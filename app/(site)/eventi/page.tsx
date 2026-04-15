"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function formatDay(date: Date) {
  return date.toLocaleDateString("it-IT", { day: "2-digit" });
}
function formatMonth(date: Date) {
  return date.toLocaleDateString("it-IT", { month: "short" }).toUpperCase();
}
function formatWeekday(date: Date) {
  return date.toLocaleDateString("it-IT", { weekday: "long" });
}
function formatTime(date: Date) {
  return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}
function formatFullDate(date: Date) {
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}
function isPast(date: Date) {
  return date < new Date();
}

function SkeletonRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "1.5rem 2rem", background: "#fff", borderRadius: "1.5rem", border: "1px solid rgba(8,16,42,.07)" }}>
      <div style={{ width: 52, height: 60, borderRadius: "1rem", background: "rgba(8,16,42,.06)", flexShrink: 0, animation: "sk 1.4s ease infinite" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ width: "55%", height: 18, borderRadius: "999px", background: "rgba(8,16,42,.06)", animation: "sk 1.4s ease infinite" }} />
        <div style={{ width: "35%", height: 13, borderRadius: "999px", background: "rgba(8,16,42,.05)", animation: "sk 1.4s ease infinite" }} />
      </div>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(8,16,42,.05)", flexShrink: 0, animation: "sk 1.4s ease infinite" }} />
    </div>
  );
}

