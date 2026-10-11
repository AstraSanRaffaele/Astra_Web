import { createHash } from "node:crypto";
import { selectLessons, type CalendarRecord, type Lesson } from "./types";

function escapeText(value: string): string { return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,"); }

export function foldLine(line: string): string {
  const chunks: string[] = [];
  let chunk = "", bytes = 0;
  for (const character of line) {
    const size = Buffer.byteLength(character, "utf8");
    if (bytes + size > 75) { chunks.push(chunk); chunk = " "; bytes = 1; }
    chunk += character; bytes += size;
  }
  chunks.push(chunk);
  return chunks.join("\r\n");
}

function dateTime(event: Lesson, field: "start" | "end") { return `${event.date.replaceAll("-", "")}T${event[field].replace(":", "")}00`; }

export function createCalendar(record: CalendarRecord): string {
  const stamp = new Date(record.last_synced_at!).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ASTRA San Raffaele//Calendario UniSR//IT", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${escapeText(record.name)}`, "X-WR-TIMEZONE:Europe/Rome", "REFRESH-INTERVAL;VALUE=DURATION:PT3H", "X-PUBLISHED-TTL:PT3H",
    "BEGIN:VTIMEZONE", "TZID:Europe/Rome", "BEGIN:STANDARD", "DTSTART:19701025T030000", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "BEGIN:DAYLIGHT", "DTSTART:19700329T020000", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT", "END:VTIMEZONE"];
  const occurrences = new Map<string, number>();
  const events = selectLessons(record.source_events, record).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  for (const event of events) {
    // Time and room are deliberately absent: a same-day move keeps the event UID.
    const identity = JSON.stringify([record.id, event.date, event.title, event.teacher, event.year, event.line]);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    const uid = createHash("sha256").update(`${identity}:${occurrence}`).digest("hex");
    const description = [event.teacher && `Docente: ${event.teacher}`, `Anno: ${event.year}`, event.line && `Linea: ${event.line}`, event.onlineUrl && `Lezione online: ${event.onlineUrl}`, event.mapUrl && `Come raggiungere l'aula: ${event.mapUrl}`, "Fonte: https://orario.unisr.it/"].filter(Boolean).join("\n");
    lines.push("BEGIN:VEVENT", `UID:${uid}@astrasanraffaele.it`, `DTSTAMP:${stamp}`, `LAST-MODIFIED:${stamp}`, `DTSTART;TZID=Europe/Rome:${dateTime(event, "start")}`, `DTEND;TZID=Europe/Rome:${dateTime(event, "end")}`, `SUMMARY:${escapeText(event.title)}`, `LOCATION:${escapeText(`${event.building} · ${event.room}`)}`, `DESCRIPTION:${escapeText(description)}`, "URL:https://orario.unisr.it/", "STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
