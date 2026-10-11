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

test("a shared read requests only the needed year and preview range, without owner or token data", async () => {
  let call;
  const reader = load("shared", { "server-only": {}, "@/lib/admin-users-server": { createAdminClient: () => ({ rpc: async (name, args) => { call = { name, args }; return { data: source, error: null }; } }) } });
  assert.deepEqual(await reader.readSharedSource("medicina", 4, "2026-10-11", "2026-10-17"), source);
  assert.deepEqual(call, { name: "read_university_calendar_source", args: { requested_course: "medicina", requested_year: 4, requested_start: "2026-10-11", requested_end: "2026-10-17" } });
});
