import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import load from "./load.mjs";
const directory = path.dirname(fileURLToPath(import.meta.url));
const { parseTimetable, deduplicateLessons, fetchDay } = load("source");
const { selectLessons, subjectKey, validateSettings, daysBetween, availableLines } = load("types");
const { createCalendar, foldLine } = load("ical");
const { subjectColors, subjectColorKey } = load("subject-colors");
const fixture = (name) => new TextDecoder("windows-1252").decode(fs.readFileSync(path.join(directory, "fixtures", `${name}.html`)));
const current = fixture("current"), legacy = fixture("legacy");
const events = [...parseTimetable(current, "2026-10-12", "10311", 0), ...parseTimetable(legacy, "2026-10-12", "10115", 0)];
const settings = { name: "Medicina · Bianca", course: "medicina", year: 4, line: "BIANCA", semester_start: "2026-09-01", semester_end: "2027-01-31", included_subjects: [] };
const record = (source_events, extra = {}) => ({ ...settings, id: "d80f0ee3-993d-4c59-93c1-fd944632f060", last_synced_at: "2026-10-11T12:00:00.000Z", source_events, ...extra });
const unfold = (ics) => ics.replace(/\r\n /g, "");

test("real UniSR cohorts expose years, lines, rooms, teachers and unassigned activities", () => {
  assert.deepEqual([...new Set(events.map((event) => event.year))].sort(), [1, 2, 3, 4, 5, 6]);
  assert.ok(events.some((event) => event.line === "AZZURRA"));
  assert.ok(events.some((event) => event.line === null && event.year === 4));
  const pediatrics = events.find((event) => event.title === "Pediatria" && event.line === "BIANCA");
  assert.equal(pediatrics.teacher, "AIUTI ALESSANDRO");
  assert.equal(pediatrics.room, "BO402 (4 piano)");
  assert.equal(pediatrics.building, "BORROMINI");
  assert.ok(pediatrics.mapUrl.startsWith("https://unisr.2guide.cloud/"));
  assert.ok(pediatrics.onlineUrl.startsWith("https://teams.microsoft.com/"));
});

test("line choices include every official color for the selected year and accept newly published colors", () => {
  assert.deepEqual(availableLines(events), ["AZZURRA", "BIANCA", "GIALLA", "ROSSA", "VERDE", "VIOLA"]);
  assert.deepEqual(availableLines(events, 4), ["AZZURRA", "BIANCA", "ROSSA", "VERDE", "VIOLA"]);
  assert.deepEqual(availableLines(events, 6), ["BIANCA", "GIALLA", "VERDE"]);
  for (const year of [4, 6]) {
    for (const line of availableLines(events, year)) {
      const selected = selectLessons(events, { ...settings, year, line });
      assert.ok(selected.length > 0);
      assert.ok(selected.every((lesson) => lesson.year === year && lesson.line === line));
    }
  }
  const changed = parseTimetable(legacy.replaceAll("LINEA ROSSA", "LINEA ARANCIONE"), "2026-10-12", "10115", 0);
  assert.ok(availableLines(changed, 4).includes("ARANCIONE"));
});

test("the all-years HTTP selection discovers lines without mixing years in the final calendar", async (context) => {
  const calls = [];
  context.mock.method(global, "fetch", async (_url, options) => {
    calls.push(options);
    const html = options.body.get("CDS_ID") === "10115" ? legacy : current;
    return new Response(Uint8Array.from([...html].map((char) => char.charCodeAt(0))), { headers: { "Content-Type": "text/html; charset=windows-1252" } });
  });
  const allYears = await fetchDay("medicina", 0, "2026-10-12");
  assert.ok(calls.every((call) => call.body.get("ANNO_CORSO") === "0" && call.body.get("lezioni") === "ok" && !call.body.has("esami")));
  assert.deepEqual(availableLines(allYears), ["AZZURRA", "BIANCA", "GIALLA", "ROSSA", "VERDE", "VIOLA"]);
  assert.ok(selectLessons(allYears, settings).every((lesson) => lesson.year === 4 && lesson.line === "BIANCA"));
});

