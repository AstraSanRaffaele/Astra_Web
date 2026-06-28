"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/ui/navbar";
import { getFreshersFacultyBySlug } from "@/lib/matricole/static-data";

type FreshersStatusResponse = {
  ok?: boolean;
  isPageActive?: boolean;
  homeBannerEnabled?: boolean;
  error?: string;
};

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

export default function MatricoleFacultyPage() {
  const params = useParams<{ facultySlug: string }>();
  const facultySlug = params?.facultySlug;

  const faculty = facultySlug ? getFreshersFacultyBySlug(facultySlug) : null;

  const [loading, setLoading] = useState(true);
  const [isPageActive, setIsPageActive] = useState(false);
  const [error, setError] = useState("");

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

  if (!faculty) {
    notFound();
  }

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

        <MatricoleFacultyStyles />
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

        <MatricoleFacultyStyles />
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

        <MatricoleFacultyStyles />
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
              <Link href="/matricole" className="back-link">
                ← Torna a Matricole
              </Link>

              <p className="eyebrow">Facoltà</p>

              <h1 className="display hero-title">
                Benvenuto nella Facoltà di {faculty.name}
              </h1>

              <p className="hero-subtitle">
                {faculty.description}
              </p>

            </div>
          </section>

          <Reveal>
            <section className="section clean-section">
              <div className="section-head compact-section-head">
                <div>
                  <p className="eyebrow">Contatti utili</p>
                  <h2 className="display section-title">
                    Rappresentanti di facoltà
                  </h2>
                </div>
              </div>

              <div className="representatives-list">
                {faculty.representatives.map((representative) => (
                  <article
                    key={`${representative.firstName}-${representative.lastName}-${representative.email}`}
                    className="representative-row"
                  >
                    <div>
                      <h3>
                        {representative.firstName} {representative.lastName}
                      </h3>
                      {representative.role && (
                        <p>{representative.role}</p>
                      )}
                    </div>

                    <a href={`mailto:${representative.email}`}>
                      {representative.email}
                    </a>
                  </article>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section className="section clean-section">
              <div className="section-head compact-section-head">
                <div>
                  <p className="eyebrow">Corsi di laurea</p>
                  <h2 className="display section-title">
                    Scegli il tuo corso
                  </h2>
                </div>
                <span className="section-count">
                  {faculty.courses.length} percors{faculty.courses.length === 1 ? "o" : "i"}
                </span>
              </div>

              <div className="courses-list">
                {faculty.courses.map((course) => (
                  <Link
                    key={course.slug}
                    href={`/matricole/${faculty.slug}/${course.slug}`}
                    className="course-row"
                  >
                    <div>
                      <span>Corso di laurea</span>
                      <h3>{course.name}</h3>
                    </div>

                    <strong>Apri →</strong>
                  </Link>
                ))}
              </div>
            </section>
          </Reveal>
        </div>
      </main>

      <MatricoleFacultyStyles />
    </>
  );
}

function MatricoleFacultyStyles() {
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
        border-radius: 2rem;
        padding: clamp(1.45rem, 3.5vw, 2.4rem);
        background:
          radial-gradient(circle at top right, rgba(200,212,245,.18), transparent 35%),
          var(--ink);
        color: white;
        box-shadow: 0 18px 48px rgba(8,16,42,.2);
        overflow: hidden;
        position: relative;
      }

      .hero::after {
        content: "";
        position: absolute;
        width: 260px;
        height: 260px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,.07);
        right: -70px;
        top: -90px;
        pointer-events: none;
      }

      .hero-content {
        position: relative;
        z-index: 1;
        max-width: 900px;
      }

      .back-link {
        display: inline-flex;
        margin-bottom: 1rem;
        color: rgba(255,255,255,.74);
        text-decoration: none;
        font-weight: 800;
        font-size: .88rem;
      }

      .back-link:hover {
        color: white;
      }

      .eyebrow {
        font-size: .68rem;
        font-weight: 800;
        letter-spacing: .2em;
        text-transform: uppercase;
        color: var(--ink-soft);
        margin-bottom: .85rem;
      }

      .hero .eyebrow {
        color: rgba(255,255,255,.6);
      }

      .hero-title {
        font-size: clamp(2.65rem, 6vw, 5rem);
        line-height: .92;
        letter-spacing: -.045em;
        max-width: 980px;
      }

      .hero-subtitle {
        margin-top: 1rem;
        max-width: 760px;
        color: rgba(255,255,255,.72);
        line-height: 1.7;
        font-size: .98rem;
      }


      .section {
        margin-top: clamp(1rem, 2.5vw, 2rem);
      }

      .clean-section {
        border-radius: 2rem;
        background: white;
        border: 1px solid rgba(8,16,42,.08);
        box-shadow: 0 14px 40px rgba(8,16,42,.055);
        padding: clamp(1.2rem, 3vw, 2rem);
      }

      .section-head {
        margin-bottom: clamp(1rem, 2.5vw, 1.6rem);
      }

      .compact-section-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .section-title {
        font-size: clamp(2rem, 4vw, 3.2rem);
        line-height: .98;
        letter-spacing: -.04em;
        color: var(--ink);
        margin-bottom: 0;
      }

      .muted {
        color: var(--mist);
        line-height: 1.8;
        max-width: 780px;
      }

      .section-count {
        border-radius: 999px;
        background: var(--blue-light);
        color: var(--ink-mid);
        padding: .45rem .8rem;
        font-size: .72rem;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .representatives-list,
      .courses-list {
        display: flex;
        flex-direction: column;
        gap: .65rem;
      }

      .representative-row,
      .course-row {
        border-radius: 1.15rem;
        border: 1px solid rgba(8,16,42,.08);
        background: rgba(248,247,243,.62);
        padding: 1rem 1.1rem;
      }

      .representative-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .representative-row h3,
      .course-row h3 {
        margin: 0;
        color: var(--ink);
        font-size: 1rem;
        line-height: 1.35;
        font-weight: 900;
      }

      .representative-row p {
        margin: .2rem 0 0;
        color: var(--mist);
        font-size: .86rem;
        line-height: 1.5;
      }

      .representative-row a {
        color: var(--ink-mid);
        font-weight: 900;
        text-decoration: none;
        overflow-wrap: anywhere;
        text-align: right;
      }

      .representative-row a:hover {
        color: var(--ink);
      }

      .course-row {
        color: inherit;
        text-decoration: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        transition: background .2s ease, border-color .2s ease, transform .2s ease;
      }

      .course-row:hover {
        background: white;
        border-color: rgba(8,16,42,.16);
        transform: translateY(-2px);
      }

      .course-row span {
        display: inline-flex;
        margin-bottom: .28rem;
        color: var(--ink-soft);
        font-size: .64rem;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .course-row strong {
        color: var(--ink-mid);
        font-size: .9rem;
        white-space: nowrap;
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

      .btn-primary {
        background: var(--ink);
        color: white;
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
        margin-top: 1.8rem;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
      }

      /* ── 768px: tablet ── */
      @media (max-width: 768px) {
        .matricole-page {
          padding: 5.5rem 1.2rem 3rem;
        }

        .hero::after {
          width: 180px;
          height: 180px;
          right: -40px;
          top: -60px;
        }

        .hero-subtitle {
          font-size: .92rem;
        }

        .section-title {
          font-size: clamp(1.8rem, 5vw, 2.8rem);
        }
      }

      /* ── 640px: large phone ── */
      @media (max-width: 640px) {
        .matricole-page {
          padding: 5rem 1rem 2.5rem;
        }

        .hero,
        .clean-section,
        .empty-state {
          padding: 1.4rem;
          border-radius: 1.6rem;
        }

        .hero-title {
          font-size: clamp(2.1rem, 8vw, 3rem);
        }

        .representative-row,
        .course-row {
          align-items: flex-start;
          flex-direction: column;
        }

        .representative-row a {
          text-align: left;
        }

        .compact-section-head {
          align-items: flex-start;
          flex-direction: column;
          gap: .5rem;
        }

        .btn-primary {
          width: 100%;
        }
      }

      /* ── 430px: small phone ── */
      @media (max-width: 430px) {
        .matricole-page {
          padding: 5rem 0.8rem 2rem;
        }

        .hero,
        .clean-section,
        .empty-state {
          padding: 1.2rem;
          border-radius: 1.3rem;
        }

        .representative-row,
        .course-row {
          padding: .85rem .9rem;
          border-radius: 1rem;
        }

        .empty-state h1 {
          font-size: clamp(2.2rem, 10vw, 3.6rem);
        }

        .back-link {
          font-size: .82rem;
        }

        .section-count {
          font-size: .66rem;
          padding: .4rem .7rem;
        }
      }
    `}</style>
  );
}