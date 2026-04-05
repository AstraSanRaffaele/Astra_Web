"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";


// ── Inline SVG Logo ──────────────────────────────────────────────
function AstraLogo({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Astra logo"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}

// ── Scroll Reveal Hook ───────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity .7s ease ${delay}s, transform .7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────
const pillars = [
  { icon: "🎓", title: "Rappresentanza", desc: "Portiamo la voce degli studenti agli organi accademici. Ogni proposta, ogni problema — siamo lì." },
  { icon: "🤝", title: "Comunità", desc: "Eventi, aperitivi, workshop e iniziative per farti sentire a casa fin dal primo giorno. Matricole benvenuti." },
  { icon: "✨", title: "Opportunità", desc: "Da SOS CASA alle borse di studio: ti aiutiamo a trovare tutto quello che cerchi." },
];

const chips = ["🩺 Medicina e Chirurgia", "🧠 Psicologia", "📖 Filosofia", "🏠 SOS CASA", "🌱 Matricole UniSR", "🌐 Astra Network"];

const marqueeItems = ["Medicina", "Psicologia", "Filosofia", "Rappresentanza", "Comunità", "Innovazione", "Milano"];

// ── Main Page ────────────────────────────────────────────────────
export default function Home() {

  return (
    <>
      {/* ── Google Fonts via next/head alternative: inject style tag ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&family=DM+Serif+Display:ital@0;1&display=swap');

        :root {
          --blue: #0E1F6B;
          --blue-mid: #1A3399;
          --blue-light: #E8EDFB;
          --blue-glow: #C2CEFF;
          --white: #FAFAFA;
          --text: #0A0F2C;
          --muted: #6B7280;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; scroll-behavior: smooth; }

        body {
          font-family: 'Nunito', sans-serif;
          background: var(--white);
          color: var(--text);
          overflow-x: hidden;
        }

        .serif { font-family: 'DM Serif Display', serif; }

        /* blobs */
        @keyframes drift {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(20px,28px) scale(1.06); }
        }
        .blob { animation: drift 12s ease-in-out infinite alternate; }
        .blob-2 { animation-delay: -4s; }
        .blob-3 { animation-delay: -8s; }

        /* marquee */
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { animation: marquee 22s linear infinite; }

        /* hero entrance */
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
        @keyframes fadeDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:none; } }

        .hero-eyebrow { animation: fadeUp .7s .3s ease both; }
        .hero-title   { animation: fadeUp .8s .5s ease both; }
        .hero-sub     { animation: fadeUp .8s .7s ease both; }
        .hero-actions { animation: fadeUp .8s .9s ease both; }
        .hero-stats   { animation: fadeUp .8s 1.1s ease both; }

        /* chip hover */
        .chip { transition: background .2s, color .2s, border-color .2s; cursor: default; }
        .chip:hover { background: var(--blue); color: #fff; border-color: var(--blue); }

        /* pillar card hover */
        .pillar-card { transition: transform .3s, box-shadow .3s; cursor: default; }
        .pillar-card:hover { transform: translateY(-6px); box-shadow: 0 16px 48px rgba(14,31,107,.11); }

        /* buttons */
        .btn-primary { transition: transform .25s, box-shadow .25s; }
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 10px 36px rgba(14,31,107,.3); }
        .btn-ghost { transition: border-color .2s, background .2s; }
        .btn-ghost:hover { border-color: var(--blue-mid); background: var(--blue-light); }
        .btn-white { transition: transform .25s, box-shadow .25s; }
        .btn-white:hover { transform: translateY(-3px); box-shadow: 0 10px 36px rgba(0,0,0,.22); }
        .nav-cta { transition: background .2s; }
        .nav-cta:hover { background: var(--blue-mid); }
      `}</style>

      <div style={{ fontFamily: "'Nunito', sans-serif", background: "var(--white)", color: "var(--text)", overflowX: "hidden" }}>
        <Navbar />

        {/* ── HERO ── */}
        <section style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "flex-start",
          padding: "10rem 4rem 6rem", position: "relative", overflow: "hidden",
        }}>
          {/* Blobs */}
          {[
            { w:600,h:600,bg:"#1A3399",top:"-120px",right:"-80px",left:"auto",bottom:"auto" },
            { w:380,h:380,bg:"var(--blue-glow)",bottom:"60px",left:"-60px",top:"auto",right:"auto" },
            { w:260,h:260,bg:"#8EA4FF",top:"55%",right:"18%",left:"auto",bottom:"auto" },
          ].map((b,i) => (
            <div key={i} className={`blob blob-${i+1}`} style={{
              position:"absolute", borderRadius:"50%", filter:"blur(80px)", opacity:.17, pointerEvents:"none",
              width:b.w, height:b.h, background:b.bg, top:b.top, right:b.right, left:b.left, bottom:b.bottom,
            }} />
          ))}

          <p className="hero-eyebrow" style={{
            fontSize:".75rem", fontWeight:800, letterSpacing:".18em", textTransform:"uppercase",
            color:"var(--blue-mid)", marginBottom:"1.4rem",
            display:"flex", alignItems:"center", gap:".6rem", opacity:0,
          }}>

          </p>

          <h1 className="serif hero-title" style={{
            fontSize:"clamp(3rem,7vw,6.5rem)", lineHeight:1.05, color:"var(--text)",
            maxWidth:720, position:"relative", zIndex:1, opacity:0,
          }}>
            Il futuro della{" "}
            <em style={{ fontStyle:"italic", color:"var(--blue-mid)" }}>medicina</em>
            <br />parte da qui.
          </h1>

          <p className="hero-sub" style={{
            marginTop:"1.8rem", fontSize:"1.1rem", lineHeight:1.75,
            color:"var(--muted)", maxWidth:480, fontWeight:400,
            position:"relative", zIndex:1, opacity:0,
          }}>
            Siamo l&apos;associazione studentesca di UniSR. Rappresentiamo, connettiamo e ispiriamo chi studia Medicina, Psicologia e Filosofia a Milano.
          </p>

          <div className="hero-actions" style={{
            display:"flex", gap:"1rem", marginTop:"2.8rem",
            position:"relative", zIndex:1, opacity:0, flexWrap:"wrap",
          }}>
            <a href="#join" className="btn-primary" style={{
              background:"var(--blue)", color:"#fff",
              padding:".85rem 2.2rem", borderRadius:"100px",
              textDecoration:"none", fontWeight:700, fontSize:".95rem",
              boxShadow:"0 4px 24px rgba(14,31,107,.22)",
            }}>Candidati ora</a>
            <a href="#about" className="btn-ghost" style={{
              border:"1.5px solid rgba(14,31,107,.2)",
              color:"var(--text)", padding:".85rem 2.2rem", borderRadius:"100px",
              textDecoration:"none", fontWeight:600, fontSize:".95rem",
            }}>Scopri chi siamo</a>
          </div>

          <div className="hero-stats" style={{
            display:"flex", gap:"3.5rem", marginTop:"5rem",
            position:"relative", zIndex:1, opacity:0, flexWrap:"wrap",
          }}>
            {[["2.9k","Followers"],["99+","Iniziative"],["3","Facoltà"]].map(([n,l]) => (
              <div key={l}>
                <div className="serif" style={{ fontSize:"2.8rem", color:"var(--blue)", lineHeight:1 }}>{n}</div>
                <div style={{ fontSize:".75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".12em", color:"var(--muted)", marginTop:".3rem" }}>{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── MARQUEE ── */}
        <div style={{
          overflow:"hidden",
          borderTop:"1px solid rgba(14,31,107,.08)",
          borderBottom:"1px solid rgba(14,31,107,.08)",
          padding:"1.1rem 0", background:"var(--blue-light)",
        }} aria-hidden="true">
          <div className="marquee-track" style={{ display:"flex", gap:"3rem", whiteSpace:"nowrap", width:"max-content" }}>
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} style={{
                fontSize:".75rem", fontWeight:800, letterSpacing:".2em", textTransform:"uppercase",
                color:"var(--blue)", display:"flex", alignItems:"center", gap:"1rem",
              }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--blue-mid)", flexShrink:0, display:"inline-block" }} />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ── ABOUT ── */}
        <section id="about" style={{ padding:"8rem 4rem" }}>
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 1fr", gap:"5rem", alignItems:"center",
          }} className="about-grid">
            <Reveal>
              <p style={{
                fontSize:".72rem", fontWeight:800, letterSpacing:".2em", textTransform:"uppercase",
                color:"var(--blue-mid)", marginBottom:"1.2rem",
                display:"flex", alignItems:"center", gap:".6rem",
              }}>
                Chi siamo
                <span style={{ width:40, height:1.5, background:"var(--blue-mid)", borderRadius:2, display:"inline-block" }} />
              </p>
              <h2 className="serif" style={{ fontSize:"clamp(2rem,4vw,3.4rem)", lineHeight:1.15, color:"var(--text)" }}>
                Studenti che<br />rappresentano<br />studenti.
              </h2>
              <p style={{ fontSize:"1.05rem", lineHeight:1.8, color:"var(--muted)", marginTop:"1.4rem" }}>
                Astra San Raffaele è l&apos;associazione studentesca dell&apos;Università Vita-Salute San Raffaele di Milano. Nata dalla passione di chi crede che l&apos;esperienza universitaria debba essere qualcosa di più dei soli esami.
              </p>
              <p style={{ fontSize:"1.05rem", lineHeight:1.8, color:"var(--muted)", marginTop:"1rem" }}>
                Lavoriamo per costruire una comunità coesa, dare voce agli studenti e creare opportunità concrete — dentro e fuori dall&apos;università.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div style={{
                background:"var(--blue)", borderRadius:"2rem",
                aspectRatio:"4/5", position:"relative",
                display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden",
              }}>
                <span className="serif" style={{
                  fontSize:"12rem", color:"rgba(255,255,255,.08)", lineHeight:1,
                  position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
                  userSelect:"none", pointerEvents:"none",
                }}>A</span>
                <div style={{ display:"flex", flexDirection:"column", gap:"1rem", padding:"2rem", width:"100%", position:"relative", zIndex:1 }}>
                  {[["2.9k","Studenti nella community"],["∞","Opportunità che creiamo"],["01","Voce per tutti gli studenti"]].map(([n,l]) => (
                    <div key={l} style={{
                      background:"rgba(255,255,255,.09)", border:"1px solid rgba(255,255,255,.14)",
                      borderRadius:"1.2rem", padding:"1.2rem 1.4rem",
                      backdropFilter:"blur(12px)",
                    }}>
                      <div className="serif" style={{ fontSize:"2rem", color:"#fff", opacity:.9 }}>{n}</div>
                      <div style={{ fontSize:".75rem", fontWeight:600, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.5)", marginTop:".2rem" }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── PILLARS ── */}
        <section id="pillars" style={{ padding:"8rem 4rem", background:"var(--blue-light)" }}>
          <Reveal>
            <p style={{
              fontSize:".72rem", fontWeight:800, letterSpacing:".2em", textTransform:"uppercase",
              color:"var(--blue-mid)", marginBottom:"1.2rem",
              display:"flex", alignItems:"center", gap:".6rem",
            }}>
              Cosa facciamo
              <span style={{ width:40, height:1.5, background:"var(--blue-mid)", borderRadius:2, display:"inline-block" }} />
            </p>
            <h2 className="serif" style={{ fontSize:"clamp(2rem,4vw,3.4rem)", lineHeight:1.15, color:"var(--text)" }}>
              Tre anime,<br />un&apos;unica missione.
            </h2>
          </Reveal>
          <div style={{
            display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"2rem", marginTop:"3.5rem",
          }} className="pillars-grid">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.1}>
                <div className="pillar-card" style={{
                  background:"#fff", borderRadius:"2rem",
                  padding:"2.5rem 2rem", border:"1px solid rgba(14,31,107,.07)",
                }}>
                  <div style={{
                    width:52, height:52, borderRadius:"50%",
                    background:"var(--blue-light)", display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"1.4rem", marginBottom:"1.5rem",
                  }}>{p.icon}</div>
                  <div style={{ fontWeight:700, fontSize:"1.1rem", color:"var(--text)", marginBottom:".7rem" }}>{p.title}</div>
                  <p style={{ fontSize:".9rem", lineHeight:1.7, color:"var(--muted)" }}>{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── FACULTY ── */}
        <section id="facolta" style={{ padding:"8rem 4rem" }}>
          <Reveal>
            <p style={{
              fontSize:".72rem", fontWeight:800, letterSpacing:".2em", textTransform:"uppercase",
              color:"var(--blue-mid)", marginBottom:"1.2rem",
              display:"flex", alignItems:"center", gap:".6rem",
            }}>
              Facoltà
              <span style={{ width:40, height:1.5, background:"var(--blue-mid)", borderRadius:2, display:"inline-block" }} />
            </p>
            <h2 className="serif" style={{ fontSize:"clamp(2rem,4vw,3.4rem)", lineHeight:1.15, color:"var(--text)" }}>
              Tre percorsi,<br />un&apos;unica casa.
            </h2>
            <p style={{ fontSize:"1.05rem", lineHeight:1.8, color:"var(--muted)", marginTop:"1.4rem", maxWidth:520 }}>
              Siamo per tutti gli studenti UniSR — qualunque corso tu stia seguendo, Astra è anche tua.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{
              display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1.2rem", marginTop:"3rem",
            }} className="chips-grid">
              {chips.map(c => (
                <div key={c} className="chip" style={{
                  border:"1.5px solid rgba(14,31,107,.14)",
                  borderRadius:"100px", padding:".7rem 1.5rem",
                  fontSize:".88rem", fontWeight:600, color:"var(--blue)",
                  textAlign:"center",
                }}>{c}</div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── JOIN CTA ── */}
        <div id="join" style={{ padding:"0 4rem 8rem" }}>
          <Reveal>
            <div style={{
              background:"var(--blue)", borderRadius:"2.5rem",
              padding:"6rem 5rem", display:"flex", alignItems:"center",
              justifyContent:"space-between", gap:"3rem",
              position:"relative", overflow:"hidden", flexWrap:"wrap",
            }}>
              {/* Blobs */}
              <div style={{ position:"absolute", width:400, height:400, background:"#fff", top:-120, right:-80, borderRadius:"50%", filter:"blur(60px)", opacity:.12, pointerEvents:"none" }} />
              <div style={{ position:"absolute", width:220, height:220, background:"#7BA0FF", bottom:-60, left:"10%", borderRadius:"50%", filter:"blur(60px)", opacity:.18, pointerEvents:"none" }} />

              <div style={{ position:"relative", zIndex:1 }}>
                <p style={{ fontSize:".72rem", fontWeight:800, letterSpacing:".2em", textTransform:"uppercase", color:"rgba(255,255,255,.5)", marginBottom:"1rem" }}>
                  Applications are open
                </p>
                <h2 className="serif" style={{ fontSize:"clamp(2rem,3.5vw,3rem)", color:"#fff", lineHeight:1.15 }}>
                  Entra nel<br />nostro team.
                </h2>
                <p style={{ fontSize:"1rem", color:"rgba(255,255,255,.62)", marginTop:"1rem", lineHeight:1.75, maxWidth:380 }}>
                  Cerchiamo persone curiose, motivate e pronte a fare la differenza. Non serve esperienza — serve voglia di costruire qualcosa.
                </p>
              </div>
              <div style={{ position:"relative", zIndex:1 }}>
                <a href="https://www.instagram.com/astrasanraffaele" target="_blank" rel="noopener noreferrer"
                   className="btn-white" style={{
                     background:"#fff", color:"var(--blue)",
                     padding:"1rem 2.5rem", borderRadius:"100px",
                     textDecoration:"none", fontWeight:800, fontSize:"1rem",
                     display:"inline-block", boxShadow:"0 4px 20px rgba(0,0,0,.15)",
                   }}>
                  Candidati ora →
                </a>
              </div>
            </div>
          </Reveal>
        </div>

        <Footer />

        {/* ── Responsive overrides ── */}
        <style>{`
          @media (max-width: 900px) {
            .hidden-mobile { display: none !important; }
            .hamburger { display: flex !important; }
            .about-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
            .pillars-grid { grid-template-columns: 1fr !important; }
            .chips-grid { grid-template-columns: 1fr 1fr !important; }
            section[id], div[id="join"] { padding-left: 1.5rem !important; padding-right: 1.5rem !important; }
            div[id="join"] > div > div { padding: 3.5rem 2rem !important; }
            nav { padding: 1rem 1.5rem !important; }
          }
          @media (max-width: 600px) {
            .chips-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </>
  );
}