test("only selected year and line are included, with explicit opt-in for unassigned lessons", () => {
  const white = selectLessons(events, settings);
  assert.ok(white.length > 0);
  assert.ok(white.every((event) => event.year === 4 && event.line === "BIANCA"));
  const elective = events.find((event) => event.year === 4 && event.line === null);
  const withElective = selectLessons(events, { ...settings, included_subjects: [subjectKey(elective)] });
  assert.equal(withElective.length, white.length + events.filter((event) => event.year === 4 && subjectKey(event) === subjectKey(elective)).length);
  assert.equal(selectLessons(events, { ...settings, semester_start: "2026-11-01" }).length, 0);
});

test("empty days require confirmed date and course; truncated and changed pages are rejected", () => {
  assert.throws(() => parseTimetable(current, "2026-10-13", "10311", 0), /data/);
  assert.throws(() => parseTimetable(current, "2026-10-12", "10115", 0), /corso/);
  assert.throws(() => parseTimetable(current, "2026-10-12", "10311", 4), /anno/);
  assert.throws(() => parseTimetable(current.slice(0, -100), "2026-10-12", "10311", 0), /incompleta/);
  assert.deepEqual(parseTimetable(fixture("empty"), "2026-10-11", "10115", 4), []);
  const missingResults = current.replace(/(<\/form>)[\s\S]*$/, "$1</body></html>");
  assert.throws(() => parseTimetable(missingResults, "2026-10-12", "10311", 0), /riepilogo/);
  assert.throws(() => parseTimetable(current.replace(/\d{2}:\d{2}-\d{2}:\d{2}/g, "orario cambiato"), "2026-10-12", "10311", 0), /Formato/);
});

test("exam rows are excluded and duplicate cohort lessons are collapsed", () => {
  const replaced = current.replace("Lezione:", "Esame:");
  const original = parseTimetable(current, "2026-10-12", "10311", 0);
  assert.equal(parseTimetable(replaced, "2026-10-12", "10311", 0).length, original.length - 1);
  assert.equal(deduplicateLessons([...events, ...events]).length, events.length);
});

test("input validates real dates and accepts an entire semester across year and DST boundaries", () => {
  assert.equal(validateSettings(settings).course, "medicina");
  assert.equal(daysBetween("2026-09-01", "2027-01-31").length, 153);
  assert.equal(daysBetween("2026-10-24", "2026-10-26").length, 3);
  assert.equal(daysBetween("2026-10-11", "2027-06-15").length, 248);
  assert.equal(daysBetween("2027-06-16", "2028-06-15").length, 366);
  for (const invalid of [{ year: 7 }, { course: "psicologia" }, { semester_start: "2026-02-30" }, { semester_end: "2026-01-01" }, { semester_end: "2027-09-02" }, { included_subjects: [8] }]) assert.throws(() => validateSettings({ ...settings, ...invalid }));
});

test("ICS is UTF-8, CRLF folded, escaped, and uses Europe/Rome including daylight saving", () => {
  const lesson = { ...selectLessons(events, settings)[0], title: "Lezione à;virgola,\\\n🎓".repeat(12) };
  const ics = createCalendar(record([lesson]));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(ics.split("\r\n").every((line) => Buffer.byteLength(line) <= 75));
  assert.ok(!ics.includes("�"));
  const unfolded = unfold(ics);
  assert.ok(unfolded.includes("DTSTART;TZID=Europe/Rome:20261012T"));
  assert.ok(unfolded.includes("TZOFFSETTO:+0200"));
  assert.ok(unfolded.includes("TZOFFSETTO:+0100"));
  assert.ok(unfolded.includes("SUMMARY:Lezione à\\;virgola\\,\\\\\\n🎓"));
  assert.ok(unfolded.includes("REFRESH-INTERVAL;VALUE=DURATION:PT4H"));
  assert.ok(unfolded.includes(`LOCATION:${lesson.building} · ${lesson.room}`));
  assert.ok(unfolded.includes(`Aula: ${lesson.room}\\nEdificio: ${lesson.building}`));
  assert.equal(foldLine("à".repeat(90)).replace(/\r\n /g, ""), "à".repeat(90));
});