export default function EventiPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"prossimi" | "tutti" | "passati">("prossimi");

  useEffect(() => {
    async function load() {
      // ── Auth check ──────────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // ── Load events ─────────────────────────────────────────────
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      setEvents(data || []);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  const upcoming = useMemo(() => events.filter(e => !isPast(new Date(e.event_date))), [events]);
  const next = upcoming[0];

  const filtered = useMemo(() => {
    if (filter === "prossimi") return events.filter(e => !isPast(new Date(e.event_date)));
    if (filter === "passati") return events.filter(e => isPast(new Date(e.event_date)));
    return events;
  }, [events, filter]);

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

        .ev-row {
          display: flex; align-items: center; gap: 1.5rem;
          padding: 1.5rem 2rem; background: #fff;
          border-radius: 1.5rem; border: 1px solid rgba(8,16,42,.07);
          text-decoration: none; color: inherit;
          transition: transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s, border-color .25s;
          box-shadow: 0 2px 12px rgba(8,16,42,.04);
        }
        .ev-row:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(8,16,42,.1); border-color: rgba(8,16,42,.14); }
        .ev-row.past { opacity: .55; }
        .ev-row.past:hover { opacity: .8; }

        .ev-arrow {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(8,16,42,.05); display: flex;
          align-items: center; justify-content: center;
          flex-shrink: 0; margin-left: auto;
          transition: background .2s, transform .2s;
        }
        .ev-row:hover .ev-arrow { background: #08102A; transform: translateX(2px); }
        .ev-row:hover .ev-arrow svg path { stroke: #fff; }

        .filter-pill {
          border: 1px solid rgba(8,16,42,.12); background: #fff;
          border-radius: 999px; padding: .45rem 1.1rem;
          font-size: .82rem; font-weight: 600; color: #6B7280;
          cursor: pointer; transition: background .18s, color .18s, border-color .18s;
        }
        .filter-pill:hover { background: rgba(8,16,42,.05); color: #08102A; }
        .filter-pill.active { background: #08102A; color: #fff; border-color: #08102A; }

        .next-card {
          background: #08102A; border-radius: 2rem; padding: 2rem 2.5rem;
          color: #fff; display: flex; align-items: center; gap: 2rem;
          flex-wrap: wrap; position: relative; overflow: hidden;
          text-decoration: none;
          transition: transform .25s, box-shadow .25s;
          box-shadow: 0 4px 24px rgba(8,16,42,.14);
        }
        .next-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(8,16,42,.22); }

        @media (max-width: 760px) {
          .ev-section { padding-left: 1.25rem !important; padding-right: 1.25rem !important; }
          .ev-hero    { padding: 8rem 1.25rem 2.5rem !important; }
          .ev-row     { gap: 1rem; padding: 1.2rem 1.25rem; }
          .ev-date-box { display: none !important; }
          .next-divider, .next-date-block { display: none !important; }
          .next-card  { padding: 1.5rem; flex-direction: column; align-items: flex-start; gap: 1rem; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F8F7F3", fontFamily: "'DM Sans', sans-serif", color: "#08102A" }}>

        {/* ══ HERO ══ */}
        <section className="ev-hero" style={{ maxWidth: 1100, margin: "0 auto", padding: "9rem 3rem 2.5rem" }}>
          <p className="ev-eyebrow" style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "#2E4080", marginBottom: "1.2rem" }}>
            Eventi
          </p>
          <h1 className="ev-h1" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(3rem,6vw,5.5rem)", fontWeight: 700, lineHeight: .98, letterSpacing: "-.025em", marginBottom: "1.2rem" }}>
            I prossimi<br />
            <span style={{ color: "#2E4080" }}>incontri.</span>
          </h1>
          <p className="ev-sub" style={{ fontSize: "1rem", color: "#6B7280", maxWidth: 420, lineHeight: 1.75 }}>
            Eventi, workshop e momenti di comunità pensati per gli studenti UniSR.
          </p>
          {!loading && events.length > 0 && (
            <div style={{ display: "flex", gap: "2.5rem", marginTop: "2.5rem", flexWrap: "wrap" }}>
              {[[String(upcoming.length), "Prossimi eventi"], [String(events.length), "Totale eventi"]].map(([n, l]) => (
                <div key={l}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "3rem", fontWeight: 700, color: "#08102A", lineHeight: 1, letterSpacing: "-.04em", display: "block" }}>{n}</span>
                  <span style={{ fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".18em", color: "#6B7280" }}>{l}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ══ NEXT EVENT HIGHLIGHT ══ */}
        {!loading && next && (
          <section className="ev-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 3rem" }}>
            <Link href={`/eventi/${next.id}`} className="next-card">
              <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "18px 18px", pointerEvents: "none" }} />

              <div className="next-date-block" style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "3.5rem", fontWeight: 700, lineHeight: 1, letterSpacing: "-.04em", color: "#fff" }}>
                  {formatDay(new Date(next.event_date))}
                </div>
                <div style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,255,255,.45)", marginTop: ".2rem" }}>
                  {formatMonth(new Date(next.event_date))}
                </div>
              </div>

              <div className="next-divider" style={{ width: 1, height: 60, background: "rgba(255,255,255,.1)", flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
                <p style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: ".5rem" }}>
                  Prossimo evento
                </p>
                <h2 style={{ fontSize: "clamp(1.1rem,2.5vw,1.35rem)", fontWeight: 700, color: "#fff", letterSpacing: "-.01em", lineHeight: 1.2, marginBottom: ".55rem" }}>
                  {next.title}
                </h2>
                <p style={{ fontSize: ".85rem", color: "rgba(255,255,255,.45)", display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                  <span>{formatWeekday(new Date(next.event_date))} {formatFullDate(new Date(next.event_date))} • {formatTime(new Date(next.event_date))}</span>
                  {next.location && <><span style={{ opacity: .4 }}>·</span><span>{next.location}</span></>}
                </p>
              </div>

              <div style={{ flexShrink: 0, zIndex: 1 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ══ FILTER + LIST ══ */}
        <section className="ev-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 3rem 6rem" }}>
          <div style={{ display: "flex", gap: ".6rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {(["prossimi", "tutti", "passati"] as const).map((f) => (
              <button key={f} className={`filter-pill${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
                {f === "prossimi" ? "Prossimi" : f === "tutti" ? "Tutti" : "Passati"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#6B7280" }}>
                <p style={{ fontSize: "2rem", marginBottom: "1rem" }}>📅</p>
                <p style={{ fontWeight: 600, color: "#08102A", marginBottom: ".5rem" }}>Nessun evento trovato</p>
                <p style={{ fontSize: ".9rem" }}>Prova a cambiare il filtro.</p>
              </div>
            ) : (
              filtered.map((e) => {
                const date = new Date(e.event_date);
                const past = isPast(date);
                return (
                  <Link key={e.id} href={`/eventi/${e.id}`} className={`ev-row${past ? " past" : ""}`}>
                    <div className="ev-date-box" style={{ width: 52, flexShrink: 0, textAlign: "center", background: past ? "rgba(8,16,42,.04)" : "#E8EDFB", borderRadius: "1rem", padding: ".6rem .4rem" }}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 700, lineHeight: 1, color: past ? "#6B7280" : "#08102A", letterSpacing: "-.03em" }}>
                        {formatDay(date)}
                      </div>
                      <div style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: past ? "#9ca3af" : "#2E4080", marginTop: ".15rem" }}>
                        {formatMonth(date)}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap", marginBottom: ".3rem" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "-.01em", color: "#08102A", lineHeight: 1.2, margin: 0 }}>
                          {e.title}
                        </h2>
                        {past && (
                          <span style={{ fontSize: ".62rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", background: "rgba(8,16,42,.06)", color: "#6B7280", padding: ".2rem .6rem", borderRadius: "999px" }}>
                            Passato
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: ".84rem", color: "#6B7280", display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                        <span>{formatWeekday(date)} • {formatTime(date)}</span>
                        {e.location && <><span style={{ opacity: .4 }}>·</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{e.location}</span></>}
                      </p>
                    </div>

                    <div className="ev-arrow">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="#08102A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

      </div>
    </>
  );
}