
// Replaced by new version
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

type Participant = {
  id: string;
  fake_matricola: string;
  nome: string;
  cognome: string;
  email_istituzionale: string | null;
  numero_telefono: string;
  data_di_nascita: string;
  intermediate_out_of_course_count: number;
  total_cfu: number;
  weighted_average: number;
  final_score: number;
  assigned_group: string | null;
  assignment_status: string;
  registered_at: string;
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
  id?: string;
  participant_id: string;
  position: number;
  fake_matricola: string;
  final_score: number;
  weighted_average: number;
  total_cfu: number;
  assigned_group: string | null;
  assignment_status: string;
  is_within_available_places: boolean;
  generated_at: string;
};

type AreaStat = {
  area: string;
  assigned_count: number;
  capacity: number;
  remaining_places: number;
  minimum_score: number | null;
};

const DISCLAIMER =
  "Questa NON è una graduatoria ufficiale dell’Università. È una simulazione/previsione indipendente basata sugli stessi criteri pubblici della graduatoria originale.";

const DEFAULT_AREA_STATS: AreaStat[] = [
  {
    area: "Chirurgia",
    assigned_count: 0,
    capacity: 250,
    remaining_places: 250,
    minimum_score: null,
  },
  {
    area: "Clinica",
    assigned_count: 0,
    capacity: 250,
    remaining_places: 250,
    minimum_score: null,
  },
  {
    area: "Ricerca",
    assigned_count: 0,
    capacity: 250,
    remaining_places: 250,
    minimum_score: null,
  },
];

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminReplicaRankPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [areaStats, setAreaStats] = useState<AreaStat[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newEdition, setNewEdition] = useState({
    name: "ReplicaRANK 2031",
    slug: createSlug("ReplicaRANK 2031"),
    cohort_year: 2031,
    available_places: 750,
    is_current: false,
    is_page_visible: false,
    are_registrations_open: false,
    is_ranking_published: false,
    archive_pdf_url: "",
  });

  const [subjectForm, setSubjectForm] = useState({
    id: "",
    name: "",
    cfu: "6",
    year_label: "",
    semester_label: "",
    category: "",
    sort_order: 0,
    is_eligibility: false,
  });

  const selectedEdition = useMemo(
    () => editions.find((edition) => edition.id === selectedEditionId) ?? null,
    [editions, selectedEditionId]
  );

  const visibleAreaStats = areaStats.length > 0 ? areaStats : DEFAULT_AREA_STATS;

  function parseDecimalInput(value: string) {
    return Number(value.replace(",", "."));
  }

  const filteredParticipants = useMemo(() => {
    const search = participantSearch.trim().toLowerCase();

    return participants.filter((participant) => {
      const matchesSearch =
        !search ||
        participant.nome.toLowerCase().includes(search) ||
        participant.cognome.toLowerCase().includes(search) ||
        participant.fake_matricola.toLowerCase().includes(search) ||
        participant.numero_telefono.toLowerCase().includes(search) ||
        (participant.email_istituzionale ?? "").toLowerCase().includes(search);

      const matchesStatus =
        assignmentFilter === "all" || participant.assignment_status === assignmentFilter;

      return matchesSearch && matchesStatus;
    });
  }, [participants, participantSearch, assignmentFilter]);

  function resetSubjectForm() {
    setSubjectForm({
      id: "",
      name: "",
      cfu: "6",
      year_label: "",
      semester_label: "",
      category: "",
      sort_order: subjects.length,
      is_eligibility: false,
    });
  }

  async function loadSubjects(editionId: string) {
    const res = await fetch(`/api/admin/replicarank/subjects?edition_id=${editionId}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Errore durante il caricamento degli esami.");
    }

    setSubjects(data.subjects ?? []);
  }

  async function loadRanking(editionId: string) {
    const res = await fetch(`/api/admin/replicarank/ranking?edition_id=${editionId}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Errore durante il caricamento della graduatoria.");
    }

    setRanking(data.ranking ?? []);
    setAreaStats(data.areaStats ?? []);
  }

  async function loadData(editionId?: string) {
    setLoading(true);
    setError("");

    try {
      const url = editionId
        ? `/api/admin/replicarank?edition_id=${editionId}`
        : "/api/admin/replicarank";

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore durante il caricamento.");
      }

      setEditions(data.editions ?? []);
      setParticipants(data.participants ?? []);

      if (data.selectedEdition?.id) {
        setSelectedEditionId(data.selectedEdition.id);
        await Promise.all([
          loadSubjects(data.selectedEdition.id),
          loadRanking(data.selectedEdition.id),
        ]);
      } else {
        setSubjects([]);
        setRanking([]);
        setAreaStats([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function updateEdition(updates: Partial<Edition>) {
    if (!selectedEdition) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/replicarank", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedEdition.id, ...updates }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore durante il salvataggio.");
      }

      setMessage(data.message || "Edizione aggiornata.");
      await loadData(selectedEdition.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setSaving(false);
    }
  }

  async function createEdition() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/replicarank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newEdition,
          slug: createSlug(newEdition.name),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore durante la creazione.");
      }

      setMessage(data.message || "Edizione creata.");
      await loadData(data.edition?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEdition() {
    if (!selectedEdition) return;

    const confirmed = window.confirm(
      `Vuoi eliminare ${selectedEdition.name}? Verranno eliminati anche esami, partecipanti e graduatorie collegate.`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/replicarank", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedEdition.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore durante l’eliminazione.");
      }

      setMessage(data.message || "Edizione eliminata.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSubject() {
    if (!selectedEdition) return;

    const name = subjectForm.name.trim();

    if (!name) {
      setError("Inserisci il nome dell’esame.");
      return;
    }

    const parsedCfu = parseDecimalInput(String(subjectForm.cfu));

    if (!Number.isFinite(parsedCfu) || parsedCfu <= 0) {
      setError("Inserisci CFU validi. Puoi usare anche numeri con la virgola, ad esempio 2,5.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const isEditing = Boolean(subjectForm.id);
      const res = await fetch("/api/admin/replicarank/subjects", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: subjectForm.id || undefined,
          edition_id: selectedEdition.id,
          name,
          cfu: parsedCfu,
          year_label: subjectForm.year_label.trim() || null,
          semester_label: subjectForm.semester_label.trim() || null,
          category: subjectForm.category.trim() || null,
          sort_order: Number(subjectForm.sort_order) || 0,
          is_eligibility: subjectForm.is_eligibility,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore durante il salvataggio dell’esame.");
      }

      setMessage(data.message || "Esame salvato correttamente.");
      resetSubjectForm();
      await loadSubjects(selectedEdition.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteParticipant(participant: Participant) {
    const confirmed = window.confirm(
      `Vuoi eliminare il partecipante ${participant.nome} ${participant.cognome} (${participant.fake_matricola})?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/replicarank/participants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: participant.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore durante l’eliminazione del partecipante.");
      }

      setMessage(data.message || "Partecipante eliminato correttamente.");
      if (selectedEdition) await loadData(selectedEdition.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubject(subject: Subject) {
    const confirmed = window.confirm(`Vuoi eliminare l’esame “${subject.name}”?`);

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/replicarank/subjects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subject.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore durante l’eliminazione dell’esame.");
      }

      setMessage(data.message || "Esame eliminato correttamente.");
      if (selectedEdition) await loadSubjects(selectedEdition.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setSaving(false);
    }
  }

  function editSubject(subject: Subject) {
    setSubjectForm({
      id: subject.id,
      name: subject.name,
      cfu: String(subject.cfu).replace(".", ","),
      year_label: subject.year_label ?? "",
      semester_label: subject.semester_label ?? "",
      category: subject.category ?? "",
      sort_order: subject.sort_order ?? 0,
      is_eligibility: subject.is_eligibility ?? false,
    });
  }

  async function generateRanking() {
    if (!selectedEdition) return;

    const confirmed = window.confirm(
      `Vuoi generare o ricalcolare la graduatoria per ${selectedEdition.name}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/replicarank/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition_id: selectedEdition.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore durante la generazione della graduatoria.");
      }

      setMessage(data.message || "Graduatoria generata correttamente.");
      await loadData(selectedEdition.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setSaving(false);
    }
  }

  function exportParticipantsCsv() {
    const headers = [
      "Nome",
      "Cognome",
      "Email",
      "Telefono",
      "Matricola",
      "CFU",
      "Media",
      "Punteggio",
      "Area",
      "Stato",
    ];

    const rows = filteredParticipants.map((participant) => [
      participant.nome,
      participant.cognome,
      participant.email_istituzionale ?? "",
      participant.numero_telefono,
      participant.fake_matricola,
      participant.total_cfu,
      participant.weighted_average,
      participant.final_score,
      participant.assigned_group ?? "",
      participant.assignment_status,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${selectedEdition?.slug ?? "replicarank"}-partecipanti.csv`;
    link.click();

    URL.revokeObjectURL(url);
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

        .eyebrow {
          font-size: .7rem;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--ink-soft);
          display: flex;
          align-items: center;
          gap: .7rem;
          margin-bottom: 1.4rem;
        }

        .eyebrow::before {
          content: "";
          width: 24px;
          height: 2px;
          background: var(--ink-soft);
          border-radius: 2px;
        }

        .eyebrow-light { color: rgba(255,255,255,.5); }
        .eyebrow-light::before { background: rgba(255,255,255,.5); }

        .btn-primary,
        .btn-dark {
          background: var(--ink);
          color: #fff;
          border: none;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: .2s;
          box-shadow: 0 4px 24px rgba(8,16,42,.22);
        }

        .btn-primary { padding: .9rem 2.4rem; font-size: .95rem; }
        .btn-dark { padding: 1rem 2.8rem; font-size: 1rem; }
        .btn-primary:hover,
        .btn-dark:hover { background: var(--ink-mid); transform: translateY(-2px); }
        .btn-primary:disabled,
        .btn-dark:disabled { opacity: .55; cursor: not-allowed; transform: none; }

        .btn-outline {
          border: 1.5px solid rgba(8,16,42,.2);
          color: var(--ink);
          padding: .9rem 2.4rem;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
          font-size: .95rem;
          background: transparent;
          cursor: pointer;
        }

        .replicarank-admin-page {
          min-height: 100vh;
          background: var(--cream);
          padding: 7rem 1.5rem 4rem;
        }

        .replicarank-admin-inner { max-width: 1180px; margin: 0 auto; }

        .replicarank-admin-hero {
          border-radius: 2.4rem;
          padding: 3rem;
          background: radial-gradient(circle at top right, rgba(200,212,245,.22), transparent 35%), var(--ink);
          color: #fff;
          box-shadow: 0 20px 60px rgba(8,16,42,.22);
        }

        .replicarank-admin-title {
          font-size: clamp(3rem, 6vw, 5.5rem);
          line-height: .9;
          letter-spacing: -.04em;
        }

        .replicarank-admin-subtitle {
          margin-top: 1.3rem;
          max-width: 780px;
          color: rgba(255,255,255,.72);
          line-height: 1.7;
        }

        .replicarank-admin-grid {
          margin-top: 1.5rem;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 380px;
          gap: 1.5rem;
          align-items: start;
        }

        .replicarank-card,
        .replicarank-side-card {
          background: var(--white);
          border: 1px solid rgba(8,16,42,.08);
          border-radius: 2rem;
          padding: 2rem;
          box-shadow: 0 14px 40px rgba(8,16,42,.06);
        }

        .replicarank-side-card { position: sticky; top: 6rem; }
        .replicarank-section { margin-top: 1.5rem; }

        .replicarank-section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .replicarank-section-title {
          font-size: 2.4rem;
          line-height: 1;
          letter-spacing: -.03em;
          margin-bottom: .6rem;
        }

        .replicarank-muted { color: var(--mist); line-height: 1.6; font-size: .95rem; }

        .replicarank-select,
        .replicarank-input {
          width: 100%;
          border: 1px solid rgba(8,16,42,.14);
          border-radius: 1rem;
          padding: .95rem 1rem;
          background: var(--cream);
          color: var(--ink);
          outline: none;
          font-family: 'DM Sans', sans-serif;
        }

        .replicarank-select {
          border-radius: 999px;
          width: auto;
          min-width: 210px;
          font-weight: 600;
        }

        .replicarank-form-stack,
        .replicarank-new-form { display: grid; gap: 1.3rem; }
        .replicarank-new-form { margin-top: 1.5rem; }
        .replicarank-slug-preview {
  border-radius: 1rem;
  background: var(--cream);
  border: 1px dashed rgba(8,16,42,.14);
  padding: .85rem 1rem;
  color: var(--mist);
  font-size: .88rem;
  line-height: 1.4;
}

.replicarank-slug-preview strong {
  color: var(--ink-mid);
}

        .replicarank-input-grid,
        .replicarank-switch-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .replicarank-field { display: grid; gap: .45rem; }

        .replicarank-label {
          font-size: .78rem;
          font-weight: 700;
          color: var(--ink-mid);
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .replicarank-switch-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          border: 1px solid rgba(8,16,42,.08);
          border-radius: 1.4rem;
          padding: 1.1rem;
          background: var(--cream);
        }

        .replicarank-switch-title { font-weight: 800; margin-bottom: .25rem; }
        .replicarank-switch-description { font-size: .86rem; color: var(--mist); line-height: 1.4; }

        .replicarank-switch-button {
          width: 52px;
          height: 30px;
          border-radius: 999px;
          border: none;
          padding: 4px;
          cursor: pointer;
          transition: .2s;
          flex-shrink: 0;
        }

        .replicarank-switch-dot {
          display: block;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: white;
          transition: .2s;
          box-shadow: 0 2px 8px rgba(8,16,42,.2);
        }

        .replicarank-actions { display: flex; flex-wrap: wrap; gap: .8rem; padding-top: .4rem; }

        .replicarank-delete-button {
          border: 1.5px solid rgba(185,28,28,.18);
          background: #fff;
          color: #991b1b;
          padding: 1rem 2rem;
          border-radius: 999px;
          font-weight: 700;
          cursor: pointer;
        }

        .replicarank-stats-box,
        .replicarank-subject-count {
          border-radius: 1.4rem;
          background: var(--blue-light);
          padding: 1.2rem;
        }

        .replicarank-stats-number,
        .replicarank-subject-count strong {
          font-size: 2rem;
          font-weight: 800;
          color: var(--ink);
        }

        .replicarank-stats-label,
        .replicarank-subject-count span {
          color: var(--ink-mid);
          font-weight: 700;
        }

        .replicarank-alert-error,
        .replicarank-alert-success {
          margin-top: 1rem;
          border-radius: 1.2rem;
          padding: 1rem 1.2rem;
          font-weight: 600;
        }

        .replicarank-alert-error {
          border: 1px solid rgba(185,28,28,.18);
          background: #fef2f2;
          color: #991b1b;
        }

        .replicarank-alert-success {
          border: 1px solid rgba(21,128,61,.18);
          background: #f0fdf4;
          color: #166534;
        }

        .replicarank-subjects-layout {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 1.5rem;
        }

        .replicarank-subject-form {
          display: grid;
          gap: 1rem;
          border-radius: 1.6rem;
          background: var(--cream);
          border: 1px solid rgba(8,16,42,.08);
          padding: 1.3rem;
        }

        .replicarank-small-title { font-size: 1rem; font-weight: 800; }
        .replicarank-list { display: grid; gap: .85rem; }

        .replicarank-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          border: 1px solid rgba(8,16,42,.08);
          border-radius: 1.4rem;
          padding: 1rem;
          background: #fff;
        }

        .replicarank-row h3 { font-size: 1rem; margin-bottom: .25rem; }
        .replicarank-row p { color: var(--mist); font-size: .9rem; line-height: 1.5; }
        .replicarank-row-actions { display: flex; gap: .5rem; flex-wrap: wrap; justify-content: flex-end; }

        .replicarank-area-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1.2rem;
        }

        .replicarank-area-card {
          border: 1px solid rgba(8,16,42,.08);
          border-radius: 1.4rem;
          background: var(--cream);
          padding: 1.2rem;
        }

        .replicarank-area-card h3 {
          font-size: 1rem;
          margin-bottom: .8rem;
          color: var(--ink);
        }

        .replicarank-area-number {
          font-size: 2rem;
          font-weight: 900;
          color: var(--ink);
          line-height: 1;
        }

        .replicarank-area-meta {
          margin-top: .45rem;
          color: var(--mist);
          font-size: .9rem;
          line-height: 1.5;
        }

        .replicarank-area-score {
          margin-top: .8rem;
          border-radius: 999px;
          background: white;
          border: 1px solid rgba(8,16,42,.08);
          padding: .55rem .8rem;
          color: var(--ink-mid);
          font-weight: 800;
          font-size: .86rem;
          display: inline-flex;
        }

        .replicarank-mini-button {
          border: 1px solid rgba(8,16,42,.12);
          background: var(--cream);
          color: var(--ink);
          border-radius: 999px;
          padding: .55rem .9rem;
          font-weight: 700;
          cursor: pointer;
        }

        .replicarank-mini-button.danger {
          border-color: rgba(185,28,28,.18);
          background: #fff;
          color: #991b1b;
        }

        .replicarank-empty-box {
          border: 1px dashed rgba(8,16,42,.18);
          border-radius: 1.4rem;
          padding: 2rem;
          background: var(--cream);
          color: var(--mist);
          text-align: center;
        }

        .replicarank-loading { min-height: 100vh; background: var(--cream); padding: 8rem 1.5rem; }
        .replicarank-loading-inner { max-width: 1180px; margin: 0 auto; }

        @media (max-width: 1000px) {
          .replicarank-admin-grid,
          .replicarank-subjects-layout,
          .replicarank-area-grid {
            grid-template-columns: 1fr;
          }

          .replicarank-side-card { position: static; }
        }

        @media (max-width: 760px) {
          .replicarank-admin-page { padding: 6rem 1rem 3rem; }
          .replicarank-admin-hero,
          .replicarank-card,
          .replicarank-side-card { border-radius: 1.5rem; padding: 1.4rem; }
          .replicarank-section-header,
          .replicarank-row { flex-direction: column; align-items: flex-start; }
          .replicarank-select { width: 100%; }
          .replicarank-input-grid,
          .replicarank-switch-grid { grid-template-columns: 1fr; }
          .replicarank-row-actions { justify-content: flex-start; }
        }
      `}</style>

      {loading ? (
        <main className="replicarank-loading">
          <div className="replicarank-loading-inner">Caricamento ReplicaRANK...</div>
        </main>
      ) : (
        <main className="replicarank-admin-page">
          <div className="replicarank-admin-inner">
            <section className="replicarank-admin-hero">
              <p className="eyebrow eyebrow-light">Area admin</p>
              <h1 className="display replicarank-admin-title">ReplicaRANK</h1>
              <p className="replicarank-admin-subtitle">{DISCLAIMER}</p>
            </section>

            {error && <div className="replicarank-alert-error">{error}</div>}
            {message && <div className="replicarank-alert-success">{message}</div>}

            <section className="replicarank-admin-grid">
              <div className="replicarank-card">
                <div className="replicarank-section-header">
                  <div>
                    <p className="eyebrow">Gestione</p>
                    <h2 className="display replicarank-section-title">Edizione</h2>
                    <p className="replicarank-muted">Gestisci visibilità, registrazioni, graduatoria e archivio.</p>
                  </div>

                  <select
                    value={selectedEditionId}
                    onChange={(event) => loadData(event.target.value)}
                    className="replicarank-select"
                  >
                    {editions.map((edition) => (
                      <option key={edition.id} value={edition.id}>{edition.name}</option>
                    ))}
                  </select>
                </div>

                {!selectedEdition ? (
                  <p className="replicarank-muted">Nessuna edizione trovata.</p>
                ) : (
                  <div className="replicarank-form-stack">
                    <div className="replicarank-input-grid">
                      <Field label="Nome edizione">
                        <input
                          value={selectedEdition.name}
                          onChange={(event) =>
                            setEditions((prev) =>
                              prev.map((item) =>
                                item.id === selectedEdition.id
                                  ? {
                                    ...item,
                                    name: event.target.value,
                                    slug: createSlug(event.target.value),
                                  }
                                  : item
                              )
                            )
                          }
                          className="replicarank-input"
                        />
                      </Field>

                      <Field label="Anno/coorte">
                        <input
                          type="number"
                          value={selectedEdition.cohort_year}
                          onChange={(event) =>
                            setEditions((prev) =>
                              prev.map((item) =>
                                item.id === selectedEdition.id
                                  ? { ...item, cohort_year: Number(event.target.value) }
                                  : item
                              )
                            )
                          }
                          className="replicarank-input"
                        />
                      </Field>

                      <Field label="Posti totali">
                        <input
                          type="number"
                          value={selectedEdition.available_places}
                          onChange={(event) =>
                            setEditions((prev) =>
                              prev.map((item) =>
                                item.id === selectedEdition.id
                                  ? { ...item, available_places: Number(event.target.value) }
                                  : item
                              )
                            )
                          }
                          className="replicarank-input"
                        />
                      </Field>
                    </div>

                    <Field label="URL PDF archivio">
                      <input
                        value={selectedEdition.archive_pdf_url ?? ""}
                        onChange={(event) =>
                          setEditions((prev) =>
                            prev.map((item) =>
                              item.id === selectedEdition.id
                                ? { ...item, archive_pdf_url: event.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="https://..."
                        className="replicarank-input"
                      />
                    </Field>

                    <div className="replicarank-switch-grid">
                      <SwitchRow title="Edizione corrente" description="La pagina pubblica userà questa edizione come principale." checked={selectedEdition.is_current} onChange={(checked) => updateEdition({ is_current: checked })} disabled={saving} />
                      <SwitchRow title="Mostra pagina ReplicaRANK" description="Se spento, la pagina pubblica non sarà visibile." checked={selectedEdition.is_page_visible} onChange={(checked) => updateEdition({ is_page_visible: checked })} disabled={saving} />
                      <SwitchRow title="Registrazioni aperte" description="Abilita o blocca il form di partecipazione." checked={selectedEdition.are_registrations_open} onChange={(checked) => updateEdition({ are_registrations_open: checked })} disabled={saving} />
                      <SwitchRow title="Graduatoria pubblicata" description="Mostra o nasconde la graduatoria pubblica." checked={selectedEdition.is_ranking_published} onChange={(checked) => updateEdition({ is_ranking_published: checked })} disabled={saving} />
                    </div>

                    <div className="replicarank-actions">
                      <button
                        onClick={() =>
                          updateEdition({
                            name: selectedEdition.name,
                            slug: createSlug(selectedEdition.name),
                            cohort_year: selectedEdition.cohort_year,
                            available_places: selectedEdition.available_places,
                            archive_pdf_url: selectedEdition.archive_pdf_url,
                          })
                        }
                        disabled={saving}
                        className="btn-dark"
                      >
                        Salva modifiche
                      </button>

                      <button onClick={deleteEdition} disabled={saving} className="replicarank-delete-button">
                        Elimina edizione
                      </button>
                    </div>

                    <div className="replicarank-stats-box">
                      <span className="replicarank-stats-number">{participants.length}</span>
                      <span className="replicarank-stats-label"> partecipanti registrati</span>
                    </div>
                  </div>
                )}
              </div>

              <aside className="replicarank-side-card">
                <p className="eyebrow">Nuova</p>
                <h2 className="display replicarank-section-title">Edizione</h2>
                <p className="replicarank-muted">Crea una nuova edizione annuale separata dalle precedenti.</p>
                <div className="replicarank-new-form">
                  <input
                    value={newEdition.name}
                    onChange={(event) =>
                      setNewEdition((prev) => ({
                        ...prev,
                        name: event.target.value,
                        slug: createSlug(event.target.value),
                      }))
                    }
                    placeholder="Nome edizione"
                    className="replicarank-input"
                  />

                  <input type="number" value={newEdition.cohort_year} onChange={(event) => setNewEdition((prev) => ({ ...prev, cohort_year: Number(event.target.value) }))} placeholder="Anno/coorte" className="replicarank-input" />
                  <input type="number" value={newEdition.available_places} onChange={(event) => setNewEdition((prev) => ({ ...prev, available_places: Number(event.target.value) }))} placeholder="Posti totali" className="replicarank-input" />
                  <button onClick={createEdition} disabled={saving} className="btn-primary">Crea edizione</button>
                </div>
              </aside>
            </section>

            <section className="replicarank-section">
              <div className="replicarank-card">
                <div className="replicarank-section-header">
                  <div>
                    <p className="eyebrow">Gestione esami</p>
                    <h2 className="display replicarank-section-title">Esami validi</h2>
                    <p className="replicarank-muted">Tutti gli esami inseriti qui saranno disponibili nel form utente.</p>
                  </div>
                  <div className="replicarank-subject-count"><strong>{subjects.length}</strong><span>esami</span></div>
                </div>

                <div className="replicarank-subjects-layout">
                  <div className="replicarank-subject-form">
                    <h3 className="replicarank-small-title">{subjectForm.id ? "Modifica esame" : "Nuovo esame"}</h3>
                    <Field label="Nome esame">
                      <input value={subjectForm.name} onChange={(event) => setSubjectForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Es. Anatomia umana" className="replicarank-input" />
                    </Field>
                    <div className="replicarank-input-grid">
                      <Field label="CFU">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={subjectForm.cfu}
                          onChange={(event) => setSubjectForm((prev) => ({ ...prev, cfu: event.target.value }))}
                          placeholder="Es. 6 oppure 2,5"
                          className="replicarank-input"
                        />
                      </Field>
                      <Field label="Ordine">
                        <input type="number" value={subjectForm.sort_order} onChange={(event) => setSubjectForm((prev) => ({ ...prev, sort_order: Number(event.target.value) }))} className="replicarank-input" />
                      </Field>
                    </div>
                    <div className="replicarank-input-grid">
                      <Field label="Anno">
                        <input value={subjectForm.year_label} onChange={(event) => setSubjectForm((prev) => ({ ...prev, year_label: event.target.value }))} placeholder="Primo anno" className="replicarank-input" />
                      </Field>
                      <Field label="Semestre">
                        <input value={subjectForm.semester_label} onChange={(event) => setSubjectForm((prev) => ({ ...prev, semester_label: event.target.value }))} placeholder="Primo semestre" className="replicarank-input" />
                      </Field>
                    </div>
                    <Field label="Categoria">
                      <input value={subjectForm.category} onChange={(event) => setSubjectForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="Base, Clinico..." className="replicarank-input" />
                    </Field>

                    <label className="replicarank-switch-row" style={{ cursor: "pointer" }}>
                      <div>
                        <p className="replicarank-switch-title">Esame a idoneità</p>
                        <p className="replicarank-switch-description">Attiva questa opzione se l’esame non prevede voto numerico ma solo idoneità/superato.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={subjectForm.is_eligibility}
                        onChange={(event) => setSubjectForm((prev) => ({ ...prev, is_eligibility: event.target.checked }))}
                        style={{ width: "20px", height: "20px", flexShrink: 0 }}
                      />
                    </label>

                    <div className="replicarank-actions">
                      <button type="button" onClick={saveSubject} disabled={saving || !selectedEdition} className="btn-dark">
                        {subjectForm.id ? "Salva esame" : "Aggiungi esame"}
                      </button>
                      {subjectForm.id && <button type="button" onClick={resetSubjectForm} disabled={saving} className="btn-outline">Annulla</button>}
                    </div>
                  </div>

                  <div className="replicarank-list">
                    {subjects.length === 0 ? (
                      <div className="replicarank-empty-box">Nessun esame inserito.</div>
                    ) : (
                      subjects.map((subject) => (
                        <div key={subject.id} className="replicarank-row">
                          <div>
                            <h3>{subject.name}</h3>
                            <p>{subject.cfu} CFU{subject.is_eligibility ? " · Idoneità" : ""}{subject.year_label ? ` · ${subject.year_label}` : ""}{subject.semester_label ? ` · ${subject.semester_label}` : ""}{subject.category ? ` · ${subject.category}` : ""}</p>
                          </div>
                          <div className="replicarank-row-actions">
                            <button type="button" onClick={() => editSubject(subject)} className="replicarank-mini-button">Modifica</button>
                            <button type="button" onClick={() => deleteSubject(subject)} className="replicarank-mini-button danger">Elimina</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="replicarank-section">
              <div className="replicarank-card">
                <div className="replicarank-section-header">
                  <div>
                    <p className="eyebrow">Partecipanti</p>
                    <h2 className="display replicarank-section-title">Gestione partecipanti</h2>
                    <p className="replicarank-muted">Ricerca, filtra ed esporta i partecipanti iscritti.</p>
                  </div>
                  <button type="button" onClick={exportParticipantsCsv} className="btn-outline">Esporta CSV</button>
                </div>

                <div className="replicarank-input-grid">
                  <input value={participantSearch} onChange={(event) => setParticipantSearch(event.target.value)} placeholder="Cerca partecipante" className="replicarank-input" />
                  <select value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value)} className="replicarank-select">
                    <option value="all">Tutti</option>
                    <option value="assegnato">Assegnati</option>
                    <option value="non_assegnato">Non assegnati</option>
                  </select>
                </div>

                <div className="replicarank-list" style={{ marginTop: "1rem" }}>
                  {filteredParticipants.length === 0 ? (
                    <div className="replicarank-empty-box">Nessun partecipante trovato.</div>
                  ) : (
                    filteredParticipants.map((participant) => (
                      <div key={participant.id} className="replicarank-row">
                        <div>
                          <h3>{participant.nome} {participant.cognome}</h3>
                          <p>{participant.fake_matricola} · {participant.total_cfu} CFU · Media {Number(participant.weighted_average).toFixed(2)} · Punteggio {Number(participant.final_score).toFixed(2)} · {participant.assigned_group ?? "Non assegnato"}</p>
                        </div>
                        <div className="replicarank-row-actions">
                          <button
                            type="button"
                            onClick={() => deleteParticipant(participant)}
                            disabled={saving}
                            className="replicarank-mini-button danger"
                          >
                            Elimina
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="replicarank-section">
              <div className="replicarank-card">
                <div className="replicarank-section-header">
                  <div>
                    <p className="eyebrow">Graduatoria</p>
                    <h2 className="display replicarank-section-title">Anteprima graduatoria</h2>
                    <p className="replicarank-muted">
                      Genera e controlla la graduatoria interna. I posti sono 750 totali: 250 Chirurgia, 250 Clinica e 250 Ricerca.
                    </p>
                  </div>
                  <button type="button" onClick={generateRanking} className="btn-dark" disabled={saving || !selectedEdition}>Genera graduatoria</button>
                </div>

                <div className="replicarank-area-grid">
                  {visibleAreaStats.map((stat) => (
                    <div key={stat.area} className="replicarank-area-card">
                      <h3>{stat.area}</h3>
                      <div className="replicarank-area-number">{stat.assigned_count} / {stat.capacity}</div>
                      <p className="replicarank-area-meta">{stat.remaining_places} posti residui</p>
                      <span className="replicarank-area-score">
                        Punteggio minimo: {stat.minimum_score === null ? "—" : Number(stat.minimum_score).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="replicarank-list">
                  {ranking.length === 0 ? (
                    <div className="replicarank-empty-box">Nessuna graduatoria generata.</div>
                  ) : (
                    ranking.map((row) => (
                      <div key={`${row.participant_id}-${row.position}`} className="replicarank-row">
                        <div>
                          <h3>#{row.position} · {row.fake_matricola}</h3>
                          <p>Punteggio {Number(row.final_score).toFixed(2)} · Media {Number(row.weighted_average).toFixed(2)} · {row.total_cfu} CFU · {row.assigned_group ?? "Non assegnato"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="replicarank-field">
      <span className="replicarank-label">{label}</span>
      {children}
    </label>
  );
}

function SwitchRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="replicarank-switch-row">
      <div>
        <p className="replicarank-switch-title">{title}</p>
        <p className="replicarank-switch-description">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="replicarank-switch-button"
        style={{
          background: checked ? "var(--ink)" : "var(--sky-deep)",
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <span
          className="replicarank-switch-dot"
          style={{ transform: checked ? "translateX(22px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}