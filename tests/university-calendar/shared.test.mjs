import test from "node:test";
import assert from "node:assert/strict";
import load from "./load.mjs";

const shared = load("shared", { "server-only": {}, "@/lib/admin-users-server": {} });
const lesson = { date: "2026-10-12", year: 4, line: "BIANCA", title: "Anatomia", teacher: "Docente", room: "CA101", building: "CANOVA" };
const record = { course: "medicina", year: 4, semester_start: "2026-10-11", semester_end: "2027-06-15", source_events: [lesson], last_synced_at: "2026-10-10T12:00:00Z", token: "personal", sync_cursor: null };
const source = { course: "medicina", semester_start: "2026-10-11", semester_end: "2027-06-15", ready: false, events: [], sync_cursor: 24, next_sync_at: "2026-10-12T06:00:00Z", last_synced_at: null };

test("a partial shared import preserves an existing subscription's complete snapshot", () => {
  const resolved = shared.applySharedSource(record, source);
  assert.deepEqual(resolved.source_events, [lesson]);
  assert.equal(resolved.last_synced_at, record.last_synced_at);
  assert.equal(resolved.token, "personal");
  assert.equal(resolved.sync_cursor, null);
});

test("new subscriptions follow shared progress; published empty calendars remove cancellations", () => {
  const pending = shared.applySharedSource({ ...record, source_events: [], last_synced_at: null }, source);
  assert.equal(pending.sync_cursor, 24);
  assert.equal(pending.last_synced_at, null);
  const ready = shared.applySharedSource(record, { ...source, ready: true, last_synced_at: "2026-10-11T16:00:00Z" });
  assert.deepEqual(ready.source_events, []);
  assert.equal(ready.sync_cursor, null);
});

test("another course, academic year or incomplete historical coverage cannot replace a personal calendar", () => {
  for (const wrong of [{ course: "medicina-2" }, { semester_end: "2028-06-15" }, { semester_start: "2026-10-12" }]) {
    assert.equal(shared.applySharedSource(record, { ...source, ready: true, ...wrong }), record);
  }
});

test("empty previews require actual cached day coverage, rather than just an empty event array", () => {
  assert.equal(shared.previewCovered({ ...source, sync_cursor: 6 }, "2026-10-11", "2026-10-17"), false);
  assert.equal(shared.previewCovered({ ...source, sync_cursor: 7 }, "2026-10-11", "2026-10-17"), true);
  assert.equal(shared.previewCovered({ ...source, ready: true }, "2026-10-11", "2027-06-15"), true);
  assert.equal(shared.previewCovered(source, "2026-10-10", "2026-10-17"), false);
  assert.equal(shared.previewCovered(source, "2027-06-14", "2027-06-16"), false);
});

test("a Medicine shared read consults cohort caches with only the needed year and range", async () => {
  const calls = [];
  const reader = load("shared", { "server-only": {}, "@/lib/admin-users-server": { createAdminClient: () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { data: args.requested_course === "medicina" ? source : null, error: null }; } }) } });
  assert.deepEqual(await reader.readSharedSource("medicina", 4, "2026-10-11", "2026-10-17"), { ...source, lines: [] });
  assert.deepEqual(calls.map(call => call.args.requested_course), ["medicina", "medicina-2", "medicina-3"]);
  assert.ok(calls.every(call => call.name === "read_university_calendar_source" && call.args.requested_year === 4 && call.args.requested_start === "2026-10-11" && call.args.requested_end === "2026-10-17"));
});

test("new subscriptions use only fully saved days of a partial cache", () => {
  const pending = { ...record, source_events: [], last_synced_at: null };
  const partial = { ...source, sync_cursor: 3, events: [lesson, { ...lesson, date: "2026-10-14" }] };
  assert.equal(shared.cachedSourceThrough(pending, partial), "2026-10-13");
  const resolved = shared.applySharedSource(pending, partial);
  assert.deepEqual(resolved.source_events, [lesson]);
  assert.equal(resolved.last_synced_at, null);
  assert.equal(resolved.sync_cursor, 3);
  for (const invalid of [{ sync_cursor: 0 }, { sync_cursor: null }, { sync_cursor: -1 }, { sync_cursor: 1.5 }, { sync_cursor: 1000000000 }, { semester_start: "2026-10-12" }, { semester_start: "2026-10-01" }, { semester_end: "2028-06-15" }, { course: "imdp" }]) {
    assert.equal(shared.cachedSourceThrough(pending, { ...partial, ...invalid }), null);
    assert.deepEqual(shared.applySharedSource(pending, { ...partial, ...invalid }).source_events, []);
  }
});


