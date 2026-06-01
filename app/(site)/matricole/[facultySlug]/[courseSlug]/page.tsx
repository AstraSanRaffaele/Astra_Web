"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/ui/navbar";
import { createClient } from "@/lib/supabase/client";
import {
  getFreshersCourseBySlug,
  getFreshersFacultyBySlug,
} from "@/lib/matricole/static-data";

type FreshersStatusResponse = {
  ok?: boolean;
  isPageActive?: boolean;
  homeBannerEnabled?: boolean;
  error?: string;
};

type PublicCourseSetting = {
  courseSlug: string;
  firstLessonAt: string | null;
};

type PublicCourseSettingsResponse = {
  ok?: boolean;
  courses?: PublicCourseSetting[];
  error?: string;
};

type CountdownValue = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
};

function getCountdown(targetDate: string | null): CountdownValue | null {
  if (!targetDate) return null;

  const target = new Date(targetDate).getTime();

  if (Number.isNaN(target)) return null;

  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
    };
  }

  const totalSeconds = Math.floor(diff / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isPast: false,
  };
}

function formatLessonDate(value: string | null) {
  if (!value) return "Data non ancora impostata";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Data non valida";

  return date.toLocaleString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

export default function MatricoleCoursePage() {
  const params = useParams<{
    facultySlug: string;
    courseSlug: string;
  }>();

  const facultySlug = params?.facultySlug;
  const courseSlug = params?.courseSlug;

  const faculty = facultySlug ? getFreshersFacultyBySlug(facultySlug) : null;

  const course =
    facultySlug && courseSlug
      ? getFreshersCourseBySlug(facultySlug, courseSlug)
      : null;

  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [isPageActive, setIsPageActive] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firstLessonAt, setFirstLessonAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<CountdownValue | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPageData() {
      setLoading(true);
      setError("");

      try {
        const [{ data: authData }, statusRes, courseSettingsRes] =
          await Promise.all([
            supabase.auth.getUser(),
            fetch("/api/matricole/status", { cache: "no-store" }),
            fetch("/api/matricole/course-settings", { cache: "no-store" }),
          ]);

        setIsAuthenticated(Boolean(authData.user));

        const statusJson =
          (await statusRes.json().catch(() => ({}))) as FreshersStatusResponse;

        if (!statusRes.ok) {
          throw new Error(
            statusJson.error ||
              "Errore durante il caricamento dello stato matricole.",
          );
        }

        const pageActive = Boolean(statusJson.isPageActive);
        setIsPageActive(pageActive);

        if (!pageActive) {
          setFirstLessonAt(null);
          return;
        }

        const courseSettingsJson =
          (await courseSettingsRes
            .json()
            .catch(() => ({}))) as PublicCourseSettingsResponse;

        if (!courseSettingsRes.ok) {
          throw new Error(
            courseSettingsJson.error ||
              "Errore durante il caricamento delle impostazioni del corso.",
          );
        }

        const setting =
          courseSettingsJson.courses?.find(
            (item) => item.courseSlug === courseSlug,
          ) ?? null;

        setFirstLessonAt(setting?.firstLessonAt ?? null);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento della pagina corso.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadPageData();
  }, [supabase, courseSlug]);

  useEffect(() => {
    setCountdown(getCountdown(firstLessonAt));

    if (!firstLessonAt) return;

    const interval = window.setInterval(() => {
      setCountdown(getCountdown(firstLessonAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [firstLessonAt]);

  if (!faculty || !course) {
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
              <p>Stiamo verificando le informazioni del corso.</p>
            </section>
          </div>
        </main>

        <MatricoleCourseStyles />
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

        <MatricoleCourseStyles />
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
                Testo demo: questa sezione sarà attivata quando saranno
                disponibili le informazioni per le nuove matricole.
              </p>
              <Link href="/" className="btn-primary dark-btn">
                Torna alla homepage
              </Link>
            </section>
          </div>
        </main>

        <MatricoleCourseStyles />
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
              <Link href={`/matricole/${faculty.slug}`} className="back-link">
                ← Torna a {faculty.name}
              </Link>

              <p className="eyebrow">Corso di laurea</p>

              <h1 className="display hero-title">{course.name}</h1>

              <p className="hero-subtitle">{course.description}</p>

              <div className="disclaimer">
                Testo demo: qui verranno inserite le informazioni principali del
                corso di laurea.
              </div>
            </div>
          </section>

          <Reveal>
            <section className="section">
              <div className="section-head">
                <p className="eyebrow">Prima lezione</p>
                <h2 className="display section-title">
                  Countdown all’inizio.
                </h2>
                <p className="muted">
                  Testo demo: questa sezione aiuterà le matricole a capire
                  quando inizieranno le lezioni.
                </p>
              </div>

              <div className="countdown-card">
                <div className="countdown-head">
                  <div>
                    <span className="countdown-kicker">Prima lezione</span>
                    <h3>{formatLessonDate(firstLessonAt)}</h3>
                  </div>
                </div>

                {!firstLessonAt ? (
                  <div className="countdown-empty">
                    La data della prima lezione non è ancora stata impostata.
                  </div>
                ) : countdown?.isPast ? (
                  <div className="countdown-finished">
                    Le lezioni sono iniziate. Buon inizio percorso!
                  </div>
                ) : (
                  <>
                    <p className="countdown-label">Prima lezione tra</p>

                    <div className="countdown-grid">
                      {[
                        ["Giorni", countdown?.days ?? 0],
                        ["Ore", countdown?.hours ?? 0],
                        ["Minuti", countdown?.minutes ?? 0],
                        ["Secondi", countdown?.seconds ?? 0],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="countdown-box">
                          <strong>{String(value).padStart(2, "0")}</strong>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section className="section">
              <div className="section-head">
                <p className="eyebrow">Contatti utili</p>
                <h2 className="display section-title">
                  Rappresentanti del corso.
                </h2>
                <p className="muted">
                  Testo demo: qui verranno mostrati i rappresentanti del corso e
                  i contatti principali.
                </p>
              </div>

              <div className="representatives-grid">
                {course.representatives.map((representative) => (
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
              <div className="whatsapp-card">
                <div>
                  <p className="eyebrow">Community</p>
                  <h2 className="display section-title">
                    Accedi al gruppo WhatsApp del tuo corso.
                  </h2>
                  <p className="muted">
                    Testo demo: questa sezione accompagnerà gli studenti verso il
                    gruppo WhatsApp del corso. Il link reale non viene mai
                    caricato nella pagina pubblica.
                  </p>
                </div>

                {isAuthenticated ? (
                  <div className="whatsapp-actions">
                    <a
                      href={`/api/matricole/whatsapp/${course.slug}`}
                      className="btn-primary"
                    >
                      Accedi al gruppo WhatsApp
                    </a>

                    <p className="security-note">
                      Il pulsante apre una route interna protetta. Il link reale
                      verrà gestito lato server nello Step 11.
                    </p>
                  </div>
                ) : (
                  <div className="login-box">
                    <p>
                      Per accedere al gruppo WhatsApp devi effettuare il login o
                      registrarti al sito.
                    </p>

                    <div className="login-actions">
                      <Link
                        href={`/login?redirect=/matricole/${faculty.slug}/${course.slug}`}
                        className="btn-primary"
                      >
                        Accedi
                      </Link>

                      <Link
                        href={`/register?redirect=/matricole/${faculty.slug}/${course.slug}`}
                        className="btn-outline-light"
                      >
                        Registrati
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </Reveal>
        </div>
      </main>

      <MatricoleCourseStyles />
    </>
  );
}

function MatricoleCourseStyles() {
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
        max-width: 900px;
      }

      .back-link {
        display: inline-flex;
        margin-bottom: 1.5rem;
        color: rgba(255,255,255,.74);
        text-decoration: none;
        font-weight: 800;
        font-size: .92rem;
      }

      .back-link:hover {
        color: white;
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
        font-size: clamp(4rem, 10vw, 8rem);
        line-height: .86;
        letter-spacing: -.06em;
      }

      .hero-subtitle {
        margin-top: 1.5rem;
        max-width: 760px;
        color: rgba(255,255,255,.78);
        line-height: 1.8;
        font-size: 1.08rem;
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

      .countdown-card,
      .whatsapp-card,
      .representative-card {
        border-radius: 2rem;
        background: white;
        border: 1px solid rgba(8,16,42,.08);
        box-shadow: 0 14px 40px rgba(8,16,42,.06);
      }

      .countdown-card {
        padding: 2rem;
      }

      .countdown-head {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
        flex-wrap: wrap;
      }

      .countdown-kicker {
        display: inline-flex;
        border-radius: 999px;
        padding: .4rem .75rem;
        background: var(--blue-light);
        color: var(--ink-mid);
        font-size: .72rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: .08em;
      }

      .countdown-card h3 {
        margin: 1rem 0 0;
        color: var(--ink);
        font-size: 1.3rem;
        line-height: 1.4;
        text-transform: capitalize;
      }

      .countdown-label {
        margin-top: 2rem;
        color: var(--ink-mid);
        font-weight: 900;
      }

      .countdown-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }

      .countdown-box {
        border-radius: 1.4rem;
        background: var(--cream);
        border: 1px solid rgba(8,16,42,.08);
        padding: 1.2rem;
        text-align: center;
      }

      .countdown-box strong {
        display: block;
        color: var(--ink);
        font-size: clamp(2rem, 5vw, 3.4rem);
        line-height: 1;
        letter-spacing: -.04em;
      }

      .countdown-box span {
        display: block;
        margin-top: .55rem;
        color: var(--mist);
        font-size: .74rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: .08em;
      }

      .countdown-empty,
      .countdown-finished {
        margin-top: 1.5rem;
        border-radius: 1.4rem;
        padding: 1rem 1.2rem;
        line-height: 1.7;
        font-weight: 800;
      }

      .countdown-empty {
        background: var(--blue-light);
        color: var(--ink-mid);
        border: 1px solid rgba(8,16,42,.08);
      }

      .countdown-finished {
        background: #ecfdf5;
        color: #047857;
        border: 1px solid #bbf7d0;
      }

      .representatives-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      .representative-card {
        padding: 1.5rem;
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

      .whatsapp-card {
        padding: 2rem;
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr);
        gap: 2rem;
        align-items: center;
      }

      .whatsapp-actions,
      .login-box {
        border-radius: 1.5rem;
        padding: 1.2rem;
        background: var(--cream);
        border: 1px solid rgba(8,16,42,.08);
      }

      .security-note,
      .login-box p {
        margin-top: .9rem;
        color: var(--mist);
        line-height: 1.65;
        font-size: .9rem;
      }

      .login-actions {
        display: flex;
        gap: .75rem;
        flex-wrap: wrap;
        margin-top: 1rem;
      }

      .btn-primary,
      .btn-outline-light {
        border-radius: 999px;
        padding: 1rem 1.4rem;
        text-decoration: none;
        font-weight: 900;
        transition: .2s ease;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .btn-primary {
        background: var(--ink);
        color: white;
        border: none;
      }

      .btn-primary:hover,
      .btn-outline-light:hover {
        transform: translateY(-2px);
      }

      .btn-outline-light {
        border: 1px solid rgba(8,16,42,.12);
        color: var(--ink);
        background: white;
      }

      .dark-btn {
        margin-top: 1.8rem;
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

      @media (max-width: 1000px) {
        .representatives-grid,
        .whatsapp-card {
          grid-template-columns: 1fr;
        }

        .countdown-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 760px) {
        .matricole-page {
          padding: 6rem 1rem 3rem;
        }

        .hero,
        .countdown-card,
        .representative-card,
        .whatsapp-card,
        .empty-state {
          padding: 1.5rem;
          border-radius: 1.6rem;
        }

        .representative-card {
          align-items: flex-start;
        }

        .btn-primary,
        .btn-outline-light {
          width: 100%;
        }
      }

      @media (max-width: 520px) {
        .countdown-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}