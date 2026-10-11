import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import load from "./load.mjs";

const token = "A".repeat(43);
const lesson = { date: "2026-10-12", start: "09:00", end: "10:00", title: "Anatomia & clinica", teacher: "Docente", year: 4, line: "BIANCA", room: "CA101", building: "CANOVA", mapUrl: null, onlineUrl: null };
const record = { id: "calendar", name: "Medicina", course: "medicina", year: 4, line: "BIANCA", semester_start: "2026-10-11", semester_end: "2027-06-15", included_subjects: [], token, enabled: true, last_synced_at: "2026-10-11T12:00:00Z", source_events: [lesson, { ...lesson, title: "Pediatria" }, { ...lesson, year: 6 }, { ...lesson, title: "Elettivo", line: null }] };

function harness(data = record, now = "2026-10-11T12:00:00Z", source = null) {
  const reads = [];
  const client = { from: (table) => {
    const filters = [];
    const query = { select: () => query, eq: (key, value) => { filters.push([key, value]); return query; }, maybeSingle: async () => { reads.push({ table, filters }); return { data: data && filters.every(([key, value]) => data[key] === value) ? data : null, error: null }; } };
    return query;
  } };
  const period = load("period");
  const route = load("../../app/api/calendars/university/[token]/route", {
    "@/lib/admin-users-server": { createAdminClient: () => client },
    "@/lib/university-calendar/ical": load("ical"),
    "@/lib/university-calendar/shared": { readSharedSource: async () => source, applySharedSource: load("shared", { "server-only": {}, "@/lib/admin-users-server": {} }).applySharedSource },
    "@/lib/university-calendar/period": { calendarExpired: (end) => period.calendarExpired(end, new Date(now)) },
  });
  const get = (query = "", etag, suppliedToken = token) => route.GET(new NextRequest(`https://astra.test/api/calendars/university/${suppliedToken}${query}`, etag ? { headers: { "If-None-Match": etag } } : undefined), { params: Promise.resolve({ token: suppliedToken }) });
  return { get, reads };
}

test("one subscription exposes all allowed subjects with rooms and privacy controls, without app colors", async () => {
  const h = harness();
  const response = await h.get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("content-type"), "text/calendar; charset=utf-8");
  const body = await response.text();
  assert.equal((body.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  assert.ok(body.includes("LOCATION:CANOVA · CA101"));
  assert.ok(body.includes("SUMMARY:Pediatria"));
  assert.ok(!body.includes("COLOR:") && !body.includes("SUMMARY:Elettivo"));
  assert.deepEqual(h.reads[0].filters, [["token", token], ["enabled", true]]);
});

test("unchanged calendars return 304 and cancelled lessons change the full feed ETag", async () => {
  const h = harness();
  const first = await h.get();
  assert.equal((await h.get("", first.headers.get("etag"))).status, 304);
  const changed = await harness({ ...record, source_events: [] }).get("", first.headers.get("etag"));
  assert.equal(changed.status, 200);
  assert.notEqual(changed.headers.get("etag"), first.headers.get("etag"));
  assert.ok(!(await changed.text()).includes("BEGIN:VEVENT"));
});

test("invalid, revoked and disabled tokens are rejected; unfinished imports can be retried", async () => {
  const invalid = harness();
  assert.equal((await invalid.get("", undefined, "invalid")).status, 404);
  assert.deepEqual(invalid.reads, []);
  assert.equal((await harness().get("", undefined, "B".repeat(43))).status, 404);
  assert.equal((await harness({ ...record, enabled: false }).get()).status, 404);
  const pending = await harness({ ...record, last_synced_at: null }).get();
  assert.equal(pending.status, 503);
  assert.equal(pending.headers.get("retry-after"), "600");
});

test("retired subject links are rejected before database access", async () => {
  const h = harness();
  for (const query of ["?subject=Pediatria", "?subject=", "?subject=A&subject=B"]) assert.equal((await h.get(query)).status, 404);
  assert.deepEqual(h.reads, []);
});

test("expiration overrides cached ETags and unfinished imports exactly at midnight in Italy", async () => {
  const before = await harness(record, "2027-06-15T21:59:59Z").get();
  assert.equal(before.status, 200);
  const after = await harness(record, "2027-06-15T22:00:00Z").get("", before.headers.get("etag"));
  assert.equal(after.status, 404);
  assert.equal(after.headers.get("cache-control"), "private, no-store");
  assert.equal((await harness({ ...record, last_synced_at: null }, "2027-06-15T22:00:00Z").get()).status, 404);
  assert.equal((await harness({ ...record, semester_end: "2028-06-15" }, "2027-06-15T22:00:00Z").get()).status, 200);
});

test("personal calendar views expose only one link without subject subscriptions", () => {
  const view = load("server", { "server-only": {}, "@/lib/supabase/server": {}, "@/lib/admin-users-server": {} }).calendarView({ ...record, staging_events: [] }, "https://astra.test");
  assert.equal(view.feedUrl, `https://astra.test/api/calendars/university/${token}`);
  assert.equal(view.eventCount, 2);
  assert.ok(!Object.hasOwn(view, "subjectFeeds"));
});


test("shared publication updates existing URLs and preserves event identities across room changes", async () => {
  const initial = await harness().get();
  const before = await initial.text();
  const source = { course: record.course, semester_start: record.semester_start, semester_end: record.semester_end, ready: true, events: [{ ...lesson, room: "CA102" }], last_synced_at: "2026-10-11T16:00:00Z", sync_cursor: null };
  const updated = await harness({ ...record, source_events: [], last_synced_at: null }, "2026-10-11T16:00:00Z", source).get();
  assert.equal(updated.status, 200);
  const after = await updated.text();
  assert.ok(after.includes("LOCATION:CANOVA · CA102"));
  assert.equal(before.match(/UID:([^\r]+)/)[1], after.match(/UID:([^\r]+)/)[1]);
  const empty = await harness(record, "2026-10-11T16:00:00Z", { ...source, events: [] }).get();
  assert.equal(empty.status, 200);
  assert.ok(!(await empty.text()).includes("BEGIN:VEVENT"));
});
