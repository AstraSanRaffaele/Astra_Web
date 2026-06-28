"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/ui/navbar";

type FreshersStatusResponse = {
  ok?: boolean;
  isPageActive?: boolean;
  homeBannerEnabled?: boolean;
  error?: string;
};

// ── Scroll Reveal Hook ───────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(36px)",
      transition: `opacity .8s cubic-bezier(.4,0,.2,1) ${delay}s, transform .8s cubic-bezier(.4,0,.2,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────
const pillars = [
  { num: "01", title: "Rappresentanza", desc: "Portiamo la voce degli studenti agli organi accademici. Ogni proposta, ogni problema — siamo lì." },
  { num: "02", title: "Comunità", desc: "Eventi, aperitivi, workshop e iniziative per farti sentire a casa fin dal primo giorno. Matricole benvenuti." },
  { num: "03", title: "Opportunità", desc: "Da SOS CASA alle borse di studio: ti aiutiamo a trovare tutto quello che cerchi." },
];

const chips = [
  { label: "ASTRA San Raffaele", href: "https://www.instagram.com/astrasanraffaele" },
  { label: "ASTRA Bocconi", href: "https://www.astrabocconi.com/" },
  { label: "ASTRA Cattolica", href: "https://www.instagram.com/astracattolica" },
  { label: "ASTRA IULM", href: "https://www.instagram.com/astraiulm/" },
  { label: "ASTRA Bicocca", href: "https://www.instagram.com/astrabicocca/" },
  { label: "ASTRA UniPR", href: "https://www.instagram.com/astraunipr/" },
];
const marqueeItems = ["Medicina", "Psicologia", "Filosofia", "Rappresentanza", "Comunità", "Innovazione", "Milano"];
const stats = [["2.9k", "Followers"], ["30+", "Iniziative"], ["3", "Facoltà"]];

// ── Main Page ────────────────────────────────────────────────────
export default function Home() {
  const [mouseX, setMouseX] = useState(50);
  const [mouseY, setMouseY] = useState(50);
  const [showFreshersBanner, setShowFreshersBanner] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMouseX((e.clientX / window.innerWidth) * 100);
      setMouseY((e.clientY / window.innerHeight) * 100);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    async function loadFreshersStatus() {
      try {
        const res = await fetch("/api/matricole/status", {
          cache: "no-store",
        });

        const json = (await res.json().catch(() => ({}))) as FreshersStatusResponse;

        if (!res.ok) {
          setShowFreshersBanner(false);
          return;
        }

        setShowFreshersBanner(
          Boolean(json.isPageActive) && Boolean(json.homeBannerEnabled),
        );
      } catch {
        setShowFreshersBanner(false);
      }
    }

    loadFreshersStatus();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        :root {
          --ink:      #08102A;
          --ink-mid:  #1A2B5C;
          --ink-soft: #2E4080;
          --sky:      #E8EDFB;
          --sky-deep: #C8D4F5;
          --cream:    #F8F7F3;
          --mist:     #6B7280;
          --white:    #FEFEFE;
          --blue:     #0E1F6B;
          --blue-mid: #1A3399;
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

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .hero-eyebrow { animation: fadeUp .6s .2s cubic-bezier(.4,0,.2,1) both; }
        .hero-h1      { animation: fadeUp .8s .4s cubic-bezier(.4,0,.2,1) both; }
        .hero-sub     { animation: fadeUp .7s .65s cubic-bezier(.4,0,.2,1) both; }
        .hero-ctas    { animation: fadeUp .7s .85s cubic-bezier(.4,0,.2,1) both; }
        .hero-stats   { animation: fadeUp .7s 1.05s cubic-bezier(.4,0,.2,1) both; }
        .hero-line    { animation: fadeIn .8s .3s ease both; }

        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-inner { animation: marquee 28s linear infinite; }

        /* pillar cards — dark section override */
        .pillar-card-dark {
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 2rem;
          padding: 2.8rem 2.4rem;
          height: 100%;
          transition: background .3s, border-color .3s, transform .3s;
        }
        .pillar-card-dark:hover {
          background: rgba(255,255,255,.08);
          border-color: rgba(255,255,255,.16);
          transform: translateY(-6px);
        }

        .chip {
          border: 1.5px solid rgba(8,16,42,.12);
          border-radius: 999px;
          padding: .85rem 1.8rem;
          font-size: .9rem;
          font-weight: 500;
          color: var(--ink-mid);
          text-align: center;
          background: var(--white);
          transition: background .2s, color .2s, border-color .2s, transform .2s;
          cursor: pointer;
          text-decoration: none;
          display: block;
        }

        .chip:hover { background: var(--ink); color: #fff; border-color: var(--ink); transform: translateY(-2px); }

        .btn-primary {
          background: var(--ink);
          color: #fff;
          padding: .9rem 2.4rem;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
          font-size: .95rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background .2s, transform .2s, box-shadow .2s;
          box-shadow: 0 4px 20px rgba(8,16,42,.18);
          letter-spacing: -.01em;
        }
        .btn-primary:hover { background: var(--ink-mid); transform: translateY(-2px); box-shadow: 0 10px 32px rgba(8,16,42,.26); }

        .btn-outline {
          border: 1.5px solid rgba(8,16,42,.2);
          color: var(--ink);
          padding: .9rem 2.4rem;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 500;
          font-size: .95rem;
          transition: border-color .2s, background .2s;
        }
        .btn-outline:hover { border-color: var(--ink); background: rgba(8,16,42,.04); }

        .freshers-home-banner {
  margin: 7rem 3rem -5.5rem;
  position: relative;
  z-index: 5;
  border-radius: 2rem;
  background: var(--ink);
  color: white;
  padding: 1.5rem;
  box-shadow: 0 20px 55px rgba(8,16,42,.18);
  overflow: hidden;
}

.freshers-home-banner::after {
  content: "";
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  right: -80px;
  top: -120px;
  background: rgba(200,212,245,.16);
  pointer-events: none;
}

.freshers-home-banner-inner {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  max-width: 1180px;
  margin: 0 auto;
}

.freshers-home-banner-kicker {
  margin: 0 0 .45rem;
  color: rgba(255,255,255,.58);
  font-size: .68rem;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.freshers-home-banner h2 {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  line-height: 1;
  letter-spacing: -.04em;
  color: white;
}

.freshers-home-banner p {
  margin: .55rem 0 0;
  color: rgba(255,255,255,.72);
  line-height: 1.6;
  max-width: 640px;
}

.freshers-home-banner-btns {
  display: flex;
  gap: .65rem;
  flex-shrink: 0;
}

.freshers-home-banner-btn {
  background: white;
  color: var(--ink);
  border-radius: 999px;
  padding: .9rem 1.4rem;
  text-decoration: none;
  font-weight: 900;
  white-space: nowrap;
  transition: transform .2s ease, box-shadow .2s ease;
}

.freshers-home-banner-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(0,0,0,.18);
}

.freshers-home-banner-btn--ghost {
  background: transparent;
  color: rgba(255,255,255,.82);
  border: 1.5px solid rgba(255,255,255,.35);
}

.freshers-home-banner-btn--ghost:hover {
  background: rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.65);
  box-shadow: none;
}

        .btn-dark {
          background: var(--ink);
          color: #fff;
          padding: 1rem 2.8rem;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          font-size: 1rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background .2s, transform .2s, box-shadow .2s;
          box-shadow: 0 4px 24px rgba(8,16,42,.22);
          letter-spacing: -.01em;
        }
        .btn-dark:hover { background: var(--ink-mid); transform: translateY(-2px); box-shadow: 0 12px 36px rgba(8,16,42,.3); }

        .contact-card {
          border: 1px solid rgba(8,16,42,.08);
          border-radius: 1.6rem;
          padding: 1.8rem;
          background: var(--cream);
          transition: border-color .2s, transform .2s;
        }
        .contact-card:hover { border-color: rgba(8,16,42,.18); transform: translateY(-2px); }

        .contact-link {
          color: var(--ink);
          text-decoration: none;
          font-weight: 600;
          transition: color .2s;
        }
        .contact-link:hover { color: var(--ink-soft); }

        .eyebrow {
          font-family: 'DM Sans', sans-serif;
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
          flex-shrink: 0;
        }
        .eyebrow-light {
          color: rgba(255,255,255,.5);
        }
        .eyebrow-light::before { background: rgba(255,255,255,.5); }

        @media (max-width: 900px) {
          .about-grid     { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .pillars-grid   { grid-template-columns: 1fr !important; }
          .chips-grid     { grid-template-columns: 1fr 1fr !important; }
          .contacts-grid  { grid-template-columns: 1fr !important; }
          .facolta-grid   { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .hero-section   { padding: 8rem 1.5rem 5rem !important; }
          .page-section   { padding: 5rem 1.5rem !important; }
          .page-pad       { padding: 0 1.5rem 4rem !important; }
          .cta-inner      { padding: 4rem 2rem !important; flex-direction: column !important; align-items: flex-start !important; }
          .contacts-box   { padding: 3rem 1.5rem !important; }
          .contacts-inner-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .hero-stats     { gap: 2.5rem !important; }
          .freshers-home-banner { margin: 6rem 1.5rem -4.5rem !important; }
          .freshers-home-banner-inner { flex-direction: column !important; align-items: flex-start !important; gap: 1rem !important; }
        }
        @media (max-width: 600px) {
          .chips-grid  { grid-template-columns: 1fr !important; }
          .hero-ctas   { flex-direction: column !important; }
          .hero-ctas a { text-align: center !important; }
          .freshers-home-banner { margin: 5.5rem 1rem -4rem !important; padding: 1.2rem !important; border-radius: 1.5rem !important; }
          .freshers-home-banner-btns { flex-direction: column !important; width: 100% !important; }
          .freshers-home-banner-btn { display: flex !important; justify-content: center !important; width: 100% !important; }
        }
        @media (max-width: 430px) {
          .freshers-home-banner { margin: 5rem 0.8rem -3.5rem !important; padding: 1rem !important; border-radius: 1.3rem !important; }
          .freshers-home-banner-kicker { font-size: .6rem !important; letter-spacing: .14em !important; }
          .freshers-home-banner h2 { font-size: clamp(1.4rem, 7vw, 1.9rem) !important; }
          .freshers-home-banner p { font-size: .86rem !important; margin-top: .4rem !important; }
          .freshers-home-banner-btn { padding: .8rem 1.2rem !important; font-size: .88rem !important; }
        }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "var(--cream)", color: "var(--ink)", overflowX: "hidden" }}>

        <Navbar />

        {showFreshersBanner && (
          <section className="freshers-home-banner">
            <div className="freshers-home-banner-inner">
              <div>
                <p className="freshers-home-banner-kicker">Università “Vita-Salute” San Raffaele</p>
                <h2 className="display">Welcome Matricole 2026</h2>
                <p>
                  Tutto ciò che ti serve per partire con il piede giusto: scegli il tuo corso, orientati tra i servizi ASTRA per te, accedi al gruppo WhatsApp ufficiale e scopri i prossimi passi del tuo percorso!
                </p>
              </div>

              <div className="freshers-home-banner-btns">
                <a href="/matricole" className="freshers-home-banner-btn">
                  Scopri di più
                </a>
                <a href="/matricole#guida" className="freshers-home-banner-btn freshers-home-banner-btn--ghost">
                  Guida rapida
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ══ HERO ══ */}
        <section
          className="hero-section"
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "10rem 3rem 7rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ambient glow */}
          <div style={{
            position: "absolute",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(26,43,92,.07) 0%, transparent 70%)",
            top: `calc(${mouseY}% - 350px)`,
            left: `calc(${mouseX}% - 350px)`,
            pointerEvents: "none",
            transition: "top 1.4s cubic-bezier(.4,0,.2,1), left 1.4s cubic-bezier(.4,0,.2,1)",
          }} />

          {/* Geometric rings */}
          <div style={{ position: "absolute", top: "7%", right: "4%", width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(8,16,42,.05)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "11%", right: "8%", width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(8,16,42,.04)", pointerEvents: "none" }} />

          {/* Dot grid */}
          <div style={{ position: "absolute", bottom: "10%", right: "6%", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, pointerEvents: "none", opacity: .18 }}>
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--ink-mid)" }} />
            ))}
          </div>

          <div style={{ position: "relative", zIndex: 1, maxWidth: 900 }}>
            <p className="eyebrow hero-eyebrow" style={{ opacity: 0 }}>
              Studenti x Studenti
            </p>

            <h1
              className="display hero-h1"
              style={{
                fontSize: "clamp(4rem, 9vw, 8.5rem)",
                lineHeight: .94,
                fontWeight: 700,
                letterSpacing: "-.025em",
                color: "var(--ink)",
                opacity: 0,
              }}
            >
              Il futuro degli<br />
              <span style={{ color: "var(--ink-soft)" }}>studenti</span><br />
              <span style={{ display: "inline-flex", alignItems: "center", gap: "1rem" }}>
                parte da{" "}
                <span style={{
                  background: "var(--ink)",
                  color: "var(--cream)",
                  padding: ".05em .3em",
                  borderRadius: "14px",
                  lineHeight: 1.08,
                }}>qui</span>
              </span>
            </h1>

            <div className="hero-line" style={{
              width: "100%",
              maxWidth: 520,
              height: 1,
              background: "linear-gradient(90deg, rgba(8,16,42,.18) 0%, transparent 100%)",
              margin: "2.6rem 0",
              opacity: 0,
            }} />

            <p className="hero-sub" style={{ fontSize: "1.1rem", lineHeight: 1.9, color: "var(--mist)", maxWidth: 480, fontWeight: 400, opacity: 0 }}>
              Siamo un team di studenti dell'Università "Vita-Salute" San Raffaele. Rappresentiamo,
              connettiamo e ispiriamo chi studia Medicina, Psicologia e Filosofia
              a Milano.
            </p>

            <div className="hero-ctas" style={{ display: "flex", gap: "1rem", marginTop: "2.5rem", opacity: 0, flexWrap: "wrap" }}>
              <a href="/convenzioni" className="btn-primary">
                Le nostre convenzioni
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a href="#about" className="btn-outline">Scopri chi siamo</a>
            </div>

            <div className="hero-stats" style={{ display: "flex", gap: "5rem", marginTop: "5.5rem", opacity: 0, flexWrap: "wrap" }}>
              {stats.map(([n, l]) => (
                <div key={l} style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
                  <span className="display" style={{ fontSize: "4.5rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1, letterSpacing: "-.04em" }}>
                    {n}
                  </span>
                  <span style={{ fontSize: ".7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--mist)" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ MARQUEE ══ */}
        <div style={{ overflow: "hidden", borderTop: "1px solid rgba(8,16,42,.07)", borderBottom: "1px solid rgba(8,16,42,.07)", padding: "1.2rem 0", background: "var(--ink)" }} aria-hidden="true">
          <div className="marquee-inner" style={{ display: "flex", gap: "3.5rem", whiteSpace: "nowrap", width: "max-content" }}>
            {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} style={{ fontSize: ".68rem", fontWeight: 600, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.45)", display: "flex", alignItems: "center", gap: "1.2rem" }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,.4)", flexShrink: 0, display: "inline-block" }} />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ══ ABOUT ══ */}
        <section id="about" className="page-section" style={{ padding: "9rem 3rem" }}>
          <div className="about-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6rem", alignItems: "center" }}>

            <Reveal>
              <p className="eyebrow">Chi siamo</p>
              <h2 className="display" style={{ fontSize: "clamp(2.6rem,4.8vw,4rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", color: "var(--ink)" }}>
                Studenti che<br />
                <span style={{ color: "var(--ink-soft)" }}>rappresentano</span><br />
                studenti
              </h2>
              <p style={{ fontSize: "1rem", lineHeight: 1.85, color: "var(--mist)", marginTop: "1.8rem", fontWeight: 400 }}>
                Astra San Raffaele è l&apos;associazione studentesca dell&apos;Università
                Vita-Salute San Raffaele di Milano. Nata dalla passione di chi crede
                che l&apos;esperienza universitaria debba essere qualcosa di più dei soli esami.
              </p>
              <p style={{ fontSize: "1rem", lineHeight: 1.85, color: "var(--mist)", marginTop: "1rem", fontWeight: 400 }}>
                Lavoriamo per costruire una comunità coesa, dare voce agli studenti
                e creare opportunità concrete — dentro e fuori dall&apos;università.
              </p>
              <div style={{ marginTop: "2rem" }}>
                <a href="/team" className="btn-primary">
                  Scopri il team
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
              <div style={{ marginTop: "2.8rem", display: "flex", gap: "3rem", flexWrap: "wrap" }}>
                {stats.map(([n, l]) => (
                  <div key={l} style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                    <span className="display" style={{ fontSize: "3.4rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1, letterSpacing: "-.04em" }}>{n}</span>
                    <span style={{ fontSize: ".65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".15em", color: "var(--mist)" }}>{l}</span>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1.1",
                  maxWidth: "460px",
                  width: "100%",
                  margin: "0 auto",
                }}
              >
                {/* Back card */}
                <div style={{ position: "absolute", inset: 0, background: "var(--sky-deep)", borderRadius: "2.5rem", transform: "rotate(3deg)" }} />
                {/* Main card */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "var(--ink)",
                    borderRadius: "2.5rem",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: "2.2rem",
                  }}
                >
                  <span className="display" style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%,-55%)",
                    fontSize: "18rem", fontWeight: 700, lineHeight: 1,
                    color: "rgba(255,255,255,.03)",
                    userSelect: "none", pointerEvents: "none", whiteSpace: "nowrap",
                  }}>A</span>
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      height: "100%",
                      gap: "10px",
                    }}
                  >
                    {[
                      ["2.9k", "Studenti nella community", true],
                      ["30+", "Iniziative realizzate", false],
                      ["3", "Facoltà rappresentate", false],
                    ].map(([n, l, accent]) => (
                      <div key={String(l)} style={{
                        padding: "1.2rem 1.4rem",
                        borderRadius: "1.4rem",
                        background: accent ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.05)",
                        border: `1px solid ${accent ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.07)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}>
                        <span className="display" style={{ fontSize: "2.2rem", fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-.04em" }}>{n}</span>
                        <span style={{ fontSize: ".7rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.38)", textAlign: "right", maxWidth: 140 }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ PILLARS ══ */}
        <section id="pillars" className="page-section" style={{ padding: "9rem 3rem", background: "var(--ink)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.025) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

          <Reveal>
            <p className="eyebrow eyebrow-light">Cosa facciamo</p>
            <h2 className="display" style={{ fontSize: "clamp(2.6rem,4.8vw,4rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", color: "#fff" }}>
              Tre anime,<br />
              <span style={{ color: "rgba(255,255,255,.55)" }}>un&apos;unica missione</span>
            </h2>
          </Reveal>

          <div className="pillars-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem", marginTop: "4rem", position: "relative", zIndex: 1 }}>
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.12}>
                <div className="pillar-card-dark">
                  <div className="display" style={{ fontSize: "4.5rem", fontWeight: 700, color: "rgba(255,255,255,.14)", lineHeight: 1, letterSpacing: "-.05em", marginBottom: "1.8rem" }}>
                    {p.num}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.15rem", color: "#fff", marginBottom: "1rem", letterSpacing: "-.01em" }}>
                    {p.title}
                  </div>
                  <p style={{ fontSize: ".92rem", lineHeight: 1.75, color: "rgba(255,255,255,.48)", fontWeight: 400 }}>
                    {p.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══ FACULTY ══ */}
        <section id="facolta" className="page-section" style={{ padding: "9rem 3rem" }}>
          <div className="facolta-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6rem", alignItems: "center" }}>
            <Reveal>
              <p className="eyebrow">ASTRA network</p>
              <h2 className="display" style={{ fontSize: "clamp(2.6rem,4.8vw,4rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", color: "var(--ink)" }}>
                Diversi atenei,<br />
                <span style={{ color: "var(--ink-soft)" }}>un&apos;unica casa</span>
              </h2>
              <p style={{ fontSize: "1rem", lineHeight: 1.85, color: "var(--mist)", marginTop: "1.8rem", maxWidth: 400 }}>
                Diversi percorsi, stessa visione. ASTRA è anche tua: uno spazio dove ogni studente può crescere, confrontarsi e sentirsi parte di qualcosa di più grande.              </p>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="chips-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: ".85rem" }}>
                {chips.map((chip) => (
                  <a
                    key={chip.label}
                    href={chip.href}
                    className="chip"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {chip.label}
                  </a>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ JOIN CTA ══ */}
        <div id="join" className="page-pad" style={{ padding: "0 3rem 5rem" }}>
          <Reveal>
            <div
              className="cta-inner"
              style={{
                background: "var(--ink)",
                borderRadius: "3rem",
                padding: "6rem 5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "3rem",
                position: "relative",
                overflow: "hidden",
                flexWrap: "wrap",
              }}
            >
              <div style={{ position: "absolute", top: -140, right: -100, width: 440, height: 440, borderRadius: "50%", background: "rgba(46,64,128,.5)", filter: "blur(80px)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -80, left: "12%", width: 260, height: 260, borderRadius: "50%", background: "rgba(200,212,245,.08)", filter: "blur(70px)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.025) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />

              <div style={{ position: "relative", zIndex: 1 }}>
                <p className="eyebrow eyebrow-light">Applications are open</p>
                <h2 className="display" style={{ fontSize: "clamp(2.4rem,4.2vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, color: "#fff", letterSpacing: "-.02em" }}>
                  Entra nel<br />
                  <span style={{ color: "rgba(255,255,255,.55)" }}>nostro team</span>
                </h2>
                <p style={{ fontSize: "1rem", color: "rgba(255,255,255,.5)", marginTop: "1.2rem", lineHeight: 1.8, maxWidth: 380, fontWeight: 400 }}>
                  Cerchiamo persone curiose, motivate e pronte a fare la differenza.
                  Non serve esperienza — serve voglia di costruire qualcosa.
                </p>
              </div>
              <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
                <a href="/calltoaction" target="_blank" rel="noopener noreferrer" className="btn-dark" style={{ background: "#fff", color: "var(--ink)" }}>
                  Candidati ora
                  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <span style={{ fontSize: ".78rem", color: "rgba(255,255,255,.35)", fontWeight: 400 }}>Seguici su Instagram per restare aggiornato</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ══ CONTACTS ══ */}
        <section id="contatti" className="page-pad" style={{ padding: "0 3rem 5rem" }}>
          <Reveal>
            <div
              className="contacts-box"
              style={{
                background: "var(--white)",
                border: "1px solid rgba(8,16,42,.08)",
                borderRadius: "3rem",
                padding: "5rem 4rem",
                boxShadow: "0 4px 40px rgba(8,16,42,.04)",
              }}
            >
              <div className="contacts-inner-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "start" }}>
                <div>
                  <p className="eyebrow">Contatti</p>
                  <h2 className="display" style={{ fontSize: "clamp(2.4rem,4.2vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, color: "var(--ink)", letterSpacing: "-.02em" }}>
                    Restiamo<br />
                    <span style={{ color: "var(--ink-soft)" }}>in contatto</span>
                  </h2>
                  <p style={{ fontSize: "1rem", lineHeight: 1.85, color: "var(--mist)", marginTop: "1.4rem", fontWeight: 400 }}>
                    Per informazioni, collaborazioni o domande, puoi contattarci
                    tramite i nostri riferimenti ufficiali.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {[
                    { label: "Email", href: "mailto:info@astrasanraffaele.it", text: "info@astrasanraffaele.it" },
                    { label: "Numero business", href: "tel:+393501937413", text: "+39 350 193 7413" },
                  ].map(({ label, href, text }) => (
                    <div key={label} className="contact-card">
                      <div style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: ".6rem", opacity: .6 }}>{label}</div>
                      <a href={href} className="contact-link" style={{ fontSize: "1rem" }}>{text}</a>
                    </div>
                  ))}
                  <div className="contact-card">
                    <div style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: ".6rem", opacity: .6 }}>Social</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                      <a href="https://www.instagram.com/astrasanraffaele" target="_blank" rel="noopener noreferrer" className="contact-link" style={{ fontSize: "1rem" }}>Instagram</a>
                      <a href="https://wa.me/393501937413" target="_blank" rel="noopener noreferrer" className="contact-link" style={{ fontSize: "1rem" }}>WhatsApp</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

      </div>
    </>
  );
}