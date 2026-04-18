"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function AdminRsvpPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRsvps, setLoadingRsvps] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!profile || profile.role !== "admin") { router.replace("/"); return; }

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
      setLoadingEvents(false);
    }
    load();
  }, [supabase, router]);

  async function loadRsvps(event: EventRow) {
    setSelectedEvent(event);
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

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem", alignItems: "start" }}>

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
                    <button onClick={exportCsv} style={{ border: "1px solid rgba(15,47,110,.14)", background: "white", color: "#0f2f6e", borderRadius: "999px", padding: ".6rem 1.2rem", fontWeight: 700, fontSize: ".84rem", cursor: "pointer" }}>
                      Esporta CSV
                    </button>
                  )}
                </div>

                {loadingRsvps ? (
                  <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} style={{ height: 52, borderRadius: "1rem", background: "rgba(15,47,110,.06)", animation: "sk 1.4s ease infinite" }} />
                    ))}
                  </div>
                ) : rsvps.length === 0 ? (
                  <div style={{ padding: "5rem 2rem", textAlign: "center", color: "#6b7280" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📋</div>
                    <p style={{ fontWeight: 600, color: "#0f2f6e" }}>Nessuna iscrizione ancora</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#edf3ff" }}>
                          {["Nome", "Email", "Telefono", "Facoltà", "Iscritto il", "Stato"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: ".85rem 1.2rem", fontSize: ".8rem", fontWeight: 800, color: "#123066", whiteSpace: "nowrap", borderBottom: "1px solid rgba(15,47,110,.08)" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rsvps.map(r => (
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
      <style>{`@keyframes sk{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
    </main>
  );
}