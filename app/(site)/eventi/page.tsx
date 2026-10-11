"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type EventRecord = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  locandina: string | null;
  location: string | null;
  event_date: string;
  data: string | null;
  ora: string | null;
  partnership: string | null;
  iscrizioni_aperte: boolean | null;
  iscrizioni_esterne: boolean | null;
};

// ── Helpers ───────────────────────────────────────────────────────
function getEventDate(e: EventRecord): Date {
  // Prefer dedicated data + ora fields, fallback to event_date
  if (e.data) {
    const dateStr = e.data;
    const timeStr = e.ora ?? "00:00:00";
    return new Date(`${dateStr}T${timeStr}`);
  }
  return new Date(e.event_date);
}

function fmtDay(d: Date) { return d.toLocaleDateString("it-IT", { day: "2-digit" }); }
function fmtMonth(d: Date) { return d.toLocaleDateString("it-IT", { month: "short" }).toUpperCase(); }
function fmtWeekday(d: Date) { return d.toLocaleDateString("it-IT", { weekday: "long" }); }
function fmtTime(d: Date) { return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }); }
function fmtFull(d: Date) { return d.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }); }
function isPast(d: Date) { return d < new Date(); }

// ── Skeleton ──────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: "1.75rem", border: "1px solid rgba(8,16,42,.07)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 160, background: "rgba(8,16,42,.06)", animation: "sk 1.4s ease infinite" }} />
      <div style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ width: "70%", height: 16, borderRadius: "999px", background: "rgba(8,16,42,.06)", animation: "sk 1.4s ease infinite" }} />
        <div style={{ width: "45%", height: 12, borderRadius: "999px", background: "rgba(8,16,42,.05)", animation: "sk 1.4s ease infinite" }} />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "1.4rem 1.8rem", background: "#fff", borderRadius: "1.5rem", border: "1px solid rgba(8,16,42,.07)" }}>
      <div style={{ width: 52, height: 60, borderRadius: "1rem", background: "rgba(8,16,42,.06)", flexShrink: 0, animation: "sk 1.4s ease infinite" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ width: "55%", height: 18, borderRadius: "999px", background: "rgba(8,16,42,.06)", animation: "sk 1.4s ease infinite" }} />
        <div style={{ width: "35%", height: 12, borderRadius: "999px", background: "rgba(8,16,42,.05)", animation: "sk 1.4s ease infinite" }} />
      </div>
      <div style={{ width: 60, height: 60, borderRadius: "1rem", background: "rgba(8,16,42,.05)", flexShrink: 0, animation: "sk 1.4s ease infinite" }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function EventiPage() {
  const supabase = useMemo(() => createClient(), []);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<"prossimi" | "tutti" | "passati">("prossimi");
  const [view, setView] = useState<"list" | "grid">("grid");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from("events")
        .select("*");

      if (!active) return;
      setEvents((data || []).sort((a, b) => getEventDate(a).getTime() - getEventDate(b).getTime()));
      setLoadError(Boolean(error));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [supabase]);

  const upcoming = useMemo(() => events.filter(e => !isPast(getEventDate(e))), [events]);
  const next = upcoming[0];

  const filtered = useMemo(() => {
    if (filter === "prossimi") return events.filter(e => !isPast(getEventDate(e)));
    if (filter === "passati") return events.filter(e => isPast(getEventDate(e))).reverse();
    return events;
  }, [events, filter]);

  // ── Cover image: prefer locandina, fallback cover_image
  const getCover = (e: EventRecord) => e.locandina || e.cover_image || null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F8F7F3; color: #08102A; overflow-x: hidden; }

        @keyframes sk { 0%,100%{opacity:.45} 50%{opacity:.9} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }

        .ev-eyebrow { animation: fadeUp .5s .1s cubic-bezier(.4,0,.2,1) both; }
        .ev-h1      { animation: fadeUp .6s .25s cubic-bezier(.4,0,.2,1) both; }
        .ev-sub     { animation: fadeUp .6s .4s cubic-bezier(.4,0,.2,1) both; }

        /* ── LIST ROW ── */
        .ev-row {
          display: flex; align-items: center; gap: 1.4rem;
          padding: 1.2rem 1.6rem; background: #fff;
          border-radius: 1.5rem; border: 1px solid rgba(8,16,42,.07);
          text-decoration: none; color: inherit;
          transition: transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s, border-color .25s;
          box-shadow: 0 2px 12px rgba(8,16,42,.04);
        }
        .ev-row:hover { transform: translateY(-3px); box-shadow: 0 14px 36px rgba(8,16,42,.1); border-color: rgba(8,16,42,.14); }
        .ev-row.past { background: #fdfdfc; }

        .ev-arrow {
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(8,16,42,.05); display: flex;
          align-items: center; justify-content: center;
          flex-shrink: 0; margin-left: auto;
          transition: background .2s, transform .2s;
        }
        .ev-row:hover .ev-arrow { background: #08102A; transform: translateX(2px); }
        .ev-row:hover .ev-arrow svg path { stroke: #fff; }

        /* ── GRID CARD ── */
        .ev-card {
          background: #fff; border-radius: 1.75rem;
          border: 1px solid rgba(8,16,42,.07);
          text-decoration: none; color: inherit;
          display: flex; flex-direction: column;
          overflow: hidden;
          transition: transform .28s cubic-bezier(.4,0,.2,1), box-shadow .28s, border-color .28s;
          box-shadow: 0 2px 12px rgba(8,16,42,.04);
        }
        .ev-card:hover { transform: translateY(-5px); box-shadow: 0 20px 48px rgba(8,16,42,.11); border-color: rgba(8,16,42,.14); }
        .ev-card.past { background: #fdfdfc; }

        /* ── FILTER + VIEW ── */
        .filter-pill {
          border: 1px solid rgba(8,16,42,.12); background: #fff;
          border-radius: 999px; padding: .42rem 1rem;
          font-size: .82rem; font-weight: 600; color: #6B7280;
          cursor: pointer; transition: background .18s, color .18s, border-color .18s;
        }
        .filter-pill:hover { background: rgba(8,16,42,.05); color: #08102A; }
        .filter-pill.active { background: #08102A; color: #fff; border-color: #08102A; }

        .view-btn {
          border: 1px solid rgba(8,16,42,.12); background: #fff;
          border-radius: 10px; padding: .42rem .65rem;
          cursor: pointer; transition: background .18s, border-color .18s;
          display: flex; align-items: center; color: #6B7280;
        }
        .view-btn.active { background: #08102A; border-color: #08102A; color: #fff; }

        /* ── NEXT CARD ── */
        .next-card {
          background: #08102A; border-radius: 2rem; padding: 0;
          color: #fff; display: flex; align-items: stretch;
          overflow: hidden; text-decoration: none;
          transition: transform .25s, box-shadow .25s;
          box-shadow: 0 4px 28px rgba(8,16,42,.16);
          min-height: 180px;
        }
        .next-card:hover { transform: translateY(-3px); box-shadow: 0 14px 44px rgba(8,16,42,.24); }

        .next-card-inner {
          flex: 1;
          min-width: 0;
          width: 100%;
          padding: 2rem 2.5rem;
          display: flex;
          align-items: center;
          gap: 2rem;
          position: relative;
        }
        .next-date-block {
          text-align: center;
          flex-shrink: 0;
        }
        .next-main {
          flex: 1;
          min-width: 0;
          position: relative;
          z-index: 1;
        }
        .next-arrow-wrap {
          flex-shrink: 0;
          z-index: 1;
        }

        .ev-section-heading { display:flex; align-items:end; justify-content:space-between; gap:1rem; margin:1.4rem 0 1.4rem; border-top:1px solid rgba(8,16,42,.13); padding-top:1.4rem; }
        .ev-section-heading h2 { font-family:'Cormorant Garamond',serif; font-size:clamp(2rem,4vw,3rem); font-weight:700; line-height:1; letter-spacing:-.035em; }
        .ev-section-heading h2 span { color:#2E4080; }
        .ev-section-heading > span { color:#6B7280; font-size:.85rem; padding-bottom:.25rem; }
        .ev-toolbar { padding:1rem; background:#fff; border:1px solid rgba(8,16,42,.08); border-radius:1.2rem; }
        .filter-count { margin-left:.55rem; opacity:.58; font-size:.75rem; }
        .filter-pill { min-height:38px; }
        .view-btn { width:38px; height:38px; justify-content:center; }
        .next-visual { width:32%; min-width:230px; position:relative; overflow:hidden; background:#24366b; }
        .next-visual img { width:100%; height:100%; object-fit:cover; display:block; }
        .next-visual::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,#08102A 0%,transparent 45%); pointer-events:none; }
        .ev-card .ev-cover { height:210px !important; }
        .ev-card:hover img, .ev-row:hover img { transform:scale(1.04); }
        .ev-card img, .ev-row img { transition:transform .35s ease; }
        .ev-card:focus-visible, .ev-row:focus-visible, .next-card:focus-visible, .filter-pill:focus-visible, .view-btn:focus-visible { outline:3px solid #6278bf; outline-offset:3px; }
        .ev-error { background:#fff; border:1px solid rgba(8,16,42,.1); border-radius:1.5rem; padding:3rem 1.5rem; text-align:center; grid-column:1/-1; }
        .ev-error h3 { font-size:1.1rem; margin-bottom:.5rem; }
        .ev-error p { color:#6B7280; font-size:.9rem; }
        .ev-error button { margin-top:1.3rem; border:0; background:#08102A; color:#fff; border-radius:999px; padding:.7rem 1.3rem; font-weight:700; cursor:pointer; }

        @media (max-width: 760px) {
          .ev-section { padding-left: 1.25rem !important; padding-right: 1.25rem !important; }
          .ev-hero    { padding: 8rem 1.25rem 2.5rem !important; }
          .ev-hero h1 { font-size:clamp(3rem,12vw,4.2rem) !important; }
          .ev-section-heading { align-items:flex-start; flex-direction:column; gap:.5rem; }
          .ev-toolbar { padding:.75rem; }
          .filter-pill { padding:.4rem .7rem; }
          .ev-row     { gap: 1rem; padding: 1.1rem 1.25rem; }
          .ev-date-box { width:44px !important; }
          .ev-row .ev-arrow { display:none; }
          .next-card  { min-height: auto; border-radius: 1.5rem; }
          .next-visual { display:none; }
          .next-card-inner {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.25rem 1.15rem;
          }
          .next-date-block {
            display: flex;
            align-items: center;
            gap: .7rem;
            text-align: left;
          }
          .next-divider {
            display: none !important;
          }
          .next-main h2 {
            font-size: 1.08rem !important;
            line-height: 1.28 !important;
            margin-bottom: .7rem !important;
          }
          .next-main p {
            font-size: .8rem !important;
            line-height: 1.45 !important;
          }
          .next-arrow-wrap {
            width: 100%;
            display: flex;
            justify-content: flex-end;
            margin-top: .2rem;
          }
          .ev-grid    { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) { .ev-card, .ev-row, .next-card, .ev-card img, .ev-row img { transition:none; } .ev-eyebrow, .ev-h1, .ev-sub { animation:none; } }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F8F7F3", fontFamily: "'DM Sans', sans-serif", color: "#08102A" }}>

        {/* ══ HERO ══ */}
        <section className="ev-hero" style={{ maxWidth: 1100, margin: "0 auto", padding: "9rem 3rem 2.5rem" }}>
          <p className="ev-eyebrow" style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "#2E4080", marginBottom: "1.2rem" }}>
            La vita in ASTRA <span aria-hidden="true">/ Eventi</span>
          </p>
          <h1 className="ev-h1" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(3rem,6vw,5.5rem)", fontWeight: 700, lineHeight: .98, letterSpacing: "-.025em", marginBottom: "1.2rem" }}>
            Ci vediamo<br />
            <span style={{ color: "#2E4080" }}>al prossimo evento.</span>
          </h1>
          <p className="ev-sub" style={{ fontSize: "1rem", color: "#6B7280", maxWidth: 420, lineHeight: 1.75 }}>
            Incontri, idee e nuove persone. Scopri cosa succede nella community e scegli il tuo prossimo appuntamento.
          </p>
          {!loading && events.length > 0 && (
            <div style={{ display: "flex", gap: "2.5rem", marginTop: "2.5rem", flexWrap: "wrap" }}>
              {[[String(upcoming.length), "In arrivo"], [String(events.length), "Eventi nella community"]].map(([n, l]) => (
                <div key={l}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "3rem", fontWeight: 700, color: "#08102A", lineHeight: 1, letterSpacing: "-.04em", display: "block" }}>{n}</span>
                  <span style={{ fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".18em", color: "#6B7280" }}>{l}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ══ NEXT EVENT — rich card ══ */}
        {!loading && next && (() => {
          const nextDate = getEventDate(next);
          const nextIscrizioniEsterne = Boolean(next.iscrizioni_esterne);
          const nextIscrizioniAperte = Boolean(next.iscrizioni_aperte);

          return (
            <section className="ev-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 3rem" }}>
              <Link href={`/eventi/${next.id}`} className="next-card">

                <div className="next-card-inner">
                  <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, background: "radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "18px 18px", pointerEvents: "none" }} />

                  <div className="next-date-block" style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "3.5rem", fontWeight: 700, lineHeight: 1, letterSpacing: "-.04em", color: "#fff" }}>
                      {fmtDay(nextDate)}
                    </div>
                    <div style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,255,255,.45)", marginTop: ".2rem" }}>
                      {fmtMonth(nextDate)}
                    </div>
                  </div>

                  <div className="next-divider" style={{ width: 1, height: 60, background: "rgba(255,255,255,.1)", flexShrink: 0 }} />

                  <div className="next-main">
                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap", marginBottom: ".5rem" }}>
                      <p style={{ fontSize: ".62rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", margin: 0 }}>
                        Prossimo evento
                      </p>
                      <span
                        style={{
                          fontSize: ".6rem",
                          fontWeight: 700,
                          letterSpacing: ".08em",
                          textTransform: "uppercase",
                          padding: ".22rem .58rem",
                          borderRadius: "999px",
                          background: nextIscrizioniEsterne
                            ? "rgba(96,165,250,.18)"
                            : nextIscrizioniAperte
                            ? "rgba(74,222,128,.16)"
                            : "rgba(248,113,113,.14)",
                          color: nextIscrizioniEsterne
                            ? "#bfdbfe"
                            : nextIscrizioniAperte
                            ? "#bbf7d0"
                            : "#fecaca",
                        }}
                      >
                        {nextIscrizioniEsterne
                          ? "Iscrizioni esterne"
                          : nextIscrizioniAperte
                          ? "Iscrizioni aperte"
                          : "Iscrizioni chiuse"}
                      </span>
                    </div>
                    <h2 style={{ fontSize: "clamp(1.1rem,2.5vw,1.4rem)", fontWeight: 700, color: "#fff", letterSpacing: "-.01em", lineHeight: 1.2, marginBottom: ".6rem" }}>
                      {next.title}
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                      <p style={{ fontSize: ".84rem", color: "rgba(255,255,255,.5)", display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                          <rect x="1" y="2" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                          <path d="M1 5h11M4.5 1v2M8.5 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                        {fmtWeekday(nextDate)} {fmtFull(nextDate)} • {fmtTime(nextDate)}
                      </p>
                      {next.location && (
                        <p style={{ fontSize: ".84rem", color: "rgba(255,255,255,.5)", display: "flex", alignItems: "center", gap: ".5rem" }}>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                            <path d="M6.5 1.5C4.84 1.5 3.5 2.84 3.5 4.5c0 2.42 3 6.5 3 6.5s3-4.08 3-6.5c0-1.66-1.34-3-3-3Z" stroke="currentColor" strokeWidth="1.3"/>
                            <circle cx="6.5" cy="4.5" r="1.1" fill="currentColor"/>
                          </svg>
                          {next.location}
                        </p>
                      )}
                      {next.partnership && (
                        <p style={{ fontSize: ".84rem", color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", gap: ".5rem" }}>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                            <path d="M9 4.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM2 11c0-2 1.79-3.5 4.5-3.5S11 9 11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                          </svg>
                          In partnership con {next.partnership}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="next-arrow-wrap">
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
                {(next.cover_image || next.locandina) && <div className="next-visual"><img src={next.cover_image || next.locandina || ""} alt="" /></div>}
              </Link>
            </section>
          );
        })()}

        {/* ══ FILTER + VIEW TOGGLE + LIST/GRID ══ */}
        <section className="ev-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 3rem 6rem" }}>
          <div className="ev-section-heading">
            <h2>Esplora gli eventi<span>.</span></h2>
            <span>Trova un’occasione per incontrarci</span>
          </div>
          <div className="ev-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }} role="group" aria-label="Filtra eventi">
              {(["prossimi", "tutti", "passati"] as const).map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} className={`filter-pill${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
                  {f === "prossimi" ? "In arrivo" : f === "tutti" ? "Tutti" : "Passati"}
                  <span className="filter-count">{f === "prossimi" ? upcoming.length : f === "tutti" ? events.length : events.length - upcoming.length}</span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: ".4rem" }} role="group" aria-label="Visualizzazione eventi">
              <button type="button" aria-label="Vista lista" aria-pressed={view === "list"} className={`view-btn${view === "list" ? " active" : ""}`} onClick={() => setView("list")} title="Vista lista">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <button type="button" aria-label="Vista griglia" aria-pressed={view === "grid"} className={`view-btn${view === "grid" ? " active" : ""}`} onClick={() => setView("grid")} title="Vista griglia">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── LIST ── */}
          {view === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : loadError ? (
                <LoadError />
              ) : filtered.length === 0 ? (
                <EmptyState />
              ) : filtered.map((e) => {
                const date = getEventDate(e);
                const past = isPast(date);
                const cover = getCover(e);
                const iscrizioniEsterne = Boolean(e.iscrizioni_esterne);
                const iscrizioniAperte = Boolean(e.iscrizioni_aperte);

                return (
                  <Link key={e.id} href={`/eventi/${e.id}`} className={`ev-row${past ? " past" : ""}`}>
                    <div className="ev-date-box" style={{ width: 52, flexShrink: 0, textAlign: "center", background: past ? "rgba(8,16,42,.04)" : "#E8EDFB", borderRadius: "1rem", padding: ".6rem .4rem" }}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 700, lineHeight: 1, color: past ? "#6B7280" : "#08102A", letterSpacing: "-.03em" }}>
                        {fmtDay(date)}
                      </div>
                      <div style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: past ? "#9ca3af" : "#2E4080", marginTop: ".15rem" }}>
                        {fmtMonth(date)}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: ".3rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
                          <h2 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "-.01em", color: "#08102A", lineHeight: 1.2, margin: 0 }}>
                            {e.title}
                          </h2>
                          {past && <Chip>Passato</Chip>}
                          {!past && (
                            <Chip color={iscrizioniEsterne ? "blue" : iscrizioniAperte ? "green" : "gray"}>
                              {iscrizioniEsterne
                                ? "Iscrizioni esterne"
                                : iscrizioniAperte
                                ? "Iscrizioni aperte"
                                : "Iscrizioni chiuse"}
                            </Chip>
                          )}
                        </div>

                        {e.partnership && (
                          <div style={{ marginTop: ".42rem" }}>
                            <Chip color="blue">{e.partnership}</Chip>
                          </div>
                        )}
                      </div>

                      <p style={{ margin: 0, fontSize: ".83rem", color: "#6B7280", display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                        <span>{fmtWeekday(date)} • {fmtTime(date)}</span>
                        {e.location && <><span style={{ opacity: .4 }}>·</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{e.location}</span></>}
                      </p>
                    </div>

                    {cover && (
                      <div style={{ width: 60, height: 60, borderRadius: "1rem", overflow: "hidden", flexShrink: 0, background: "#E8EDFB" }}>
                        <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </div>
                    )}

                    <div className="ev-arrow">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="#08102A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── GRID ── */}
          {view === "grid" && (
            <div className="ev-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              ) : loadError ? (
                <LoadError />
              ) : filtered.length === 0 ? (
                <div style={{ gridColumn: "1/-1" }}><EmptyState /></div>
              ) : filtered.map((e) => {
                const date = getEventDate(e);
                const past = isPast(date);
                const cover = getCover(e);
                const iscrizioniEsterne = Boolean(e.iscrizioni_esterne);
                const iscrizioniAperte = Boolean(e.iscrizioni_aperte);

                return (
                  <Link key={e.id} href={`/eventi/${e.id}`} className={`ev-card${past ? " past" : ""}`}>
                    <div className="ev-cover" style={{ position: "relative", height: 180, background: cover ? "transparent" : "#08102A", flexShrink: 0, overflow: "hidden" }}>
                      {cover ? (
                        <img src={cover} alt={e.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "5rem", fontWeight: 700, color: "rgba(255,255,255,.08)", lineHeight: 1 }}>
                            {fmtDay(date)}
                          </div>
                        </div>
                      )}

                      <div style={{ position: "absolute", top: "1rem", left: "1rem", background: "rgba(8,16,42,.75)", backdropFilter: "blur(8px)", borderRadius: ".75rem", padding: ".4rem .7rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 700, color: "#fff", lineHeight: 1 }}>{fmtDay(date)}</span>
                        <span style={{ fontSize: ".55rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.6)" }}>{fmtMonth(date)}</span>
                      </div>

                      <div style={{ position: "absolute", top: "1rem", right: "1rem", display: "flex", flexDirection: "column", gap: ".45rem", alignItems: "flex-end" }}>
                        {past && <Chip>Passato</Chip>}
                        {!past && (
                          <Chip color={iscrizioniEsterne ? "blue" : iscrizioniAperte ? "green" : "gray"}>
                            {iscrizioniEsterne
                              ? "Iscrizioni esterne"
                              : iscrizioniAperte
                              ? "Iscrizioni aperte"
                              : "Iscrizioni chiuse"}
                          </Chip>
                        )}
                      </div>

                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,16,42,.5) 0%, transparent 50%)" }} />
                    </div>

                    <div style={{ padding: "1.2rem 1.4rem", display: "flex", flexDirection: "column", gap: ".5rem", flex: 1 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: ".42rem" }}>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-.01em", color: "#08102A", lineHeight: 1.3 }}>
                          {e.title}
                        </h3>
                        {e.partnership && (
                          <div>
                            <Chip color="blue">{e.partnership}</Chip>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                        <p style={{ margin: 0, fontSize: ".82rem", color: "#6B7280", display: "flex", alignItems: "center", gap: ".4rem" }}>
                          <svg width="12" height="12" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, color: "#2E4080" }}>
                            <rect x="1" y="2" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                            <path d="M1 5h11M4.5 1v2M8.5 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                          </svg>
                          {fmtWeekday(date)} • {fmtTime(date)}
                        </p>
                        {e.location && (
                          <p style={{ margin: 0, fontSize: ".82rem", color: "#6B7280", display: "flex", alignItems: "center", gap: ".4rem", overflow: "hidden" }}>
                            <svg width="12" height="12" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, color: "#2E4080" }}>
                              <path d="M6.5 1.5C4.84 1.5 3.5 2.84 3.5 4.5c0 2.42 3 6.5 3 6.5s3-4.08 3-6.5c0-1.66-1.34-3-3-3Z" stroke="currentColor" strokeWidth="1.3"/>
                              <circle cx="6.5" cy="4.5" r="1.1" fill="currentColor"/>
                            </svg>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.location}</span>
                          </p>
                        )}
                      </div>

                      {e.description && (
                        <p style={{ margin: 0, fontSize: ".82rem", color: "#6B7280", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {e.description}
                        </p>
                      )}

                      <div style={{ marginTop: "auto", paddingTop: ".8rem", borderTop: "1px solid rgba(8,16,42,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: ".75rem", fontWeight: 700, color: "#2E4080" }}>Scopri di più</span>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(8,16,42,.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="#08102A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

// ── Small components ──────────────────────────────────────────────
function Chip({ children, color = "gray" }: { children: React.ReactNode; color?: "gray" | "blue" | "green" }) {
  return (
    <span style={{
      fontSize: ".62rem",
      fontWeight: 700,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      background: color === "blue" ? "rgba(46,64,128,.08)" : color === "green" ? "rgba(22,101,52,.1)" : "rgba(8,16,42,.06)",
      color: color === "blue" ? "#2E4080" : color === "green" ? "#166534" : "#6B7280",
      padding: ".22rem .65rem",
      borderRadius: "999px",
      whiteSpace: "nowrap",
      border: color === "blue" ? "1px solid rgba(46,64,128,.12)" : color === "green" ? "1px solid rgba(22,101,52,.18)" : "1px solid rgba(8,16,42,.08)",
      backdropFilter: "blur(6px)",
    }}>
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#6B7280", background: "#fff", border: "1px solid rgba(8,16,42,.08)", borderRadius: "1.5rem" }}>
      <p style={{ fontSize: "2rem", marginBottom: "1rem" }}>📅</p>
      <p style={{ fontWeight: 600, color: "#08102A", marginBottom: ".5rem" }}>Nessun evento trovato</p>
      <p style={{ fontSize: ".9rem" }}>Torna presto o prova a cambiare il filtro.</p>
    </div>
  );
}

function LoadError() {
  return <div className="ev-error"><h3>Non riusciamo a caricare gli eventi</h3><p>Riprova tra qualche momento.</p><button type="button" onClick={() => window.location.reload()}>Ricarica la pagina</button></div>;
}
