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

function harness({ enabled = true, user = { id: "user-a" }, admin = null, createError = null } = {}) {
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
    "./server": { getCalendarUser: async () => user, getCalendarOwner: async () => admin, calendarView: actualView,
      newFeedToken: () => "C".repeat(43), processSyncBatch: async (id) => { syncs.push(id); }, serviceError: () => "Servizio non disponibile" },
    "./source": { fetchDay: async (...args) => { sourceReads.push(args); return []; }, deduplicateLessons: (items) => items },
  });
  return { api, rows, reads, writes, syncs, rpcCalls, sourceReads };
}

test("the public launch switch blocks list, creation and preview, including direct API requests", async () => {
  const h = harness({ enabled: false });
  assert.equal((await h.api.listCalendars(request(), "user")).status, 403);
  assert.equal((await h.api.mutateCalendar(request({ action: "create", id: ownId, settings }), "user")).status, 403);
  assert.equal((await h.api.previewCalendar(request({ course: "medicina", year: 4, date: "2026-10-12" }), "user")).status, 403);
  assert.deepEqual([h.reads, h.writes, h.syncs, h.sourceReads, h.rpcCalls], [[], [], [], [], []]);
});

test("personal APIs reject anonymous users even after launch", async () => {
  const h = harness({ user: null });
  assert.equal((await h.api.listCalendars(request(), "user")).status, 403);
  assert.equal((await h.api.mutateCalendar(request({ action: "rotate", id: ownId }), "user")).status, 403);
});

test("a user receives only their calendars, without raw worker or dispatcher secrets", async () => {
  const h = harness();
  const response = await h.api.listCalendars(request(), "user");
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
    const response = await h.api.mutateCalendar(request({ action, id: otherId, enabled: false, included_subjects: [] }), "user");
    assert.equal(response.status, 404);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.syncs, []);
    assert.equal(h.rows[1].token, "B".repeat(43));
  });
}

test("own changes include the authenticated owner filter", async () => {
  const h = harness();
  assert.equal((await h.api.mutateCalendar(request({ action: "toggle", id: ownId, enabled: false }), "user")).status, 200);
  assert.equal(h.rows[0].enabled, false);
  assert.equal(h.rows[1].enabled, true);
  assert.deepEqual(h.writes[0].filters, [["id", ownId], ["owner_id", "user-a"]]);
});

test("creation ignores forged ownership and quota values and uses the atomic database function", async () => {
  const h = harness();
  assert.equal((await h.api.mutateCalendar(request({ action: "create", id: ownId, owner_id: "user-b", maximum_calendars: 100, settings: { ...settings, owner_id: "user-b" } }), "user")).status, 200);
  assert.equal(h.rpcCalls[0].name, "create_university_calendar");
  assert.equal(h.rpcCalls[0].args.requested_owner, "user-a");
  assert.equal(h.rpcCalls[0].args.maximum_calendars, 1);
  assert.ok(!Object.hasOwn(h.rpcCalls[0].args.settings, "owner_id"));
  assert.deepEqual(h.syncs, [ownId]);
});

test("the database quota stops creation without starting a source import", async () => {
  const h = harness({ createError: { code: "P0001" } });
  assert.equal((await h.api.mutateCalendar(request({ action: "create", id: ownId, settings }), "user")).status, 409);
  assert.deepEqual(h.syncs, []);
});

test("cross-origin mutations are rejected without reading or writing calendars", async () => {
  const h = harness();
  assert.equal((await h.api.mutateCalendar(request({ action: "toggle", id: ownId, enabled: false }, "https://other.test"), "user")).status, 403);
  assert.deepEqual(h.reads, []);
  assert.deepEqual(h.writes, []);
});

test("a regular user cannot access admin APIs and the owner can still use them before launch", async () => {
  const h = harness({ enabled: false });
  assert.equal((await h.api.listCalendars(request(), "admin")).status, 403);
  const owner = harness({ enabled: false, admin: { id: "user-a" } });
  assert.equal((await owner.api.listCalendars(request(), "admin")).status, 200);
});

test("repeated manual updates are throttled", async () => {
  const h = harness();
  h.rows[0].last_synced_at = new Date().toISOString();
  assert.equal((await h.api.mutateCalendar(request({ action: "sync", id: ownId }), "user")).status, 429);
  assert.deepEqual(h.syncs, []);
  assert.deepEqual(h.writes, []);
});

test("the owner also creates at most one calendar", async () => {
  const h = harness({ enabled: false, admin: { id: "user-a" } });
  assert.equal((await h.api.mutateCalendar(request({ action: "create", id: ownId, settings }), "admin")).status, 200);
  assert.equal(h.rpcCalls[0].args.maximum_calendars, 1);
});

test("changing semester and filters updates the existing calendar without changing its link", async () => {
  const h = harness();
  const next = { ...settings, year: 5, line: "AZZURRA", semester_start: "2027-02-01", semester_end: "2027-06-30" };
  assert.equal((await h.api.mutateCalendar(request({ action: "settings", id: ownId, settings: next }), "user")).status, 200);
  assert.equal(h.rows[0].id, ownId);
  assert.equal(h.rows[0].token, "A".repeat(43));
  assert.equal(h.rows[0].year, 5);
  assert.equal(h.rows[0].line, "AZZURRA");
  assert.equal(h.rows[0].semester_end, "2027-06-30");
  assert.equal(h.rows[0].last_synced_at, null);
  assert.deepEqual(h.syncs, [ownId]);
  assert.deepEqual(h.rpcCalls, []);
  assert.equal(h.rows[1].year, 4);
});
