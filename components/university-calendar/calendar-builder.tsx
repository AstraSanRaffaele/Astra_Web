"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, Check, Copy, ExternalLink, LoaderCircle, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { COURSES, selectLessons, type CalendarView, type CourseKey, type Lesson } from "@/lib/university-calendar/types";
import { GOOGLE_CALENDAR_SUBSCRIPTION_URL } from "@/lib/university-calendar/config";
import { calendarPeriod, calendarSeasonOpen } from "@/lib/university-calendar/period";
import { subjectColorKey, subjectColors } from "@/lib/university-calendar/subject-colors";
import styles from "./calendar-builder.module.css";

type Subject = { key: string; title: string; teacher: string };
type Preview = { lessons: Lesson[]; lines: string[]; subjects: Subject[]; start: string; end: string; period: { start: string; end: string } };
type CreatingCalendar = Pick<CalendarView, "name" | "year" | "line" | "semester_start" | "semester_end">;
type CopyNotice = { calendarId: string; target: "link" | "google"; message: string; failed: boolean };

function subjectStyle(title: string, colors: Map<string, string>): CSSProperties {
  return { "--subject-color": colors.get(subjectColorKey(title)) } as CSSProperties;
}

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

function CalendarCreationOverlay({ percentage, error, retryAt }: { percentage: number; error?: string | null; retryAt?: string | null }) {
  return <div className={styles.creationOverlay}>
    <div className={styles.creationMessage} role="status" aria-live="polite" aria-atomic="true">
      <div className={styles.creationIcon}><LoaderCircle className={error ? undefined : styles.spin} size={24} aria-hidden="true" /></div>
      <h3>{error ? "L’importazione è in pausa" : "Stiamo importando il tuo calendario"}</h3>
      <div className={styles.creationPercentage} role="progressbar" aria-label="Importazione del calendario" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <span aria-hidden="true">{percentage}<small>%</small></span>
      </div>
      <p>{error ? `La lettura degli orari è stata interrotta. ${retryAt ? `Riproviamo automaticamente il ${timeLabel(retryAt)}.` : "Riproviamo automaticamente tra poco."}` : "Stiamo preparando le tue lezioni. Il link apparirà appena il calendario sarà pronto."}</p>
    </div>
  </div>;
}

function Subjects({ subjects, selected, onChange, colors }: { subjects: Subject[]; selected: string[]; onChange: (keys: string[]) => void; colors: Map<string, string> }) {
  return <div className={styles.subjects}>
    {subjects.map((subject) => <label className={styles.checkbox} key={subject.key} style={subjectStyle(subject.title, colors)}>
      <input type="checkbox" checked={selected.includes(subject.key)} onChange={(event) => onChange(event.target.checked ? [...selected, subject.key] : selected.filter((key) => key !== subject.key))} />
      <span><strong>{subject.title}</strong>{subject.teacher && <small>{subject.teacher}</small>}</span>
    </label>)}
  </div>;
}

function SavedSubjects({ calendar, busy, save, colors }: { calendar: CalendarView; busy: boolean; save: (body: Record<string, unknown>) => Promise<void>; colors: Map<string, string> }) {
  const [selected, setSelected] = useState(calendar.included_subjects);
  const changed = JSON.stringify([...selected].sort()) !== JSON.stringify([...calendar.included_subjects].sort());
  if (!calendar.subjects.length) return null;
  return <details className={styles.details}>
    <summary>Attività senza linea <span>{calendar.subjects.length}</span></summary>
    <p className={styles.hint}>Attività trovate nell’intero semestre. Includi solo quelle che vuoi seguire.</p>
    <Subjects subjects={calendar.subjects} selected={selected} onChange={setSelected} colors={colors} />
    <button className={styles.secondary} type="button" disabled={busy || !changed} onClick={() => void save({ action: "subjects", id: calendar.id, included_subjects: selected })}>Salva selezione</button>
  </details>;
}

