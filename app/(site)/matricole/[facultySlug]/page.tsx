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

              <div className="disclaimer">
                Testo demo: qui verranno indicati i contatti utili e le prime informazioni per orientarsi nella facoltà.
              </div>
            </div>
          </section>

          <Reveal>
            <section className="section">
              <div className="section-head">
                <p className="eyebrow">Contatti utili</p>
                <h2 className="display section-title">
                  Rappresentanti di facoltà.
                </h2>
                <p className="muted">
                  Testo demo: in questa sezione compariranno i rappresentanti di facoltà e i contatti principali.
                </p>
              </div>

              <div className="representatives-grid">
                {faculty.representatives.map((representative) => (
                  <article
                    key={`${representative.firstName}-${representative.lastName}-${representative.email}`}
                    className="representative-card"
                  >
                    <div className="avatar">
                      {representative.firstName.charAt(0)}
                      {representative.lastName.charAt(0)}
                    </div>

                    <div>
                      <h3>
                        {representative.firstName} {representative.lastName}
                      </h3>

                      {representative.role && (
                        <p className="role">{representative.role}</p>
                      )}

                      <a href={`mailto:${representative.email}`}>
                        {representative.email}
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section className="section">
              <div className="section-head">
                <p className="eyebrow">Corsi di laurea</p>
                <h2 className="display section-title">
                  Scegli il tuo corso.
                </h2>
                <p className="muted">
                  Testo demo: seleziona il corso di laurea corretto per vedere informazioni, rappresentanti, countdown alla prima lezione e accesso protetto al gruppo WhatsApp.
                </p>
              </div>

              <div className="courses-grid">
                {faculty.courses.map((course) => (
                  <Link
                    key={course.slug}
                    href={`/matricole/${faculty.slug}/${course.slug}`}
                    className="course-card"
                  >
                    <span className="course-kicker">Corso di laurea</span>

                    <h3 className="display">{course.name}</h3>

                    <p>{course.description}</p>

                    <div className="course-footer">
                      <span>{course.representatives.length} rappresentant{course.representatives.length === 1 ? "e" : "i"}</span>
                      <span>Apri →</span>
                    </div>
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

      .disclaimer {
        margin-top: 1rem;
        border-radius: 1.2rem;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.055);
        padding: .85rem 1rem;
        color: rgba(255,255,255,.82);
        line-height: 1.65;
        font-size: .92rem;
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

      .representatives-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      .representative-card {
        border-radius: 2rem;
        background: white;
        border: 1px solid rgba(8,16,42,.08);
        padding: 1.5rem;
        box-shadow: 0 14px 40px rgba(8,16,42,.06);
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .avatar {
        width: 58px;
        height: 58px;
        border-radius: 1.2rem;
        background: linear-gradient(135deg, var(--sky), var(--sky-deep));
        color: var(--ink-mid);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        flex-shrink: 0;
      }

      .representative-card h3 {
        margin: 0;
        color: var(--ink);
        font-size: 1.05rem;
      }

      .representative-card .role {
        margin-top: .25rem;
        color: var(--mist);
        font-size: .9rem;
        line-height: 1.5;
      }

      .representative-card a {
        display: inline-flex;
        margin-top: .45rem;
        color: var(--ink-mid);
        font-weight: 800;
        text-decoration: none;
        overflow-wrap: anywhere;
      }

      .representative-card a:hover {
        color: var(--ink);
      }

      .courses-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
      }

      .course-card {
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

      .course-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 55px rgba(8,16,42,.1);
        border-color: rgba(8,16,42,.16);
      }

      .course-kicker {
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

      .course-card h3 {
        margin-top: 1.4rem;
        color: var(--ink);
        font-size: clamp(2.2rem, 4vw, 3rem);
        line-height: .95;
      }

      .course-card p {
        margin-top: 1rem;
        color: var(--mist);
        line-height: 1.7;
        font-size: .94rem;
      }

      .course-footer {
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

      @media (max-width: 1000px) {
        .representatives-grid,
        .courses-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 760px) {
        .matricole-page {
          padding: 6rem 1rem 3rem;
        }

        .hero,
        .representative-card,
        .course-card,
        .empty-state {
          padding: 1.25rem;
          border-radius: 1.4rem;
        }

        .hero-title {
          font-size: clamp(2.3rem, 12vw, 3.4rem);
        }

        .representative-card {
          align-items: flex-start;
        }

        .course-card {
          min-height: auto;
        }

        .btn-primary {
          width: 100%;
        }
      }
    `}</style>
  );
}