"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FRESHERS_ALL_COURSES } from "@/lib/matricole/static-data";

type FreshersSettings = {
  id: string;
  isPageActive: boolean;
  homeBannerEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type FreshersCourseSetting = {
  id: string;
  courseSlug: string;
  firstLessonAt: string | null;
  whatsappUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

function cleanDateTimeLocalValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
      <label style={{ fontSize: ".8rem", fontWeight: 800, color: "#17315f" }}>
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          border: "1px solid rgba(15,47,110,.12)",
          background: "white",
          color: "#102a56",
          borderRadius: "12px",
          padding: ".85rem 1rem",
          fontSize: ".95rem",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  activeLabel,
  inactiveLabel,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  activeLabel: string;
  inactiveLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: `1px solid ${
          active ? "rgba(12,122,77,.25)" : "rgba(15,47,110,.12)"
        }`,
        background: active ? "rgba(12,122,77,.08)" : "rgba(15,47,110,.04)",
        color: active ? "#0b6b46" : "#6b7280",
        borderRadius: "999px",
        padding: ".72rem 1rem",
        fontWeight: 900,
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.65 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: ".5rem",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: active ? "#16a34a" : "#9ca3af",
        }}
      />
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        color: "#2E4080",
        fontSize: ".72rem",
        fontWeight: 900,
        letterSpacing: ".18em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </p>
  );
}

