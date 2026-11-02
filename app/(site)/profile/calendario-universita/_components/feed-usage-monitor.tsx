"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { COURSES, courseHasLines, type CourseKey } from "../_lib/types";
import { calendarTrafficLevel, CALENDAR_REVOCATION_LIMIT, type CalendarClient, type CalendarUsageReport, type CalendarUsageRow, type CalendarUsageState, type CalendarRevocationResult } from "../_lib/feed-usage-types";
import styles from "./feed-usage-monitor.module.css";

const clientNames: Record<CalendarClient, string> = { apple: "Apple", google: "Google", browser: "Browser", other: "Altre / non riconosciute" };
const count = (value: number) => value.toLocaleString("it-IT");
const time = (value: string) => new Date(value).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const rowKey = (row: Pick<CalendarUsageRow, "calendarId" | "feedHash">) => `${row.calendarId}:${row.feedHash}`;
const canRevoke = (row: CalendarUsageRow) => row.currentLink && !row.revoked;

export default function FeedUsageMonitor() {
  const [filters, setFilters] = useState({ days: 1 as 1 | 7, page: 1, query: "", state: "active" as CalendarUsageState });
  const [draft, setDraft] = useState("");
  const [revision, setRevision] = useState(0);
  const [report, setReport] = useState<CalendarUsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [selected, setSelected] = useState(new Set<string>());
  const mutationBusy = useRef(false);
  const selectable = report?.rows.filter(canRevoke) ?? [];
  const selectedRows = selectable.filter(row => selected.has(rowKey(row)));
  const allSelected = selectable.length > 0 && selectedRows.length === selectable.length;
  const someSelected = selectedRows.length > 0 && !allSelected;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ days: String(filters.days), page: String(filters.page), q: filters.query, state: filters.state });
    fetch(`/api/admin/university-calendar-usage?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json() as CalendarUsageReport & { error?: string };
        if (!response.ok) throw new Error(data.error || "Impossibile caricare gli accessi.");
        if (!controller.signal.aborted) {
          setReport(data);
          const available = new Set(data.rows.filter(canRevoke).map(rowKey));
          setSelected(current => new Set([...current].filter(key => available.has(key))));
        }
      }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Impossibile caricare gli accessi."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, revision]);

  function refresh(next = filters, preserveSelection = false) {
    setLoading(true); setError("");
    if (!preserveSelection) { setSelected(new Set()); setActionError(""); setMessage(""); }
    if (next.state !== filters.state) setReport(null);
    setFilters(next); setRevision(value => value + 1);
  }
  function search(event: FormEvent) { event.preventDefault(); refresh({ ...filters, page: 1, query: draft.trim() }); }
  function toggle(row: CalendarUsageRow) {
    if (loading || mutationBusy.current || !canRevoke(row)) return;
    const key = rowKey(row);
    setSelected(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else if (next.size < CALENDAR_REVOCATION_LIMIT) next.add(key);
      return next;
    });
  }
  async function revoke(rows: CalendarUsageRow[]) {
    if (loading || mutationBusy.current || !rows.length || rows.length > CALENDAR_REVOCATION_LIMIT || rows.some(row => !canRevoke(row))) return;
    const subject = rows.length === 1 ? `il link di ${rows[0].ownerName || rows[0].ownerEmail}` : `i link di ${count(rows.length)} utenti selezionati`;
    const names = rows.length > 1 ? `\n\n${rows.map(row => row.ownerEmail || row.ownerName).join("\n")}\n` : "";
    if (!window.confirm(`Svuotare e revocare ${subject}?${names}\nI conteggi non provano da soli una condivisione. Tutte le lezioni saranno rimosse e sostituite da un avviso nel giorno della revoca e nei due successivi. Generando un nuovo link, l’utente rimuoverà anche questi avvisi dal vecchio abbonamento al successivo aggiornamento dell’app.`)) return;
    mutationBusy.current = true;
    setRevoking(rows.length === 1 ? rowKey(rows[0]) : "bulk"); setActionError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/university-calendar-usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ calendars: rows.map(({ calendarId, feedHash }) => ({ calendarId, feedHash })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Revoca non riuscita.");
      if (!Array.isArray(data.results) || data.results.length !== rows.length) throw new Error("Esito non verificabile. Ricarica i conteggi prima di riprovare.");
      const results = data.results as CalendarRevocationResult[];
      const succeeded = results.filter(result => result.ok);
      const failed = results.filter(result => !result.ok);
      const revokedKeys = new Set(succeeded.map(rowKey));
      setSelected(current => new Set([...current].filter(key => !revokedKeys.has(key))));
      if (succeeded.length) setMessage(`${succeeded.length === 1 ? "Link revocato" : `${count(succeeded.length)} link revocati`}. Gli utenti interessati troveranno l’avviso su ASTRA e tre avvisi giornalieri nel vecchio calendario al prossimo aggiornamento dell’app. Puoi consultare i link nella scheda Revocati.`);
      if (failed.length) setActionError(`${count(failed.length)} ${failed.length === 1 ? "link non revocato" : "link non revocati"}. ${[...new Set(failed.map(result => result.error).filter(Boolean))].join(" ")}`);
      refresh(filters, true);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Revoca non riuscita."); refresh(filters, true); }
    finally { mutationBusy.current = false; setRevoking(null); }
  }
  const pages = report ? Math.max(1, Math.ceil(report.totalLinks / report.pageSize)) : 1;

  return <main className={styles.page}><div className={styles.shell}>
    <Link href="/admin" className={styles.back}><ArrowLeft size={16} /> Dashboard admin</Link>
    <header className={styles.hero}><span>ASTRA · Monitoraggio</span><h1>Accessi al calendario</h1><p>Richieste ricevute dai link personali di abbonamento.</p></header>
    <nav className={styles.tabs} aria-label="Stato dei link"><button type="button" aria-pressed={filters.state === "active"} disabled={Boolean(revoking)} onClick={() => refresh({ ...filters, state: "active", page: 1 })}>Da gestire</button><button type="button" aria-pressed={filters.state === "revoked"} disabled={Boolean(revoking)} onClick={() => refresh({ ...filters, state: "revoked", page: 1 })}>Revocati</button></nav>
    <form onSubmit={search} className={styles.filters}>
      <label>Periodo<select value={filters.days} disabled={Boolean(revoking)} onChange={event => refresh({ ...filters, days: Number(event.target.value) as 1 | 7, page: 1 })}><option value={1}>Oggi · orario italiano</option><option value={7}>Ultimi 7 giorni</option></select></label>
      <label className={styles.search}>Cerca utente o calendario<input value={draft} maxLength={100} disabled={Boolean(revoking)} onChange={event => setDraft(event.target.value)} placeholder="Nome, email o calendario" /></label>
      <button type="submit" disabled={loading || Boolean(revoking)}><Search size={16} /> Cerca</button>
      <button type="button" disabled={loading || Boolean(revoking)} onClick={() => refresh()}><RefreshCw size={16} className={loading ? styles.spin : undefined} /> Ricarica conteggi</button>
    </form>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {actionError && <p className={styles.error} role="alert">{actionError}</p>}
    {message && <p className={styles.success} role="status">{message}</p>}
    <section className={styles.stats} aria-label="Riepilogo del periodo">
      <div><span>Richieste registrate</span><strong>{report && !error ? count(report.totalRequests) : "—"}</strong></div>
      <div><span>Link consultati</span><strong>{report && !error ? count(report.totalLinks) : "—"}</strong></div>
      <div><span>Link da verificare</span><strong>{report && !error ? count(report.attentionLinks + report.highTrafficLinks) : "—"}</strong><small>{report && !error ? `${count(report.highTrafficLinks)} con traffico elevato` : ""}</small></div>
    </section>
    {loading && <p className={styles.hint} role="status">Caricamento dei conteggi…</p>}
    {filters.state === "active" && report && !error && <div className={styles.selectionBar}><span aria-live="polite">{count(selectedRows.length)} {selectedRows.length === 1 ? "utente selezionato" : "utenti selezionati"}</span><div><button type="button" disabled={!selectedRows.length || loading || Boolean(revoking)} onClick={() => setSelected(new Set())}>Deseleziona</button><button type="button" className={styles.revoke} disabled={!selectedRows.length || loading || Boolean(revoking)} onClick={() => void revoke(selectedRows)}>{revoking === "bulk" ? "Revoca in corso…" : `Revoca selezionati (${count(selectedRows.length)})`}</button></div></div>}
    {report && !error && <section className={styles.results} aria-busy={loading}>
      {!report.rows.length ? <p className={styles.empty}>{filters.state === "revoked" ? "Nessun link revocato." : "Nessun link da gestire con accessi registrati nel periodo selezionato."}</p> : <div className={styles.tableWrap}><table>
        <thead><tr>{filters.state === "active" && <th className={styles.selectionCell}><label><input type="checkbox" aria-label="Seleziona tutti i link revocabili di questa pagina" checked={allSelected} ref={input => { if (input) input.indeterminate = someSelected; }} disabled={loading || Boolean(revoking) || !selectable.length} onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map(rowKey)))} /></label></th>}<th>Utente</th><th>Calendario e link</th><th aria-sort="descending">Richieste</th><th>App dichiarata</th><th>Ultima consultazione</th><th>Azione manuale</th></tr></thead>
        <tbody>{report.rows.map(row => <tr key={`${row.calendarId}-${row.feedHash}`}>
          {filters.state === "active" && <td className={styles.selectionCell}><label><input type="checkbox" aria-label={`Seleziona ${row.ownerName || row.ownerEmail || "utente"}`} checked={selected.has(rowKey(row))} disabled={loading || Boolean(revoking) || !canRevoke(row)} onChange={() => toggle(row)} /></label></td>}
          <td><strong>{row.ownerName || row.ownerEmail || "Utente"}</strong><small>{row.ownerEmail}</small></td>
          <td><strong>{row.name}</strong><small>{COURSES.find(course => course.key === row.course)?.label ?? row.course} · {row.year}° anno{courseHasLines(row.course as CourseKey) ? ` · ${row.line}` : ""}</small><span className={styles.badge}>{row.revoked ? "Revocato" : row.currentLink ? row.enabled ? "Link corrente" : "Disattivato" : "Link precedente"}</span><small>Riferimento {row.feedHash.slice(0, 10)}</small></td>
          <td><strong className={styles.requests}>{count(row.requests)}</strong><small>{count(row.downloads)} con file · {count(row.unchanged)} invariati</small><small>Picco giornaliero: {count(row.peakDailyRequests)}</small>{calendarTrafficLevel(row.peakDailyRequests) !== "ordinary" && <span className={`${styles.badge} ${calendarTrafficLevel(row.peakDailyRequests) === "high" ? styles.trafficHigh : styles.trafficAttention}`}>{calendarTrafficLevel(row.peakDailyRequests) === "high" ? "Traffico elevato" : "Da verificare"}</span>}{row.headRequests > 0 && <small>{count(row.headRequests)} controlli senza scaricamento</small>}{row.errors > 0 && <small>{count(row.errors)} errori</small>}</td>
          <td><div className={styles.clients}>{(Object.entries(row.clients) as [CalendarClient, number][]).filter(([, value]) => value > 0).map(([client, value]) => <span key={client}>{clientNames[client]} <b>{count(value)}</b></span>)}</div></td>
          <td>{row.lastSeen ? <><time dateTime={row.lastSeen}>{time(row.lastSeen)}</time><small>Orario italiano</small></> : <><span>—</span><small>Nessun accesso nel periodo</small></>}</td>
          <td><button className={styles.revoke} type="button" disabled={loading || Boolean(revoking) || row.revoked || !row.currentLink} onClick={() => void revoke([row])}>{revoking === rowKey(row) ? "Revoca in corso…" : row.revoked ? "Già revocato" : !row.currentLink ? "Non più attivo" : "Svuota e revoca"}</button></td>
        </tr>)}</tbody>
      </table></div>}
      <div className={styles.pagination}><span>Pagina {report.page} di {pages}</span><div><button type="button" aria-label="Pagina precedente" disabled={loading || Boolean(revoking) || report.page <= 1} onClick={() => refresh({ ...filters, page: report.page - 1 })}><ChevronLeft size={17} /></button><button type="button" aria-label="Pagina successiva" disabled={loading || Boolean(revoking) || report.page >= pages} onClick={() => refresh({ ...filters, page: report.page + 1 })}><ChevronRight size={17} /></button></div></div>
    </section>}
  </div></main>;
}
