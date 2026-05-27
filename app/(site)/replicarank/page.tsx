"use client";

import { useEffect, useMemo, useState } from "react";

type Edition = {
  id: string;
  name: string;
  slug: string;
  cohort_year: number;
  is_current: boolean;
  is_page_visible: boolean;
  are_registrations_open: boolean;
  is_ranking_published: boolean;
  available_places: number;
  archive_pdf_url: string | null;
};

type Subject = {
  id: string;
  edition_id: string;
  name: string;
  cfu: number;
  year_label: string | null;
  semester_label: string | null;
  category: string | null;
  sort_order: number;
  is_eligibility: boolean;
};

type RankingRow = {
  id: string;
  edition_id: string;
  position: number;
  fake_matricola: string;
  final_score: number;
  assigned_group: string | null;
  assignment_status: string;
  is_within_available_places: boolean;
  generated_at: string;
};

type ArchiveEdition = {
  id: string;
  name: string;
  slug: string;
  cohort_year: number;
  archive_pdf_url: string | null;
  is_ranking_published: boolean;
};

type Participant = {
  id: string;
  fake_matricola: string;
  total_cfu: number;
  weighted_average: number;
  final_score: number;
  assigned_group: string | null;
  assignment_status: string;
  registered_at: string;
} | null;

type SelectedSubject = {
  subject_id: string;
  grade: string;
  has_honors: boolean;
  is_passed: boolean;
};

const AREA_OPTIONS = ["Chirurgia", "Clinica", "Ricerca"] as const;

const DISCLAIMER =
  "Questa NON è una graduatoria ufficiale dell’Università. È una simulazione/previsione indipendente basata sugli stessi criteri pubblici della graduatoria originale.";

function isEligibilitySubject(subject: Subject | undefined) {
  return Boolean(subject?.is_eligibility);
}

