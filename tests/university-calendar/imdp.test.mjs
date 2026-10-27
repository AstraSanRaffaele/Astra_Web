import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import load from "./load.mjs";

const { parseTimetable, deduplicateLessons, fetchDay } = load("source");
const { selectLessons, validateSettings, availableLines } = load("types");
const { createCalendar } = load("ical");
const pages = new Map([
  ["10124", fs.readFileSync(new URL("./fixtures/imdp-legacy.html", import.meta.url), "utf8")],
  ["10321", fs.readFileSync(new URL("./fixtures/imdp-current.html", import.meta.url), "utf8")],
]);
const lessons = deduplicateLessons([...pages].flatMap(([id, html]) => parseTimetable(html, "2026-10-26", id, 0)));
const settings = { name: "Lezioni IMDP", course: "imdp", year: 3, semester_start: "2026-10-25", semester_end: "2027-06-15" };

test("both official IMDP records expose all six years without lines and retain rooms", () => {
  assert.deepEqual([...new Set(lessons.map((lesson) => lesson.year))].sort(), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(availableLines(lessons), []);
  assert.ok(lessons.every((lesson) => lesson.line === null && lesson.room && lesson.building && lesson.teacher));
  assert.ok(lessons.some((lesson) => lesson.title === "Basic Mechanisms of Diseases"));
  assert.ok(lessons.some((lesson) => lesson.title === "Medical Physics"));
});

test("IMDP settings need no line and include every lesson of the chosen year automatically", () => {
  const normalized = validateSettings({ ...settings, line: "VIOLA", included_subjects: ["a stale Medicine selection"] });
  assert.equal(normalized.line, "COMUNE");
  assert.deepEqual(normalized.included_subjects, []);
  for (const year of [1, 2, 3, 4, 5, 6]) {
    const selected = selectLessons(lessons, validateSettings({ ...settings, year }));
    assert.ok(selected.length > 0);
    assert.deepEqual(selected, lessons.filter((lesson) => lesson.year === year));
  }
  assert.deepEqual(selectLessons(lessons, { ...normalized, semester_start: "2026-10-27" }), []);
});

test("the IMDP importer consults both cohorts once with every year selected", async (context) => {
  const calls = [];
  const original = globalThis.fetch;
  context.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (_url, options) => {
    calls.push(options.body);
    return new Response(pages.get(options.body.get("CDS_ID")), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  };
  assert.deepEqual(await fetchDay("imdp", 0, "2026-10-26"), lessons);
  assert.deepEqual(calls.map((body) => body.get("CDS_ID")), ["10124", "10321"]);
  assert.ok(calls.every((body) => body.get("ANNO_CORSO") === "0" && body.get("lezioni") === "ok" && !body.has("esami")));
});

test("a pause between UniSR cohorts prevents the next HTTP request", async (context) => {
  const original = globalThis.fetch;
  context.after(() => { globalThis.fetch = original; });
  let open = true;
  let requests = 0;
  globalThis.fetch = async (_url, options) => {
    requests++;
    open = false;
    return new Response(pages.get(options.body.get("CDS_ID")), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  };
  await assert.rejects(fetchDay("imdp", 0, "2026-10-26", () => open), /in pausa/);
  assert.equal(requests, 1);
});

test("IMDP subscriptions export all selected-year lessons and classrooms without a line description", () => {
  const record = { ...validateSettings(settings), id: "imdp-calendar", source_events: lessons, last_synced_at: "2026-10-25T12:00:00Z" };
  const ics = createCalendar(record);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, lessons.filter((lesson) => lesson.year === 3).length);
  assert.match(ics, /SUMMARY:Basic Mechanisms of Diseases/);
  assert.match(ics, /LOCATION:/);
  assert.doesNotMatch(ics, /Linea:|SUMMARY:Medical Physics/);
});
