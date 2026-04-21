"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  data?: string;
  ora?: string;
  location?: string;
  max_posti?: number | null;
  rsvp_count?: number;
};

// Supabase restituisce profiles come array quando è una foreign key join
type RsvpRaw = {
  id: number;
  stato: string;
  created_at: string;
  profiles: {
    nome: string;
    cognome: string;
    email_istituzionale: string;
    numero_telefono: string;
    facolta: string;
  }[] | {
    nome: string;
    cognome: string;
    email_istituzionale: string;
    numero_telefono: string;
    facolta: string;
  } | null;
};

// Tipo normalizzato dopo aver risolto profiles
type RsvpRow = {
  id: number;
  stato: string;
  created_at: string;
  profile: {
    nome: string;
    cognome: string;
    email_istituzionale: string;
    numero_telefono: string;
    facolta: string;
  };
};

type SearchProfileRow = {
  id: string;
  nome: string;
  cognome: string;
  email_istituzionale: string;
  numero_telefono: string;
  facolta: string;
};

type EventParticipant = SearchProfileRow & {
  rsvpId?: number;
  stato?: string;
  created_at?: string;
};

function normalizeRsvp(raw: RsvpRaw): RsvpRow | null {
  const p = Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles;
  if (!p) return null;
  return { id: raw.id, stato: raw.stato, created_at: raw.created_at, profile: p };
}