export default function CalendarBuilder({ today, isAdmin = false, enabled = true }: { today: string; isAdmin?: boolean; enabled?: boolean }) {
  const API = "/api/university-calendar";
  const [course, setCourse] = useState<CourseKey>("medicina");
  const [year, setYear] = useState(1);
  const [line, setLine] = useState("");
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
  const [creatingCalendar, setCreatingCalendar] = useState<CreatingCalendar | null>(null);
  const [copyNotice, setCopyNotice] = useState<CopyNotice | null>(null);
  const mutationBusy = useRef(false);
  const previewSequence = useRef(0);
  const creationId = useRef<string | null>(null);
  const period = preview?.period ?? calendarPeriod(new Date(`${today}T12:00:00Z`));
  const seasonOpen = calendarSeasonOpen(new Date(`${today}T12:00:00Z`));

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
    if (!seasonOpen) return;
    const sequence = ++previewSequence.current;
    setPreviewBusy(true); setError(""); setNotice("");
    try {
      for (let attempt = 0; attempt < 12; attempt++) {
        const data = await request<Preview & { pending?: boolean }>(`${API}/preview`, { course, year });
        if (sequence !== previewSequence.current) return;
        if (!data.pending) {
          setPreview(data); setIncluded([]); setLine(data.lines.length === 1 ? data.lines[0] : ""); creationId.current = null;
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
        if (sequence !== previewSequence.current) return;
      }
      throw new Error("Gli orari condivisi sono in preparazione. Riprova tra poco.");
    } catch (cause) { if (sequence === previewSequence.current) setError(cause instanceof Error ? cause.message : "Anteprima non disponibile."); }
    finally { if (sequence === previewSequence.current) setPreviewBusy(false); }
  }

  async function mutate(body: Record<string, unknown>) {
    if (!enabled) return;
    if (!seasonOpen) return;
    if (mutationBusy.current) { setError("Attendi il completamento della lettura in corso."); throw new Error("Lettura in corso."); }
    mutationBusy.current = true; setBusy(true); setError(""); setNotice(""); setCopyNotice(null);
    try { await request(API, body); await reload(); setNotice(body.action === "sync" ? "Stai usando gli ultimi orari condivisi disponibili." : "Modifiche salvate."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Impossibile salvare."); throw cause; }
    finally { mutationBusy.current = false; setBusy(false); }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!enabled || !seasonOpen || !preview || !line) return;
    creationId.current ??= crypto.randomUUID();
    const calendarName = name.trim() || `${COURSES.find((item) => item.key === course)!.label} · ${year}° · ${line}`;
    if (!existingCalendar) setCreatingCalendar({ name: calendarName, year, line, semester_start: period.start, semester_end: period.end });
    try {
      await mutate({ action: existingCalendar ? "settings" : "create", id: existingCalendar?.id ?? creationId.current, settings: { name: calendarName, course, year, line, included_subjects: included } });
      creationId.current = null;
      setNotice(existingCalendar ? "Calendario modificato. Il link resta lo stesso." : "Calendario creato. Il link sarà pronto al termine della prima importazione delle lezioni fino al 15 giugno.");
    } catch { /* The error is shown above the form; keep the ID for a safe retry. */ }
    finally { setCreatingCalendar(null); }
  }

  async function copy(url: string, calendarId: string, google = false) {
    const target = google ? "google" : "link";
    setCopyNotice(null);
    try { await navigator.clipboard.writeText(url); setCopyNotice({ calendarId, target, message: google ? "Link copiato. Incollalo in “Da URL” su Google Calendar." : "Link copiato!", failed: false }); }
    catch { setCopyNotice({ calendarId, target, message: "Copia non riuscita. Seleziona il link nel campo qui sopra e copialo manualmente.", failed: true }); }
  }

  const visible = preview && line ? selectLessons(preview.lessons, { name: "", course, year, line, semester_start: preview.start, semester_end: preview.end, included_subjects: included }) : [];
  const colors = new Map([...subjectColors([...(preview?.lessons.map((lesson) => lesson.title) ?? []), ...calendars.flatMap((calendar) => calendar.subjects.map((subject) => subject.title))])].map(([key, color]) => [key, color.hex]));
  const copyFeedback = (calendarId: string, target: CopyNotice["target"]) => copyNotice?.calendarId === calendarId && copyNotice.target === target ? <span className={`${styles.copyFeedback} ${copyNotice.failed ? styles.copyFailed : ""}`} role={copyNotice.failed ? "alert" : "status"}>{!copyNotice.failed && <Check size={14} aria-hidden="true" />}{copyNotice.message}</span> : null;
  const subscriptionActions = (id: string, url: string) => <div className={`${styles.actions} ${styles.subscriptionActions}`}>
    <a className={styles.primary} href={url.replace(/^https?:/, "webcal:")}><CalendarDays size={16} /> Calendario Apple</a>
    <div className={styles.copyAction}><a className={styles.secondary} href={GOOGLE_CALENDAR_SUBSCRIPTION_URL} target="_blank" rel="noreferrer" onClick={() => void copy(url, id, true)}><ExternalLink size={16} /> Google Calendar</a>{copyFeedback(id, "google")}</div>
    <div className={styles.copyAction}><button className={styles.secondary} onClick={() => void copy(url, id)} type="button"><Copy size={16} /> Copia link</button>{copyFeedback(id, "link")}</div>
  </div>;
  const safeMutate = async (body: Record<string, unknown>) => { try { await mutate(body); } catch { /* Visible status already set. */ } };

  return <main className={`${styles.page} ${styles.publicPage}`}>
    <div className={styles.shell}>
      <Link className={styles.back} href="/profile"><ArrowLeft size={16} /> Il tuo profilo</Link>
      <header className={styles.hero}>
        <div><span className={styles.tag}>ASTRA · Il tuo calendario universitario</span><h1>Il semestre, <em>nel tuo calendario.</em></h1><p>Seleziona corso, anno e linea. ASTRA legge gli orari ufficiali e prepara un abbonamento per Calendario Apple e Google Calendar.</p></div>
        <div className={styles.heroIcon}><CalendarDays size={44} strokeWidth={1.3} /></div>
        <span className={styles.private}><ShieldCheck size={15} /> {isAdmin ? "Anteprima riservata agli admin" : "I tuoi corsi, il tuo link personale"}</span>
      </header>

      {enabled && seasonOpen && <div className={`${styles.syncNotice} ${scheduler === false ? styles.syncInactive : ""}`} role="status">
        <div className={styles.syncNoticeIcon}><RefreshCw size={22} aria-hidden="true" /></div>
        <div><strong>{scheduler === true ? "Aggiornamenti automatici alle 08:00, 12:00 e 18:00" : scheduler === false ? "L’aggiornamento automatico non è ancora attivo" : "Verifica dell’aggiornamento automatico…"}</strong><p>{scheduler === true ? "Ogni giorno, in orario italiano, ASTRA avvia la lettura degli orari UniSR. Le variazioni e le aule arrivano nel tuo calendario al termine della lettura. Il tuo link resta sempre lo stesso." : scheduler === false ? "Gli aggiornamenti delle 08:00, 12:00 e 18:00 si attivano automaticamente quando crei il tuo calendario. Dal 1° settembre puoi preparare quello del nuovo anno accademico." : "Stiamo controllando che il servizio sia pronto a tenere aggiornate le tue lezioni."}</p></div>
        {scheduler === true && <span className={styles.syncFrequency}><b>3 volte</b> al giorno</span>}
      </div>}

      {enabled && !seasonOpen && <div className={`${styles.syncNotice} ${styles.syncInactive}`} role="status"><div className={styles.syncNoticeIcon}><CalendarDays size={22} aria-hidden="true" /></div><div><strong>Il calendario è in pausa estiva</strong><p>Dal 1° settembre potrai creare il calendario del nuovo anno. Alla prima creazione ripartiranno automaticamente gli aggiornamenti delle 08:00, 12:00 e 18:00.</p></div></div>}

      {!enabled && <div className={styles.launchNotice} role="status"><CalendarDays size={22} /><div><strong>Il tuo calendario, prossimamente.</strong><p>Stiamo preparando il servizio. Qui potrai scegliere le tue lezioni e aggiungerle a Calendario Apple o Google Calendar.</p></div></div>}

      {error && <div className={styles.error} role="alert">{error}</div>}
      {notice && <div className={styles.success} role="status"><Check size={18} />{notice}</div>}

      <div className={styles.layout}>
        <section className={styles.card}>
          <div className={styles.sectionHead}><span className={styles.step}>01</span><div><h2>{existingCalendar ? "Modifica il tuo calendario" : "Crea il tuo calendario"}</h2><p>Scegli il corso e l’anno. La lettura parte da oggi.</p></div></div>
          <form onSubmit={loadPreview}><fieldset className={styles.fieldset} disabled={!enabled || !seasonOpen}>
            <div className={styles.fields}>
              <label className={styles.wide}>Corso di laurea<select value={course} onChange={(event) => { setCourse(event.target.value as CourseKey); resetPreview(); }}>
                {COURSES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select></label>
              <label className={styles.wide}>Anno<select value={year} onChange={(event) => { setYear(Number(event.target.value)); resetPreview(); }}>{[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}° anno</option>)}</select></label>
            </div>
            <button className={styles.secondary} disabled={previewBusy || busy} type="submit">{previewBusy ? <LoaderCircle className={styles.spin} size={17} /> : <RefreshCw size={17} />}{previewBusy ? "Lettura degli orari…" : "Leggi gli orari UniSR"}</button>
          </fieldset></form>

          <form onSubmit={create} className={styles.createForm}><fieldset className={styles.fieldset} disabled={!enabled || !seasonOpen}>
            <label>Linea<select required value={line} disabled={!preview || previewBusy} onChange={(event) => { setLine(event.target.value); creationId.current = null; }}>
              <option value="">{preview ? "Seleziona la linea" : "Leggi prima gli orari"}</option>
              {preview?.lines.map((value) => <option key={value} value={value}>Linea {value.toLocaleLowerCase("it")}</option>)}
              {preview && preview.subjects.length > 0 && <option value="COMUNE">Solo attività senza linea</option>}
            </select></label>
            {preview && preview.lines.length > 0 && <p className={styles.hint}>Tutte le linee del corso, rilevate negli orari UniSR di tutti gli anni. Le lezioni restano filtrate sull’anno scelto.</p>}
            {preview && !preview.lines.length && <p className={styles.hint}>Nessuna linea indicata nei prossimi giorni.{preview.subjects.length > 0 ? " Puoi scegliere le attività senza linea." : " Gli orari potrebbero non essere ancora pubblicati: riprova più avanti."}</p>}
            <div className={styles.fields}>
              <label className={styles.wide}>Nome calendario <span className={styles.optional}>(facoltativo)</span><input maxLength={100} placeholder="Es. Le mie lezioni di Medicina" value={name} onChange={(event) => { setName(event.target.value); creationId.current = null; }} /></label>
            </div>
            <p className={styles.hint}>{seasonOpen ? <><strong>Periodo automatico:</strong> {dateLabel(period.start)} – {dateLabel(period.end)}.</> : "Il periodo sarà calcolato quando creerai il nuovo calendario dal 1° settembre."} Il calendario include anche l’aula e l’edificio di ogni lezione.</p>
            {preview && preview.subjects.length > 0 && <div className={styles.unassigned}><h3>Attività senza linea</h3><p className={styles.hint}>Scegli quali includere. Dopo l’importazione potrai vedere anche quelle delle altre settimane.</p><Subjects subjects={preview.subjects} selected={included} colors={colors} onChange={(keys) => { setIncluded(keys); creationId.current = null; }} /></div>}
            <button className={styles.primary} disabled={!enabled || !seasonOpen || !preview || !line || loading || busy || previewBusy} type="submit">{busy ? <LoaderCircle className={styles.spin} size={18} /> : existingCalendar ? <RefreshCw size={18} /> : <Plus size={18} />} {!enabled ? "Disponibile prossimamente" : !seasonOpen ? "Nuovi calendari dal 1° settembre" : existingCalendar ? "Aggiorna il mio calendario" : "Crea calendario del semestre"}</button>
            <p className={styles.hint}>Un solo calendario personale. Puoi modificare corso, anno e linea mantenendo lo stesso link. {seasonOpen ? <>Dopo il {dateLabel(period.end)} verrà eliminato automaticamente da ASTRA.</> : "Ogni anno viene eliminato automaticamente dopo il 15 giugno."}</p>
          </fieldset></form>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><span className={styles.step}>02</span><div><h2>Anteprima lezioni</h2><p>{preview ? `${dateLabel(preview.start)} – ${dateLabel(preview.end)}` : "Gli orari arrivano direttamente da UniSR."}</p></div></div>
          {!preview ? <div className={styles.empty}><CalendarDays size={36} /><h3>Le lezioni, a partire da oggi</h3><p>Leggi gli orari per vedere un’anteprima dei prossimi sette giorni. Il calendario completo arriverà fino al 15 giugno.</p></div> : !line ? <div className={styles.empty}><CalendarDays size={36} /><h3>Scegli la tua linea</h3><p>Abbiamo trovato {preview.lessons.length} lezioni. Seleziona una linea per vedere quelle da includere.</p></div> : <>
            <div className={styles.previewCount}><strong>{visible.length}</strong> lezioni selezionate <span>Solo lezioni · orario italiano</span></div>
            <div className={styles.lessons}>
              {!visible.length && <p className={styles.hint}>Nessuna lezione selezionata nei prossimi giorni. Controlla le attività senza linea.</p>}
              {visible.map((lesson, index) => <article className={styles.lesson} style={subjectStyle(lesson.title, colors)} key={`${lesson.date}-${lesson.start}-${index}`}><div className={styles.lessonTime}><strong>{lesson.start}</strong><span>{lesson.end}</span><small>{dateLabel(lesson.date)}</small></div><div><h3>{lesson.title}</h3><p>{lesson.teacher}</p><small>Aula {lesson.room} · {lesson.building}</small>{!lesson.line && <span className={styles.badge}>Senza linea</span>}</div></article>)}
            </div>
          </>}
          <a className={styles.source} href="https://orario.unisr.it/" target="_blank" rel="noreferrer">Consulta il portale ufficiale <ExternalLink size={14} /></a>
        </section>
      </div>

      <section className={styles.saved} aria-label="Il tuo calendario">
        <div className={styles.savedHead}><div><span className={styles.tag}>Il tuo abbonamento</span><h2>Il tuo calendario</h2></div><span className={enabled && seasonOpen && scheduler === true ? styles.syncBadge : styles.badge}>{enabled && seasonOpen && scheduler === true && <RefreshCw size={15} aria-hidden="true" />}{!enabled ? "Prossimamente" : !seasonOpen ? "Pausa estiva · fino al 31 agosto" : scheduler === true ? "Automatico · 08:00 / 12:00 / 18:00" : scheduler === false ? "Riparte creando il tuo calendario" : "Verifica del servizio…"}</span></div>
        {loading ? <p className={styles.hint} role="status">Caricamento dei calendari…</p> : !calendars.length && !creatingCalendar ? <div className={styles.noCalendars}>{enabled ? "Il tuo calendario apparirà qui con il suo link personale." : "Quando il servizio sarà disponibile, troverai qui il tuo calendario e il link di abbonamento."}</div> : <div className={styles.calendarGrid}>
          {creatingCalendar && !calendars.length && <article className={`${styles.card} ${styles.calendarCreating}`} aria-busy="true">
            <div className={styles.calendarContent} inert aria-hidden="true">
              <div className={styles.calendarHead}><div><h3>{creatingCalendar.name}</h3><p>{creatingCalendar.year}° anno · {creatingCalendar.line === "COMUNE" ? "Attività senza linea" : `Linea ${creatingCalendar.line.toLowerCase()}`}</p></div></div>
              <p className={styles.hint}>{dateLabel(creatingCalendar.semester_start)} – {dateLabel(creatingCalendar.semester_end)}</p>
              <div className={styles.subscription}><p className={styles.hint}>Link per Apple e Google Calendar</p><div className={styles.linkPlaceholder} /><div className={styles.buttonPlaceholders}><span /><span /></div></div>
            </div>
            <CalendarCreationOverlay percentage={0} />
          </article>}
          {calendars.map((calendar) => {
            const creating = calendar.enabled && calendar.sync_cursor !== null && !calendar.last_synced_at;
            const percentage = calendar.totalDays > 0 ? Math.min(99, Math.max(0, Math.floor((calendar.sync_cursor ?? 0) / calendar.totalDays * 100))) : 0;
            return <article className={`${styles.card} ${creating ? styles.calendarCreating : ""}`} key={calendar.id} aria-busy={creating || undefined}>
              <div className={styles.calendarContent} inert={creating || undefined} aria-hidden={creating || undefined}>
                <div className={styles.calendarHead}><div><h3>{calendar.name}</h3><p>{calendar.year}° anno · {calendar.line === "COMUNE" ? "Attività senza linea" : `Linea ${calendar.line.toLowerCase()}`}</p></div><span className={styles.badge}>{!calendar.enabled ? "Disattivato" : calendar.sync_cursor !== null ? "Importazione" : "Attivo"}</span></div>
                <p className={styles.hint}>{dateLabel(calendar.semester_start)} – {dateLabel(calendar.semester_end)}<br />Si elimina automaticamente da ASTRA dopo il {dateLabel(calendar.semester_end)}.</p>
                {!creating && calendar.enabled && calendar.sync_cursor !== null && <p className={styles.hint} role="status">Aggiornamento in corso · {percentage}% · il link mantiene l’ultima versione completa.</p>}
                {calendar.sync_error && <p className={styles.syncError}>Lettura UniSR interrotta: {calendar.sync_error} Nuovo tentativo {calendar.retry_at ? timeLabel(calendar.retry_at) : "in corso"}.</p>}
                {calendar.last_synced_at && <p className={styles.hint}><strong>{calendar.eventCount} lezioni</strong> · aggiornato {timeLabel(calendar.last_synced_at)}</p>}
                {calendar.last_synced_at && calendar.enabled ? <div className={styles.subscription}>
                  <label>Link per Apple e Google Calendar<input readOnly value={calendar.feedUrl} onFocus={(event) => event.currentTarget.select()} /></label>
                  {subscriptionActions(calendar.id, calendar.feedUrl)}
                  <p className={styles.hint}>Per Google Calendar, apri questa pagina da un computer: il pulsante copia il link e apre “Da URL”. Incollalo e scegli “Aggiungi calendario”.</p>
                </div> : <p className={styles.hint}>{calendar.enabled ? "Il link sarà disponibile dopo la lettura dell’intero semestre." : "Il link è sospeso. Riattiva il calendario per utilizzarlo."}</p>}
                <SavedSubjects key={`${calendar.id}-${JSON.stringify(calendar.included_subjects)}`} calendar={calendar} busy={busy} save={safeMutate} colors={colors} />
                <div className={styles.actions}><button className={styles.textButton} disabled={busy || !calendar.enabled || calendar.sync_cursor !== null} onClick={() => void safeMutate({ action: "sync", id: calendar.id })} type="button"><RefreshCw size={14} /> Verifica aggiornamenti</button><button className={styles.textButton} disabled={busy} onClick={() => void safeMutate({ action: "toggle", id: calendar.id, enabled: !calendar.enabled })} type="button">{calendar.enabled ? "Disattiva" : "Riattiva"}</button>
                  <button className={styles.textButton} disabled={busy} type="button" onClick={() => { if (window.confirm("Il vecchio link smetterà di funzionare. Dovrai sostituire l’abbonamento in Calendario Apple o Google Calendar. Generare un nuovo link?")) void safeMutate({ action: "rotate", id: calendar.id }); }}>Rigenera link</button></div>
              </div>
              {creating && <CalendarCreationOverlay percentage={percentage} error={calendar.sync_error} retryAt={calendar.retry_at} />}
            </article>;
          })}</div>}
      </section>
      <aside className={styles.note}><ShieldCheck size={20} /><div><strong>Un link personale per tutto il semestre.</strong><p>Conserva il link: chi lo possiede può leggere le lezioni selezionate. ASTRA avvia gli aggiornamenti condivisi alle 08:00, 12:00 e 18:00 italiane, quando il servizio è attivo. Durante la lettura resta disponibile l’ultima versione completa. Calendario Apple e Google Calendar gestiscono i tempi di ricezione delle modifiche. Su Mac puoi scegliere la frequenza nelle impostazioni dell’abbonamento. Dopo il 15 giugno il calendario viene eliminato da ASTRA e il link smette di funzionare; l’abbonamento nelle app va rimosso dall’app stessa. Dal 1° settembre, creando il nuovo calendario, gli aggiornamenti si riattivano automaticamente.</p></div></aside>
    </div>
  </main>;
}