function familyReader(sources, errorCourse) {
  const calls = [];
  const reader = load("shared", { "server-only": {}, "@/lib/admin-users-server": { createAdminClient: () => ({ rpc: async (name, args) => { calls.push(args); return { data: sources[args.requested_course] ?? null, error: args.requested_course === errorCourse ? { code: "offline" } : null }; } }) } });
  return { ...reader, calls };
}

const familyLesson = { ...lesson, date: "2026-11-04", start: "09:00", end: "10:00", year: 2, line: "ROSSA", title: "Lezione della linea rossa" };
const familyElective = { ...familyLesson, date: "2026-11-05", line: null, title: "Elettivo comune" };
const snapshot = (course, events, overrides = {}) => ({ ...source, course, ready: true, sync_cursor: null, last_synced_at: "2026-11-02T08:00:00Z", lines: load("types").availableLines(events), events, ...overrides });

for (const requestedCourse of ["medicina", "medicina-2", "medicina-3"]) {
  test(`${requestedCourse}: the same subscription includes cohort lessons and common electives`, async () => {
    const sources = { medicina: snapshot("medicina", [familyElective]), "medicina-2": snapshot("medicina-2", [{ ...familyLesson, line: "VERDE" }]), "medicina-3": snapshot("medicina-3", [familyLesson]) };
    const reader = familyReader(sources);
    const combined = await reader.readSharedSource(requestedCourse, 2, "2026-11-02", "2027-06-15");
    assert.equal(combined.course, requestedCourse);
    assert.equal(combined.ready, true);
    const types = load("types");
    const settings = { ...record, course: requestedCourse, year: 2, line: "ROSSA", included_subjects: [types.subjectKey(familyElective)] };
    assert.deepEqual(types.selectLessons(combined.events, settings), [familyLesson, familyElective]);
    assert.deepEqual(types.unassignedSubjects(combined.events, 2).map(subject => subject.title), [familyElective.title]);
    assert.equal(reader.calls.length, 3);
  });
}

test("Medicine cache composition deduplicates shared events and updates the publication timestamp", async () => {
  const reader = familyReader({ medicina: snapshot("medicina", [familyElective]), "medicina-2": snapshot("medicina-2", []), "medicina-3": snapshot("medicina-3", [familyLesson, familyElective], { last_synced_at: "2026-11-02T12:00:00Z" }) });
  const combined = await reader.readSharedSource("medicina", 2);
  assert.deepEqual(combined.events, [familyLesson, familyElective]);
  assert.equal(combined.last_synced_at, "2026-11-02T12:00:00Z");
});

test("unpublished, incompatible or insufficiently covered companion snapshots cannot erase or leak lessons", async () => {
  for (const invalid of [{ ready: false }, { semester_end: "2028-06-15" }, { semester_start: "2026-11-03" }]) {
    const reader = familyReader({ medicina: snapshot("medicina", [familyElective]), "medicina-3": snapshot("medicina-3", [familyLesson], invalid) });
    const combined = await reader.readSharedSource("medicina", 2, "2026-11-02", "2027-06-15");
    assert.deepEqual(combined.events, [familyElective]);
  }
  const incomplete = familyReader({ medicina: snapshot("medicina", [familyElective], { ready: false, last_synced_at: null, sync_cursor: 7 }), "medicina-3": snapshot("medicina-3", [familyLesson]) });
  const combined = await incomplete.readSharedSource("medicina", 2);
  assert.equal(combined.ready, false);
  assert.equal(combined.last_synced_at, null);
  assert.equal(combined.sync_cursor, 7);
});

test("a companion lookup failure returns an error rather than publishing a calendar without its lessons", async () => {
  const reader = familyReader({ medicina: snapshot("medicina", [familyElective]) }, "medicina-3");
  await assert.rejects(reader.readSharedSource("medicina", 2));
});

test("IMDP remains a separate single-source read and does not acquire Medicine events", async () => {
  const imdp = snapshot("imdp", [{ ...familyLesson, line: null, title: "IMDP lesson" }]);
  const reader = familyReader({ imdp, medicina: snapshot("medicina", [familyElective]) });
  assert.deepEqual(await reader.readSharedSource("imdp", 2), imdp);
  assert.equal(reader.calls.length, 1);
  assert.equal(reader.calls[0].requested_course, "imdp");
});
