"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function formatFullDate(date: Date) {
  return date.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
function formatTime(date: Date) {
  return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}
function formatDay(date: Date) {
  return date.toLocaleDateString("it-IT", { day: "2-digit" });
}
function formatMonth(date: Date) {
  return date.toLocaleDateString("it-IT", { month: "long" });
}
function formatYear(date: Date) {
  return date.toLocaleDateString("it-IT", { year: "numeric" });
}
function isPast(date: Date) {
  return date < new Date();
}

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
      // ── Auth check ──────────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // ── Load event ──────────────────────────────────────────────
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setEvent(data);
      }
      setLoading(false);
    }

    load();
  }, [id, supabase, router]);

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8F7F3" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "10rem 1.5rem 4rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {[["60%", 40], ["40%", 28], ["100%", 16], ["100%", 16], ["80%", 16]].map(([w, h], i) => (
            <div key={i} style={{ width: w as string, height: h as number, borderRadius: "999px", background: "rgba(8,16,42,.07)", animation: "sk 1.4s ease infinite" }} />
          ))}
        </div>
        <style>{`@keyframes sk { 0%,100%{opacity:.4} 50%{opacity:.9} }`}</style>
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

  const date = new Date(event.event_date);
  const past = isPast(date);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F8F7F3; color: #08102A; overflow-x: hidden; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .det-eyebrow { animation: fadeUp .5s .1s cubic-bezier(.4,0,.2,1) both; }
        .det-h1      { animation: fadeUp .6s .25s cubic-bezier(.4,0,.2,1) both; }
        .det-meta    { animation: fadeUp .6s .4s cubic-bezier(.4,0,.2,1) both; }
        .det-body    { animation: fadeUp .6s .55s cubic-bezier(.4,0,.2,1) both; }

        .back-link {
          display: inline-flex; align-items: center; gap: .5rem;
          font-size: .84rem; font-weight: 600; color: #6B7280;
          text-decoration: none; transition: color .18s;
        }
        .back-link:hover { color: #08102A; }

        .meta-chip {
          display: inline-flex; align-items: center; gap: .5rem;
          background: #fff; border: 1px solid rgba(8,16,42,.08);
          border-radius: 999px; padding: .55rem 1.1rem;
          font-size: .84rem; font-weight: 500; color: #08102A;
        }

        .back-btn:hover { background: rgba(8,16,42,.04) !important; border-color: rgba(8,16,42,.2) !important; }

        @media (max-width: 700px) {
          .det-hero    { padding: 8rem 1.25rem 2.5rem !important; }
          .det-content { padding: 0 1.25rem 4rem !important; }
          .det-grid    { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F8F7F3", fontFamily: "'DM Sans', sans-serif", color: "#08102A" }}>

        {/* ══ HERO ══ */}
        <section className="det-hero" style={{ maxWidth: 1100, margin: "0 auto", padding: "9rem 3rem 3rem" }}>
          <div className="det-eyebrow" style={{ marginBottom: "2rem" }}>
            <Link href="/eventi" className="back-link">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 7H3M6.5 3.5L3 7l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Tutti gli eventi
            </Link>
          </div>

          {past && (
            <span style={{ display: "inline-block", fontSize: ".65rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", background: "rgba(8,16,42,.06)", color: "#6B7280", padding: ".3rem .9rem", borderRadius: "999px", marginBottom: "1rem" }}>
              Evento passato
            </span>
          )}

          <h1 className="det-h1" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2.6rem,6vw,5rem)", fontWeight: 700, lineHeight: .96, letterSpacing: "-.025em", maxWidth: 800, marginBottom: "2rem" }}>
            {event.title}
          </h1>

          <div className="det-meta" style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
            <div className="meta-chip">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="#6B7280" strokeWidth="1.4"/>
                <path d="M1.5 5.5h11M4.5 1.5v2M9.5 1.5v2" stroke="#6B7280" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span>{formatFullDate(date)}</span>
            </div>
            <div className="meta-chip">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5" stroke="#6B7280" strokeWidth="1.4"/>
                <path d="M7 4.5V7l2 1.5" stroke="#6B7280" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span>{formatTime(date)}</span>
            </div>
            {event.location && (
              <div className="meta-chip">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5C5.07 1.5 3.5 3.07 3.5 5c0 2.625 3.5 7 3.5 7s3.5-4.375 3.5-7c0-1.93-1.57-3.5-3.5-3.5Z" stroke="#6B7280" strokeWidth="1.4"/>
                  <circle cx="7" cy="5" r="1.2" fill="#6B7280"/>
                </svg>
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </section>

        {/* ══ CONTENT ══ */}
        <section className="det-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 3rem 6rem" }}>
          <div className="det-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2.5rem", alignItems: "start" }}>

            {/* Main */}
            <div className="det-body">
              {event.cover_image ? (
                <div style={{ borderRadius: "2rem", overflow: "hidden", marginBottom: "2rem", aspectRatio: "16/7", background: "#e8edfb" }}>
                  <img src={event.cover_image} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{ borderRadius: "2rem", background: "#08102A", marginBottom: "2rem", aspectRatio: "16/7", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                  <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "6rem", fontWeight: 700, color: "rgba(255,255,255,.08)", lineHeight: 1, letterSpacing: "-.05em" }}>
                      {formatDay(date)}
                    </div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 600, color: "rgba(255,255,255,.3)", letterSpacing: ".05em", textTransform: "uppercase" }}>
                      {formatMonth(date)} {formatYear(date)}
                    </div>
                  </div>
                </div>
              )}

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
            </div>

            {/* Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "sticky", top: "90px" }}>
              <div style={{ background: "#08102A", borderRadius: "2rem", padding: "2rem", color: "#fff", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "4.5rem", fontWeight: 700, lineHeight: 1, letterSpacing: "-.05em", color: "#fff" }}>
                    {formatDay(date)}
                  </div>
                  <div style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginTop: ".3rem" }}>
                    {formatMonth(date)} {formatYear(date)}
                  </div>
                  <div style={{ marginTop: "1.2rem", height: 1, background: "rgba(255,255,255,.1)" }} />
                  <div style={{ marginTop: "1.2rem", fontSize: ".9rem", color: "rgba(255,255,255,.6)", fontWeight: 500 }}>
                    ore {formatTime(date)}
                  </div>
                  {event.location && (
                    <div style={{ marginTop: ".5rem", fontSize: ".85rem", color: "rgba(255,255,255,.4)", lineHeight: 1.5 }}>
                      {event.location}
                    </div>
                  )}
                </div>
              </div>

              <Link
                href="/eventi"
                className="back-btn"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem",
                  background: "#fff", border: "1px solid rgba(8,16,42,.1)", borderRadius: "999px",
                  padding: ".75rem 1.5rem", textDecoration: "none", color: "#08102A",
                  fontWeight: 600, fontSize: ".88rem",
                  transition: "background .18s, border-color .18s",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11 7H3M6.5 3.5L3 7l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
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