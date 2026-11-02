"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { COURSES, courseHasLines, type CourseKey } from "../_lib/types";
import { calendarTrafficLevel, type CalendarClient, type CalendarUsageReport, type CalendarUsageRow } from "../_lib/feed-usage-types";
import styles from "./feed-usage-monitor.module.css";

const clientNames: Record<CalendarClient, string> = { apple: "Apple", google: "Google", browser: "Browser", other: "Altre / non riconosciute" };
const count = (value: number) => value.toLocaleString("it-IT");
const time = (value: string) => new Date(value).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

export default function FeedUsageMonitor() {
  const [filters, setFilters] = useState({ days: 1 as 1 | 7, page: 1, query: "" });
  const [draft, setDraft] = useState("");
  const [revision, setRevision] = useState(0);
  const [report, setReport] = useState<CalendarUsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ days: String(filters.days), page: String(filters.page), q: filters.query });
    fetch(`/api/admin/university-calendar-usage?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Impossibile caricare gli accessi.");
        if (!controller.signal.aborted) setReport(data);
      }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Impossibile caricare gli accessi."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, revision]);

  function refresh(next = filters) {
    setLoading(true); setError(""); setFilters(next); setRevision(value => value + 1);
  }
  function search(event: FormEvent) { event.preventDefault(); refresh({ ...filters, page: 1, query: draft.trim() }); }
  async function revoke(row: CalendarUsageRow) {
    if (revoking || row.revoked || !row.currentLink) return;
    if (!window.confirm(`Svuotare e revocare il link di ${row.ownerName || row.ownerEmail}? I conteggi non provano da soli una condivisione. Tutte le lezioni saranno rimosse e sostituite da un avviso nel giorno della revoca e nei due successivi. Generando un nuovo link, l’utente rimuoverà anche questi avvisi dal vecchio abbonamento al successivo aggiornamento dell’app.`)) return;
    setRevoking(row.feedHash); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/university-calendar-usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ calendarId: row.calendarId, feedHash: row.feedHash }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Revoca non riuscita.");
      setMessage("Link revocato. Al prossimo aggiornamento il vecchio abbonamento mostrerà solo tre avvisi giornalieri, al posto delle lezioni. Il creatore troverà lo stesso avviso su ASTRA; generando un nuovo link verranno rimossi anche gli avvisi dal vecchio abbonamento.");
      refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Revoca non riuscita."); }
    finally { setRevoking(null); }
  }
  const pages = report ? Math.max(1, Math.ceil(report.totalLinks / report.pageSize)) : 1;

  return <main className={styles.page}><div className={styles.shell}>
    <Link href="/admin" className={styles.back}><ArrowLeft size={16} /> Dashboard admin</Link>
    <header className={styles.hero}><span>ASTRA · Monitoraggio</span><h1>Accessi al calendario</h1><p>Richieste ricevute dai link personali di abbonamento.</p></header>
    <form onSubmit={search} className={styles.filters}>
      <label>Periodo<select value={filters.days} onChange={event => refresh({ ...filters, days: Number(event.target.value) as 1 | 7, page: 1 })}><option value={1}>Oggi · orario italiano</option><option value={7}>Ultimi 7 giorni</option></select></label>
      <label className={styles.search}>Cerca utente o calendario<input value={draft} maxLength={100} onChange={event => setDraft(event.target.value)} placeholder="Nome, email o calendario" /></label>
      <button type="submit" disabled={loading}><Search size={16} /> Cerca</button>
      <button type="button" disabled={loading} onClick={() => refresh()}><RefreshCw size={16} className={loading ? styles.spin : undefined} /> Ricarica conteggi</button>
    </form>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.success} role="status">{message}</p>}
    <section className={styles.stats} aria-label="Riepilogo del periodo">
      <div><span>Richieste registrate</span><strong>{report && !error ? count(report.totalRequests) : "—"}</strong></div>
      <div><span>Link consultati</span><strong>{report && !error ? count(report.totalLinks) : "—"}</strong></div>
      <div><span>Link da verificare</span><strong>{report && !error ? count(report.attentionLinks + report.highTrafficLinks) : "—"}</strong><small>{report && !error ? `${count(report.highTrafficLinks)} con traffico elevato` : ""}</small></div>
    </section>
    {loading && <p className={styles.hint} role="status">Caricamento dei conteggi…</p>}
    {report && !error && <section className={styles.results} aria-busy={loading}>
      {!report.rows.length ? <p className={styles.empty}>Non risultano richieste registrate nel periodo selezionato.</p> : <div className={styles.tableWrap}><table>
        <thead><tr><th>Utente</th><th>Calendario e link</th><th aria-sort="descending">Richieste</th><th>App dichiarata</th><th>Ultima consultazione</th><th>Azione manuale</th></tr></thead>
        <tbody>{report.rows.map(row => <tr key={`${row.calendarId}-${row.feedHash}`}>
          <td><strong>{row.ownerName || row.ownerEmail || "Utente"}</strong><small>{row.ownerEmail}</small></td>
          <td><strong>{row.name}</strong><small>{COURSES.find(course => course.key === row.course)?.label ?? row.course} · {row.year}° anno{courseHasLines(row.course as CourseKey) ? ` · ${row.line}` : ""}</small><span className={styles.badge}>{row.revoked ? "Revocato" : row.currentLink ? row.enabled ? "Link corrente" : "Disattivato" : "Link precedente"}</span><small>Riferimento {row.feedHash.slice(0, 10)}</small></td>
          <td><strong className={styles.requests}>{count(row.requests)}</strong><small>{count(row.downloads)} con file · {count(row.unchanged)} invariati</small><small>Picco giornaliero: {count(row.peakDailyRequests)}</small>{calendarTrafficLevel(row.peakDailyRequests) !== "ordinary" && <span className={`${styles.badge} ${calendarTrafficLevel(row.peakDailyRequests) === "high" ? styles.trafficHigh : styles.trafficAttention}`}>{calendarTrafficLevel(row.peakDailyRequests) === "high" ? "Traffico elevato" : "Da verificare"}</span>}{row.headRequests > 0 && <small>{count(row.headRequests)} controlli senza scaricamento</small>}{row.errors > 0 && <small>{count(row.errors)} errori</small>}</td>
          <td><div className={styles.clients}>{(Object.entries(row.clients) as [CalendarClient, number][]).filter(([, value]) => value > 0).map(([client, value]) => <span key={client}>{clientNames[client]} <b>{count(value)}</b></span>)}</div></td>
          <td><time dateTime={row.lastSeen}>{time(row.lastSeen)}</time><small>Orario italiano</small></td>
          <td><button className={styles.revoke} type="button" disabled={loading || Boolean(revoking) || row.revoked || !row.currentLink} onClick={() => void revoke(row)}>{revoking === row.feedHash ? "Revoca in corso…" : row.revoked ? "Già revocato" : !row.currentLink ? "Non più attivo" : "Svuota e revoca"}</button></td>
        </tr>)}</tbody>
      </table></div>}
      <div className={styles.pagination}><span>Pagina {report.page} di {pages}</span><div><button type="button" aria-label="Pagina precedente" disabled={loading || report.page <= 1} onClick={() => refresh({ ...filters, page: report.page - 1 })}><ChevronLeft size={17} /></button><button type="button" aria-label="Pagina successiva" disabled={loading || report.page >= pages} onClick={() => refresh({ ...filters, page: report.page + 1 })}><ChevronRight size={17} /></button></div></div>
    </section>}
  </div></main>;
}
