"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import { createClient } from "@/lib/supabase/client";

type Role = "user" | "admin";
type Facolta = "medicina" | "psicologia" | "filosofia";

type Profile = {
  id: string;
  nome: string;
  cognome: string;
  email_istituzionale: string;
  numero_telefono: string;
  facolta: Facolta;
  corso_di_laurea: string;
  anno_immatricolazione: number;
  data_di_nascita: string;
  role: Role;
  created_at: string;
  updated_at: string;
};

const facultyOptions = [
  { value: "medicina", label: "Medicina" },
  { value: "psicologia", label: "Psicologia" },
  { value: "filosofia", label: "Filosofia" },
];

const degreeOptionsMap: Record<string, { value: string; label: string }[]> = {
  medicina: [
    { value: "medicina_e_chirurgia", label: "Medicina e Chirurgia" },
    { value: "international_medical_doctor_program", label: "International Medical Doctor Program" },
    { value: "ricerca_biotecnologica_in_medicina", label: "Ricerca biotecnologica in medicina" },
    { value: "fisioterapia", label: "Fisioterapia" },
    { value: "igiene_dentale", label: "Igiene dentale" },
    { value: "odontoiatria_e_protesi_dentaria", label: "Odontoiatria e protesi dentaria" },
    { value: "biotechnology_for_innovative_therapeutics", label: "Biotechnology for Innovative Therapeutics" },
    { value: "scienze_riabilitative_delle_professioni_sanitarie", label: "Scienze riabilitative delle professioni sanitarie" },
    { value: "ostetricia", label: "Ostetricia" },
    { value: "health_informatics", label: "Health Informatics" },
  ],
  psicologia: [{ value: "psicologia", label: "Psicologia" }],
  filosofia: [
    { value: "filosofia_triennale", label: "Filosofia" },
    { value: "filosofia_del_mondo_contemporaneo", label: "Filosofia del mondo contemporaneo" },
    { value: "teoria_e_storia_delle_arti_e_dell_immagine", label: "Teoria e storia delle arti e dell’immagine" },
    { value: "politics_philosophy_and_public_affairs", label: "Politics, Philosophy and Public Affairs" },
  ],
};