export default function ReplicaRankPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [edition, setEdition] = useState<Edition | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [archives, setArchives] = useState<ArchiveEdition[]>([]);
  const [participant, setParticipant] = useState<Participant>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [canAccessReplicaRank, setCanAccessReplicaRank] = useState(false);

  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([]);
  const [areaPreferences, setAreaPreferences] = useState({
    first: "",
    second: "",
    third: "",
  });
  const [matricolaSearch, setMatricolaSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const totalCfu = useMemo(() => {
    return selectedSubjects.reduce((sum, item) => {
      const subject = subjects.find((subjectItem) => subjectItem.id === item.subject_id);
      if (!subject) return sum;

      if (isEligibilitySubject(subject) && !item.is_passed) {
        return sum;
      }

      return sum + subject.cfu;
    }, 0);
  }, [selectedSubjects, subjects]);

  const gradedTotalCfu = useMemo(() => {
    return selectedSubjects.reduce((sum, item) => {
      const subject = subjects.find((subjectItem) => subjectItem.id === item.subject_id);
      if (!subject || isEligibilitySubject(subject)) return sum;

      return sum + subject.cfu;
    }, 0);
  }, [selectedSubjects, subjects]);

  const weightedAverage = useMemo(() => {
    const totalWeight = selectedSubjects.reduce((sum, item) => {
      const subject = subjects.find((subjectItem) => subjectItem.id === item.subject_id);
      if (!subject || isEligibilitySubject(subject)) return sum;

      const numericGrade = Number(item.grade);
      if (!Number.isFinite(numericGrade)) return sum;

      return sum + numericGrade * subject.cfu;
    }, 0);

    if (gradedTotalCfu === 0) return 0;
    return totalWeight / gradedTotalCfu;
  }, [selectedSubjects, subjects, gradedTotalCfu]);

  const filteredRanking = useMemo(() => {
    const search = matricolaSearch.trim().toLowerCase();

    return ranking.filter((row) => {
      const matchesSearch = !search || row.fake_matricola.toLowerCase().includes(search);
      const matchesArea = areaFilter === "all" || (row.assigned_group ?? "") === areaFilter;
      return matchesSearch && matchesArea;
    });
  }, [ranking, matricolaSearch, areaFilter]);

  const availableAreas = useMemo(() => {
    return Array.from(
      new Set(
        ranking
          .map((row) => row.assigned_group)
          .filter((value): value is string => Boolean(value))
      )
    );
  }, [ranking]);

  const hasValidAreaPreferences = useMemo(() => {
    const values = [
      areaPreferences.first,
      areaPreferences.second,
      areaPreferences.third,
    ].filter(Boolean);

    return values.length === 3 && new Set(values).size === 3;
  }, [areaPreferences]);

  async function loadReplicaRank() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/replicarank");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore durante il caricamento di ReplicaRANK.");
      }

      setEdition(data.edition ?? null);
      setSubjects(data.subjects ?? []);
      setRanking(data.ranking ?? []);
      setArchives(data.archives ?? []);
      setParticipant(data.participant ?? null);
      setIsAuthenticated(Boolean(data.isAuthenticated));
      setCanAccessReplicaRank(Boolean(data.canAccessReplicaRank));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReplicaRank();
  }, []);

  useEffect(() => {
    if (!loading && edition && !isAuthenticated) {
      window.location.replace("/login?next=/replicarank");
    }
  }, [loading, edition, isAuthenticated]);

  function toggleSubject(subjectId: string) {
    setSelectedSubjects((prev) => {
      const exists = prev.find((item) => item.subject_id === subjectId);

      if (exists) {
        return prev.filter((item) => item.subject_id !== subjectId);
      }

      const subject = subjects.find((subjectItem) => subjectItem.id === subjectId);

      return [
        ...prev,
        {
          subject_id: subjectId,
          grade: isEligibilitySubject(subject) ? "" : "18",
          has_honors: false,
          is_passed: true,
        },
      ];
    });
  }


  function updateSubjectGrade(subjectId: string, grade: string) {
    const onlyNumbers = grade.replace(/\D/g, "");

    setSelectedSubjects((prev) =>
      prev.map((item) =>
        item.subject_id === subjectId
          ? {
            ...item,
            grade: onlyNumbers,
          }
          : item
      )
    );
  }

  function updateSubjectHonors(subjectId: string, hasHonors: boolean) {
    setSelectedSubjects((prev) =>
      prev.map((item) =>
        item.subject_id === subjectId
          ? {
            ...item,
            has_honors: hasHonors,
          }
          : item
      )
    );
  }

  function updateSubjectPassed(subjectId: string, isPassed: boolean) {
    setSelectedSubjects((prev) =>
      prev.map((item) =>
        item.subject_id === subjectId
          ? {
            ...item,
            is_passed: isPassed,
          }
          : item
      )
    );
  }

  async function submitRegistration() {
    if (!edition) return;

    if (!isAuthenticated) {
      setError("Devi effettuare l’accesso per partecipare a ReplicaRANK.");
      return;
    }

    if (!canAccessReplicaRank) {
      setError(`ReplicaRANK è riservato agli utenti con anno di laurea ${edition.cohort_year}.`);
      return;
    }

    if (!edition.are_registrations_open) {
      setError("Registrazioni chiuse.");
      return;
    }

    if (selectedSubjects.length === 0) {
      setError("Seleziona almeno un esame sostenuto.");
      return;
    }

    const hasInvalidGrades = selectedSubjects.some((item) => {
      const subject = subjects.find((subjectItem) => subjectItem.id === item.subject_id);

      if (isEligibilitySubject(subject)) {
        return false;
      }

      const numericGrade = Number(item.grade);
      return item.grade === "" || !Number.isFinite(numericGrade) || numericGrade < 18 || numericGrade > 30;
    });

    if (hasInvalidGrades) {
      setError("Inserisci un voto valido tra 18 e 30 per ogni esame selezionato.");
      return;
    }

    if (!hasValidAreaPreferences) {
      setError("Devi indicare tutte e 3 le aree in ordine di preferenza, senza ripetizioni.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const preferenceRows = [
        areaPreferences.first,
        areaPreferences.second,
        areaPreferences.third,
      ].map((groupName, index) => ({
        group_name: groupName,
        preference_order: index + 1,
      }));

      const res = await fetch("/api/replicarank/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          edition_id: edition.id,
          selected_subjects: selectedSubjects.map((item) => ({
            subject_id: item.subject_id,
            grade: item.grade,
            has_honors: item.has_honors,
            passed: item.is_passed,
          })),
          preferences: preferenceRows,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore durante la registrazione.");
      }

      setMessage(
        `Registrazione completata. La tua matricola ReplicaRANK è ${data.participant?.fake_matricola}.`
      );
      await loadReplicaRank();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        :root {
          --ink: #08102A;
          --ink-mid: #1A2B5C;
          --ink-soft: #2E4080;
          --sky: #E8EDFB;
          --sky-deep: #C8D4F5;
          --cream: #F8F7F3;
          --mist: #6B7280;
          --white: #FEFEFE;
          --blue: #0E1F6B;
          --blue-mid: #1A3399;
          --blue-light: #E8EDFB;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--cream);
          color: var(--ink);
          overflow-x: hidden;
        }

        .display { font-family: 'Cormorant Garamond', serif; }

        .replicarank-page {
          min-height: 100vh;
          padding: 7rem 1.5rem 4rem;
          background: var(--cream);
        }

        .replicarank-inner { max-width: 1180px; margin: 0 auto; }

        .hero {
          border-radius: 2.8rem;
          padding: 4rem;
          background: radial-gradient(circle at top right, rgba(200,212,245,.22), transparent 35%), var(--ink);
          color: white;
          box-shadow: 0 24px 70px rgba(8,16,42,.24);
        }

        .eyebrow {
          font-size: .72rem;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: rgba(255,255,255,.6);
          margin-bottom: 1.2rem;
        }

        .hero-title {
          font-size: clamp(4rem, 10vw, 8rem);
          line-height: .86;
          letter-spacing: -.06em;
        }

        .hero-subtitle {
          margin-top: 1.5rem;
          max-width: 760px;
          color: rgba(255,255,255,.72);
          line-height: 1.8;
          font-size: 1.05rem;
        }

        .disclaimer {
          margin-top: 1.5rem;
          border-radius: 1.5rem;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(255,255,255,.06);
          padding: 1rem 1.2rem;
          color: rgba(255,255,255,.86);
          line-height: 1.7;
        }

        .hero-actions { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 2rem; }

        .btn-primary {
          background: white;
          color: var(--ink);
          border: none;
          border-radius: 999px;
          padding: 1rem 2rem;
          text-decoration: none;
          font-weight: 800;
          transition: .2s ease;
          cursor: pointer;
        }

        .btn-primary:hover { transform: translateY(-2px); }

        .btn-primary:disabled {
          opacity: .55;
          cursor: not-allowed;
          transform: none;
        }

        .btn-outline {
          border: 1px solid rgba(255,255,255,.2);
          color: white;
          border-radius: 999px;
          padding: 1rem 2rem;
          text-decoration: none;
          font-weight: 700;
          background: transparent;
        }

        .btn-submit-rank {
          display: inline-flex;
          align-items: center;
          justify-content: center;
  width: 100%;
  margin-top: 1.5rem;
  background: linear-gradient(135deg, var(--blue), var(--blue-mid));
  color: white;
  border: none;
  border-radius: 999px;
  padding: 1.05rem 2rem;
  font-weight: 900;
  letter-spacing: .02em;
  box-shadow: 0 14px 30px rgba(14,31,107,.28);
  cursor: pointer;
  transition: .2s ease;
}

.btn-submit-rank:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 38px rgba(14,31,107,.34);
}

.btn-submit-rank:disabled {
  opacity: .55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 1rem;
          margin-top: 2rem;
        }

        .stat-card {
          border-radius: 1.5rem;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.08);
          padding: 1.2rem;
        }

        .stat-card strong { display: block; font-size: 2rem; }

        .stat-card span {
          display: block;
          margin-top: .35rem;
          color: rgba(255,255,255,.6);
          font-size: .78rem;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 800;
        }

        .section { margin-top: 1.5rem; }

        .grid {
          display: grid;
          grid-template-columns: minmax(0,1.1fr) minmax(320px,.9fr);
          gap: 1.5rem;
        }

        .card {
          border-radius: 2rem;
          background: white;
          border: 1px solid rgba(8,16,42,.08);
          padding: 2rem;
          box-shadow: 0 14px 40px rgba(8,16,42,.06);
        }

        .section-title {
          font-size: 2.5rem;
          line-height: 1;
          letter-spacing: -.03em;
          margin-bottom: .8rem;
        }

        .muted { color: var(--mist); line-height: 1.8; }

        .alert {
          margin-top: 1.2rem;
          border-radius: 1.4rem;
          padding: 1rem 1.2rem;
          line-height: 1.7;
          font-weight: 600;
        }

        .alert-warning { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; }
        .alert-success { background: #ecfdf5; border: 1px solid #bbf7d0; color: #047857; }
        .alert-info { background: var(--blue-light); border: 1px solid rgba(8,16,42,.08); color: var(--ink-mid); }

        .status-grid { display: grid; gap: .85rem; margin-top: 1.4rem; }

        .status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          border-radius: 1.3rem;
          background: var(--cream);
          border: 1px solid rgba(8,16,42,.08);
          padding: 1rem;
        }

        .badge {
          border-radius: 999px;
          padding: .45rem .75rem;
          font-size: .74rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .badge-ok { background: #ecfdf5; color: #047857; }
        .badge-closed { background: #fef2f2; color: #991b1b; }
        .badge-idle { background: #f8fafc; color: #64748b; }

        .form-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(8,16,42,.12);
          padding: .95rem 1rem;
          background: white;
          color: var(--ink);
          font-family: 'DM Sans', sans-serif;
        }

        .subject-card {
          align-items: flex-start;
          flex-direction: column;
        }

        .subject-head {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .subject-check {
          display: flex;
          align-items: center;
          gap: .7rem;
          font-weight: 800;
          cursor: pointer;
        }

        .subject-check input {
          width: 20px;
          height: 20px;
          accent-color: var(--ink);
        }

        .ranking-tools {
          display: grid;
          grid-template-columns: minmax(0,1fr) 240px;
          gap: 1rem;
          margin-top: 1.2rem;
        }

        .ranking-table-wrap { width: 100%; overflow-x: auto; }

        .ranking-table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
          margin-top: 1.5rem;
        }

        .ranking-table th {
          text-align: left;
          padding: 1rem;
          background: var(--cream);
          color: var(--ink-mid);
          font-size: .74rem;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .ranking-table td { padding: 1rem; border-bottom: 1px solid rgba(8,16,42,.06); }

        .position {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          border-radius: 999px;
          background: var(--ink);
          color: white;
          padding: .35rem .65rem;
          font-weight: 900;
        }

        .matricola {
          border-radius: 999px;
          background: var(--blue-light);
          color: var(--ink-mid);
          padding: .35rem .7rem;
          font-weight: 900;
          font-family: 'DM Sans', sans-serif;
        }

        .top-row { background: #fbfdff; }

        .archive-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 1rem;
          margin-top: 1.2rem;
        }

        .archive-card {
          border-radius: 1.4rem;
          background: var(--cream);
          border: 1px solid rgba(8,16,42,.08);
          padding: 1rem;
        }

        .loading-page { min-height: 100vh; padding: 8rem 1.5rem; background: var(--cream); }
        .empty-box { border-radius: 1.4rem; border: 1px dashed rgba(8,16,42,.18); padding: 2rem; text-align: center; color: var(--mist); background: var(--cream); margin-top: 1rem; }

        @media (max-width: 1000px) {
          .grid, .stats, .archive-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 760px) {
          .replicarank-page { padding: 6rem 1rem 3rem; }
          .hero, .card { padding: 1.5rem; border-radius: 1.6rem; }
          .hero-actions, .ranking-tools { flex-direction: column; grid-template-columns: 1fr; }
        }
      `}</style>

      {loading ? (
        <main className="loading-page">
          <div className="replicarank-inner">Caricamento ReplicaRANK...</div>
        </main>
      ) : !edition ? (
        <main className="replicarank-page">
          <div className="replicarank-inner">
            <section className="section">
              <div className="card">
                <h1 className="display section-title">ReplicaRANK non disponibile</h1>
                <p className="muted">Al momento non è presente un’edizione attiva di ReplicaRANK.</p>
              </div>
            </section>
          </div>
        </main>
      ) : !isAuthenticated ? (
        <main className="loading-page">
          <div className="replicarank-inner">Reindirizzamento al login...</div>
        </main>
      ) : !canAccessReplicaRank ? (
        <main className="replicarank-page">
          <div className="replicarank-inner">
            <section className="section">
              <div className="card">
                <h1 className="display section-title">Accesso non autorizzato</h1>

                <div className="alert alert-warning">
                  ReplicaRANK {edition.cohort_year} è riservato agli utenti con anno di laurea{" "}
                  {edition.cohort_year}. Se pensi che ci sia un errore, controlla il tuo profilo o
                  contatta gli amministratori.
                </div>
              </div>
            </section>
          </div>
        </main>
      ) : (
        <main className="replicarank-page">
          <div className="replicarank-inner">
            <section className="hero">
              <p className="eyebrow">Simulazione indipendente</p>

              <h1 className="display hero-title">{edition?.name ?? "ReplicaRANK"}</h1>

              <p className="hero-subtitle">
                Una simulazione indipendente pensata per aiutarti a orientarti: confronta media, CFU e preferenze usando criteri pubblici, senza sostituire in alcun modo la graduatoria ufficiale.
              </p>

              <div className="hero-actions">
                <a href="#partecipa" className="btn-primary">Partecipa ora</a>
                <a href="#graduatoria" className="btn-outline">Vedi graduatoria</a>
              </div>

              <div className="stats">
                <div className="stat-card"><strong>{edition?.available_places ?? 750}</strong><span>posti totali</span></div>
                <div className="stat-card"><strong>250</strong><span>chirurgica</span></div>
                <div className="stat-card"><strong>250</strong><span>clinica</span></div>
                <div className="stat-card"><strong>250</strong><span>ricerca</span></div>
              </div>
            </section>

            {error && <div className="alert alert-warning">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}

            <>
              <section className="section grid">
                <div className="card">
                  <p className="eyebrow" style={{ color: "var(--ink-soft)" }}>Come funziona</p>

                  <h2 className="display section-title">Una previsione chiara, non ufficiale</h2>

                  <p className="muted">
                    ReplicaRANK raccoglie i dati inseriti dagli studenti registrati, calcola media ponderata, CFU e punteggio finale, poi assegna progressivamente i posti nelle tre aree: Chirurgia, Clinica e Ricerca, con massimo 250 persone per area.
                  </p>

                </div>

                <aside className="card" id="partecipa">
                  <p className="eyebrow" style={{ color: "var(--ink-soft)" }}>Partecipa</p>

                  <h2 className="display section-title">Registrazione</h2>

                  {participant ? (
                    <div className="alert alert-info">
                      <strong>Risulti già registrato.</strong><br />
                      Matricola ReplicaRANK: {participant.fake_matricola}<br />
                      CFU: {participant.total_cfu}<br />
                      Media ponderata: {Number(participant.weighted_average).toFixed(2)}
                    </div>
                  ) : !edition.are_registrations_open ? (
                    <div className="alert alert-warning">Registrazioni chiuse.</div>
                  ) : (
                    <>
                      <p className="muted">
                        Seleziona gli esami sostenuti, inserisci il voto e ordina obbligatoriamente le aree in base alle tue preferenze.
                      </p>

                      <div className="alert alert-info">
                        In questa simulazione non verranno presi in considerazione gli esami della sessione estiva corrente. Verranno conteggiati solo gli esami presenti in questa pagina, già suddivisi in parziali quando necessario.
                      </div>

                      <div className="alert alert-warning">{DISCLAIMER}</div>

                      <div className="status-grid" style={{ marginTop: "1.2rem" }}>
                        {subjects.length === 0 ? (
                          <div className="empty-box">Nessun esame disponibile. Attendi che gli admin li inseriscano.</div>
                        ) : (
                          subjects.map((subject) => {
                            const selected = selectedSubjects.find((item) => item.subject_id === subject.id);

                            return (
                              <div key={subject.id} className="status-row subject-card">
                                <div className="subject-head">
                                  <label className="subject-check">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selected)}
                                      onChange={() => toggleSubject(subject.id)}
                                    />
                                    {subject.name}
                                  </label>
                                  <span className="badge badge-ok">
                                    {subject.cfu} CFU{isEligibilitySubject(subject) ? " · Idoneità" : ""}
                                  </span>
                                </div>

                                <p className="muted" style={{ fontSize: ".9rem" }}>
                                  {subject.year_label ? `${subject.year_label}` : ""}
                                  {subject.semester_label ? ` · ${subject.semester_label}` : ""}
                                  {subject.category ? ` · ${subject.category}` : ""}
                                </p>

                                {selected && (
                                  <div style={{ width: "100%", marginTop: "1rem" }}>
                                    {isEligibilitySubject(subject) ? (
                                      <div>
                                        <label style={{ display: "block", marginBottom: ".45rem", fontWeight: 700 }}>
                                          Esito
                                        </label>

                                        <select
                                          value={selected.is_passed ? "passed" : "not_passed"}
                                          onChange={(event) =>
                                            updateSubjectPassed(subject.id, event.target.value === "passed")
                                          }
                                          className="form-input"
                                        >
                                          <option value="passed">Superato</option>
                                          <option value="not_passed">Non superato</option>
                                        </select>

                                        <p className="muted" style={{ fontSize: ".85rem", marginTop: ".55rem" }}>
                                          Se selezioni “Superato”, i CFU vengono conteggiati. Questo esame non entra
                                          nel calcolo della media ponderata.
                                        </p>
                                      </div>
                                    ) : (
                                      <>
                                        <label style={{ display: "block", marginBottom: ".45rem", fontWeight: 700 }}>
                                          Voto
                                        </label>

                                        <select
                                          value={selected.grade}
                                          onChange={(event) => updateSubjectGrade(subject.id, event.target.value)}
                                          className="form-input"
                                        >
                                          {Array.from({ length: 13 }, (_, index) => index + 18).map((grade) => (
                                            <option key={grade} value={String(grade)}>
                                              {grade}
                                            </option>
                                          ))}
                                        </select>

                                        <label
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: ".6rem",
                                            marginTop: ".9rem",
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selected.has_honors}
                                            onChange={(event) => updateSubjectHonors(subject.id, event.target.checked)}
                                          />
                                          Con lode
                                        </label>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>


                      <div style={{ marginTop: "1.5rem" }}>
                        <label style={{ display: "block", marginBottom: ".5rem", fontWeight: 700 }}>
                          Ordine preferenze aree
                        </label>

                        <p className="muted" style={{ fontSize: ".92rem", marginBottom: ".9rem" }}>
                          Devi ordinare tutte le aree. L’algoritmo proverà prima la tua 1ª scelta, poi la 2ª e infine la 3ª in base ai posti disponibili.
                        </p>

                        <div style={{ display: "grid", gap: ".9rem" }}>
                          <div>
                            <label style={{ display: "block", marginBottom: ".45rem", fontWeight: 700 }}>
                              1ª preferenza
                            </label>
                            <select
                              value={areaPreferences.first}
                              onChange={(event) =>
                                setAreaPreferences((prev) => ({
                                  ...prev,
                                  first: event.target.value,
                                }))
                              }
                              className="form-input"
                            >
                              <option value="">Seleziona area</option>
                              {AREA_OPTIONS.map((area) => (
                                <option
                                  key={area}
                                  value={area}
                                  disabled={
                                    area === areaPreferences.second ||
                                    area === areaPreferences.third
                                  }
                                >
                                  {area}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={{ display: "block", marginBottom: ".45rem", fontWeight: 700 }}>
                              2ª preferenza
                            </label>
                            <select
                              value={areaPreferences.second}
                              onChange={(event) =>
                                setAreaPreferences((prev) => ({
                                  ...prev,
                                  second: event.target.value,
                                }))
                              }
                              className="form-input"
                            >
                              <option value="">Seleziona area</option>
                              {AREA_OPTIONS.map((area) => (
                                <option
                                  key={area}
                                  value={area}
                                  disabled={
                                    area === areaPreferences.first ||
                                    area === areaPreferences.third
                                  }
                                >
                                  {area}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={{ display: "block", marginBottom: ".45rem", fontWeight: 700 }}>
                              3ª preferenza
                            </label>
                            <select
                              value={areaPreferences.third}
                              onChange={(event) =>
                                setAreaPreferences((prev) => ({
                                  ...prev,
                                  third: event.target.value,
                                }))
                              }
                              className="form-input"
                            >
                              <option value="">Seleziona area</option>
                              {AREA_OPTIONS.map((area) => (
                                <option
                                  key={area}
                                  value={area}
                                  disabled={
                                    area === areaPreferences.first ||
                                    area === areaPreferences.second
                                  }
                                >
                                  {area}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="alert alert-info">
                        <strong>CFU totali:</strong> {totalCfu}<br />
                        <strong>Media ponderata:</strong> {weightedAverage.toFixed(2)}
                      </div>

                      <button
                        type="button"
                        className="btn-submit-rank"
                        onClick={submitRegistration}
                        disabled={submitting || !canAccessReplicaRank || selectedSubjects.length === 0 || !hasValidAreaPreferences}
                      >
                        {submitting ? "Registrazione..." : "Registrati a ReplicaRANK"}
                      </button>
                    </>
                  )}
                </aside>
              </section>

              <section className="section" id="graduatoria">
                <div className="card">
                  <p className="eyebrow" style={{ color: "var(--ink-soft)" }}>Graduatoria pubblica</p>
                  <h2 className="display section-title">Graduatoria simulata</h2>
                  <p className="muted">
                    La graduatoria pubblica non mostra dati personali reali. I posti sono 750 totali: 250 Chirurgia, 250 Clinica e 250 Ricerca.
                  </p>
                  <div className="alert alert-warning">{DISCLAIMER}</div>

                  {!edition.is_ranking_published ? (
                    <div className="empty-box">Graduatoria non ancora pubblicata.</div>
                  ) : (
                    <>
                      <div className="ranking-tools">
                        <input
                          value={matricolaSearch}
                          onChange={(event) => setMatricolaSearch(event.target.value)}
                          placeholder="Cerca matricola ReplicaRANK"
                          className="form-input"
                        />
                        <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className="form-input">
                          <option value="all">Tutte le aree</option>
                          {availableAreas.map((area) => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                        </select>
                      </div>

                      <div className="ranking-table-wrap">
                        <table className="ranking-table">
                          <thead>
                            <tr>
                              <th>Posizione</th>
                              <th>Matricola</th>
                              <th>Punteggio</th>
                              <th>Area</th>
                              <th>Stato</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRanking.length === 0 ? (
                              <tr><td colSpan={5}>Nessun risultato trovato.</td></tr>
                            ) : (
                              filteredRanking.map((row) => (
                                <tr key={row.id} className={row.is_within_available_places ? "top-row" : ""}>
                                  <td><span className="position">#{row.position}</span></td>
                                  <td><span className="matricola">{row.fake_matricola}</span></td>
                                  <td>{Number(row.final_score).toFixed(2)}</td>
                                  <td>{row.assigned_group ?? "—"}</td>
                                  <td><span className={`badge ${row.assignment_status === "assegnato" ? "badge-ok" : "badge-idle"}`}>{row.assignment_status === "assegnato" ? "Assegnato" : "Non assegnato"}</span></td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {archives.length > 0 && (
                <section className="section">
                  <div className="card">
                    <p className="eyebrow" style={{ color: "var(--ink-soft)" }}>Archivio</p>
                    <h2 className="display section-title">Edizioni precedenti</h2>
                    <p className="muted">Le vecchie edizioni resteranno consultabili con PDF scaricabili.</p>
                    <div className="archive-grid">
                      {archives.map((archive) => (
                        <div key={archive.id} className="archive-card">
                          <strong>{archive.name}</strong>
                          <p className="muted">Coorte {archive.cohort_year}</p>
                          {archive.archive_pdf_url && (
                            <a href={archive.archive_pdf_url} target="_blank" className="btn-primary" style={{ display: "inline-flex", marginTop: ".8rem" }}>Scarica PDF</a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </>
          </div>
        </main>
      )}
    </>
  );
}