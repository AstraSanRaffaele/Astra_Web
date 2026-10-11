import type { CourseKey, Lesson } from "./types";
import { COURSES } from "./types";

const SOURCE = "https://orario.unisr.it/default.asp";
const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", agrave: "à", egrave: "è", eacute: "é", igrave: "ì", ograve: "ò", ugrave: "ù", Agrave: "À", Egrave: "È", Eacute: "É", Igrave: "Ì", Ograve: "Ò", Ugrave: "Ù" };

function text(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity.startsWith("#")) {
      const point = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : whole;
    }
    return ENTITIES[entity] ?? whole;
  }).replace(/\s+/g, " ").trim();
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match?.[1] ?? null;
}

function safeLink(html: string, host: string): string | null {
  for (const tag of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attribute(tag[0], "href");
    if (!href) continue;
    try { const url = new URL(href.replace(/&amp;/g, "&"), SOURCE); if (url.protocol === "https:" && url.hostname === host) return url.href; } catch { /* Ignore malformed links in source material. */ }
  }
  return null;
}

// UniSR's public timetable uses flat, four-column HTML rows, grouped by classroom.
// Validate the returned date and selection before treating an empty page as empty data.
export function parseTimetable(html: string, date: string, sourceId: string, year: number): Lesson[] {
  if (!/<title>\s*Calendario Aule UniSR\s*<\/title>/i.test(html) || !/<\/html>\s*$/i.test(html) || !/<\/form>/i.test(html)) throw new Error("Il portale UniSR ha restituito una pagina inattesa o incompleta.");
  const [y, m, d] = date.split("-");
  const dateInput = [...html.matchAll(/<input\b[^>]*>/gi)].find((tag) => attribute(tag[0], "name") === "data");
  if (!dateInput || attribute(dateInput[0], "value") !== `${d}/${m}/${y}`) throw new Error("UniSR non ha confermato la data richiesta.");
  const courseSelect = html.match(/<select\b[^>]*name=["']CDS_ID["'][^>]*>([\s\S]*?)<\/select>/i)?.[1];
  const selected = courseSelect && [...courseSelect.matchAll(/<option\b[^>]*>/gi)].find((tag) => /\bselected\b/i.test(tag[0]));
  if (!selected || attribute(selected[0], "value") !== sourceId) throw new Error("UniSR non ha confermato il corso richiesto.");
  const events: Lesson[] = [];
  let room = "", building = "", mapUrl: string | null = null, onlineUrl: string | null = null;
  const result = html.slice(html.lastIndexOf("</form>"));
  const resultText = text(result);
  const explicitlyEmpty = /\bNessun risultato\b/i.test(resultText);
  if (!explicitlyEmpty && !resultText.startsWith(`${d}/${m}/${y}`)) throw new Error("UniSR non ha restituito il riepilogo degli orari richiesti.");
  for (const row of result.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1]);
    if (cells.length !== 4) continue;
    const values = cells.map(text);
    if (values[2] === "Corso di Laurea" && values[3] === "anno") {
      const location = values[1].match(/^(.*?)\s*-\s*Aula\s+(.+?)(?:\s*\((.*?)\))?(?:\s+live)?$/i);
      if (!location) throw new Error("Formato delle aule UniSR cambiato.");
      building = location[1]; room = `${location[2]}${location[3] ? ` (${location[3]})` : ""}`;
      mapUrl = safeLink(cells[0], "unisr.2guide.cloud"); onlineUrl = safeLink(cells[1], "teams.microsoft.com");
      continue;
    }
    const time = values[0].match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
    if (!time) continue;
    if (!/^Lezione\s*:/i.test(values[1])) continue;
    if (!room || !building || !/^[1-6]$/.test(values[3]) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time[1]) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time[2]) || time[2] <= time[1]) throw new Error("Una lezione UniSR contiene dati incompleti.");
    let title = values[1].replace(/^Lezione\s*:\s*/i, "");
    const teacher = title.match(/\s*\(docente:\s*([\s\S]*?)\)\s*$/i)?.[1]?.trim() ?? "";
    title = title.replace(/\s*\(docente:[\s\S]*?\)\s*$/i, "").trim();
    const line = title.match(/\(LINEA\s+([^)]+)\)/i)?.[1]?.trim().toUpperCase() ?? null;
    if (/\bLINEA\b/i.test(title) && !line) throw new Error("Formato delle linee UniSR cambiato.");
    title = title.replace(/\s*\(LINEA\s+[^)]+\)/i, "").trim();
    if (!title) throw new Error("Una lezione UniSR è senza titolo.");
    if (year !== 0 && Number(values[3]) !== year) throw new Error("UniSR ha restituito un anno diverso da quello richiesto.");
    events.push({ date, start: time[1], end: time[2], title, teacher, year: Number(values[3]), line, room, building, mapUrl, onlineUrl });
  }
  if ((result.match(/Lezione\s*:/gi) ?? []).length !== events.length) throw new Error("Formato delle lezioni UniSR cambiato. L’ultimo calendario completo è conservato.");
  if (!events.length && !explicitlyEmpty && !/Esame\s*:/i.test(result)) throw new Error("UniSR non ha confermato l’assenza di lezioni.");
  return events;
}

export function deduplicateLessons(events: Lesson[]): Lesson[] {
  const unique = new Map<string, Lesson>();
  for (const event of events) unique.set(JSON.stringify([event.date, event.start, event.end, event.title, event.teacher, event.year, event.line, event.room, event.building]), event);
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}

export async function fetchDay(course: CourseKey, year: number, date: string): Promise<Lesson[]> {
  const definition = COURSES.find((item) => item.key === course);
  // UniSR uses zero for all years; preview uses it to discover every course line.
  if (!definition || !Number.isInteger(year) || year < 0 || year > 6 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Filtri non validi.");
  const [y, m, d] = date.split("-");
  const events: Lesson[] = [];
  // Consult both official course records: UniSR separates cohorts across otherwise identical labels.
  for (const sourceId of definition.sourceIds) {
    const response = await fetch(SOURCE, {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ASTRA University Calendar/1.0 (+https://www.astrasanraffaele.it)" },
      body: new URLSearchParams({ data: `${d}/${m}/${y}`, DAORA: "0", lezioni: "ok", id_palazzo: "0", id_aula: "0", CDS_ID: sourceId, ANNO_CORSO: String(year), Referente: "", mostra: "mostra / show" }),
    });
    if (!response.ok) throw new Error(`Il portale UniSR non è disponibile (${response.status}).`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 2000000) throw new Error("Risposta UniSR troppo grande.");
    const charset = response.headers.get("content-type")?.match(/charset\s*=\s*([^;\s]+)/i)?.[1]?.replace(/["']/g, "") ?? "windows-1252";
    let html: string;
    try { html = new TextDecoder(charset).decode(bytes); } catch { throw new Error("Codifica della risposta UniSR non riconosciuta."); }
    events.push(...parseTimetable(html, date, sourceId, year));
  }
  return deduplicateLessons(events);
}
