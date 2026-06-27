"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/ui/navbar";
import {
  FRESHERS_ACTIVE_CAROUSEL_ITEMS,
  FRESHERS_FACULTIES,
  FRESHERS_PAGE,
} from "@/lib/matricole/static-data";

type FreshersStatusResponse = {
  ok?: boolean;
  isPageActive?: boolean;
  homeBannerEnabled?: boolean;
  error?: string;
};

function getFreshersImageUrl(imagePath: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || !imagePath) {
    return "";
  }

  return `${supabaseUrl}/storage/v1/object/public/freshers-carousel/${imagePath}`;
}

function getFreshersDocumentUrl(pdfPath: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || !pdfPath) {
    return "";
  }

  return `${supabaseUrl}/storage/v1/object/public/freshers-documents/${pdfPath}`;
}

function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(36px)",
        transition: `opacity .8s cubic-bezier(.4,0,.2,1) ${delay}s, transform .8s cubic-bezier(.4,0,.2,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function MatricolePage() {
  const [loading, setLoading] = useState(true);
  const [isPageActive, setIsPageActive] = useState(false);
  const [error, setError] = useState("");

  const activeCarouselItems = useMemo(
    () => FRESHERS_ACTIVE_CAROUSEL_ITEMS,
    [],
  );

  useEffect(() => {
    async function loadStatus() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/matricole/status", {
          cache: "no-store",
        });

        const json = (await res.json().catch(() => ({}))) as FreshersStatusResponse;

        if (!res.ok) {
          throw new Error(json.error || "Errore durante il caricamento della pagina matricole.");
        }

        setIsPageActive(Boolean(json.isPageActive));
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento della pagina matricole.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="matricole-page">
          <div className="matricole-inner">
            <section className="empty-state">
              <p className="eyebrow">Matricole</p>
              <h1 className="display">Caricamento...</h1>
              <p>Stiamo verificando se la pagina matricole è disponibile.</p>
            </section>
          </div>
        </main>

        <MatricoleStyles />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />

        <main className="matricole-page">
          <div className="matricole-inner">
            <section className="empty-state">
              <p className="eyebrow">Matricole</p>
              <h1 className="display">Errore</h1>
              <p>{error}</p>
            </section>
          </div>
        </main>

        <MatricoleStyles />
      </>
    );
  }

  if (!isPageActive) {
    return (
      <>
        <Navbar />

        <main className="matricole-page">
          <div className="matricole-inner">
            <section className="empty-state">
              <p className="eyebrow">Matricole</p>
              <h1 className="display">Pagina non ancora disponibile</h1>
              <p>
                Testo demo: questa sezione sarà attivata quando saranno disponibili
                le informazioni per le nuove matricole.
              </p>
              <Link href="/" className="btn-primary">
                Torna alla homepage
              </Link>
            </section>
          </div>
        </main>

        <MatricoleStyles />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="matricole-page">
        <div className="matricole-inner">
          <section className="hero">
            <div className="hero-content">
              <p className="eyebrow hero-eyebrow">Welcome Matricole 2026</p>

              <h1 className="display hero-title">
                Matricole 2026<br />
                <span style={{ whiteSpace: "nowrap" }}>Università &ldquo;Vita-Salute&rdquo; San Raffaele</span>
              </h1>

              <p className="hero-subtitle">
                {FRESHERS_PAGE.subtitle}
              </p>

              <div className="disclaimer">
                {FRESHERS_PAGE.welcomeText}
              </div>

              <p className="hero-description">
                {FRESHERS_PAGE.description}
              </p>

              <div className="hero-actions">
                <div className="split-pill">
                  <a href="#facolta" className="split-pill-left">
                    Scegli la tua facoltà
                  </a>
                  <span className="split-pill-divider" aria-hidden="true" />
                  <a href="#guida" className="split-pill-right">
                    Guida rapida
                  </a>
                </div>
              </div>
            </div>
          </section>


          {activeCarouselItems.length > 0 && (
            <Reveal>
              <section id="guida" className="section">
                <div className="section-head">
                  <p className="eyebrow">Guida rapida</p>
                  <h2 className="display section-title">
                    Informazioni utili per le matricole.
                  </h2>
                  <p className="muted">
                    Le risposte alle domande più frequenti per iniziare al meglio il tuo percorso universitario.
                  </p>
                </div>

                <div className="carousel-wrap" aria-label="Carosello informazioni matricole">
                  {activeCarouselItems.map((item) => {
                    const imageUrl = getFreshersImageUrl(item.imagePath);

                    const content = (
                      <article className="carousel-card">
                        <div className="carousel-image">
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrl} alt={item.title} />
                          ) : (
                            <div className="carousel-placeholder">
                              Immagine
                            </div>
                          )}
                        </div>

                        <div className="carousel-content">
                          <h3>{item.title}</h3>
                          <p>{item.description}</p>
                          <div className="carousel-actions">
                            {item.ctas && item.ctas.length > 0 && item.ctas.map((cta) => {
                              const isExternal = cta.href.startsWith("http");
                              return (
                                <a
                                  key={cta.href}
                                  href={cta.href}
                                  className="carousel-cta"
                                  {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                >
                                  {cta.label}
                                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                                    <path d="M7 3v8M3.5 7.5L7 11l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </a>
                              );
                            })}
                            {item.pdfPath && (() => {
                              const pdfUrl = getFreshersDocumentUrl(item.pdfPath);
                              if (!pdfUrl) return null;
                              return (
                                <a
                                  key="pdf"
                                  href={pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="carousel-cta"
                                >
                                  {item.pdfLabel ?? "Scarica PDF"}
                                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                                    <path d="M7 2v7M4 6.5L7 10l3-3.5M2 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </a>
                              );
                            })()}
                          </div>
                        </div>
                      </article>
                    );

                    if (item.linkUrl) {
                      return (
                        <a
                          key={item.title}
                          href={item.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="carousel-link"
                        >
                          {content}
                        </a>
                      );
                    }

                    return (
                      <div key={item.title} className="carousel-link">
                        {content}
                      </div>
                    );
                  })}
                </div>
              </section>
            </Reveal>
          )}

          <Reveal>
            <section id="facolta" className="section">
              <div className="section-head">
                <p className="eyebrow">Scegli il tuo percorso</p>
                <h2 className="display section-title">
                  Trova la tua facoltà.
                </h2>
              </div>

              <div className="faculty-grid">
                {FRESHERS_FACULTIES.map((faculty) => (
                  <Link
                    key={faculty.slug}
                    href={`/matricole/${faculty.slug}`}
                    className="faculty-card"
                    style={faculty.color ? {
                      background: faculty.color,
                      borderColor: "transparent",
                    } : undefined}
                  >
                    <span
                      className="faculty-kicker"
                      style={faculty.color ? {
                        background: "rgba(255,255,255,.18)",
                        color: "rgba(255,255,255,.9)",
                      } : undefined}
                    >
                      Facoltà
                    </span>
                    <h3
                      className="display"
                      style={faculty.color ? { color: "#fff" } : undefined}
                    >
                      {faculty.name}
                    </h3>
                    <p style={faculty.color ? { color: "rgba(255,255,255,.72)" } : undefined}>
                      {faculty.description}
                    </p>

                    <div
                      className="faculty-footer"
                      style={faculty.color ? { color: "rgba(255,255,255,.85)" } : undefined}
                    >
                      <span>
                        {faculty.courses.length} cors{faculty.courses.length === 1 ? "o" : "i"}
                      </span>
                      <span>Apri →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </Reveal>
        </div>
      </main>

      <MatricoleStyles />
    </>
  );
}

function MatricoleStyles() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

      :root {
        --ink: #08102A;
        --ink-mid: #1A2B5C;
        --ink-soft: #2E4080;
        --sky: #E8EDFB;
        --sky-deep: #C8D4F5;
        --cream: #F8F7F3;
        --mist: #6B7280;
        --white: #FEFEFE;
        --blue: #0E1F6B;
        --blue-mid: #1A3399;
        --blue-light: #E8EDFB;
      }

      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        font-family: 'DM Sans', sans-serif;
        background: var(--cream);
        color: var(--ink);
        overflow-x: hidden;
      }

      .display {
        font-family: 'Cormorant Garamond', serif;
      }

      .matricole-page {
        min-height: 100vh;
        padding: 7rem 1.5rem 4rem;
        background:
          radial-gradient(circle at top right, rgba(200,212,245,.35), transparent 32%),
          var(--cream);
      }

      .matricole-inner {
        max-width: 1180px;
        margin: 0 auto;
      }

      .hero {
        border-radius: 2.8rem;
        padding: clamp(2rem, 6vw, 4rem);
        background:
          radial-gradient(circle at top right, rgba(200,212,245,.22), transparent 35%),
          var(--ink);
        color: white;
        box-shadow: 0 24px 70px rgba(8,16,42,.24);
        overflow: hidden;
        position: relative;
      }

      .hero::after {
        content: "";
        position: absolute;
        width: 360px;
        height: 360px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,.08);
        right: -80px;
        top: -80px;
        pointer-events: none;
      }

      .hero-content {
        position: relative;
        z-index: 1;
        max-width: 860px;
      }

      .eyebrow {
        font-size: .72rem;
        font-weight: 800;
        letter-spacing: .22em;
        text-transform: uppercase;
        color: var(--ink-soft);
        margin-bottom: 1.2rem;
      }

      .hero .eyebrow {
        color: rgba(255,255,255,.6);
      }

      .hero-title {
        font-size: clamp(2.4rem, 5.5vw, 4.8rem);
        line-height: 1.05;
        letter-spacing: -.03em;
        max-width: 680px;
      }

      .hero-subtitle {
        margin-top: 1.5rem;
        max-width: 760px;
        color: rgba(255,255,255,.78);
        line-height: 1.8;
        font-size: 1.08rem;
      }

      .hero-description {
        margin-top: 1.2rem;
        max-width: 760px;
        color: rgba(255,255,255,.62);
        line-height: 1.8;
        font-size: .98rem;
      }

      .disclaimer {
        margin-top: 1.5rem;
        border-radius: 1.5rem;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.06);
        padding: 1rem 1.2rem;
        color: rgba(255,255,255,.86);
        line-height: 1.7;
      }

      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 2rem;
      }

      .btn-primary {
        background: white;
        color: var(--ink);
        border: none;
        border-radius: 999px;
        padding: 1rem 2rem;
        text-decoration: none;
        font-weight: 900;
        transition: .2s ease;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
      }

      .btn-outline {
        border: 1px solid rgba(255,255,255,.22);
        color: white;
        border-radius: 999px;
        padding: 1rem 2rem;
        text-decoration: none;
        font-weight: 800;
        background: transparent;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .split-pill {
        display: inline-flex;
        align-items: center;
        background: white;
        border-radius: 999px;
        overflow: hidden;
        box-shadow: 0 2px 18px rgba(255,255,255,.12);
      }

      .split-pill-left,
      .split-pill-right {
        padding: 1rem 1.8rem;
        text-decoration: none;
        font-weight: 900;
        font-size: .96rem;
        transition: background .18s ease;
        white-space: nowrap;
      }

      .split-pill-left {
        color: var(--ink);
      }

      .split-pill-left:hover {
        background: rgba(8,16,42,.07);
      }

      .split-pill-divider {
        width: 1px;
        height: 1.6rem;
        background: rgba(8,16,42,.14);
        flex-shrink: 0;
      }

      .split-pill-right {
        color: var(--ink-soft);
      }

      .split-pill-right:hover {
        background: rgba(8,16,42,.07);
      }

      .section {
        margin-top: 1.5rem;
      }

      .section-head {
        margin-bottom: 1.2rem;
      }

      .section-title {
        font-size: clamp(2.4rem, 5vw, 4rem);
        line-height: .95;
        letter-spacing: -.04em;
        color: var(--ink);
        margin-bottom: .8rem;
      }

      .muted {
        color: var(--mist);
        line-height: 1.8;
        max-width: 780px;
      }


      .carousel-wrap {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(300px, 380px);
        gap: 1rem;
        overflow-x: auto;
        overscroll-behavior-x: contain;
        scroll-snap-type: x mandatory;
        padding: .3rem .2rem 1rem;
      }

      .carousel-wrap::-webkit-scrollbar {
        height: 8px;
      }

      .carousel-wrap::-webkit-scrollbar-track {
        background: rgba(8,16,42,.06);
        border-radius: 999px;
      }

      .carousel-wrap::-webkit-scrollbar-thumb {
        background: rgba(8,16,42,.22);
        border-radius: 999px;
      }

      .carousel-link {
        color: inherit;
        text-decoration: none;
        scroll-snap-align: start;
      }

      .carousel-card {
        background: white;
        border: 1px solid rgba(8,16,42,.08);
        border-radius: 2rem;
        overflow: hidden;
        box-shadow: 0 14px 40px rgba(8,16,42,.06);
        height: 100%;
        display: flex;
        flex-direction: column;
        transition: transform .2s ease, box-shadow .2s ease;
      }

      .carousel-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 18px 50px rgba(8,16,42,.1);
      }

      .carousel-image {
        aspect-ratio: 1 / 1;
        background: var(--sky);
        overflow: hidden;
      }

      .carousel-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .carousel-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ink-soft);
        font-weight: 900;
      }

      .carousel-content {
        padding: 1.2rem;
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      .carousel-content h3 {
        color: var(--ink);
        font-size: 1rem;
        margin-bottom: .55rem;
      }

      .carousel-content p {
        color: var(--mist);
        line-height: 1.65;
        font-size: .9rem;
      }

      .carousel-actions {
        display: flex;
        flex-direction: column;
        gap: .5rem;
        margin-top: auto;
        padding-top: .9rem;
      }

      .carousel-cta {
        display: inline-flex;
        align-items: center;
        gap: .4rem;
        font-size: .8rem;
        font-weight: 700;
        color: var(--ink-mid);
        text-decoration: none;
        letter-spacing: .01em;
        transition: gap .2s ease, color .2s ease;
      }

      .carousel-cta:hover {
        color: var(--ink);
        gap: .6rem;
      }

      .faculty-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
      }

      .faculty-card {
        min-height: 290px;
        border-radius: 2rem;
        background: white;
        border: 1px solid rgba(8,16,42,.08);
        padding: 2rem;
        box-shadow: 0 14px 40px rgba(8,16,42,.06);
        color: inherit;
        text-decoration: none;
        display: flex;
        flex-direction: column;
        transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
      }

      .faculty-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 55px rgba(8,16,42,.1);
        border-color: rgba(8,16,42,.16);
      }

      .faculty-kicker {
        align-self: flex-start;
        border-radius: 999px;
        padding: .4rem .75rem;
        background: var(--blue-light);
        color: var(--ink-mid);
        font-size: .72rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: .08em;
      }

      .faculty-card h3 {
        margin-top: 1.4rem;
        color: var(--ink);
        font-size: clamp(2.2rem, 4vw, 3rem);
        line-height: .95;
      }

      .faculty-card p {
        margin-top: 1rem;
        color: var(--mist);
        line-height: 1.7;
        font-size: .94rem;
      }

      .faculty-footer {
        margin-top: auto;
        padding-top: 1.4rem;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        color: var(--ink-mid);
        font-weight: 900;
      }

      .empty-state {
        min-height: 70vh;
        border-radius: 2.8rem;
        padding: clamp(2rem, 6vw, 4rem);
        background: white;
        border: 1px solid rgba(8,16,42,.08);
        box-shadow: 0 14px 40px rgba(8,16,42,.06);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
      }

      .empty-state h1 {
        font-size: clamp(3rem, 8vw, 6rem);
        line-height: .9;
        letter-spacing: -.05em;
        color: var(--ink);
      }

      .empty-state p {
        margin-top: 1.2rem;
        color: var(--mist);
        line-height: 1.8;
        max-width: 620px;
      }

      .empty-state .btn-primary {
        margin-top: 1.8rem;
        background: var(--ink);
        color: white;
      }

      @media (max-width: 1000px) {
        .faculty-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 760px) {
        .matricole-page {
          padding: 6rem 1rem 3rem;
        }

        .hero,
        .faculty-card,
        .empty-state {
          padding: 1.5rem;
          border-radius: 1.6rem;
        }

        .hero-actions {
          flex-direction: column;
          align-items: flex-start;
        }

        .btn-primary,
        .btn-outline {
          width: 100%;
        }

        .split-pill {
          width: 100%;
        }

        .split-pill-left,
        .split-pill-right {
          flex: 1;
          justify-content: center;
          display: flex;
        }

        .carousel-wrap {
          grid-auto-columns: minmax(240px, 82vw);
        }
      }
    `}</style>
  );
}