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
  const route = load("@/app/api/calendars/university/[token]/route", {
    "@/lib/admin-users-server": { createAdminClient: () => client },
    "@/app/(site)/profile/calendario-universita/_lib/ical": load("ical"),
    "@/app/(site)/profile/calendario-universita/_lib/shared": { ...load("shared", { "server-only": {}, "@/lib/admin-users-server": {} }), readSharedSource: async () => source },
    "@/app/(site)/profile/calendario-universita/_lib/period": { calendarExpired: (end) => period.calendarExpired(end, new Date(now)) },
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

test("IMDP feeds use the shared year snapshot and include line-free lessons without individual opt-in", async () => {
  const imdp = { ...record, course: "imdp", line: "COMUNE", included_subjects: [], source_events: [], last_synced_at: null };
  const source = { course: "imdp", semester_start: imdp.semester_start, semester_end: imdp.semester_end, ready: true, events: [{ ...lesson, title: "Neurology", line: null }, { ...lesson, title: "Radiology", line: null }, { ...lesson, title: "Medical Physics", line: null, year: 1 }], last_synced_at: "2026-10-11T16:00:00Z", sync_cursor: null };
  const response = await harness(imdp, "2026-10-11T16:00:00Z", source).get();
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.equal((body.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  assert.match(body, /SUMMARY:Neurology/);
  assert.match(body, /LOCATION:CANOVA · CA101/);
  assert.doesNotMatch(body, /SUMMARY:Medical Physics|Linea:/);
  const view = load("server", { "server-only": {}, "@/lib/supabase/server": {}, "@/lib/admin-users-server": {} }).calendarView(imdp, "https://astra.test", source);
  assert.equal(view.eventCount, 2);
  assert.deepEqual(view.subjects, []);
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

test("partial cached links work throughout the weekend and Monday with stable IDs and no invented sync date", async () => {
  const pending = { ...record, source_events: [], last_synced_at: null, created_at: "2026-10-10T12:00:00Z" };
  const source = { course: record.course, semester_start: "2026-10-09", semester_end: record.semester_end, ready: false, events: [lesson, { ...lesson, date: "2026-10-14" }], last_synced_at: null, sync_started_at: "2026-10-09T16:00:00Z", sync_cursor: 5 };
  const h = harness(pending, "2026-10-11T12:00:00Z", source);
  const partial = await h.get();
  assert.equal(partial.status, 200);
  const before = await partial.text();
  assert.equal((before.match(/BEGIN:VEVENT/g) ?? []).length, 1);
  assert.match(before, /LOCATION:CANOVA · CA101/);
  assert.match(before, /DTSTAMP:20261009T160000Z/);
  assert.doesNotMatch(before, /DTSTART;TZID=Europe\/Rome:20261014/);
  assert.equal((await h.get("", partial.headers.get("etag"))).status, 304);
  assert.equal((await harness(pending, "2026-10-12T06:00:00Z", source).get()).status, 200);
  const complete = await harness(pending, "2026-10-12T06:10:00Z", { ...source, ready: true, last_synced_at: "2026-10-12T06:10:00Z", sync_cursor: null }).get();
  const after = await complete.text();
  assert.equal(complete.status, 200);
  assert.equal((after.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  assert.equal(before.match(/UID:([^\r]+)/)[1], after.match(/UID:([^\r]+)/)[1]);
  assert.notEqual(complete.headers.get("etag"), partial.headers.get("etag"));
});

test("a partial cache never removes lessons from an already complete subscription", async () => {
  const source = { course: record.course, semester_start: record.semester_start, semester_end: record.semester_end, ready: false, events: [], last_synced_at: null, sync_started_at: "2026-10-09T16:00:00Z", sync_cursor: 3 };
  const response = await harness(record, "2026-10-11T12:00:00Z", source).get();
  assert.equal(response.status, 200);
  assert.equal(((await response.text()).match(/BEGIN:VEVENT/g) ?? []).length, 2);
});
