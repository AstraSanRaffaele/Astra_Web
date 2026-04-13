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
  anno_di_laurea: number;
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
    { value: "teoria_e_storia_delle_arti_e_dell_immagine", label: "Teoria e storia delle arti e dell'immagine" },
    { value: "politics_philosophy_and_public_affairs", label: "Politics, Philosophy and Public Affairs" },
  ],
};

const graduationYearOptions = Array.from({ length: 2040 - 2020 + 1 }, (_, i) => {
  const year = 2040 - i;
  return { value: String(year), label: String(year) };
});

const PASSWORD_RESET_COOLDOWN_MS = 60 * 60 * 1000;

function formatCooldownRemaining(ms: number) {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
  if (hours > 0) return `${hours} ora${hours > 1 ? "e" : ""}`;
  return `${minutes} minuto${minutes > 1 ? "i" : ""}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

function getInitials(nome: string, cognome: string) {
  return `${nome?.[0] ?? ""}${cognome?.[0] ?? ""}`.toUpperCase() || "A";
}

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState("");
  const [passwordResetCooldownUntil, setPasswordResetCooldownUntil] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [emailIstituzionale, setEmailIstituzionale] = useState("");
  const [numeroTelefono, setNumeroTelefono] = useState("");
  const [facolta, setFacolta] = useState("");
  const [corsoDiLaurea, setCorsoDiLaurea] = useState("");
  const [annoLaurea, setAnnoLaurea] = useState("");
  const [dataDiNascita, setDataDiNascita] = useState("");

  const passwordResetStorageKey = useMemo(() => {
    if (!emailIstituzionale) return "";
    return `password-reset-cooldown:${emailIstituzionale.toLowerCase()}`;
  }, [emailIstituzionale]);

  const remainingPasswordResetMs = passwordResetCooldownUntil ? Math.max(passwordResetCooldownUntil - Date.now(), 0) : 0;
  const isPasswordResetLocked = remainingPasswordResetMs > 0;
  const courseOptions = useMemo(() => degreeOptionsMap[facolta] ?? [], [facolta]);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { router.replace("/login"); return; }

      const { data, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (profileError) { setError(profileError.message || "Impossibile caricare il profilo."); setLoading(false); return; }
      if (!data) { setError("Profilo non trovato. Contatta un amministratore."); setLoading(false); return; }

      const p = data as Profile;
      setProfile(p);
      setNome(p.nome); setCognome(p.cognome); setEmailIstituzionale(p.email_istituzionale);
      setNumeroTelefono(p.numero_telefono); setFacolta(p.facolta); setCorsoDiLaurea(p.corso_di_laurea);
      setAnnoLaurea(String(p.anno_di_laurea)); setDataDiNascita(p.data_di_nascita);

      if (typeof window !== "undefined") {
        const key = `password-reset-cooldown:${p.email_istituzionale.toLowerCase()}`;
        const stored = window.localStorage.getItem(key);
        if (stored) {
          const until = Number(stored);
          if (Number.isFinite(until) && until > Date.now()) setPasswordResetCooldownUntil(until);
          else { window.localStorage.removeItem(key); setPasswordResetCooldownUntil(null); }
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, [router, supabase]);

  useEffect(() => {
    if (!passwordResetCooldownUntil) return;
    const interval = window.setInterval(() => {
      if (passwordResetCooldownUntil <= Date.now()) {
        if (passwordResetStorageKey) window.localStorage.removeItem(passwordResetStorageKey);
        setPasswordResetCooldownUntil(null);
        setPasswordResetMessage("Ora puoi richiedere una nuova email per reimpostare la password.");
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [passwordResetCooldownUntil, passwordResetStorageKey]);

  async function handlePasswordReset() {
    if (!emailIstituzionale) { setPasswordResetMessage("Email istituzionale non disponibile."); return; }
    if (isPasswordResetLocked) { setPasswordResetMessage(`Riprova tra ${formatCooldownRemaining(remainingPasswordResetMs)}.`); return; }
    setPasswordResetLoading(true); setPasswordResetMessage("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailIstituzionale, { redirectTo: `${window.location.origin}/update-password` });
    if (resetError) { setPasswordResetMessage(resetError.message || "Non è stato possibile inviare l'email."); setPasswordResetLoading(false); return; }
    const until = Date.now() + PASSWORD_RESET_COOLDOWN_MS;
    if (passwordResetStorageKey) window.localStorage.setItem(passwordResetStorageKey, String(until));
    setPasswordResetCooldownUntil(until);
    setPasswordResetMessage("Email inviata. Puoi richiederne una nuova solo ogni ora.");
    setPasswordResetLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true); setError(""); setSuccess("");
    const n = nome.trim(), c = cognome.trim(), t = numeroTelefono.trim();
    if (!n || !c || !t || !facolta || !corsoDiLaurea || !annoLaurea || !dataDiNascita) {
      setError("Compila tutti i campi richiesti."); setSaving(false); return;
    }
    const { error: updateError } = await supabase.from("profiles").update({
      nome: n, cognome: c, numero_telefono: t, facolta, corso_di_laurea: corsoDiLaurea,
      anno_di_laurea: Number(annoLaurea), data_di_nascita: dataDiNascita,
    }).eq("id", profile.id);
    if (updateError) { setError(updateError.message || "Impossibile aggiornare il profilo."); setSaving(false); return; }
    const next: Profile = { ...profile, nome: n, cognome: c, numero_telefono: t, facolta: facolta as Facolta, corso_di_laurea: corsoDiLaurea, anno_di_laurea: Number(annoLaurea), data_di_nascita: dataDiNascita, updated_at: new Date().toISOString() };
    setProfile(next); setNome(n); setCognome(c); setNumeroTelefono(t);
    setSuccess("Profilo aggiornato con successo."); setIsEditing(false); setSaving(false);
  }

  function handleCancelEdit() {
    if (!profile) return;
    setNome(profile.nome); setCognome(profile.cognome); setEmailIstituzionale(profile.email_istituzionale);
    setNumeroTelefono(profile.numero_telefono); setFacolta(profile.facolta); setCorsoDiLaurea(profile.corso_di_laurea);
    setAnnoLaurea(String(profile.anno_di_laurea)); setDataDiNascita(profile.data_di_nascita);
    setError(""); setSuccess(""); setIsEditing(false);
  }

  const isAdmin = profile?.role === "admin";

  // ── Loading state
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8F7F3" }}>
        <Navbar />
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "10rem 1.5rem 4rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid rgba(8,16,42,.08)", borderRadius: "2rem", padding: "3rem", textAlign: "center", width: "100%", maxWidth: 400 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(8,16,42,.06)", margin: "0 auto 1.2rem", animation: "pulse 1.4s ease infinite" }} />
            <p style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>Caricamento profilo...</p>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8F7F3", fontFamily: "'DM Sans', sans-serif", color: "#08102A" }}>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8rem 1.5rem 5rem" }}>

        {/* ── HEADER BAR ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "#08102A", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem", fontWeight: 700, flexShrink: 0, letterSpacing: "-.01em",
          }}>
            {getInitials(nome, cognome)}
          </div>

          {/* Name + email */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-.02em", margin: 0, lineHeight: 1.1 }}>
                {nome} {cognome}
              </h1>
              <span style={{
                fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em",
                padding: ".3rem .85rem", borderRadius: "999px",
                background: isAdmin ? "#08102A" : "rgba(8,16,42,.08)",
                color: isAdmin ? "#fff" : "#08102A",
              }}>
                {isAdmin ? "Admin" : "Utente"}
              </span>
            </div>
            <p style={{ margin: ".3rem 0 0", color: "#6B7280", fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {emailIstituzionale}
            </p>
          </div>

          {/* Edit button — desktop */}
          {!isEditing && (
            <button
              type="button"
              onClick={() => { setError(""); setSuccess(""); setIsEditing(true); }}
              style={{
                border: "1px solid rgba(8,16,42,.15)", background: "#fff", color: "#08102A",
                padding: ".6rem 1.3rem", borderRadius: "999px", fontWeight: 600, fontSize: ".88rem",
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                transition: "background .18s, border-color .18s",
              }}
              className="btn-edit"
            >
              Modifica profilo
            </button>
          )}
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", alignItems: "start" }} className="profile-grid">

          {/* ── LEFT: FORM ── */}
          <div style={{ background: "#fff", border: "1px solid rgba(8,16,42,.08)", borderRadius: "2rem", padding: "2.5rem", boxShadow: "0 2px 20px rgba(8,16,42,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#2E4080", margin: "0 0 .4rem" }}>Dati personali</p>
                <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-.02em" }}>
                  {isEditing ? "Modifica profilo" : "Il tuo profilo"}
                </h2>
              </div>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {/* Nome + Cognome */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-row">
                <Field label="Nome" id="nome" value={nome} onChange={setNome} disabled={!isEditing} />
                <Field label="Cognome" id="cognome" value={cognome} onChange={setCognome} disabled={!isEditing} />
              </div>

              {/* Email */}
              <Field label="Email istituzionale" id="email" value={emailIstituzionale} disabled />

              {/* Password reset */}
              <div>
                <p style={{ fontSize: ".8rem", fontWeight: 700, color: "#1e293b", margin: "0 0 .6rem" }}>Password</p>
                <div style={{ background: "rgba(8,16,42,.03)", border: "1px solid rgba(8,16,42,.07)", borderRadius: "1.2rem", padding: "1.2rem 1.4rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={passwordResetLoading || isPasswordResetLocked}
                    style={{
                      background: isPasswordResetLocked ? "rgba(8,16,42,.05)" : "#08102A",
                      color: isPasswordResetLocked ? "#6B7280" : "#fff",
                      border: "none", borderRadius: "999px",
                      padding: ".6rem 1.3rem", fontWeight: 600, fontSize: ".86rem",
                      cursor: isPasswordResetLocked ? "not-allowed" : "pointer",
                      width: "fit-content", transition: "background .18s",
                    }}
                  >
                    {passwordResetLoading ? "Invio..." : isPasswordResetLocked ? `Riprova tra ${formatCooldownRemaining(remainingPasswordResetMs)}` : "Reimposta password"}
                  </button>
                  <p style={{ margin: 0, fontSize: ".82rem", color: "#6B7280", lineHeight: 1.6 }}>
                    Puoi richiedere una nuova email di reimpostazione solo una volta ogni ora.
                  </p>
                </div>
              </div>

              {/* Telefono */}
              <Field label="Numero di telefono" id="telefono" value={numeroTelefono} onChange={setNumeroTelefono} disabled={!isEditing} />

              {/* Facoltà + Anno */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="form-row">
                <SelectField label="Facoltà" id="facolta" value={facolta} onChange={(v) => { setFacolta(v); setCorsoDiLaurea(""); }} disabled={!isEditing} options={[{ value: "", label: "Seleziona facoltà" }, ...facultyOptions]} />
                <SelectField label="Anno di laurea" id="anno" value={annoLaurea} onChange={setAnnoLaurea} disabled={!isEditing} options={[{ value: "", label: "Seleziona anno" }, ...graduationYearOptions]} />
              </div>

              {/* Corso */}
              <SelectField
                label="Corso di laurea"
                id="corso"
                value={corsoDiLaurea}
                onChange={setCorsoDiLaurea}
                disabled={!isEditing || !facolta}
                options={[{ value: "", label: facolta ? "Seleziona corso" : "Seleziona prima la facoltà" }, ...courseOptions]}
              />

              {/* Data di nascita */}
              <Field label="Data di nascita" id="dataNascita" value={dataDiNascita} onChange={setDataDiNascita} disabled={!isEditing} type="date" />

              {/* Messages */}
              {error && <Msg type="error">{error}</Msg>}
              {success && <Msg type="success">{success}</Msg>}
              {passwordResetMessage && (
                <Msg type={passwordResetMessage.includes("Non è stato") || passwordResetMessage.includes("non disponibile") ? "error" : "success"}>
                  {passwordResetMessage}
                </Msg>
              )}

              {/* Actions */}
              {isEditing && (
                <div style={{ display: "flex", gap: ".75rem", marginTop: ".25rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    style={{ border: "1px solid rgba(8,16,42,.15)", background: "#fff", color: "#08102A", padding: ".7rem 1.6rem", borderRadius: "999px", fontWeight: 600, fontSize: ".9rem", cursor: "pointer" }}
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ background: "#08102A", color: "#fff", border: "none", padding: ".7rem 2rem", borderRadius: "999px", fontWeight: 700, fontSize: ".9rem", cursor: saving ? "wait" : "pointer", opacity: saving ? .7 : 1, boxShadow: "0 4px 16px rgba(8,16,42,.18)" }}
                  >
                    {saving ? "Salvataggio..." : "Salva modifiche"}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* ── RIGHT: SIDEBAR ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Account overview */}
            <div style={{ background: "#fff", border: "1px solid rgba(8,16,42,.08)", borderRadius: "2rem", padding: "2rem", boxShadow: "0 2px 20px rgba(8,16,42,.04)" }}>
              <p style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#2E4080", margin: "0 0 .4rem" }}>Panoramica</p>
              <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-.02em" }}>Account</h2>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["Ruolo", isAdmin ? "Admin" : "User"],
                  ["Facoltà", facolta || "—"],
                  ["Anno laurea", annoLaurea || "—"],
                  ["Iscritto dal", profile?.created_at ? formatDate(profile.created_at) : "—"],
                  ["Ultimo aggiornamento", profile?.updated_at ? formatDate(profile.updated_at) : "—"],
                ].map(([label, value], i, arr) => (
                  <div key={label} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem",
                    padding: ".9rem 0",
                    borderBottom: i < arr.length - 1 ? "1px solid rgba(8,16,42,.06)" : "none",
                  }}>
                    <span style={{ fontSize: ".86rem", color: "#6B7280", flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: ".86rem", fontWeight: 600, color: "#08102A", textAlign: "right", wordBreak: "break-word" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Corso di laurea card */}
            {corsoDiLaurea && (
              <div style={{ background: "#08102A", border: "none", borderRadius: "2rem", padding: "2rem", color: "#fff" }}>
                <p style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", margin: "0 0 .8rem" }}>Corso di laurea</p>
                <p style={{ fontSize: ".95rem", fontWeight: 600, color: "#fff", lineHeight: 1.5, margin: 0 }}>
                  {courseOptions.find(o => o.value === corsoDiLaurea)?.label ?? corsoDiLaurea}
                </p>
                <p style={{ fontSize: ".8rem", color: "rgba(255,255,255,.4)", margin: ".6rem 0 0", textTransform: "capitalize" }}>{facolta}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        .btn-edit:hover { background: rgba(8,16,42,.04) !important; border-color: rgba(8,16,42,.3) !important; }

        @media (max-width: 860px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }

        @media (max-width: 560px) {
          .form-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── Tiny helpers ──────────────────────────────────────────────────

function Field({ label, id, value, onChange, disabled, type = "text" }: {
  label: string; id: string; value: string;
  onChange?: (v: string) => void; disabled?: boolean; type?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
      <label htmlFor={id} style={{ fontSize: ".8rem", fontWeight: 700, color: "#1e293b" }}>{label}</label>
      <input
        id={id} type={type} value={value}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled} required={!disabled}
        style={{
          width: "100%",
          padding: ".8rem 1rem",
          borderRadius: "999px",
          border: "1px solid rgba(8,16,42,.12)",

          // ✅ usa backgroundColor invece di background
          backgroundColor: disabled ? "rgba(8,16,42,.04)" : "#fff",

          color: value ? "#08102A" : "#6B7280",
          fontSize: ".9rem",
          outline: "none",
          transition: "border-color .18s, box-shadow .18s",
          cursor: disabled ? "default" : "pointer",
          appearance: "none",

          // 👇 questo ora NON entra più in conflitto
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 1rem center",

          paddingRight: "2.5rem",
        }}
        onFocus={e => { if (!disabled) { e.target.style.borderColor = "rgba(46,64,128,.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(46,64,128,.1)"; } }}
        onBlur={e => { e.target.style.borderColor = "rgba(8,16,42,.12)"; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );
}

function SelectField({ label, id, value, onChange, disabled, options }: {
  label: string; id: string; value: string;
  onChange: (v: string) => void; disabled?: boolean;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
      <label htmlFor={id} style={{ fontSize: ".8rem", fontWeight: 700, color: "#1e293b" }}>{label}</label>
      <select
        id={id} value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled} required
        style={{
  width: "100%",
  padding: ".8rem 1rem",
  borderRadius: "999px",
  border: "1px solid rgba(8,16,42,.12)",

  // ✅ usa backgroundColor invece di background
  backgroundColor: disabled ? "rgba(8,16,42,.04)" : "#fff",

  color: value ? "#08102A" : "#6B7280",
  fontSize: ".9rem",
  outline: "none",
  transition: "border-color .18s, box-shadow .18s",
  cursor: disabled ? "default" : "pointer",
  appearance: "none",

  // 👇 questo ora NON entra più in conflitto
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 1rem center",

  paddingRight: "2.5rem",
}}
        onFocus={e => { if (!disabled) { e.target.style.borderColor = "rgba(46,64,128,.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(46,64,128,.1)"; } }}
        onBlur={e => { e.target.style.borderColor = "rgba(8,16,42,.12)"; e.target.style.boxShadow = "none"; }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Msg({ type, children }: { type: "error" | "success"; children: React.ReactNode }) {
  const isError = type === "error";
  return (
    <div style={{
      padding: ".85rem 1.1rem", borderRadius: "999px",
      background: isError ? "#fff1f2" : "#f0fdf4",
      border: `1px solid ${isError ? "#fecdd3" : "#bbf7d0"}`,
      color: isError ? "#be123c" : "#15803d",
      fontSize: ".88rem", fontWeight: 600,
    }}>
      {children}
    </div>
  );
}