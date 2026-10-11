import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import load from "./load.mjs";

const ownId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const settings = { name: "Medicina personale", course: "medicina", year: 4, line: "BIANCA", semester_start: "2026-10-12", semester_end: "2027-01-31", included_subjects: [] };
const record = { ...settings, id: ownId, owner_id: "user-a", token: "A".repeat(43), source_events: [], staging_events: [], sync_cursor: null, enabled: true, last_synced_at: "2026-10-01T12:00:00Z" };

function request(body, origin = "https://astra.test") {
  return new NextRequest("https://astra.test/api/university-calendar", body ? { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) } : undefined);
}

const defaultPeriod = { start: "2026-10-11", end: "2027-06-15" };

function harness({ enabled = true, user = { id: "user-a", isAdmin: false }, createError = null, period = defaultPeriod, sourceLessons = [] } = {}) {
  const rows = [structuredClone(record), { ...structuredClone(record), id: otherId, owner_id: "user-b", token: "B".repeat(43) }];
  const writes = [], reads = [], syncs = [], rpcCalls = [], sourceReads = [];
  const client = {
    from(table) {
      const filters = [];
      let patch;
      let limit = Infinity;
      const result = (single) => {
        const data = table === "university_calendar_sync_config" ? [{ enabled: true, token: "SECRET" }] : rows.filter((row) => filters.every(([key, value]) => row[key] === value)).slice(0, limit);
        reads.push({ table, filters });
        if (patch) { data.forEach((row) => Object.assign(row, patch)); writes.push({ filters, patch }); }
        return { data: single ? data[0] ?? null : data, error: null };
      };
      const query = {
        select: () => query, eq: (key, value) => { filters.push([key, value]); return query; },
        order: () => query, limit: (value) => { limit = value; return query; },
        update: (value) => { patch = value; return query; },
        maybeSingle: async () => result(true), then: (resolve) => resolve(result(false)),
      };
      return query;
    },
    async rpc(name, args) { rpcCalls.push({ name, args }); return { data: createError ? null : args.requested_id, error: createError }; },
  };
  const actualView = load("server", { "server-only": {}, "@/lib/supabase/server": {}, "@/lib/admin-users-server": {} }).calendarView;
  const api = load("api", {
    "server-only": {}, "./config": { PUBLIC_CALENDAR_ENABLED: enabled, PUBLIC_CALENDAR_LIMIT: 1 },
    "@/lib/admin-users-server": { createAdminClient: () => client },
    "./server": { getCalendarUser: async () => user && (user.isAdmin || enabled) ? user : null, calendarView: actualView,
      newFeedToken: () => "C".repeat(43), processSyncBatch: async (id) => { syncs.push(id); }, serviceError: () => "Servizio non disponibile" },
    "./source": { fetchDay: async (...args) => { sourceReads.push(args); return sourceLessons.filter((lesson) => (args[1] === 0 || lesson.year === args[1]) && lesson.date === args[2]); }, deduplicateLessons: (items) => items },
    "./period": { calendarPeriod: () => period },
  });
  return { api, rows, reads, writes, syncs, rpcCalls, sourceReads };
}

test("the public launch switch blocks list, creation and preview, including direct API requests", async () => {
  const h = harness({ enabled: false });
  assert.equal((await h.api.listCalendars(request())).status, 403);
  assert.equal((await h.api.mutateCalendar(request({ action: "create", id: ownId, settings }))).status, 403);
  assert.equal((await h.api.previewCalendar(request({ course: "medicina", year: 4, date: "2026-10-12" }))).status, 403);
  assert.deepEqual([h.reads, h.writes, h.syncs, h.sourceReads, h.rpcCalls], [[], [], [], [], []]);
});

test("personal APIs reject anonymous users even after launch", async () => {
  const h = harness({ user: null });
  assert.equal((await h.api.listCalendars(request())).status, 403);
  assert.equal((await h.api.mutateCalendar(request({ action: "rotate", id: ownId }))).status, 403);
});

test("a user receives only their calendars, without raw worker or dispatcher secrets", async () => {
  const h = harness();
  const response = await h.api.listCalendars(request());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.calendars.map((item) => item.id), [ownId]);
  assert.ok(body.calendars[0].feedUrl.endsWith("A".repeat(43)));
  for (const key of ["token", "owner_id", "source_events", "staging_events", "lease_token", "leased_until"]) assert.ok(!Object.hasOwn(body.calendars[0], key));
  assert.deepEqual(body.scheduler, { enabled: true });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

for (const action of ["settings", "rotate", "toggle", "subjects", "sync", "continue"]) {
  test(`a user cannot ${action} another user's calendar`, async () => {
    const h = harness();
    const response = await h.api.mutateCalendar(request({ action, id: otherId, enabled: false, included_subjects: [] }));
    assert.equal(response.status, 404);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.syncs, []);
    assert.equal(h.rows[1].token, "B".repeat(43));
  });
}

test("own changes include the authenticated owner filter", async () => {
  const h = harness();
  assert.equal((await h.api.mutateCalendar(request({ action: "toggle", id: ownId, enabled: false }))).status, 200);
  assert.equal(h.rows[0].enabled, false);
  assert.equal(h.rows[1].enabled, true);
  assert.deepEqual(h.writes[0].filters, [["id", ownId], ["owner_id", "user-a"]]);
});

