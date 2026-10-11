"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, Check, Copy, ExternalLink, LoaderCircle, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { COURSES, selectLessons, type CalendarView, type CourseKey, type Lesson } from "@/lib/university-calendar/types";
import { GOOGLE_CALENDAR_SUBSCRIPTION_URL } from "@/lib/university-calendar/config";
import styles from "./calendar-builder.module.css";

type Subject = { key: string; title: string; teacher: string };
type Preview = { lessons: Lesson[]; lines: string[]; subjects: Subject[]; start: string; end: string };

async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, { method: body ? "POST" : "GET", cache: "no-store", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Impossibile completare la richiesta.");
  return data as T;
}

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" });
}

function timeLabel(date: string) {
  return new Date(date).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
}

function Subjects({ subjects, selected, onChange }: { subjects: Subject[]; selected: string[]; onChange: (keys: string[]) => void }) {
  return <div className={styles.subjects}>
    {subjects.map((subject) => <label className={styles.checkbox} key={subject.key}>
      <input type="checkbox" checked={selected.includes(subject.key)} onChange={(event) => onChange(event.target.checked ? [...selected, subject.key] : selected.filter((key) => key !== subject.key))} />
      <span><strong>{subject.title}</strong>{subject.teacher && <small>{subject.teacher}</small>}</span>
    </label>)}
  </div>;
}

function SavedSubjects({ calendar, busy, save }: { calendar: CalendarView; busy: boolean; save: (body: Record<string, unknown>) => Promise<void> }) {
  const [selected, setSelected] = useState(calendar.included_subjects);
  const changed = JSON.stringify([...selected].sort()) !== JSON.stringify([...calendar.included_subjects].sort());
  if (!calendar.subjects.length) return null;
  return <details className={styles.details}>
    <summary>Attività senza linea <span>{calendar.subjects.length}</span></summary>
    <p className={styles.hint}>Attività trovate nell’intero semestre. Includi solo quelle che vuoi seguire.</p>
    <Subjects subjects={calendar.subjects} selected={selected} onChange={setSelected} />
    <button className={styles.secondary} type="button" disabled={busy || !changed} onClick={() => void save({ action: "subjects", id: calendar.id, included_subjects: selected })}>Salva selezione</button>
  </details>;
}

