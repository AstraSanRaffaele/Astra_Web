"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

export function AstraLogo({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Astra logo"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
      priority
    />
  );
}

export function AuthStyles() {
  return (
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
        --danger: #B42318;
        --success: #027A48;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; scroll-behavior: smooth; }

      body {
        font-family: 'Nunito', sans-serif;
        background: var(--white);
        color: var(--text);
        overflow-x: hidden;
      }

      .serif { font-family: 'DM Serif Display', serif; }

      @keyframes drift {
        from { transform: translate(0,0) scale(1); }
        to   { transform: translate(20px,28px) scale(1.06); }
      }

      @keyframes fadeUp {
        from { opacity:0; transform:translateY(24px); }
        to { opacity:1; transform:none; }
      }

      @keyframes fadeDown {
        from { opacity:0; transform:translateY(-16px); }
        to { opacity:1; transform:none; }
      }

      .blob { animation: drift 12s ease-in-out infinite alternate; }
      .blob-2 { animation-delay: -4s; }
      .blob-3 { animation-delay: -8s; }

      .page-enter { animation: fadeUp .8s ease both; }
      .nav-enter { animation: fadeDown .8s ease both; }

      .btn-primary { transition: transform .25s, box-shadow .25s; }
      .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 10px 36px rgba(14,31,107,.3); }

      .btn-ghost { transition: border-color .2s, background .2s; }
      .btn-ghost:hover { border-color: var(--blue-mid); background: var(--blue-light); }

      .input {
        width: 100%;
        padding: 1rem 1.1rem;
        border-radius: 1rem;
        border: 1.5px solid rgba(14,31,107,.12);
        background: rgba(255,255,255,.9);
        color: var(--text);
        font-size: .96rem;
        outline: none;
        transition: border-color .2s, box-shadow .2s, background .2s;
      }

      .input:focus {
        border-color: var(--blue-mid);
        box-shadow: 0 0 0 4px rgba(26,51,153,.08);
        background: #fff;
      }

      .panel-card {
        transition: transform .3s, box-shadow .3s;
      }
      .panel-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 16px 48px rgba(14,31,107,.08);
      }

      @media (max-width: 980px) {
        .login-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
        .page-padding { padding: 7rem 1.5rem 3rem !important; }
        .nav-padding { padding: 1rem 1.5rem !important; }
        .left-panel { display: none !important; }
        .card-padding { padding: 2rem !important; }
      }

      @media (max-width: 640px) {
        .stats-grid { grid-template-columns: 1fr !important; }
        .hero-title { font-size: clamp(2.4rem, 10vw, 4rem) !important; }
      }
    `}</style>
  );
}

export function AuthShell({
  eyebrow = "Area riservata",
  title,
  description,
  cardEyebrow = "Account",
  cardTitle,
  cardDescription,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  description: string;
  cardEyebrow?: string;
  cardTitle: ReactNode;
  cardDescription: string;
  children: ReactNode;
}) {
  return (
    <>
      <AuthStyles />

      <div
        style={{
          fontFamily: "'Nunito', sans-serif",
          background: "var(--white)",
          color: "var(--text)",
          overflowX: "hidden",
        }}
      >
        <nav
  className="nav-enter nav-padding"
  style={{
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: 64, // ✅ altezza controllata
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2rem", // ✅ meno padding
    background: "rgba(250,250,250,0.75)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    borderBottom: "1px solid rgba(14,31,107,0.07)",
  }}
>
  <Link
    href="/"
    style={{
      display: "flex",
      alignItems: "center",
      gap: ".6rem",
      textDecoration: "none",
    }}
  >
    {/* ✅ logo RIDOTTO */}
    <AstraLogo size={100} />
  </Link>

  <Link
    href="/"
    className="btn-ghost"
    style={{
      border: "1px solid rgba(14,31,107,.12)",
      color: "var(--text)",
      padding: ".55rem 1rem", // ✅ più compatto
      borderRadius: "999px",
      textDecoration: "none",
      fontWeight: 700,
      fontSize: ".82rem",
      transition: "all .2s ease",
    }}
  >
    ← Home
  </Link>
</nav>

        <main
          className="page-padding"
          style={{
            minHeight: "100vh",
            padding: "9rem 4rem 4rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {[
            { w: 560, h: 560, bg: "#1A3399", top: "-120px", right: "-80px", left: "auto", bottom: "auto" },
            { w: 340, h: 340, bg: "var(--blue-glow)", bottom: "20px", left: "-50px", top: "auto", right: "auto" },
            { w: 220, h: 220, bg: "#8EA4FF", top: "55%", right: "18%", left: "auto", bottom: "auto" },
          ].map((b, i) => (
            <div
              key={i}
              className={`blob blob-${i + 1}`}
              style={{
                position: "absolute",
                borderRadius: "50%",
                filter: "blur(80px)",
                opacity: 0.16,
                pointerEvents: "none",
                width: b.w,
                height: b.h,
                background: b.bg,
                top: b.top,
                right: b.right,
                left: b.left,
                bottom: b.bottom,
              }}
            />
          ))}

          <div
            className="login-grid page-enter"
            style={{
              display: "grid",
              gridTemplateColumns: "1.05fr .95fr",
              gap: "2rem",
              alignItems: "stretch",
              position: "relative",
              zIndex: 1,
              maxWidth: 1200,
              margin: "0 auto",
            }}
          >
            <section
              className="left-panel"
              style={{
                background: "var(--blue)",
                borderRadius: "2.5rem",
                padding: "3rem",
                position: "relative",
                overflow: "hidden",
                minHeight: 680,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: 360,
                  height: 360,
                  background: "#fff",
                  top: -120,
                  right: -80,
                  borderRadius: "50%",
                  filter: "blur(60px)",
                  opacity: 0.12,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  width: 220,
                  height: 220,
                  background: "#7BA0FF",
                  bottom: -60,
                  left: "8%",
                  borderRadius: "50%",
                  filter: "blur(60px)",
                  opacity: 0.16,
                  pointerEvents: "none",
                }}
              />

              <div style={{ position: "relative", zIndex: 1 }}>
                <p
                  style={{
                    fontSize: ".75rem",
                    fontWeight: 800,
                    letterSpacing: ".18em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,.58)",
                    marginBottom: "1.4rem",
                  }}
                >
                  {eyebrow}
                </p>

                <h1
                  className="serif hero-title"
                  style={{
                    fontSize: "clamp(3rem,6vw,5.2rem)",
                    lineHeight: 1.05,
                    color: "#fff",
                    maxWidth: 560,
                  }}
                >
                  {title}
                </h1>

                <p
                  style={{
                    marginTop: "1.5rem",
                    fontSize: "1.05rem",
                    lineHeight: 1.8,
                    color: "rgba(255,255,255,.68)",
                    maxWidth: 470,
                  }}
                >
                  {description}
                </p>
              </div>

              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  marginTop: "2rem",
                }}
              >
                <div
                  style={{
                    marginBottom: "1.2rem",
                    minHeight: 165,
                    position: "relative",
                  }}
                >
                  <p
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      fontSize: ".8rem",
                      lineHeight: 1.7,
                      color: "rgba(255,255,255,.72)",
                      maxWidth: 620,
                    }}
                  >
                    <span style={{ fontWeight: 800, color: "#fff" }}>* </span>
                    Ai sensi del Regolamento UE 2016/679 (GDPR), ti informiamo che i dati
                    personali raccolti in questo modulo saranno trattati dal team ASTRA San
                    Raffaele esclusivamente per le seguenti finalità: inserimento nel Libro
                    Soci, gestione del rapporto associativo, invio di comunicazioni relative
                    alle attività e adempimento degli obblighi di legge. I dati non verranno
                    ceduti a terzi. Puoi richiedere in qualsiasi momento la cancellazione o
                    la modifica dei tuoi dati scrivendo a info@astrasanraffaele.it.
                  </p>
                </div>

                <div
                  className="stats-grid"
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: "1rem",
                  }}
                >
                  {[
                    ["2.9k", "Studenti nella community"],
                    ["30+", "Iniziative create"],
                    ["3", "Facoltà coinvolte"],
                  ].map(([n, l]) => (
                    <div
                      key={l}
                      style={{
                        background: "rgba(255,255,255,.09)",
                        border: "1px solid rgba(255,255,255,.14)",
                        borderRadius: "1.2rem",
                        padding: "1.2rem 1.1rem",
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      <div className="serif" style={{ fontSize: "2rem", color: "#fff", opacity: 0.95 }}>
                        {n}
                      </div>
                      <div
                        style={{
                          fontSize: ".7rem",
                          fontWeight: 700,
                          letterSpacing: ".1em",
                          textTransform: "uppercase",
                          color: "rgba(255,255,255,.52)",
                          marginTop: ".35rem",
                          lineHeight: 1.5,
                        }}
                      >
                        {l}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </section>

            <section
              className="panel-card card-padding"
              style={{
                background: "rgba(255,255,255,.72)",
                border: "1px solid rgba(14,31,107,.08)",
                borderRadius: "2.5rem",
                padding: "3rem",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                boxShadow: "0 10px 40px rgba(14,31,107,.05)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div style={{ marginBottom: "2rem" }}>
                <p
                  style={{
                    fontSize: ".72rem",
                    fontWeight: 800,
                    letterSpacing: ".2em",
                    textTransform: "uppercase",
                    color: "var(--blue-mid)",
                    marginBottom: "1rem",
                  }}
                >
                  {cardEyebrow}
                </p>

                <h2
                  className="serif"
                  style={{
                    fontSize: "clamp(2rem,4vw,3.3rem)",
                    lineHeight: 1.1,
                    color: "var(--text)",
                  }}
                >
                  {cardTitle}
                </h2>

                <p
                  style={{
                    fontSize: "1rem",
                    lineHeight: 1.8,
                    color: "var(--muted)",
                    marginTop: "1rem",
                    maxWidth: 460,
                  }}
                >
                  {cardDescription}
                </p>
              </div>

              {children}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

export function AuthMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) return null;

  return (
    <div
      style={{
        marginTop: ".2rem",
        borderRadius: "1rem",
        padding: ".95rem 1rem",
        fontSize: ".92rem",
        lineHeight: 1.6,
        background: error ? "rgba(180,35,24,.06)" : "rgba(2,122,72,.06)",
        border: error
          ? "1px solid rgba(180,35,24,.14)"
          : "1px solid rgba(2,122,72,.14)",
        color: error ? "var(--danger)" : "var(--success)",
      }}
    >
      {error || success}
    </div>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        fontSize: ".82rem",
        fontWeight: 700,
        color: "var(--text)",
        marginBottom: ".55rem",
      }}
    >
      {children}
    </label>
  );
}