test("creation ignores forged ownership and quota values and uses the atomic database function", async () => {
  const h = harness();
  assert.equal((await h.api.mutateCalendar(request({ action: "create", id: ownId, owner_id: "user-b", maximum_calendars: 100, settings: { ...settings, owner_id: "user-b" } }))).status, 200);
  assert.equal(h.rpcCalls[0].name, "create_university_calendar");
  assert.equal(h.rpcCalls[0].args.requested_owner, "user-a");
  assert.equal(h.rpcCalls[0].args.maximum_calendars, 1);
  assert.ok(!Object.hasOwn(h.rpcCalls[0].args.settings, "owner_id"));
  assert.equal(h.rpcCalls[0].args.settings.semester_start, defaultPeriod.start);
  assert.equal(h.rpcCalls[0].args.settings.semester_end, defaultPeriod.end);
  assert.deepEqual(h.syncs, [ownId]);
});

test("the database quota stops creation without starting a source import", async () => {
  const h = harness({ createError: { code: "P0001" } });
  assert.equal((await h.api.mutateCalendar(request({ action: "create", id: ownId, settings }))).status, 409);
  assert.deepEqual(h.syncs, []);
});

test("cross-origin mutations are rejected without reading or writing calendars", async () => {
  const h = harness();
  assert.equal((await h.api.mutateCalendar(request({ action: "toggle", id: ownId, enabled: false }, "https://other.test"))).status, 403);
  assert.deepEqual(h.reads, []);
  assert.deepEqual(h.writes, []);
});

test("ordinary users cannot bypass launch but any admin can use the profile APIs", async () => {
  const h = harness({ enabled: false });
  assert.equal((await h.api.listCalendars(request())).status, 403);
  assert.equal((await h.api.mutateCalendar(request({ action: "create", id: ownId, settings, isAdmin: true, role: "admin" }))).status, 403);
  const admin = harness({ enabled: false, user: { id: "user-b", isAdmin: true } });
  const response = await admin.api.listCalendars(request());
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).calendars.map((calendar) => calendar.id), [otherId]);
  assert.equal((await admin.api.mutateCalendar(request({ action: "rotate", id: ownId }))).status, 404);
  assert.deepEqual(admin.writes, []);
});

test("repeated manual updates are throttled", async () => {
  const h = harness();
  h.rows[0].last_synced_at = new Date().toISOString();
  assert.equal((await h.api.mutateCalendar(request({ action: "sync", id: ownId }))).status, 429);
  assert.deepEqual(h.syncs, []);
  assert.deepEqual(h.writes, []);
});

test("every admin also creates at most one calendar", async () => {
  const h = harness({ enabled: false, user: { id: "user-a", isAdmin: true } });
  assert.equal((await h.api.mutateCalendar(request({ action: "create", id: ownId, settings }))).status, 200);
  assert.equal(h.rpcCalls[0].args.maximum_calendars, 1);
});

test("changing filters uses the automatic period and preserves the existing calendar link", async () => {
  const h = harness();
  const next = { ...settings, year: 5, line: "AZZURRA", semester_start: "2027-02-01", semester_end: "2027-06-30" };
  assert.equal((await h.api.mutateCalendar(request({ action: "settings", id: ownId, settings: next }))).status, 200);
  assert.equal(h.rows[0].id, ownId);
  assert.equal(h.rows[0].token, "A".repeat(43));
  assert.equal(h.rows[0].year, 5);
  assert.equal(h.rows[0].line, "AZZURRA");
  assert.equal(h.rows[0].semester_start, defaultPeriod.start);
  assert.equal(h.rows[0].semester_end, defaultPeriod.end);
  assert.equal(h.rows[0].last_synced_at, null);
  assert.deepEqual(h.syncs, [ownId]);
  assert.deepEqual(h.rpcCalls, []);
  assert.equal(h.rows[1].year, 4);
});

test("creation requires no semester dates from the browser", async () => {
  const h = harness();
  const { semester_start, semester_end, ...withoutDates } = settings;
  assert.equal((await h.api.mutateCalendar(request({ action: "create", id: ownId, settings: withoutDates }))).status, 200);
  assert.equal(h.rpcCalls[0].args.settings.semester_start, defaultPeriod.start);
  assert.equal(h.rpcCalls[0].args.settings.semester_end, defaultPeriod.end);
});

test("preview includes lines from all years while lessons remain limited to the selected year", async () => {
  const sourceLessons = ["AZZURRA", "BIANCA", "ROSSA", "VERDE", "VIOLA"].map((line) => ({ date: "2026-10-12", year: 4, line, title: "Lezione", teacher: "Docente", room: "BO402", building: "BORROMINI" }));
  const h = harness({ enabled: false, user: { id: "user-a", isAdmin: true }, sourceLessons: [...sourceLessons, { ...sourceLessons[0], year: 6, line: "GIALLA" }] });
  const response = await h.api.previewCalendar(request({ course: "medicina", year: 4, date: "2000-01-01" }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.lines, ["AZZURRA", "BIANCA", "GIALLA", "ROSSA", "VERDE", "VIOLA"]);
  assert.deepEqual(body.period, defaultPeriod);
  assert.equal(body.start, "2026-10-11");
  assert.equal(body.end, "2026-10-17");
  assert.equal(h.sourceReads.length, 7);
  assert.ok(h.sourceReads.every((args) => args[1] === 0));
  assert.equal(h.sourceReads[0][2], defaultPeriod.start);
  assert.ok(body.lessons.every((lesson) => lesson.room === "BO402" && lesson.building === "BORROMINI"));
  assert.ok(body.lessons.every((lesson) => lesson.year === 4));
  assert.equal(body.lessons.length, 5);
});

test("preview does not read past June 15 and accepts requests without a date", async () => {
  const period = { start: "2027-06-14", end: "2027-06-15" };
  const h = harness({ period });
  const response = await h.api.previewCalendar(request({ course: "medicina", year: 4 }));
  assert.equal(response.status, 200);
  assert.deepEqual(h.sourceReads.map((args) => args[2]), ["2027-06-14", "2027-06-15"]);
  assert.deepEqual((await response.json()).period, period);
});