test("same-day time and room changes keep UID; removed lessons disappear from the full feed", () => {
  const lesson = selectLessons(events, settings)[0];
  const first = unfold(createCalendar(record([lesson])));
  const moved = unfold(createCalendar(record([{ ...lesson, start: "18:00", end: "20:00", room: "NUOVA" }])));
  assert.equal(first.match(/UID:(.+)/)[1], moved.match(/UID:(.+)/)[1]);
  assert.ok(moved.includes("T180000"));
  assert.ok(moved.includes(`LOCATION:${lesson.building} · NUOVA`));
  assert.ok(moved.includes("Aula: NUOVA"));
  assert.ok(!createCalendar(record([])).includes("BEGIN:VEVENT"));
});

test("subject colors group the same subject across teachers, avoid duplicates and do not depend on row order", () => {
  const titles = [...new Set(events.map((event) => event.title)), ...Array.from({ length: 100 }, (_, i) => `Materia aggiuntiva ${i}`)];
  const colors = subjectColors(titles);
  assert.equal(new Set([...colors.values()].map((color) => color.hex)).size, colors.size);
  assert.deepEqual(subjectColors([...titles].reverse()), colors);
  assert.equal(subjectColorKey("  ANATOMIA   Patologica "), subjectColorKey("Anatomia Patologica"));
  assert.equal(subjectColors(["  ANATOMIA   Patologica ", "Anatomia Patologica"]).size, 1);
});

test("one full calendar includes all allowed subjects and leaves colors to Apple and Google", () => {
  const selected = selectLessons(events, settings);
  const lesson = selected[0];
  const restricted = [{ ...lesson, year: 5 }, { ...lesson, line: "ROSSA" }, { ...lesson, line: null }];
  const full = unfold(createCalendar(record([...selected, ...restricted])));
  assert.equal((full.match(/BEGIN:VEVENT/g) ?? []).length, selected.length);
  assert.ok(full.includes(`X-WR-CALNAME:${settings.name}`));
  assert.ok(!full.includes("COLOR:") && !full.includes("CATEGORIES:"));
  assert.ok(full.includes("REFRESH-INTERVAL;VALUE=DURATION:PT4H"));
  assert.ok(full.includes(`LOCATION:${lesson.building} · ${lesson.room}`));
});

test("the HTTP reader submits lesson-only filters to both official course IDs and decodes Italian accents", async (context) => {
  const calls = [];
  context.mock.method(global, "fetch", async (_url, options) => {
    calls.push(options);
    const sourceId = options.body.get("CDS_ID");
    const html = (sourceId === "10115" ? legacy : current).replace("Lezione:&nbsp;Anatomia", "Lezione:&nbsp;Unità di Anatomia");
    // Filter the fixture to year 4, just as the real request does.
    const rows = html.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, (row) => {
      if (!/Lezione:/.test(row)) return row;
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
      return cells[3]?.[1].trim() === "4" ? row : "";
    });
    const filtered = sourceId === "10311" ? rows.replace(/(<\/form>)[\s\S]*$/, "$1<p>Nessun risultato</p></body></html>") : rows;
    const bytes = Uint8Array.from([...filtered].map((char) => char.charCodeAt(0)));
    return new Response(bytes, { headers: { "Content-Type": "text/html; charset=windows-1252" } });
  });
  const result = await fetchDay("medicina", 4, "2026-10-12");
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.method === "POST" && call.body.get("lezioni") === "ok" && !call.body.has("esami") && call.body.get("data") === "12/10/2026"));
  assert.ok(result.length > 0 && result.every((lesson) => lesson.year === 4));
  assert.ok(result.some((lesson) => lesson.title.includes("Unità")));
  assert.ok(result.every((lesson) => !lesson.title.includes("�")));
});
