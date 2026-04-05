"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import { createClient } from "@/lib/supabase/client";

type Role = "user" | "admin";

type Profile = {
  id: string;
  nome: string;
  cognome: string;
  email_istituzionale: string;
  numero_telefono: string;
  facolta: string;
  corso_di_laurea: string;
  anno_immatricolazione: number;
  data_di_nascita: string;
  role: Role;
  created_at: string;
  updated_at: string;
};

type Convenzione = {
  id: number;
  titolo: string;
  partner: string;
  descrizione: string;
  vantaggio: string;
  categoria: string;
  link: string;
  ordine: number;
  attiva: boolean;
};

type ConvenzioneForm = {
  titolo: string;
  partner: string;
  descrizione: string;
  vantaggio: string;
  categoria: string;
  link: string;
  ordine: string;
  attiva: boolean;
};

const convenzioniDemo: Convenzione[] = [];

const emptyForm: ConvenzioneForm = {
  titolo: "",
  partner: "",
  descrizione: "",
  vantaggio: "",
  categoria: "",
  link: "",
  ordine: "0",
  attiva: true,
};

export default function ConvenzioniPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [convenzioni, setConvenzioni] = useState<Convenzione[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ConvenzioneForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login?next=/convenzioni");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!isMounted) return;

      setProfile((profileData as Profile) || null);

      const { data: convenzioniData, error: convenzioniError } = await supabase
        .from("convenzioni")
        .select("*")
        .order("ordine", { ascending: true })
        .order("id", { ascending: true });

      if (!isMounted) return;

      if (convenzioniError || !convenzioniData) {
        setConvenzioni(convenzioniDemo);
      } else {
        setConvenzioni(convenzioniData as Convenzione[]);
      }

      setLoading(false);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  const isAdmin = profile?.role === "admin";

  const filteredConvenzioni = convenzioni.filter((convenzione) => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return true;

    return [
      convenzione.titolo,
      convenzione.partner,
      convenzione.descrizione,
      convenzione.vantaggio,
      convenzione.categoria,
    ].some((value) => value.toLowerCase().includes(query));
  });

  async function loadConvenzioni() {
    const { data: convenzioniData, error: convenzioniError } = await supabase
      .from("convenzioni")
      .select("*")
      .order("ordine", { ascending: true })
      .order("id", { ascending: true });

    if (convenzioniError || !convenzioniData) {
      setConvenzioni(convenzioniDemo);
      return;
    }

    setConvenzioni(convenzioniData as Convenzione[]);
  }

  function resetAdminForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowAdminForm(false);
    setAdminError(null);
    setAdminMessage(null);
  }

  function handleEditConvenzione(convenzione: Convenzione) {
    setForm({
      titolo: convenzione.titolo,
      partner: convenzione.partner,
      descrizione: convenzione.descrizione,
      vantaggio: convenzione.vantaggio,
      categoria: convenzione.categoria,
      link: convenzione.link === "#" ? "" : convenzione.link,
      ordine: String(convenzione.ordine ?? 0),
      attiva: convenzione.attiva,
    });
    setEditingId(convenzione.id);
    setShowAdminForm(true);
    setAdminError(null);
    setAdminMessage(null);
  }

  async function handleSubmitConvenzione(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isAdmin) return;

    setSaving(true);
    setAdminError(null);
    setAdminMessage(null);

    const payload = {
      titolo: form.titolo.trim(),
      partner: form.partner.trim(),
      descrizione: form.descrizione.trim(),
      vantaggio: form.vantaggio.trim(),
      categoria: form.categoria.trim(),
      link: form.link.trim() || "#",
      ordine: Number(form.ordine) || 0,
      attiva: form.attiva,
    };

    if (!payload.titolo || !payload.partner || !payload.descrizione || !payload.vantaggio || !payload.categoria) {
      setAdminError("Compila tutti i campi obbligatori prima di salvare.");
      setSaving(false);
      return;
    }

    const query = editingId
      ? supabase.from("convenzioni").update(payload).eq("id", editingId)
      : supabase.from("convenzioni").insert(payload);

    const { error } = await query;

    if (error) {
      setAdminError("Non è stato possibile salvare la convenzione. Riprova.");
      setSaving(false);
      return;
    }

    await loadConvenzioni();
    setAdminMessage(editingId ? "Convenzione aggiornata correttamente." : "Convenzione creata correttamente.");
    setForm(emptyForm);
    setEditingId(null);
    setShowAdminForm(false);
    setSaving(false);
  }

  async function handleDeleteConvenzione(id: number) {
    if (!isAdmin) return;

    const confirmed = window.confirm("Vuoi davvero eliminare questa convenzione?");
    if (!confirmed) return;

    setDeletingId(id);
    setAdminError(null);
    setAdminMessage(null);

    const { error } = await supabase.from("convenzioni").delete().eq("id", id);

    if (error) {
      setAdminError("Non è stato possibile eliminare la convenzione. Riprova.");
      setDeletingId(null);
      return;
    }

    if (editingId === id) {
      setForm(emptyForm);
      setEditingId(null);
      setShowAdminForm(false);
    }

    await loadConvenzioni();
    setAdminMessage("Convenzione eliminata correttamente.");
    setDeletingId(null);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F7F8FC" }}>
        <Navbar />
        <main
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "9rem 1.25rem 4rem",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid rgba(14,31,107,.08)",
              borderRadius: "2rem",
              padding: "2rem",
              boxShadow: "0 20px 60px rgba(14,31,107,.06)",
            }}
          >
            Caricamento convenzioni...
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8FC" }}>
      <Navbar />

      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "8.5rem 1.25rem 4rem",
          fontFamily: "'Nunito', sans-serif",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        <section
          style={{
            background: "linear-gradient(135deg, #0E1F6B 0%, #1C2FA3 100%)",
            borderRadius: "2rem",
            padding: "2rem",
            color: "white",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
            boxShadow: "0 24px 60px rgba(14,31,107,.18)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <span
              style={{
                width: "fit-content",
                padding: ".45rem .8rem",
                borderRadius: "999px",
                background: "rgba(255,255,255,.12)",
                border: "1px solid rgba(255,255,255,.18)",
                fontSize: ".82rem",
                fontWeight: 700,
                letterSpacing: ".04em",
                textTransform: "uppercase",
              }}
            >
              Area riservata soci
            </span>

            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  lineHeight: 1.02,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                Convenzioni Astra
              </h1>
              <p style={{ margin: 0, color: "rgba(255,255,255,.86)", fontSize: "1rem", lineHeight: 1.7 }}>
                Qui trovi tutte le agevolazioni pensate per la community: studio, benessere, servizi e opportunità dedicate.
              </p>
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,.1)",
              border: "1px solid rgba(255,255,255,.14)",
              borderRadius: "1.5rem",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: ".85rem",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: ".9rem", color: "rgba(255,255,255,.76)" }}>
              Accesso effettuato come
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800 }}>
              {profile?.nome ? `${profile.nome} ${profile.cognome}` : "Utente registrato"}
            </div>
            <div style={{ fontSize: ".95rem", color: "rgba(255,255,255,.82)" }}>
              {isAdmin ? "Ruolo amministratore" : "Ruolo utente"}
            </div>
            {isAdmin ? (
              <div
                style={{
                  marginTop: ".4rem",
                  width: "fit-content",
                  padding: ".55rem .85rem",
                  borderRadius: "999px",
                  background: "white",
                  color: "#0E1F6B",
                  fontWeight: 800,
                  fontSize: ".84rem",
                }}
              >
                Puoi modificare questa pagina
              </div>
            ) : null}
          </div>
        </section>

        {isAdmin ? (
          <section
            style={{
              background: "white",
              border: "1px solid rgba(14,31,107,.08)",
              borderRadius: "1.75rem",
              padding: "1.4rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              boxShadow: "0 16px 40px rgba(14,31,107,.05)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.15rem", color: "#0E1F6B" }}>Controlli amministratore</h2>
              <p style={{ margin: 0, color: "#5E647A", lineHeight: 1.6 }}>
                Da qui potrai aggiungere, modificare o disattivare le convenzioni.
              </p>
            </div>

            <div style={{ display: "flex", gap: ".8rem", flexWrap: "wrap" }}>
              <a
                href="/admin"
                style={{
                  textDecoration: "none",
                  padding: ".9rem 1.1rem",
                  borderRadius: "999px",
                  background: "#0E1F6B",
                  color: "white",
                  fontWeight: 700,
                }}
              >
                Vai alla dashboard admin
              </a>
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm);
                  setEditingId(null);
                  setShowAdminForm((current) => !current || editingId !== null);
                  setAdminError(null);
                  setAdminMessage(null);
                }}
                style={{
                  padding: ".9rem 1.1rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(14,31,107,.12)",
                  background: "#F7F8FC",
                  color: "#0E1F6B",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {showAdminForm && editingId === null ? "Chiudi form" : "Aggiungi convenzione"}
              </button>
            </div>
          </section>
        ) : null}

        {isAdmin && showAdminForm ? (
          <section
            style={{
              background: "white",
              border: "1px solid rgba(14,31,107,.08)",
              borderRadius: "1.75rem",
              padding: "1.4rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              boxShadow: "0 16px 40px rgba(14,31,107,.05)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.15rem", color: "#0E1F6B" }}>
                {editingId ? "Modifica convenzione" : "Nuova convenzione"}
              </h2>
              <p style={{ margin: 0, color: "#5E647A", lineHeight: 1.6 }}>
                Inserisci o aggiorna i dati della convenzione e salva le modifiche direttamente su Supabase.
              </p>
            </div>

            <form
              onSubmit={handleSubmitConvenzione}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: ".45rem", color: "#11162A", fontWeight: 700 }}>
                Titolo
                <input
                  value={form.titolo}
                  onChange={(e) => setForm((current) => ({ ...current, titolo: e.target.value }))}
                  style={{ border: "1px solid rgba(14,31,107,.12)", borderRadius: "1rem", padding: ".9rem 1rem", fontSize: ".95rem", outline: "none" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".45rem", color: "#11162A", fontWeight: 700 }}>
                Partner
                <input
                  value={form.partner}
                  onChange={(e) => setForm((current) => ({ ...current, partner: e.target.value }))}
                  style={{ border: "1px solid rgba(14,31,107,.12)", borderRadius: "1rem", padding: ".9rem 1rem", fontSize: ".95rem", outline: "none" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".45rem", color: "#11162A", fontWeight: 700 }}>
                Categoria
                <input
                  value={form.categoria}
                  onChange={(e) => setForm((current) => ({ ...current, categoria: e.target.value }))}
                  style={{ border: "1px solid rgba(14,31,107,.12)", borderRadius: "1rem", padding: ".9rem 1rem", fontSize: ".95rem", outline: "none" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".45rem", color: "#11162A", fontWeight: 700 }}>
                Ordine
                <input
                  type="number"
                  value={form.ordine}
                  onChange={(e) => setForm((current) => ({ ...current, ordine: e.target.value }))}
                  style={{ border: "1px solid rgba(14,31,107,.12)", borderRadius: "1rem", padding: ".9rem 1rem", fontSize: ".95rem", outline: "none" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".45rem", color: "#11162A", fontWeight: 700, gridColumn: "1 / -1" }}>
                Descrizione
                <textarea
                  value={form.descrizione}
                  onChange={(e) => setForm((current) => ({ ...current, descrizione: e.target.value }))}
                  rows={4}
                  style={{
                    border: "1px solid rgba(14,31,107,.12)",
                    borderRadius: "1rem",
                    padding: ".9rem 1rem",
                    fontSize: ".95rem",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".45rem", color: "#11162A", fontWeight: 700, gridColumn: "1 / -1" }}>
                Vantaggio
                <input
                  value={form.vantaggio}
                  onChange={(e) => setForm((current) => ({ ...current, vantaggio: e.target.value }))}
                  style={{ border: "1px solid rgba(14,31,107,.12)", borderRadius: "1rem", padding: ".9rem 1rem", fontSize: ".95rem", outline: "none" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".45rem", color: "#11162A", fontWeight: 700, gridColumn: "1 / -1" }}>
                Link
                <input
                  value={form.link}
                  onChange={(e) => setForm((current) => ({ ...current, link: e.target.value }))}
                  placeholder="https://..."
                  style={{ border: "1px solid rgba(14,31,107,.12)", borderRadius: "1rem", padding: ".9rem 1rem", fontSize: ".95rem", outline: "none" }}
                />
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: ".65rem", color: "#11162A", fontWeight: 700, gridColumn: "1 / -1" }}>
                <input
                  type="checkbox"
                  checked={form.attiva}
                  onChange={(e) => setForm((current) => ({ ...current, attiva: e.target.checked }))}
                />
                Convenzione attiva
              </label>

              {adminError ? (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    borderRadius: "1rem",
                    padding: ".9rem 1rem",
                    background: "rgba(211,47,47,.08)",
                    color: "#B3261E",
                    border: "1px solid rgba(179,38,30,.12)",
                  }}
                >
                  {adminError}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: ".8rem", flexWrap: "wrap", gridColumn: "1 / -1" }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: ".9rem 1.1rem",
                    borderRadius: "999px",
                    border: "none",
                    background: "#0E1F6B",
                    color: "white",
                    fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Crea convenzione"}
                </button>

                <button
                  type="button"
                  onClick={resetAdminForm}
                  style={{
                    padding: ".9rem 1.1rem",
                    borderRadius: "999px",
                    border: "1px solid rgba(14,31,107,.12)",
                    background: "white",
                    color: "#0E1F6B",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Annulla
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: ".9rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.7rem", color: "#0E1F6B" }}>Convenzioni disponibili</h2>

            <p style={{ margin: 0, color: "#5E647A", lineHeight: 1.7 }}>
              Le convenzioni attive vengono mostrate qui sotto:
            </p>

            {isAdmin && adminMessage ? (
              <div
                style={{
                  background: "rgba(15,118,110,.08)",
                  border: "1px solid rgba(15,118,110,.16)",
                  borderRadius: "1rem",
                  padding: ".95rem 1rem",
                  color: "#0F766E",
                  fontWeight: 700,
                }}
              >
                {adminMessage}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: ".75rem",
              }}
            >
              <div
                style={{
                  flex: "1 1 360px",
                  minWidth: "260px",
                  maxWidth: "460px",
                  background: "white",
                  border: "1px solid rgba(14,31,107,.08)",
                  borderRadius: "1.15rem",
                  padding: ".35rem",
                  boxShadow: "0 12px 30px rgba(14,31,107,.05)",
                }}
              >
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cerca titolo, partner, categoria o vantaggio"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    padding: ".9rem 1rem",
                    fontSize: ".95rem",
                    color: "#11162A",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {searchTerm.trim() ? (
                <span
                  style={{
                    width: "fit-content",
                    padding: ".55rem .8rem",
                    borderRadius: "999px",
                    background: "rgba(14,31,107,.07)",
                    border: "1px solid rgba(14,31,107,.10)",
                    color: "#0E1F6B",
                    fontSize: ".82rem",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {filteredConvenzioni.length} {filteredConvenzioni.length === 1 ? "risultato trovato" : "risultati trovati"}
                </span>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.2rem",
            }}
          >
            {filteredConvenzioni.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  background: "white",
                  border: "1px solid rgba(14,31,107,.08)",
                  borderRadius: "1.6rem",
                  padding: "1.5rem",
                  color: "#5E647A",
                  boxShadow: "0 16px 40px rgba(14,31,107,.05)",
                }}
              >
                {convenzioni.length === 0
                  ? "Al momento non ci sono convenzioni da mostrare."
                  : "Nessuna convenzione corrisponde alla tua ricerca."}
              </div>
            ) : null}

            {filteredConvenzioni.map((convenzione) => (
              <article
                key={convenzione.id}
                style={{
                  background: "white",
                  border: "1px solid rgba(14,31,107,.08)",
                  borderRadius: "1.6rem",
                  padding: "1.35rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  boxShadow: "0 16px 40px rgba(14,31,107,.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: ".75rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: ".45rem" }}>
                    <span
                      style={{
                        width: "fit-content",
                        padding: ".38rem .72rem",
                        borderRadius: "999px",
                        background: "rgba(14,31,107,.06)",
                        color: "#0E1F6B",
                        fontSize: ".76rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                      }}
                    >
                      {convenzione.categoria}
                    </span>
                    <h3 style={{ margin: 0, fontSize: "1.18rem", color: "#11162A" }}>{convenzione.titolo}</h3>
                    <p style={{ margin: 0, color: "#0E1F6B", fontWeight: 700 }}>{convenzione.partner}</p>
                  </div>

                  <div
                    style={{
                      minWidth: "58px",
                      height: "58px",
                      borderRadius: "1rem",
                      background: "linear-gradient(135deg, rgba(14,31,107,.1), rgba(28,47,163,.18))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0E1F6B",
                      fontWeight: 900,
                      fontSize: "1.1rem",
                    }}
                  >
                    {convenzione.partner.slice(0, 2).toUpperCase()}
                  </div>
                </div>

                <p style={{ margin: 0, color: "#5E647A", lineHeight: 1.7 }}>{convenzione.descrizione}</p>

                <div
                  style={{
                    background: "#F7F8FC",
                    border: "1px solid rgba(14,31,107,.06)",
                    borderRadius: "1rem",
                    padding: ".9rem 1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: ".25rem",
                  }}
                >
                  <span style={{ fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".04em", color: "#7A8094", fontWeight: 800 }}>
                    Vantaggio
                  </span>
                  <span style={{ fontWeight: 800, color: "#0E1F6B" }}>{convenzione.vantaggio}</span>
                </div>

                <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginTop: "auto" }}>
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEditConvenzione(convenzione)}
                        style={{
                          padding: ".82rem 1rem",
                          borderRadius: "999px",
                          border: "1px solid rgba(14,31,107,.12)",
                          background: "white",
                          color: "#0E1F6B",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Modifica
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteConvenzione(convenzione.id)}
                        disabled={deletingId === convenzione.id}
                        style={{
                          padding: ".82rem 1rem",
                          borderRadius: "999px",
                          border: "1px solid rgba(179,38,30,.16)",
                          background: "white",
                          color: "#B3261E",
                          fontWeight: 700,
                          cursor: deletingId === convenzione.id ? "not-allowed" : "pointer",
                          opacity: deletingId === convenzione.id ? 0.7 : 1,
                        }}
                      >
                        {deletingId === convenzione.id ? "Eliminazione..." : "Elimina"}
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}