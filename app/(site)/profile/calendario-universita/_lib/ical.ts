import { createHash } from "node:crypto";
import { selectLessons, type CalendarRecord, type Lesson } from "./types";
import { CALENDAR_APP_REFRESH_HOURS } from "./config";
import { calendarToday } from "./period";
import { REVOKED_CALENDAR_NOTICE } from "./revocation-notice";

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

export function createRevokedCalendar(notice?: { calendarId: string; revokedAt: string; profileUrl: string }): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ASTRA San Raffaele//Calendario UniSR//IT", "CALSCALE:GREGORIAN", "X-WR-CALNAME:ASTRA · Link disattivato", "X-WR-TIMEZONE:Europe/Rome", `REFRESH-INTERVAL;VALUE=DURATION:PT${CALENDAR_APP_REFRESH_HOURS}H`, `X-PUBLISHED-TTL:PT${CALENDAR_APP_REFRESH_HOURS}H`];
  if (notice) {
    const revokedAt = new Date(notice.revokedAt);
    const firstDay = Date.parse(`${calendarToday(revokedAt)}T12:00:00Z`);
    const stamp = revokedAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const day = (offset: number) => new Date(firstDay + offset * 86400000).toISOString().slice(0, 10).replaceAll("-", "");
    // Fixed Italian dates and UIDs: refreshing never moves or duplicates warnings.
    for (let index = 0; index < 3; index++) {
      const date = day(index);
      const uid = createHash("sha256").update(JSON.stringify(["revocation", notice.calendarId, notice.revokedAt, date])).digest("hex");
      lines.push("BEGIN:VEVENT", `UID:${uid}@astrasanraffaele.it`, `DTSTAMP:${stamp}`, `LAST-MODIFIED:${stamp}`, `DTSTART;VALUE=DATE:${date}`, `DTEND;VALUE=DATE:${day(index + 1)}`, `SUMMARY:${escapeText(REVOKED_CALENDAR_NOTICE.title)}`, `DESCRIPTION:${escapeText(`${REVOKED_CALENDAR_NOTICE.description}\n\nGenera un nuovo link su ASTRA: ${notice.profileUrl}`)}`, `URL:${notice.profileUrl}`, "STATUS:CONFIRMED", "TRANSP:TRANSPARENT", "END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function createCalendar(record: CalendarRecord): string {
  const stamp = new Date(record.last_synced_at ?? record.sync_started_at ?? record.created_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const events = selectLessons(record.source_events, record).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ASTRA San Raffaele//Calendario UniSR//IT", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${escapeText(record.name)}`, "X-WR-TIMEZONE:Europe/Rome", `REFRESH-INTERVAL;VALUE=DURATION:PT${CALENDAR_APP_REFRESH_HOURS}H`, `X-PUBLISHED-TTL:PT${CALENDAR_APP_REFRESH_HOURS}H`,
    "BEGIN:VTIMEZONE", "TZID:Europe/Rome", "BEGIN:STANDARD", "DTSTART:19701025T030000", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "BEGIN:DAYLIGHT", "DTSTART:19700329T020000", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT", "END:VTIMEZONE"];
  const occurrences = new Map<string, number>();
  for (const event of events) {
    // Time and room are deliberately absent: a same-day move keeps the event UID.
    const identity = JSON.stringify([record.id, event.date, event.title, event.teacher, event.year, event.line]);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    const uid = createHash("sha256").update(`${identity}:${occurrence}`).digest("hex");
    const description = [event.teacher && `Docente: ${event.teacher}`, `Anno: ${event.year}`, event.line && `Linea: ${event.line}`, `Aula: ${event.room}`, "Fonte: https://orario.unisr.it/"].filter(Boolean).join("\n");
    lines.push("BEGIN:VEVENT", `UID:${uid}@astrasanraffaele.it`, `DTSTAMP:${stamp}`, `LAST-MODIFIED:${stamp}`, `DTSTART;TZID=Europe/Rome:${dateTime(event, "start")}`, `DTEND;TZID=Europe/Rome:${dateTime(event, "end")}`, `SUMMARY:${escapeText(event.title)}`, `LOCATION:${escapeText(`${event.building} · ${event.room}`)}`, `DESCRIPTION:${escapeText(description)}`, "URL:https://orario.unisr.it/", "STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