export default function AdminMatricolePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingCourseSlug, setSavingCourseSlug] = useState<string | null>(null);
  const [openCourseSlug, setOpenCourseSlug] = useState<string | null>(null);

  const [settings, setSettings] = useState<FreshersSettings | null>(null);

  const [courseSettings, setCourseSettings] = useState<
    Record<string, FreshersCourseSetting>
  >({});

  const [courseForms, setCourseForms] = useState<
    Record<string, { firstLessonAt: string; whatsappUrl: string }>
  >({});

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function checkAdminAndLoad() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        router.replace("/");
        return;
      }

      await fetchAll();
    }

    checkAdminAndLoad();
  }, [supabase, router]);

  async function fetchAll() {
    setLoading(true);
    setError("");

    try {
      const [settingsRes, coursesRes] = await Promise.all([
        fetch("/api/admin/matricole/settings"),
        fetch("/api/admin/matricole/course-settings"),
      ]);

      const [settingsJson, coursesJson] = await Promise.all([
        settingsRes.json().catch(() => ({})),
        coursesRes.json().catch(() => ({})),
      ]);

      if (!settingsRes.ok) {
        throw new Error(
          settingsJson.error || "Errore caricamento impostazioni matricole."
        );
      }

      if (!coursesRes.ok) {
        throw new Error(
          coursesJson.error || "Errore caricamento impostazioni corsi."
        );
      }

      setSettings(settingsJson.settings ?? null);

      const mappedCourses = (
        (coursesJson.courses ?? []) as FreshersCourseSetting[]
      ).reduce<Record<string, FreshersCourseSetting>>((acc, course) => {
        acc[course.courseSlug] = course;
        return acc;
      }, {});

      setCourseSettings(mappedCourses);

      const initialForms = FRESHERS_ALL_COURSES.reduce<
        Record<string, { firstLessonAt: string; whatsappUrl: string }>
      >((acc, course) => {
        const saved = mappedCourses[course.slug];

        acc[course.slug] = {
          firstLessonAt: cleanDateTimeLocalValue(saved?.firstLessonAt ?? null),
          whatsappUrl: saved?.whatsappUrl ?? "",
        };

        return acc;
      }, {});

      setCourseForms(initialForms);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Errore durante il caricamento della pagina admin matricole."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(nextSettings: {
    isPageActive: boolean;
    homeBannerEnabled: boolean;
  }) {
    if (savingSettings) return;

    setSavingSettings(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/matricole/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || "Salvataggio impostazioni non riuscito.");
      }

      setSettings(json.settings);
      setSuccess("Impostazioni matricole salvate.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Errore durante il salvataggio delle impostazioni."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  function updateCourseForm(
    courseSlug: string,
    key: "firstLessonAt" | "whatsappUrl",
    value: string
  ) {
    setCourseForms((current) => ({
      ...current,
      [courseSlug]: {
        firstLessonAt: current[courseSlug]?.firstLessonAt ?? "",
        whatsappUrl: current[courseSlug]?.whatsappUrl ?? "",
        [key]: value,
      },
    }));
  }

  function toggleCourse(courseSlug: string) {
    setOpenCourseSlug((current) => (current === courseSlug ? null : courseSlug));
  }

  async function saveCourse(courseSlug: string) {
    const form = courseForms[courseSlug];

    if (!form) return;

    if (form.whatsappUrl.trim()) {
      try {
        const parsed = new URL(form.whatsappUrl.trim());

        if (!["http:", "https:"].includes(parsed.protocol)) {
          setError("Il link WhatsApp deve iniziare con http:// o https://.");
          return;
        }
      } catch {
        setError("Inserisci un link WhatsApp valido.");
        return;
      }
    }

    setSavingCourseSlug(courseSlug);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/matricole/course-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseSlug,
          firstLessonAt: form.firstLessonAt || null,
          whatsappUrl: form.whatsappUrl.trim() || null,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || "Salvataggio corso non riuscito.");
      }

      setCourseSettings((current) => ({
        ...current,
        [courseSlug]: json.course,
      }));

      setSuccess("Impostazioni corso salvate.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Errore durante il salvataggio del corso."
      );
    } finally {
      setSavingCourseSlug(null);
    }
  }

  const configuredCourses = Object.keys(courseSettings).length;

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg,#f7f9fc 0%,#eef3fb 100%)",
          padding: "8.5rem 1.5rem 4rem",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            background: "white",
            border: "1px solid rgba(15,47,110,.08)",
            borderRadius: "2rem",
            padding: "2rem",
            color: "#0f2f6e",
            fontWeight: 900,
          }}
        >
          Caricamento gestione matricole...
        </div>
      </main>
    );
  }

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg,#f7f9fc 0%,#eef3fb 100%)",
          padding: "8.5rem 1.5rem 4rem",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <section
            style={{
              background: "linear-gradient(135deg,#0f2f6e 0%,#1847a3 100%)",
              borderRadius: "2rem",
              padding: "clamp(1.5rem,3vw,2.5rem)",
              color: "white",
              boxShadow: "0 24px 60px rgba(15,47,110,.18)",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <span
                  style={{
                    display: "inline-flex",
                    padding: ".4rem .9rem",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.12)",
                    border: "1px solid rgba(255,255,255,.18)",
                    fontSize: ".85rem",
                    fontWeight: 800,
                    marginBottom: ".75rem",
                  }}
                >
                  Amministrazione • Matricole
                </span>

                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(2rem,5vw,3rem)",
                    lineHeight: 1.05,
                    fontWeight: 900,
                  }}
                >
                  Gestione matricole.
                </h1>

                <p
                  style={{
                    margin: ".75rem 0 0",
                    color: "rgba(255,255,255,.8)",
                    lineHeight: 1.6,
                    maxWidth: 620,
                  }}
                >
                  Attiva la sezione matricole, controlla il banner in homepage e imposta i dati variabili dei corsi.
                </p>
              </div>

              <a
                href="/admin"
                style={{
                  textDecoration: "none",
                  color: "white",
                  padding: ".85rem 1.3rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,.2)",
                  background: "rgba(255,255,255,.1)",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                Pannello admin
              </a>
            </div>
          </section>

          {(error || success) && (
            <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              {error && (
                <div className="admin-alert admin-alert-error">
                  {error}
                  <button onClick={() => setError("")}>✕</button>
                </div>
              )}

              {success && (
                <div className="admin-alert admin-alert-success">
                  {success}
                  <button onClick={() => setSuccess("")}>✕</button>
                </div>
              )}
            </div>
          )}

          <section className="admin-card">
            <div className="section-head">
              <div>
                <SectionLabel>Impostazioni generali</SectionLabel>
                <h2 className="section-title">Visibilità sezione matricole</h2>
                <p className="section-muted">
                  Queste impostazioni controllano la visibilità della sezione pubblica e del banner in homepage.
                </p>
              </div>
            </div>

            <div className="settings-grid">
              <div className="setting-box">
                <div>
                  <h3>Pagina matricole</h3>
                  <p>
                    Se disattivata, le pagine pubbliche Matricole non saranno disponibili.
                  </p>
                </div>

                <ToggleButton
                  active={Boolean(settings?.isPageActive)}
                  disabled={savingSettings}
                  activeLabel="Pagina attiva"
                  inactiveLabel="Pagina disattiva"
                  onClick={() =>
                    saveSettings({
                      isPageActive: !Boolean(settings?.isPageActive),
                      homeBannerEnabled: Boolean(settings?.homeBannerEnabled),
                    })
                  }
                />
              </div>

              <div className="setting-box">
                <div>
                  <h3>Banner homepage</h3>
                  <p>
                    Il banner compare solo se anche la pagina Matricole è attiva.
                  </p>
                </div>

                <ToggleButton
                  active={Boolean(settings?.homeBannerEnabled)}
                  disabled={savingSettings}
                  activeLabel="Banner attivo"
                  inactiveLabel="Banner disattivo"
                  onClick={() =>
                    saveSettings({
                      isPageActive: Boolean(settings?.isPageActive),
                      homeBannerEnabled: !Boolean(settings?.homeBannerEnabled),
                    })
                  }
                />
              </div>
            </div>
          </section>

          <section className="admin-card compact-card">
            <div className="section-head compact-head">
              <div>
                <SectionLabel>Impostazioni corsi</SectionLabel>
                <h2 className="section-title">Prima lezione e link WhatsApp</h2>
                <p className="section-muted">
                  Clicca su un corso per aprire la sezione e modificare solo i dati di quel CdL.
                </p>
              </div>

              <span className="courses-counter">
                {configuredCourses}/{FRESHERS_ALL_COURSES.length} configurati
              </span>
            </div>

            <div className="courses-list">
              {FRESHERS_ALL_COURSES.map((course) => {
                const form = courseForms[course.slug] ?? {
                  firstLessonAt: "",
                  whatsappUrl: "",
                };

                const saving = savingCourseSlug === course.slug;
                const isOpen = openCourseSlug === course.slug;
                const isConfigured = Boolean(courseSettings[course.slug]);

                return (
                  <div
                    key={course.slug}
                    className={`course-row ${isOpen ? "course-row-open" : ""}`}
                  >
                    <button
                      type="button"
                      className="course-row-trigger"
                      onClick={() => toggleCourse(course.slug)}
                      aria-expanded={isOpen}
                    >
                      <div className="course-row-main">
                        <span className="faculty-badge">{course.facultyName}</span>
                        <strong>{course.name}</strong>
                      </div>

                      <div className="course-row-meta">
                        {isConfigured && (
                          <span className="configured-badge">Configurato</span>
                        )}
                        <span className="course-chevron">{isOpen ? "↑" : "↓"}</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="course-row-panel">
                        <div className="course-fields">
                          <Field
                            label="Data e ora prima lezione"
                            type="datetime-local"
                            value={form.firstLessonAt}
                            onChange={(value) =>
                              updateCourseForm(course.slug, "firstLessonAt", value)
                            }
                          />

                          <Field
                            label="Link WhatsApp"
                            value={form.whatsappUrl}
                            onChange={(value) =>
                              updateCourseForm(course.slug, "whatsappUrl", value)
                            }
                            placeholder="https://chat.whatsapp.com/..."
                          />
                        </div>

                        <div className="course-actions">
                          <button
                            type="button"
                            onClick={() => saveCourse(course.slug)}
                            disabled={saving}
                          >
                            {saving ? "Salvataggio..." : "Salva dati corso"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <style>{`
        .admin-card {
          background: rgba(255,255,255,.86);
          border: 1px solid rgba(15,47,110,.08);
          box-shadow: 0 8px 32px rgba(15,47,110,.07);
          backdrop-filter: blur(12px);
          border-radius: 2rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .compact-card {
          gap: 1rem;
        }

        .section-head {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .compact-head {
          align-items: center;
        }

        .section-title {
          margin: .35rem 0 0;
          color: #0f2f6e;
          font-size: 1.45rem;
          font-weight: 900;
          line-height: 1.1;
        }

        .section-muted {
          margin: .45rem 0 0;
          color: #6b7280;
          line-height: 1.6;
          max-width: 760px;
        }

        .courses-counter {
          border-radius: 999px;
          background: rgba(15,47,110,.06);
          color: #0f2f6e;
          padding: .5rem .85rem;
          font-size: .78rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .setting-box {
          border: 1px solid rgba(15,47,110,.08);
          background: white;
          border-radius: 1.4rem;
          padding: 1.2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .setting-box h3 {
          margin: 0;
          color: #08102A;
          font-size: 1rem;
          font-weight: 900;
        }

        .setting-box p {
          margin: .35rem 0 0;
          color: #6b7280;
          line-height: 1.5;
          font-size: .9rem;
        }

        .courses-list {
          display: flex;
          flex-direction: column;
          gap: .55rem;
        }

        .course-row {
          border: 1px solid rgba(15,47,110,.08);
          background: white;
          border-radius: 1.15rem;
          overflow: hidden;
          box-shadow: 0 8px 22px rgba(15,47,110,.045);
        }

        .course-row-open {
          border-color: rgba(15,47,110,.16);
          box-shadow: 0 14px 34px rgba(15,47,110,.075);
        }

        .course-row-trigger {
          width: 100%;
          border: none;
          background: transparent;
          padding: .82rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
        }

        .course-row-trigger:hover {
          background: rgba(15,47,110,.025);
        }

        .course-row-main {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: .75rem;
        }

        .course-row-main strong {
          color: #08102A;
          font-size: .98rem;
          font-weight: 900;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .course-row-meta {
          display: flex;
          align-items: center;
          gap: .55rem;
          flex-shrink: 0;
        }

        .course-chevron {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: rgba(15,47,110,.06);
          color: #0f2f6e;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .course-row-panel {
          border-top: 1px solid rgba(15,47,110,.08);
          background: rgba(15,47,110,.025);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .faculty-badge,
        .configured-badge {
          display: inline-flex;
          border-radius: 999px;
          padding: .25rem .62rem;
          font-size: .63rem;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .faculty-badge {
          background: rgba(15,47,110,.07);
          color: #0f2f6e;
        }

        .configured-badge {
          background: rgba(12,122,77,.08);
          color: #0b6b46;
        }

        .course-fields {
          display: grid;
          grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
          gap: 1rem;
        }

        .course-actions {
          display: flex;
          justify-content: flex-end;
        }

        .course-actions button {
          border: none;
          background: #1847a3;
          color: white;
          border-radius: 999px;
          padding: .75rem 1.4rem;
          font-weight: 900;
          cursor: pointer;
          font-family: inherit;
        }

        .course-actions button:disabled {
          background: #8ca4d7;
          cursor: wait;
        }

        .admin-alert {
          border-radius: 1rem;
          padding: .9rem 1.1rem;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
        }

        .admin-alert button {
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 900;
        }

        .admin-alert-error {
          background: rgba(190,39,39,.08);
          color: #8b1d1d;
          border: 1px solid rgba(190,39,39,.14);
        }

        .admin-alert-error button {
          color: #8b1d1d;
        }

        .admin-alert-success {
          background: rgba(12,122,77,.08);
          color: #0b6b46;
          border: 1px solid rgba(12,122,77,.14);
        }

        .admin-alert-success button {
          color: #0b6b46;
        }

        @media (max-width: 860px) {
          .settings-grid,
          .course-fields {
            grid-template-columns: 1fr;
          }

          .setting-box {
            align-items: flex-start;
            flex-direction: column;
          }

          .course-actions button {
            width: 100%;
          }

          .course-row-trigger {
            align-items: flex-start;
          }

          .course-row-main {
            align-items: flex-start;
            flex-direction: column;
            gap: .45rem;
          }

          .course-row-main strong {
            white-space: normal;
          }

          .course-row-meta {
            align-items: flex-end;
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}