function getEventDate(e: EventRow): Date {
  if (e.data) return new Date(`${e.data}T${e.ora ?? "00:00:00"}`);
  return new Date(e.event_date);
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(v: string) {
  return new Date(v).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function matchesSearch(profile: SearchProfileRow, search: string) {
  const q = normalizeSearchValue(search);
  if (!q) return true;

  return [
    profile.nome,
    profile.cognome,
    `${profile.nome} ${profile.cognome}`,
    `${profile.cognome} ${profile.nome}`,
    profile.email_istituzionale,
  ].some((field) => field?.toLowerCase().includes(q));
}

export default function AdminRsvpPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [availableProfiles, setAvailableProfiles] = useState<SearchProfileRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRsvps, setLoadingRsvps] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [savingProfileId, setSavingProfileId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/login"); return; }
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (!profile || profile.role !== "admin") { router.replace("/"); return; }

        setLoadingProfiles(true);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, nome, cognome, email_istituzionale, numero_telefono, facolta")
          .order("cognome", { ascending: true })
          .order("nome", { ascending: true });

        setAvailableProfiles((profilesData ?? []) as SearchProfileRow[]);

        const { data: evs } = await supabase
          .from("events")
          .select("id, title, event_date, data, ora, location, max_posti")
          .order("event_date", { ascending: false });

        if (!evs) { setLoadingEvents(false); return; }

        const counts = await Promise.all(
          evs.map(async e => {
            const { count } = await supabase
              .from("rsvp")
              .select("id", { count: "exact", head: true })
              .eq("event_id", e.id)
              .eq("stato", "confermato");
            return { id: e.id, count: count ?? 0 };
          })
        );

        setEvents(evs.map(e => ({
          ...e,
          rsvp_count: counts.find(c => c.id === e.id)?.count ?? 0,
        })));
      } finally {
        setLoadingEvents(false);
        setLoadingProfiles(false);
      }
    }
    load();
  }, [supabase, router]);

  async function refreshEventCount(eventId: string) {
    const { count } = await supabase
      .from("rsvp")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("stato", "confermato");

    setEvents((current) => current.map((event) => (
      event.id === eventId ? { ...event, rsvp_count: count ?? 0 } : event
    )));

    setSelectedEvent((current) => (
      current && current.id === eventId ? { ...current, rsvp_count: count ?? 0 } : current
    ));
  }

  async function loadRsvps(event: EventRow) {
    setSelectedEvent(event);
    setMessage(null);
    setLoadingRsvps(true);

    const { data } = await supabase
      .from("rsvp")
      .select("id, stato, created_at, profiles(nome, cognome, email_istituzionale, numero_telefono, facolta)")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });

    const normalized = ((data ?? []) as unknown as RsvpRaw[])
      .map(normalizeRsvp)
      .filter((r): r is RsvpRow => r !== null);

    setRsvps(normalized);
    setLoadingRsvps(false);
    await refreshEventCount(event.id);
  }

  async function addParticipant(profile: SearchProfileRow) {
    if (!selectedEvent) return;
    setMessage(null);
    setSavingProfileId(profile.id);

    const alreadyPresent = rsvps.some(
      (r) =>
        r.profile.email_istituzionale.toLowerCase() === profile.email_istituzionale.toLowerCase()
    );

    if (alreadyPresent) {
      setMessage({ type: "error", text: "Questo utente è già presente nella lista." });
      setSavingProfileId(null);
      return;
    }

    const { error } = await supabase.from("rsvp").insert({
      event_id: selectedEvent.id,
      user_id: profile.id,
      stato: "confermato",
    });

    if (error) {
      setMessage({ type: "error", text: "Non sono riuscito ad aggiungere l'utente." });
      setSavingProfileId(null);
      return;
    }

    setMessage({ type: "success", text: "Utente aggiunto correttamente." });
    setSearchValue("");
    setSavingProfileId(null);
    await loadRsvps(selectedEvent);
  }

  async function removeParticipant(row: RsvpRow) {
  if (!selectedEvent) return;
  setMessage(null);
  setSavingProfileId(String(row.id));

  const { error } = await supabase
    .from("rsvp")
    .delete()
    .eq("id", row.id)
    .eq("event_id", selectedEvent.id);

  if (error) {
    setMessage({
      type: "error",
      text: error.message || "Non sono riuscito a rimuovere l'utente.",
    });
    setSavingProfileId(null);
    return;
  }

  setMessage({ type: "success", text: "Utente rimosso correttamente." });
  setSavingProfileId(null);
  await loadRsvps(selectedEvent);
}

  function exportCsv() {
    if (!selectedEvent || !rsvps.length) return;
    const confirmed = rsvps.filter(r => r.stato === "confermato");
    const cols = ["Nome", "Cognome", "Email", "Telefono", "Facoltà", "Iscritto il"];
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = confirmed.map(r => [
      esc(r.profile.nome), esc(r.profile.cognome),
      esc(r.profile.email_istituzionale), esc(r.profile.numero_telefono),
      esc(r.profile.facolta), esc(fmtDateTime(r.created_at)),
    ].join(";"));
    const csv = [cols.map(esc).join(";"), ...rows].join("\r\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })),
      download: `rsvp-${selectedEvent.title.replace(/\s+/g, "-").toLowerCase()}.csv`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  const confirmed = rsvps.filter(r => r.stato === "confermato");
  const cancelled = rsvps.filter(r => r.stato === "cancellato");

  const filteredProfiles = useMemo(() => {
    if (!selectedEvent) return [] as SearchProfileRow[];

    const alreadyAddedEmails = new Set(
      rsvps.map((r) => r.profile.email_istituzionale.toLowerCase())
    );

    return availableProfiles
      .filter((profile) => profile.email_istituzionale)
      .filter((profile) => !alreadyAddedEmails.has(profile.email_istituzionale.toLowerCase()))
      .filter((profile) => matchesSearch(profile, searchValue))
      .slice(0, 8);
  }, [availableProfiles, rsvps, searchValue, selectedEvent]);

  const actionButtonStyle: CSSProperties = {
    border: "1px solid rgba(15,47,110,.14)",
    background: "white",
    color: "#0f2f6e",
    borderRadius: "999px",
    padding: ".55rem 1rem",
    fontWeight: 700,
    fontSize: ".8rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const dangerButtonStyle: CSSProperties = {
    ...actionButtonStyle,
    border: "1px solid rgba(220,38,38,.16)",
    color: "#b91c1c",
  };

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f7f9fc 0%,#eef3fb 100%)", padding: "8.5rem 1.5rem 4rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Hero */}
        <section style={{ background: "linear-gradient(135deg,#0f2f6e 0%,#1847a3 100%)", borderRadius: "2rem", padding: "clamp(1.5rem,3vw,2.5rem)", color: "white", boxShadow: "0 24px 60px rgba(15,47,110,.18)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
            <span style={{ alignSelf: "flex-start", padding: ".4rem .9rem", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: ".85rem", fontWeight: 700 }}>
              Amministrazione • RSVP
            </span>
            <h1 style={{ margin: 0, fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 800, lineHeight: 1.05 }}>Iscrizioni eventi.</h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>
              Seleziona un evento per vedere chi si è iscritto.
            </p>
          </div>
          <a href="/admin" style={{ textDecoration: "none", color: "white", padding: ".85rem 1.3rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.1)", fontWeight: 700, whiteSpace: "nowrap" }}>
            Pannello admin
          </a>
        </section>

        <div className="rsvp-layout" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* Event list */}
          <div style={{ background: "rgba(255,255,255,.85)", border: "1px solid rgba(15,47,110,.08)", borderRadius: "1.8rem", overflow: "hidden", boxShadow: "0 8px 32px rgba(15,47,110,.07)" }}>
            <div style={{ padding: "1.2rem 1.4rem", borderBottom: "1px solid rgba(15,47,110,.07)" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f2f6e" }}>Eventi</h2>
            </div>
            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {loadingEvents ? (
                <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ height: 64, borderRadius: "1rem", background: "rgba(15,47,110,.06)", animation: "sk 1.4s ease infinite" }} />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <p style={{ padding: "2rem", color: "#6b7280", textAlign: "center" }}>Nessun evento trovato.</p>
              ) : events.map(e => {
                const isSelected = selectedEvent?.id === e.id;
                const date = getEventDate(e);
                const full = e.max_posti != null && (e.rsvp_count ?? 0) >= e.max_posti;
                return (
                  <button
                    key={e.id}
                    onClick={() => loadRsvps(e)}
                    style={{
                      width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                      padding: "1rem 1.4rem",
                      background: isSelected ? "rgba(15,47,110,.07)" : "transparent",
                      borderLeft: isSelected ? "3px solid #1847a3" : "3px solid transparent",
                      transition: "background .15s",
                      display: "flex", flexDirection: "column", gap: ".3rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: ".5rem" }}>
                      <span style={{ fontSize: ".92rem", fontWeight: 700, color: "#0f2f6e", lineHeight: 1.3 }}>{e.title}</span>
                      <span style={{
                        fontSize: ".65rem", fontWeight: 700, letterSpacing: ".06em", whiteSpace: "nowrap",
                        background: full ? "rgba(248,113,113,.1)" : "rgba(52,211,153,.1)",
                        color: full ? "#dc2626" : "#059669",
                        padding: ".2rem .55rem", borderRadius: "999px",
                      }}>
                        {e.rsvp_count ?? 0}{e.max_posti != null ? `/${e.max_posti}` : ""} {full ? "• esauriti" : "iscritti"}
                      </span>
                    </div>
                    <span style={{ fontSize: ".8rem", color: "#6b7280" }}>{fmtDate(date)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RSVP detail */}
          <div style={{ background: "rgba(255,255,255,.85)", border: "1px solid rgba(15,47,110,.08)", borderRadius: "1.8rem", overflow: "hidden", boxShadow: "0 8px 32px rgba(15,47,110,.07)" }}>
            {!selectedEvent ? (
              <div style={{ padding: "5rem 2rem", textAlign: "center", color: "#6b7280" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>👈</div>
                <p style={{ fontWeight: 600, color: "#0f2f6e", marginBottom: ".5rem" }}>Seleziona un evento</p>
                <p style={{ fontSize: ".9rem" }}>Clicca su un evento a sinistra per vedere gli iscritti.</p>
              </div>
            ) : (
              <>
                <div style={{ padding: "1.4rem 1.8rem", borderBottom: "1px solid rgba(15,47,110,.07)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h2 style={{ margin: "0 0 .25rem", fontSize: "1.15rem", fontWeight: 800, color: "#0f2f6e" }}>{selectedEvent.title}</h2>
                    <p style={{ margin: 0, fontSize: ".84rem", color: "#6b7280" }}>
                      {confirmed.length} confermati
                      {selectedEvent.max_posti != null ? ` / ${selectedEvent.max_posti} posti` : ""}
                      {cancelled.length > 0 ? ` • ${cancelled.length} cancellati` : ""}
                    </p>
                  </div>
                  {confirmed.length > 0 && (
                    <button onClick={exportCsv} style={actionButtonStyle}>
                      Esporta CSV
                    </button>
                  )}
                </div>

                <div style={{ padding: "1.2rem 1.8rem", borderBottom: "1px solid rgba(15,47,110,.07)", display: "flex", flexDirection: "column", gap: ".9rem", background: "rgba(237,243,255,.45)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                    <h3 style={{ margin: 0, fontSize: ".98rem", fontWeight: 800, color: "#0f2f6e" }}>Aggiungi utente manualmente</h3>
                    <p style={{ margin: 0, fontSize: ".84rem", color: "#6b7280" }}>
                      Cerca per email, nome o cognome e aggiungi l'utente alla lista dei confermati.
                    </p>
                  </div>

                  <input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Cerca per email, nome o cognome"
                    style={{
                      width: "100%",
                      borderRadius: "1rem",
                      border: "1px solid rgba(15,47,110,.12)",
                      padding: ".85rem 1rem",
                      fontSize: ".95rem",
                      outline: "none",
                      background: "white",
                      color: "#0f2f6e",
                    }}
                  />

                  {message && (
                    <div
                      style={{
                        borderRadius: "1rem",
                        padding: ".8rem 1rem",
                        fontSize: ".84rem",
                        fontWeight: 600,
                        background: message.type === "success" ? "rgba(52,211,153,.12)" : "rgba(248,113,113,.12)",
                        color: message.type === "success" ? "#047857" : "#b91c1c",
                        border: message.type === "success" ? "1px solid rgba(16,185,129,.18)" : "1px solid rgba(220,38,38,.16)",
                      }}
                    >
                      {message.text}
                    </div>
                  )}

                  {loadingProfiles ? (
                    <p style={{ margin: 0, fontSize: ".84rem", color: "#6b7280" }}>Caricamento utenti...</p>
                  ) : searchValue.trim() === "" ? (
                    <p style={{ margin: 0, fontSize: ".84rem", color: "#6b7280" }}>Inizia a scrivere per cercare un utente da aggiungere.</p>
                  ) : filteredProfiles.length === 0 ? (
                    <p style={{ margin: 0, fontSize: ".84rem", color: "#6b7280" }}>Nessun utente disponibile trovato.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
                      {filteredProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "1rem",
                            padding: ".9rem 1rem",
                            borderRadius: "1rem",
                            background: "white",
                            border: "1px solid rgba(15,47,110,.08)",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: ".2rem", minWidth: 0 }}>
                            <span style={{ fontWeight: 700, color: "#0f2f6e" }}>
                              {profile.nome} {profile.cognome}
                            </span>
                            <span style={{ fontSize: ".84rem", color: "#4b5563", overflowWrap: "anywhere" }}>{profile.email_istituzionale}</span>
                            <span style={{ fontSize: ".78rem", color: "#6b7280", textTransform: "capitalize" }}>{profile.facolta}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => addParticipant(profile)}
                            disabled={savingProfileId === profile.id}
                            style={{
                              ...actionButtonStyle,
                              opacity: savingProfileId === profile.id ? 0.65 : 1,
                              cursor: savingProfileId === profile.id ? "wait" : "pointer",
                            }}
                          >
                            {savingProfileId === profile.id ? "Aggiunta..." : "Aggiungi"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {loadingRsvps ? (
                  <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} style={{ height: 52, borderRadius: "1rem", background: "rgba(15,47,110,.06)", animation: "sk 1.4s ease infinite" }} />
                    ))}
                  </div>
                ) : confirmed.length === 0 ? (
                  <div style={{ padding: "5rem 2rem", textAlign: "center", color: "#6b7280" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📋</div>
                    <p style={{ fontWeight: 600, color: "#0f2f6e" }}>Nessuna iscrizione ancora</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#edf3ff" }}>
                          {["Nome", "Email", "Telefono", "Facoltà", "Iscritto il", "Stato", "Azioni"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: ".85rem 1.2rem", fontSize: ".8rem", fontWeight: 800, color: "#123066", whiteSpace: "nowrap", borderBottom: "1px solid rgba(15,47,110,.08)" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {confirmed.map(r => (
                          <tr key={r.id} style={{ borderBottom: "1px solid rgba(15,47,110,.06)", background: r.stato === "cancellato" ? "rgba(248,113,113,.03)" : "white" }}>
                            <td style={{ padding: ".85rem 1.2rem", fontWeight: 600, color: "#0f2f6e", whiteSpace: "nowrap" }}>
                              {r.profile.nome} {r.profile.cognome}
                            </td>
                            <td style={{ padding: ".85rem 1.2rem", fontSize: ".88rem", color: "#374151" }}>{r.profile.email_istituzionale}</td>
                            <td style={{ padding: ".85rem 1.2rem", fontSize: ".88rem", color: "#374151", whiteSpace: "nowrap" }}>{r.profile.numero_telefono}</td>
                            <td style={{ padding: ".85rem 1.2rem", fontSize: ".88rem", color: "#374151", textTransform: "capitalize" }}>{r.profile.facolta}</td>
                            <td style={{ padding: ".85rem 1.2rem", fontSize: ".82rem", color: "#6b7280", whiteSpace: "nowrap" }}>{fmtDateTime(r.created_at)}</td>
                            <td style={{ padding: ".85rem 1.2rem" }}>
                              <span style={{
                                fontSize: ".7rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
                                background: r.stato === "confermato" ? "rgba(52,211,153,.12)" : "rgba(248,113,113,.12)",
                                color: r.stato === "confermato" ? "#059669" : "#dc2626",
                                padding: ".25rem .7rem", borderRadius: "999px",
                              }}>
                                {r.stato}
                              </span>
                            </td>
                            <td style={{ padding: ".85rem 1.2rem" }}>
                              <button
                                type="button"
                                onClick={() => removeParticipant(r)}
                                disabled={savingProfileId === String(r.id)}
                                style={{
                                  ...dangerButtonStyle,
                                  opacity: savingProfileId === String(r.id) ? 0.65 : 1,
                                  cursor: savingProfileId === String(r.id) ? "wait" : "pointer",
                                }}
                              >
                                {savingProfileId === String(r.id) ? "Rimozione..." : "Rimuovi"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes sk{0%,100%{opacity:.4}50%{opacity:.9}}
        @media (max-width: 980px) {
          .rsvp-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}