const enrollmentYearOptions = Array.from({ length: 15 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: String(year), label: String(year) };
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profile, setProfile] = useState<Profile | null>(null);

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [emailIstituzionale, setEmailIstituzionale] = useState("");
  const [numeroTelefono, setNumeroTelefono] = useState("");
  const [facolta, setFacolta] = useState("");
  const [corsoDiLaurea, setCorsoDiLaurea] = useState("");
  const [annoImmatricolazione, setAnnoImmatricolazione] = useState("");
  const [dataDiNascita, setDataDiNascita] = useState("");

  const courseOptions = useMemo(() => {
    return degreeOptionsMap[facolta] ?? [];
  }, [facolta]);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Errore caricamento profilo:", profileError);
        setError(profileError.message || "Impossibile caricare il profilo.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Profilo non trovato. Contatta un amministratore.");
        setLoading(false);
        return;
      }

      const loadedProfile = data as Profile;

      setProfile(loadedProfile);
      setNome(loadedProfile.nome);
      setCognome(loadedProfile.cognome);
      setEmailIstituzionale(loadedProfile.email_istituzionale);
      setNumeroTelefono(loadedProfile.numero_telefono);
      setFacolta(loadedProfile.facolta);
      setCorsoDiLaurea(loadedProfile.corso_di_laurea);
      setAnnoImmatricolazione(String(loadedProfile.anno_immatricolazione));
      setDataDiNascita(loadedProfile.data_di_nascita);

      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!profile) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const normalizedNome = nome.trim();
    const normalizedCognome = cognome.trim();
    const normalizedTelefono = numeroTelefono.trim();

    if (
      !normalizedNome ||
      !normalizedCognome ||
      !normalizedTelefono ||
      !facolta ||
      !corsoDiLaurea ||
      !annoImmatricolazione ||
      !dataDiNascita
    ) {
      setError("Compila tutti i campi richiesti.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        nome: normalizedNome,
        cognome: normalizedCognome,
        numero_telefono: normalizedTelefono,
        facolta,
        corso_di_laurea: corsoDiLaurea,
        anno_immatricolazione: Number(annoImmatricolazione),
        data_di_nascita: dataDiNascita,
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Errore aggiornamento profilo:", updateError);
      setError(updateError.message || "Non è stato possibile aggiornare il profilo.");
      setSaving(false);
      return;
    }

    const nextProfile: Profile = {
      ...profile,
      nome: normalizedNome,
      cognome: normalizedCognome,
      numero_telefono: normalizedTelefono,
      facolta: facolta as Facolta,
      corso_di_laurea: corsoDiLaurea,
      anno_immatricolazione: Number(annoImmatricolazione),
      data_di_nascita: dataDiNascita,
      updated_at: new Date().toISOString(),
    };

    setProfile(nextProfile);
    setNome(nextProfile.nome);
    setCognome(nextProfile.cognome);
    setEmailIstituzionale(nextProfile.email_istituzionale);
    setNumeroTelefono(nextProfile.numero_telefono);
    setFacolta(nextProfile.facolta);
    setCorsoDiLaurea(nextProfile.corso_di_laurea);
    setAnnoImmatricolazione(String(nextProfile.anno_immatricolazione));
    setDataDiNascita(nextProfile.data_di_nascita);
    setSuccess("Profilo aggiornato con successo.");
    setIsEditing(false);
    setSaving(false);
  }

  function handleCancelEdit() {
    if (!profile) return;

    setNome(profile.nome);
    setCognome(profile.cognome);
    setEmailIstituzionale(profile.email_istituzionale);
    setNumeroTelefono(profile.numero_telefono);
    setFacolta(profile.facolta);
    setCorsoDiLaurea(profile.corso_di_laurea);
    setAnnoImmatricolazione(String(profile.anno_immatricolazione));
    setDataDiNascita(profile.data_di_nascita);
    setError("");
    setSuccess("");
    setIsEditing(false);
  }

  const isAdmin = profile?.role === "admin";

  if (loading) {
    return (
      <main className="profile-page">
        <Navbar />

        <div className="profile-shell">
          <div className="loading-card">
            <span className="section-tag">Profilo</span>
            <h1 className="profile-title">Caricamento profilo...</h1>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="profile-page">
      <Navbar />

      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="profile-shell">
        <section className="hero">
          <div className="heroText">
            <span className="section-tag">Area personale</span>
            <h1 className="profile-title">
              Il tuo profilo <em>Astra</em>
            </h1>
            <p className="profile-subtitle">
              Gestisci i tuoi dati personali e visualizza le informazioni legate al tuo account.
            </p>
          </div>

          <div className="heroCard">
            <div className="avatar">{nome?.[0]?.toUpperCase() || "A"}</div>

            <div>
              <div className="heroName">
                {nome} {cognome}
              </div>
              <div className="heroEmail">{emailIstituzionale}</div>
            </div>

            <div className={`roleBadge ${isAdmin ? "admin" : "user"}`}>
              {isAdmin ? "Amministratore" : "Utente"}
            </div>
          </div>
        </section>

        <section className="contentGrid">
          <div className="card">
            <div className="sectionHead sectionHeadRow">
              <div>
                <span className="section-tag">Dati personali</span>
                <h2 className="sectionTitle">{isEditing ? "Modifica profilo" : "Profilo"}</h2>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  className="ghostButton smallActionButton"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setIsEditing(true);
                  }}
                >
                  Modifica
                </button>
              ) : null}
            </div>

            <form onSubmit={handleSave} className="form">
              <div className="grid two">
                <div className="field">
                  <label htmlFor="nome">Nome</label>
                  <input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    disabled={!isEditing}
                  />
                </div>

                <div className="field">
                  <label htmlFor="cognome">Cognome</label>
                  <input
                    id="cognome"
                    value={cognome}
                    onChange={(e) => setCognome(e.target.value)}
                    required
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="email">Mail istituzionale</label>
                <input id="email" value={emailIstituzionale} disabled />
              </div>

              <div className="field">
                <label htmlFor="telefono">Numero di telefono</label>
                <input
                  id="telefono"
                  value={numeroTelefono}
                  onChange={(e) => setNumeroTelefono(e.target.value)}
                  required
                  disabled={!isEditing}
                />
              </div>

              <div className="grid two">
                <div className="field">
                  <label htmlFor="facolta">Facoltà</label>
                  <select
                    id="facolta"
                    value={facolta}
                    onChange={(e) => {
                      setFacolta(e.target.value);
                      setCorsoDiLaurea("");
                    }}
                    required
                    disabled={!isEditing}
                  >
                    <option value="">Seleziona una facoltà</option>
                    {facultyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="anno">Anno di immatricolazione</label>
                  <select
                    id="anno"
                    value={annoImmatricolazione}
                    onChange={(e) => setAnnoImmatricolazione(e.target.value)}
                    required
                    disabled={!isEditing}
                  >
                    <option value="">Seleziona un anno</option>
                    {enrollmentYearOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="corso">Corso di laurea</label>
                <select
                  id="corso"
                  value={corsoDiLaurea}
                  onChange={(e) => setCorsoDiLaurea(e.target.value)}
                  required
                  disabled={!isEditing || !facolta}
                >
                  <option value="">
                    {facolta ? "Seleziona un corso di laurea" : "Seleziona prima la facoltà"}
                  </option>
                  {courseOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="dataDiNascita">Data di nascita</label>
                <input
                  id="dataDiNascita"
                  type="date"
                  value={dataDiNascita}
                  onChange={(e) => setDataDiNascita(e.target.value)}
                  required
                  disabled={!isEditing}
                />
              </div>

              {error ? <div className="message error">{error}</div> : null}
              {success ? <div className="message success">{success}</div> : null}

              {isEditing ? (
                <div className="actions actionsRow">
                  <button
                    type="button"
                    className="ghostButton secondaryActionButton"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Annulla
                  </button>

                  <button type="submit" disabled={saving} className="primaryButton saveButton">
                    {saving ? "Salvataggio..." : "Salva modifiche"}
                  </button>
                </div>
              ) : null}
            </form>
          </div>

          <div className="sideColumn">
            <div className="card">
              <div className="sectionHead">
                <span className="section-tag">Panoramica</span>
                <h2 className="sectionTitle">Account</h2>
              </div>

              <div className="infoList">
                <div className="infoRow">
                  <span>Ruolo</span>
                  <strong>{isAdmin ? "Admin" : "User"}</strong>
                </div>
                <div className="infoRow">
                  <span>Facoltà</span>
                  <strong>{facolta || "-"}</strong>
                </div>
                <div className="infoRow">
                  <span>Corso</span>
                  <strong>{corsoDiLaurea || "-"}</strong>
                </div>
                <div className="infoRow">
                  <span>Data prima iscrizione</span>
                  <strong>{profile?.created_at ? formatDate(profile.created_at) : "-"}</strong>
                </div>
                <div className="infoRow">
                  <span>Ultimo aggiornamento</span>
                  <strong>{profile?.updated_at ? formatDate(profile.updated_at) : "-"}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .profile-page {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at top right, rgba(14,31,107,.10), transparent 22%),
      radial-gradient(circle at left center, rgba(14,31,107,.08), transparent 18%),
      linear-gradient(180deg, #f8faff 0%, #ffffff 38%, #f7f9ff 100%);
    color: #0f172a;
  }

  .bg-orb {
    position: absolute;
    border-radius: 999px;
    filter: blur(70px);
    pointer-events: none;
  }

  .bg-orb-1 {
    width: 320px;
    height: 320px;
    background: rgba(14,31,107,.14);
    top: -40px;
    right: -60px;
  }

  .bg-orb-2 {
    width: 260px;
    height: 260px;
    background: rgba(94,129,244,.12);
    bottom: 40px;
    left: -80px;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1.1rem 1.4rem;
    backdrop-filter: blur(16px);
    background: rgba(255,255,255,.72);
    border-bottom: 1px solid rgba(14,31,107,.08);
  }

  .brand {
    text-decoration: none;
    color: #0E1F6B;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    line-height: 0;
  }

  .topbarActions {
    display: flex;
    align-items: center;
    gap: .75rem;
    flex-wrap: wrap;
    margin-left: auto;
  }

  .profile-shell {
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
    padding: 7rem 1.25rem 3rem;
    position: relative;
    z-index: 1;
  }

  .hero {
    display: grid;
    grid-template-columns: 1.2fr .8fr;
    gap: 1.25rem;
    align-items: end;
    margin-bottom: 1.5rem;
  }

  .heroText {
    min-width: 0;
  }

  .section-tag {
    display: inline-block;
    font-size: .78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .12em;
    color: #0E1F6B;
    margin-bottom: .85rem;
  }

  .profile-title {
    margin: 0;
    font-size: clamp(2rem, 4vw, 4rem);
    line-height: .98;
    font-weight: 900;
    letter-spacing: -.03em;
    word-break: break-word;
  }

  .profile-title em {
    font-style: italic;
    font-weight: 700;
    color: #2743b4;
  }

  .profile-subtitle {
    margin-top: 1rem;
    max-width: 640px;
    color: #475569;
    font-size: 1rem;
    line-height: 1.7;
  }

  .heroCard,
  .card,
  .loading-card {
    border-radius: 28px;
    border: 1px solid rgba(14,31,107,.08);
    box-shadow: 0 10px 30px rgba(15,23,42,.06);
  }

  .heroCard {
    background: linear-gradient(135deg, #0E1F6B 0%, #1f3aa8 100%);
    color: white;
    padding: 1.4rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 230px;
    justify-content: center;
    min-width: 0;
  }

  .avatar {
    width: 72px;
    height: 72px;
    border-radius: 999px;
    background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 900;
    flex-shrink: 0;
  }

  .heroName {
    font-size: 1.35rem;
    font-weight: 800;
    line-height: 1.2;
    word-break: break-word;
  }

  .heroEmail {
    margin-top: .35rem;
    color: rgba(255,255,255,.78);
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .roleBadge {
    align-self: flex-start;
    padding: .5rem .85rem;
    border-radius: 999px;
    font-size: .78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .05em;
    max-width: 100%;
  }

  .roleBadge.user {
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.14);
    color: white;
  }

  .roleBadge.admin {
    background: white;
    color: #0E1F6B;
  }

  .contentGrid {
    display: grid;
    grid-template-columns: 1.3fr .7fr;
    gap: 1.25rem;
    align-items: start;
  }

  .sideColumn {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    min-width: 0;
  }

  .card,
  .loading-card {
    background: rgba(255,255,255,.78);
    backdrop-filter: blur(14px);
    padding: 1.4rem;
    min-width: 0;
  }

  .sectionHead {
    margin-bottom: 1rem;
  }

  .sectionHeadRow {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .sectionTitle {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.1;
    font-weight: 900;
    letter-spacing: -.02em;
    word-break: break-word;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .grid {
    display: grid;
    gap: 1rem;
  }

  .grid.two {
    grid-template-columns: 1fr 1fr;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: .45rem;
    min-width: 0;
  }

  .field label {
    font-size: .92rem;
    font-weight: 700;
    color: #1e293b;
  }

  .field input,
  .field select {
    width: 100%;
    border: 1px solid rgba(14,31,107,.12);
    background: rgba(255,255,255,.92);
    border-radius: 18px;
    padding: .95rem 1rem;
    font-size: .96rem;
    color: #0f172a;
    outline: none;
    transition: .2s ease;
    min-width: 0;
  }

  .field input:focus,
  .field select:focus {
    border-color: rgba(39,67,180,.45);
    box-shadow: 0 0 0 4px rgba(39,67,180,.08);
  }

  .field input:disabled,
  .field select:disabled {
    background: #f1f5f9;
    color: #64748b;
    cursor: not-allowed;
  }

  .message {
    border-radius: 16px;
    padding: .95rem 1rem;
    font-size: .92rem;
    font-weight: 700;
    word-break: break-word;
  }

  .message.error {
    background: #fff1f2;
    color: #be123c;
    border: 1px solid #fecdd3;
  }

  .message.success {
    background: #ecfdf3;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }

  .actions {
    display: flex;
    justify-content: flex-start;
    margin-top: .25rem;
  }

  .actionsRow {
    gap: .75rem;
    flex-wrap: wrap;
  }

  .primaryButton,
  .ghostButton {
    border-radius: 999px;
    font-weight: 800;
    text-decoration: none;
    transition: .2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .primaryButton {
    border: none;
    background: #0E1F6B;
    color: white;
    padding: .95rem 1.4rem;
    box-shadow: 0 8px 24px rgba(14,31,107,.18);
    cursor: pointer;
  }

  .primaryButton.small {
    padding: .72rem 1rem;
  }

  .primaryButton:disabled {
    opacity: .75;
    cursor: wait;
  }

  .ghostButton {
    padding: .72rem 1rem;
    color: #0E1F6B;
    background: rgba(14,31,107,.06);
    border: 1px solid rgba(14,31,107,.08);
    cursor: pointer;
  }

  .saveButton {
    min-width: 220px;
  }

  .smallActionButton {
    padding: .78rem 1rem;
    white-space: nowrap;
  }

  .secondaryActionButton {
    min-width: 130px;
  }

  .infoList {
    display: flex;
    flex-direction: column;
    gap: .2rem;
  }

  .infoRow {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: .95rem 0;
    border-bottom: 1px solid rgba(14,31,107,.08);
  }

  .infoRow:last-child {
    border-bottom: none;
  }

  .infoRow span {
    color: #64748b;
    font-size: .94rem;
    flex-shrink: 0;
  }

  .infoRow strong {
    color: #0f172a;
    text-align: right;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .adminCard {
    background: linear-gradient(180deg, rgba(232,237,251,.95) 0%, rgba(255,255,255,.9) 100%);
  }

  .adminText {
    margin: 0 0 1rem;
    color: #475569;
    line-height: 1.7;
  }

  .pillWrap {
    display: flex;
    flex-wrap: wrap;
    gap: .7rem;
  }

  .pill {
    padding: .65rem .95rem;
    border-radius: 999px;
    background: white;
    border: 1px solid rgba(14,31,107,.1);
    color: #0E1F6B;
    font-size: .88rem;
    font-weight: 800;
  }

  .loading-card {
    max-width: 560px;
    margin: 4rem auto 0;
  }

  @media (max-width: 980px) {
    .hero,
    .contentGrid,
    .grid.two {
      grid-template-columns: 1fr;
    }

    .hero {
      align-items: stretch;
    }

    .heroCard {
      min-height: unset;
    }
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 1rem;
      align-items: stretch;
    }

    .topbarActions {
      width: 100%;
      margin-left: 0;
    }

    .topbarActions .ghostButton,
    .topbarActions .primaryButton {
      flex: 1 1 0;
      min-width: 0;
    }

    .profile-shell {
      padding: 6.25rem 1rem 2rem;
    }

    .hero {
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .heroCard,
    .card,
    .loading-card {
      border-radius: 22px;
      padding: 1.1rem;
    }

    .profile-subtitle {
      font-size: .96rem;
      line-height: 1.6;
    }

    .sectionTitle {
      font-size: 1.28rem;
    }

    .avatar {
      width: 62px;
      height: 62px;
      font-size: 1.25rem;
    }

    .heroName {
      font-size: 1.15rem;
    }

    .field input,
    .field select {
      padding: .9rem .95rem;
      border-radius: 16px;
      font-size: .95rem;
    }

    .sectionHeadRow {
      flex-direction: column;
      align-items: stretch;
    }

    .actions {
      width: 100%;
    }

    .actionsRow {
      flex-direction: column;
    }

    .saveButton,
    .secondaryActionButton,
    .smallActionButton {
      width: 100%;
      min-width: 0;
    }

    .infoRow {
      flex-direction: column;
      align-items: flex-start;
      gap: .35rem;
    }

    .infoRow strong {
      text-align: left;
    }

    .pillWrap {
      gap: .55rem;
    }

    .pill {
      font-size: .82rem;
      padding: .58rem .82rem;
    }
  }

  @media (max-width: 420px) {
    .profile-shell {
      padding: 5.9rem .85rem 1.6rem;
    }

    .profile-title {
      font-size: clamp(1.75rem, 8vw, 2.3rem);
      line-height: 1.02;
    }

    .section-tag {
      font-size: .72rem;
    }

    .topbarActions {
      flex-direction: column;
    }

    .topbarActions .ghostButton,
    .topbarActions .primaryButton {
      width: 100%;
    }

    .heroCard,
    .card,
    .loading-card {
      padding: 1rem;
      border-radius: 20px;
    }
  }
`;