export default function CalendarBuilder({ today, audience = "admin", enabled = true }: { today: string; audience?: "admin" | "user"; enabled?: boolean }) {
  const API = audience === "admin" ? "/api/admin/university-calendar" : "/api/university-calendar";
  const [course, setCourse] = useState<CourseKey>("medicina");
  const [year, setYear] = useState(1);
  const [line, setLine] = useState("");
  const [previewDate, setPreviewDate] = useState(today);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [name, setName] = useState("");
  const [included, setIncluded] = useState<string[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [calendars, setCalendars] = useState<CalendarView[]>([]);
  const existingCalendar = calendars[0] ?? null;
  const [scheduler, setScheduler] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const mutationBusy = useRef(false);
  const previewSequence = useRef(0);
  const creationId = useRef<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const data = await request<{ calendars: CalendarView[]; scheduler: { enabled: boolean } | null }>(API);
    setCalendars(data.calendars);
    setScheduler(data.scheduler?.enabled ?? false);
  }, [API, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    request<{ calendars: CalendarView[]; scheduler: { enabled: boolean } | null }>(API).then((data) => {
      if (active) { setCalendars(data.calendars); setScheduler(data.scheduler?.enabled ?? false); }
    }).catch((cause: Error) => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [API, enabled]);

  // Continue imports while this page is open, including before the scheduler is enabled.
  // Database leases also protect against another tab or the scheduled worker.
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (mutationBusy.current || previewBusy) return;
      const pending = calendars.find((calendar) => calendar.enabled && calendar.sync_cursor !== null && (!calendar.retry_at || Date.parse(calendar.retry_at) <= Date.now()));
      if (!pending) return;
      mutationBusy.current = true; setBusy(true);
      try { await request(API, { action: "continue", id: pending.id }); if (active) await reload(); }
      catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Importazione interrotta. Riprova tra poco."); }
      finally { mutationBusy.current = false; setBusy(false); }
    }, 4000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [API, calendars, enabled, previewBusy, reload]);

  // Poll to pick up scheduled progress and retry times without repeatedly fetching UniSR.
  useEffect(() => {
    if (!calendars.some((calendar) => calendar.enabled && calendar.sync_cursor !== null)) return;
    const timer = window.setInterval(() => { if (!mutationBusy.current) void reload().catch(() => undefined); }, 15000);
    return () => window.clearInterval(timer);
  }, [calendars, reload]);

  function resetPreview() {
    previewSequence.current += 1;
    setPreview(null); setLine(""); setIncluded([]); setPreviewBusy(false); creationId.current = null;
  }

  async function loadPreview(event: FormEvent) {
    event.preventDefault();
    if (!enabled) return;
    const sequence = ++previewSequence.current;
    setPreviewBusy(true); setError(""); setNotice("");
    try {
      const data = await request<Preview>(`${API}/preview`, { course, year, date: previewDate });
      if (sequence !== previewSequence.current) return;
      setPreview(data); setIncluded([]); setLine(data.lines.length === 1 ? data.lines[0] : ""); creationId.current = null;
    } catch (cause) { if (sequence === previewSequence.current) setError(cause instanceof Error ? cause.message : "Anteprima non disponibile."); }
    finally { if (sequence === previewSequence.current) setPreviewBusy(false); }
  }

  async function mutate(body: Record<string, unknown>) {
    if (!enabled) return;
    if (mutationBusy.current) { setError("Attendi il completamento della lettura in corso."); throw new Error("Lettura in corso."); }
    mutationBusy.current = true; setBusy(true); setError(""); setNotice("");
    try { await request(API, body); await reload(); setNotice("Modifiche salvate."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Impossibile salvare."); throw cause; }
    finally { mutationBusy.current = false; setBusy(false); }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!enabled || !preview || !line) return;
    creationId.current ??= crypto.randomUUID();
    try {
      await mutate({ action: existingCalendar ? "settings" : "create", id: existingCalendar?.id ?? creationId.current, settings: { name: name.trim() || `${COURSES.find((item) => item.key === course)!.label} · ${year}° · ${line}`, course, year, line, semester_start: start, semester_end: end, included_subjects: included } });
      creationId.current = null;
      setNotice(existingCalendar ? "Calendario modificato. Il link resta lo stesso e sarà pronto dopo la lettura del semestre selezionato." : "Calendario creato. Il link sarà pronto al termine della prima importazione del semestre.");
    } catch { /* The error is shown above the form; keep the ID for a safe retry. */ }
  }

  async function copy(url: string, google = false) {
    try { await navigator.clipboard.writeText(url); setNotice(google ? "Link copiato. Incollalo nel campo Da URL di Google Calendar e premi Aggiungi calendario." : "Link copiato. Usalo come abbonamento in Calendario Apple o in Google Calendar, scegliendo Da URL."); }
    catch { setError("Copia il link dal campo del calendario."); }
  }

  const visible = preview && line ? selectLessons(preview.lessons, { name: "", course, year, line, semester_start: preview.start, semester_end: preview.end, included_subjects: included }) : [];
  const safeMutate = async (body: Record<string, unknown>) => { try { await mutate(body); } catch { /* Visible status already set. */ } };

  return <main className={`${styles.page} ${audience === "user" ? styles.publicPage : ""}`}>
    <div className={styles.shell}>
      <Link className={styles.back} href={audience === "admin" ? "/admin" : "/profile"}><ArrowLeft size={16} /> {audience === "admin" ? "Pannello admin" : "Il tuo profilo"}</Link>
      <header className={styles.hero}>
        <div><span className={styles.tag}>{audience === "admin" ? "Strumenti admin · UniSR" : "ASTRA · Il tuo calendario universitario"}</span><h1>Il semestre, <em>nel tuo calendario.</em></h1><p>Seleziona corso, anno e linea. ASTRA legge gli orari ufficiali e prepara un abbonamento per Calendario Apple e Google Calendar.</p></div>
        <div className={styles.heroIcon}><CalendarDays size={44} strokeWidth={1.3} /></div>
        <span className={styles.private}><ShieldCheck size={15} /> {audience === "admin" ? "Accesso riservato a Edoardo" : "I tuoi corsi, il tuo link personale"}</span>
      </header>

      {!enabled && <div className={styles.launchNotice} role="status"><CalendarDays size={22} /><div><strong>Il tuo calendario, prossimamente.</strong><p>Stiamo preparando il servizio. Qui potrai scegliere le tue lezioni e aggiungerle a Calendario Apple o Google Calendar.</p></div></div>}

      {error && <div className={styles.error} role="alert">{error}</div>}
      {notice && <div className={styles.success} role="status"><Check size={18} />{notice}</div>}

      <div className={styles.layout}>
        <section className={styles.card}>
          <div className={styles.sectionHead}><span className={styles.step}>01</span><div><h2>{existingCalendar ? "Modifica il tuo calendario" : "Crea il tuo calendario"}</h2><p>Parti da una settimana di lezioni.</p></div></div>
          <form onSubmit={loadPreview}><fieldset className={styles.fieldset} disabled={!enabled}>
            <div className={styles.fields}>
              <label className={styles.wide}>Corso di laurea<select value={course} onChange={(event) => { setCourse(event.target.value as CourseKey); resetPreview(); }}>
                {COURSES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select></label>
              <label>Anno<select value={year} onChange={(event) => { setYear(Number(event.target.value)); resetPreview(); }}>{[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}° anno</option>)}</select></label>
              <label>Settimana dal<input type="date" required value={previewDate} onChange={(event) => { setPreviewDate(event.target.value); resetPreview(); }} /></label>
            </div>
            <button className={styles.secondary} disabled={previewBusy || busy} type="submit">{previewBusy ? <LoaderCircle className={styles.spin} size={17} /> : <RefreshCw size={17} />}{previewBusy ? "Lettura degli orari…" : "Leggi gli orari UniSR"}</button>
          </fieldset></form>

          <form onSubmit={create} className={styles.createForm}><fieldset className={styles.fieldset} disabled={!enabled}>
            <label>Linea<select required value={line} disabled={!preview || previewBusy} onChange={(event) => { setLine(event.target.value); creationId.current = null; }}>
              <option value="">{preview ? "Seleziona la linea" : "Leggi prima gli orari"}</option>
              {preview?.lines.map((value) => <option key={value} value={value}>Linea {value.toLocaleLowerCase("it")}</option>)}
              {preview && preview.subjects.length > 0 && <option value="COMUNE">Solo attività senza linea</option>}
            </select></label>
            {preview && !preview.lines.length && <p className={styles.hint}>Nessuna linea indicata in questa settimana. Prova un’altra data del semestre{preview.subjects.length > 0 ? " oppure scegli le attività senza linea." : "."}</p>}
            <div className={styles.fields}>
              <label>Inizio semestre<input type="date" required value={start} onChange={(event) => { setStart(event.target.value); creationId.current = null; }} /></label>
              <label>Fine semestre<input type="date" required min={start || undefined} value={end} onChange={(event) => { setEnd(event.target.value); creationId.current = null; }} /></label>
              <label className={styles.wide}>Nome calendario <span className={styles.optional}>(facoltativo)</span><input maxLength={100} placeholder="Es. Medicina · 4° anno · Linea bianca" value={name} onChange={(event) => { setName(event.target.value); creationId.current = null; }} /></label>
            </div>
            {preview && preview.subjects.length > 0 && <div className={styles.unassigned}><h3>Attività senza linea</h3><p className={styles.hint}>Scegli quali includere. Dopo l’importazione potrai vedere anche quelle delle altre settimane.</p><Subjects subjects={preview.subjects} selected={included} onChange={(keys) => { setIncluded(keys); creationId.current = null; }} /></div>}
            <button className={styles.primary} disabled={!enabled || !preview || !line || loading || busy || previewBusy} type="submit">{busy ? <LoaderCircle className={styles.spin} size={18} /> : existingCalendar ? <RefreshCw size={18} /> : <Plus size={18} />} {enabled ? existingCalendar ? "Aggiorna il mio calendario" : "Crea calendario del semestre" : "Disponibile prossimamente"}</button>
            <p className={styles.hint}>Un solo calendario personale. Puoi modificare corso, anno, linea e semestre mantenendo lo stesso link.</p>
          </fieldset></form>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><span className={styles.step}>02</span><div><h2>Anteprima lezioni</h2><p>{preview ? `${dateLabel(preview.start)} – ${dateLabel(preview.end)}` : "Gli orari arrivano direttamente da UniSR."}</p></div></div>
          {!preview ? <div className={styles.empty}><CalendarDays size={36} /><h3>Una settimana alla volta</h3><p>Leggi gli orari per vedere le linee disponibili e controllare le lezioni prima di creare il calendario.</p></div> : !line ? <div className={styles.empty}><CalendarDays size={36} /><h3>Scegli la tua linea</h3><p>Abbiamo trovato {preview.lessons.length} lezioni. Seleziona una linea per vedere quelle da includere.</p></div> : <>
            <div className={styles.previewCount}><strong>{visible.length}</strong> lezioni selezionate <span>Solo lezioni · orario italiano</span></div>
            <div className={styles.lessons}>
              {!visible.length && <p className={styles.hint}>Nessuna lezione selezionata in questa settimana. Controlla la data e le attività senza linea.</p>}
              {visible.map((lesson, index) => <article className={styles.lesson} key={`${lesson.date}-${lesson.start}-${index}`}><div className={styles.lessonTime}><strong>{lesson.start}</strong><span>{lesson.end}</span><small>{dateLabel(lesson.date)}</small></div><div><h3>{lesson.title}</h3><p>{lesson.teacher}</p><small>{lesson.building} · {lesson.room}</small>{!lesson.line && <span className={styles.badge}>Senza linea</span>}</div></article>)}
            </div>
          </>}
          <a className={styles.source} href="https://orario.unisr.it/" target="_blank" rel="noreferrer">Consulta il portale ufficiale <ExternalLink size={14} /></a>
        </section>
      </div>

      <section className={styles.saved} aria-label="Il tuo calendario">
        <div className={styles.savedHead}><div><span className={styles.tag}>Il tuo abbonamento</span><h2>Il tuo calendario</h2></div><span className={styles.badge}>{!enabled ? "Prossimamente" : scheduler === true ? "Aggiornamento ogni 3 ore" : scheduler === false ? "Aggiornamento automatico da attivare" : "Verifica del servizio…"}</span></div>
        {loading ? <p className={styles.hint} role="status">Caricamento dei calendari…</p> : !calendars.length ? <div className={styles.noCalendars}>{enabled ? "Il tuo calendario apparirà qui con il suo link personale." : "Quando il servizio sarà disponibile, troverai qui il tuo calendario e il link di abbonamento."}</div> : <div className={styles.calendarGrid}>{calendars.map((calendar) => <article className={styles.card} key={calendar.id}>
          <div className={styles.calendarHead}><div><h3>{calendar.name}</h3><p>{calendar.year}° anno · {calendar.line === "COMUNE" ? "Attività senza linea" : `Linea ${calendar.line.toLowerCase()}`}</p></div><span className={styles.badge}>{!calendar.enabled ? "Disattivato" : calendar.sync_cursor !== null ? "Importazione" : "Attivo"}</span></div>
          <p className={styles.hint}>{dateLabel(calendar.semester_start)} – {dateLabel(calendar.semester_end)}</p>
          {calendar.sync_cursor !== null && <div className={styles.progress} role="status"><progress max={calendar.totalDays} value={calendar.sync_cursor} /><span>{calendar.sync_cursor} / {calendar.totalDays} giorni letti{calendar.last_synced_at ? " · il link mantiene l’ultima versione completa" : " · preparazione del primo link"}</span></div>}
          {calendar.sync_error && <p className={styles.syncError}>Lettura UniSR interrotta: {calendar.sync_error} Nuovo tentativo {calendar.retry_at ? timeLabel(calendar.retry_at) : "in corso"}.</p>}
          {calendar.last_synced_at && <p className={styles.hint}><strong>{calendar.eventCount} lezioni</strong> · aggiornato {timeLabel(calendar.last_synced_at)}</p>}
          {calendar.last_synced_at && calendar.enabled ? <div className={styles.subscription}>
            <label>Link per Apple e Google Calendar<input readOnly value={calendar.feedUrl} onFocus={(event) => event.currentTarget.select()} /></label>
            <div className={styles.actions}><a className={styles.primary} href={calendar.feedUrl.replace(/^https?:/, "webcal:")}><CalendarDays size={16} /> Calendario Apple</a><a className={styles.secondary} href={GOOGLE_CALENDAR_SUBSCRIPTION_URL} target="_blank" rel="noreferrer" onClick={() => void copy(calendar.feedUrl, true)}><ExternalLink size={16} /> Google Calendar</a><button className={styles.secondary} onClick={() => void copy(calendar.feedUrl)} type="button"><Copy size={16} /> Copia link</button></div>
            <p className={styles.hint}>Per Google Calendar, apri questa pagina da un computer: il pulsante copia il link e apre “Da URL”. Incollalo e scegli “Aggiungi calendario”.</p>
          </div> : <p className={styles.hint}>{calendar.enabled ? "Il link sarà disponibile dopo la lettura dell’intero semestre." : "Il link è sospeso. Riattiva il calendario per utilizzarlo."}</p>}
          <SavedSubjects key={`${calendar.id}-${JSON.stringify(calendar.included_subjects)}`} calendar={calendar} busy={busy} save={safeMutate} />
          <div className={styles.actions}><button className={styles.textButton} disabled={busy || !calendar.enabled || calendar.sync_cursor !== null} onClick={() => void safeMutate({ action: "sync", id: calendar.id })} type="button"><RefreshCw size={14} /> Aggiorna adesso</button><button className={styles.textButton} disabled={busy} onClick={() => void safeMutate({ action: "toggle", id: calendar.id, enabled: !calendar.enabled })} type="button">{calendar.enabled ? "Disattiva" : "Riattiva"}</button>
            <button className={styles.textButton} disabled={busy} type="button" onClick={() => { if (window.confirm("Il vecchio link smetterà di funzionare. Dovrai sostituire l’abbonamento in Calendario Apple o Google Calendar. Generare un nuovo link?")) void safeMutate({ action: "rotate", id: calendar.id }); }}>Rigenera link</button></div>
        </article>)}</div>}
      </section>
      <aside className={styles.note}><ShieldCheck size={20} /><div><strong>Un link personale, sempre aggiornabile.</strong><p>Conserva il link: chi lo possiede può leggere le lezioni selezionate. ASTRA rilegge UniSR ogni tre ore quando l’aggiornamento automatico è attivo. Calendario Apple e Google Calendar gestiscono i tempi di ricezione delle modifiche. Su Mac puoi scegliere la frequenza nelle impostazioni dell’abbonamento.</p></div></aside>
    </div>
  </main>;
}
