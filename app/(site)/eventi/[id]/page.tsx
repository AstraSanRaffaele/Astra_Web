"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import RsvpButton from "@/components/ui/rsvp-button";

// ── Helpers ───────────────────────────────────────────────────────
function getEventDate(e: any): Date {
  if (e.data) {
    const timeStr = e.ora ?? "00:00:00";
    return new Date(`${e.data}T${timeStr}`);
  }
  return new Date(e.event_date);
}

function fmtFull(d: Date) { return d.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }); }
function fmtTime(d: Date) { return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }); }
function fmtDay(d: Date) { return d.toLocaleDateString("it-IT", { day: "2-digit" }); }
function fmtMonth(d: Date) { return d.toLocaleDateString("it-IT", { month: "long" }); }
function fmtYear(d: Date) { return d.toLocaleDateString("it-IT", { year: "numeric" }); }
function isPast(d: Date) { return d < new Date(); }

const getCover = (e: any) => e.locandina || e.cover_image || null;

export default function EventoDetailPage() {
  const supabase = useMemo(() => createClient(), []);
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?next=/eventi/${id}`);
        return;
      }
      const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      if (error || !data) setNotFound(true);
      else setEvent(data);
      setLoading(false);
    }
    load();
  }, [id, supabase, router]);

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8F7F3" }}>
        <style>{`@keyframes sk { 0%,100%{opacity:.4} 50%{opacity:.9} }`}</style>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "10rem 1.5rem 4rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ height: 320, borderRadius: "2rem", background: "rgba(8,16,42,.07)", animation: "sk 1.4s ease infinite" }} />
          {[["60%", 40], ["40%", 24], ["80%", 14], ["70%", 14]].map(([w, h], i) => (
            <div key={i} style={{ width: w as string, height: h as number, borderRadius: "999px", background: "rgba(8,16,42,.06)", animation: "sk 1.4s ease infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !event) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8F7F3", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "10rem 1.5rem 4rem", textAlign: "center" }}>
          <p style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>📭</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: ".75rem" }}>Evento non trovato</h1>
          <p style={{ color: "#6B7280", marginBottom: "2rem" }}>L&apos;evento che stai cercando non esiste o è stato rimosso.</p>
          <Link href="/eventi" style={{ background: "#08102A", color: "#fff", padding: ".75rem 2rem", borderRadius: "999px", textDecoration: "none", fontWeight: 600, fontSize: ".9rem" }}>
            Torna agli eventi
          </Link>
        </div>
      </div>
    );
  }

  const date = getEventDate(event);
  const past = isPast(date);
  const cover = getCover(event);
  const iscrizioniAperte = Boolean(event.iscrizioni_aperte);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F8F7F3; color: #08102A; overflow-x: hidden; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .det-meta  { animation: fadeUp .6s .2s cubic-bezier(.4,0,.2,1) both; }
        .det-body  { animation: fadeUp .6s .35s cubic-bezier(.4,0,.2,1) both; }

        .meta-chip { display: inline-flex; align-items: center; gap: .5rem; background: #fff; border: 1px solid rgba(8,16,42,.08); border-radius: 999px; padding: .55rem 1.1rem; font-size: .84rem; font-weight: 500; color: #08102A; }
        .meta-chip-blue { background: rgba(46,64,128,.07); border-color: rgba(46,64,128,.14); color: #2E4080; font-weight: 600; }

        .back-pill {
          display: inline-flex; align-items: center; gap: .5rem;
          font-size: .84rem; font-weight: 600; text-decoration: none;
          border-radius: 999px; padding: .55rem 1.1rem;
          transition: background .18s, border-color .18s;
        }
        .back-pill-light {
          color: rgba(255,255,255,.85);
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.22);
          backdrop-filter: blur(10px);
        }
        .back-pill-light:hover { background: rgba(255,255,255,.2); }

        .back-btn { transition: background .18s, border-color .18s; }
        .back-btn:hover { background: rgba(8,16,42,.04) !important; border-color: rgba(8,16,42,.2) !important; }

        @media (max-width: 780px) {
          .det-content { padding: 0 1.25rem 4rem !important; }
          .det-grid    { grid-template-columns: 1fr !important; }
          .det-sidebar { position: static !important; }
          .hero-inner  { padding: 0 1.5rem !important; }
          .meta-chip-blue { display: none !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F8F7F3", fontFamily: "'DM Sans', sans-serif", color: "#08102A" }}>

        {/* ══ HERO ══ */}
        <div style={{
          position: "relative",
          width: "100%",
          minHeight: "clamp(280px, 42vw, 460px)",
          background: "#08102A",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Background image (if any) */}
          {cover && (
            <>
              <img
                src={cover}
                alt={event.title}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: .65 }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(8,16,42,.35) 0%, rgba(8,16,42,.75) 100%)" }} />
            </>
          )}

          {/* Dot pattern (always) */}
          {!cover && (
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(rgba(177, 2, 2, 0.03) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          )}

          {/* ── Inner: vertically centered, max-width aligned ── */}
          <div
            className="hero-inner"
            style={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              maxWidth: 1100,
              width: "100%",
              margin: "0 auto",
              padding: "0 3rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "1.4rem",
              paddingTop: "6rem",   /* accounts for fixed navbar */
              paddingBottom: "3rem",
            }}
          >
            {/* Back button — top of content block */}
            <div>
              <Link href="/eventi" className="back-pill back-pill-light">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M11 7H3M6.5 3.5L3 7l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Tutti gli eventi
              </Link>
            </div>

            {/* Past badge */}
            {past && (
              <div>
                <span style={{ fontSize: ".62rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", background: "rgba(255,255,255,.14)", color: "rgba(255,255,255,.8)", padding: ".3rem .9rem", borderRadius: "999px" }}>
                  Evento passato
                </span>
              </div>
            )}

            {/* Title */}
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)",
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-.025em",
              color: "#fff",
              maxWidth: 780,
              textShadow: cover ? "0 2px 24px rgba(0,0,0,.25)" : "none",
            }}>
              {event.title}
            </h1>
          </div>
        </div>

        {/* ══ META CHIPS ══ */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 3rem 1rem" }}>
          <div className="det-meta" style={{ display: "flex", gap: ".65rem", flexWrap: "wrap" }}>
            <div className="meta-chip">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="#6B7280" strokeWidth="1.4" />
                <path d="M1.5 5.5h11M4.5 1.5v2M9.5 1.5v2" stroke="#6B7280" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <span>{fmtFull(date)}</span>
            </div>
            <div className="meta-chip">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5" stroke="#6B7280" strokeWidth="1.4" />
                <path d="M7 4.5V7l2 1.5" stroke="#6B7280" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <span>ore {fmtTime(date)}</span>
            </div>
            {event.location && (
              <div className="meta-chip">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5C5.07 1.5 3.5 3.07 3.5 5c0 2.625 3.5 7 3.5 7s3.5-4.375 3.5-7c0-1.93-1.57-3.5-3.5-3.5Z" stroke="#6B7280" strokeWidth="1.4" />
                  <circle cx="7" cy="5" r="1.2" fill="#6B7280" />
                </svg>
                <span>{event.location}</span>
              </div>
            )}
            {event.partnership && (
              <div className="meta-chip meta-chip-blue">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10 5.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2 12c0-2.21 2.24-4 5-4s5 1.79 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span>In partnership con {event.partnership}</span>
              </div>
            )}
          </div>
        </section>

        {/* ══ CONTENT ══ */}
        <section className="det-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 3rem 6rem" }}>
          <div className="det-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2.5rem", alignItems: "start" }}>

            {/* Main column */}
            <div className="det-body" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {event.description && (
                <div style={{ background: "#fff", border: "1px solid rgba(8,16,42,.07)", borderRadius: "2rem", padding: "2.5rem", boxShadow: "0 2px 12px rgba(8,16,42,.04)" }}>
                  <p style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#2E4080", marginBottom: "1.2rem" }}>
                    Descrizione
                  </p>
                  <p style={{ fontSize: "1.05rem", lineHeight: 1.85, color: "#374151", fontWeight: 400, whiteSpace: "pre-wrap" }}>
                    {event.description}
                  </p>
                </div>
              )}

              {event.partnership && (
                <div style={{ background: "rgba(46,64,128,.05)", border: "1px solid rgba(46,64,128,.12)", borderRadius: "1.5rem", padding: "1.6rem 2rem", display: "flex", alignItems: "center", gap: "1.2rem" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(46,64,128,.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
                      <path d="M10 5.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2 12c0-2.21 2.24-4 5-4s5 1.79 5 4" stroke="#2E4080" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#2E4080", marginBottom: ".3rem" }}>Partnership</p>
                    <p style={{ fontSize: "1rem", fontWeight: 700, color: "#08102A" }}>{event.partnership}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="det-sidebar" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "sticky", top: "90px" }}>
              <div style={{ background: "#08102A", borderRadius: "2rem", padding: "2rem", color: "#fff", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "4.5rem", fontWeight: 700, lineHeight: 1, letterSpacing: "-.05em" }}>
                    {fmtDay(date)}
                  </div>
                  <div style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginTop: ".3rem" }}>
                    {fmtMonth(date)} {fmtYear(date)}
                  </div>
                  <div style={{ marginTop: "1.2rem", height: 1, background: "rgba(255,255,255,.1)" }} />
                  <div style={{ marginTop: "1.2rem", fontSize: ".9rem", color: "rgba(255,255,255,.6)", fontWeight: 500 }}>
                    ore {fmtTime(date)}
                  </div>
                  {event.location && (
                    <div style={{ marginTop: ".6rem", fontSize: ".84rem", color: "rgba(255,255,255,.38)", lineHeight: 1.5 }}>
                      {event.location}
                    </div>
                  )}
                  {event.partnership && (
                    <>
                      <div style={{ marginTop: "1rem", height: 1, background: "rgba(255,255,255,.08)" }} />
                      <div style={{ marginTop: "1rem", fontSize: ".78rem", color: "rgba(255,255,255,.35)", lineHeight: 1.5 }}>
                        Con {event.partnership}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!past ? (
                iscrizioniAperte ? (
                  <RsvpButton eventId={event.id} maxPosti={event.max_posti} />
                ) : (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid rgba(8,16,42,.08)",
                      borderRadius: "1.75rem",
                      padding: "1.25rem 1.2rem",
                      boxShadow: "0 2px 12px rgba(8,16,42,.04)",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        fontSize: ".72rem",
                        fontWeight: 700,
                        letterSpacing: ".16em",
                        textTransform: "uppercase",
                        color: "#2E4080",
                        marginBottom: ".65rem",
                      }}
                    >
                      Iscrizioni chiuse
                    </p>
                    <p
                      style={{
                        fontSize: ".92rem",
                        lineHeight: 1.6,
                        color: "#374151",
                      }}
                    >
                      Le iscrizioni a questo evento non sono ancora aperte.
                    </p>
                  </div>
                )
              ) : null}

              {event.locandina && (
                <div style={{ background: "#fff", border: "1px solid rgba(8,16,42,.07)", borderRadius: "1.75rem", overflow: "hidden", boxShadow: "0 2px 12px rgba(8,16,42,.04)" }}>
                  <p style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#2E4080", padding: "1.2rem 1.4rem .75rem" }}>
                    Locandina
                  </p>
                  <img src={event.locandina} alt="Locandina" style={{ width: "100%", display: "block", objectFit: "cover" }} />
                </div>
              )}

              <Link
                href="/eventi"
                className="back-btn"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem",
                  background: "#fff", border: "1px solid rgba(8,16,42,.1)", borderRadius: "999px",
                  padding: ".75rem 1.5rem", textDecoration: "none", color: "#08102A",
                  fontWeight: 600, fontSize: ".88rem",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11 7H3M6.5 3.5L3 7l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Tutti gli eventi
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}