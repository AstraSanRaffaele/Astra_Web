import test from "node:test";
import assert from "node:assert/strict";
import load from "./load.mjs";

const lesson = { date: "2026-10-12", start: "09:00", end: "10:00", title: "Lezione conservata", teacher: "Docente", year: 4, line: "BIANCA", room: "CA101", building: "CANOVA", mapUrl: null, onlineUrl: null };
const base = { id: "calendar", course: "medicina", year: 4, semester_start: "2026-10-12", semester_end: "2026-10-21", source_events: [lesson], staging_events: [], sync_cursor: 0, sync_started_at: "2026-10-11T12:00:00.000Z", lease_token: "lease" };

function worker(record, fetchDay, accepted = true) {
  const writes = [];
  const client = {
    rpc: async () => ({ data: record ? [record] : [], error: null }),
    from: () => ({ update: (patch) => {
      const filters = [];
      writes.push({ patch, filters });
      const query = { eq: (...args) => { filters.push(args); return query; }, select: () => query, maybeSingle: async () => ({ data: accepted ? { id: "calendar" } : null, error: null }), then: (resolve) => resolve({ error: null }) };
      return query;
    } }),
  };
  const server = load("server", { "server-only": {}, "@/lib/supabase/server": {}, "@/lib/admin-users-server": { createAdminClient: () => client }, "./source": { fetchDay, deduplicateLessons: load("source").deduplicateLessons } });
  return { run: server.processSyncBatch, writes };
}

test("bounded batches stage eight days without replacing the last complete snapshot", async () => {
  const { run, writes } = worker(base, async (dateCourse, year, date) => [{ ...lesson, date }]);
  const result = await run();
  assert.equal(result.complete, false);
  assert.equal(result.days, 8);
  assert.equal(writes[0].patch.sync_cursor, 8);
  assert.equal(writes[0].patch.staging_events.length, 8);
  assert.ok(!Object.hasOwn(writes[0].patch, "source_events"));
  assert.deepEqual(writes[0].filters, [["id", "calendar"], ["lease_token", "lease"]]);
});

test("a source outage preserves events and cursor, releases the lease, and schedules a retry", async () => {
  const { run, writes } = worker({ ...base, sync_cursor: 2, staging_events: [lesson] }, async () => { throw new Error("UniSR non disponibile"); });
  const result = await run();
  assert.equal(result.complete, false);
  assert.equal(writes[0].patch.sync_cursor, 2);
  assert.deepEqual(writes[0].patch.staging_events, [lesson]);
  assert.ok(!Object.hasOwn(writes[0].patch, "source_events"));
  assert.equal(writes[0].patch.lease_token, null);
  assert.ok(Date.parse(writes[0].patch.retry_at) > Date.now());
});

test("only a complete import replaces the full snapshot, removing old cancelled lessons", async () => {
  const { run, writes } = worker({ ...base, sync_cursor: 8 }, async () => []);
  const result = await run();
  assert.equal(result.complete, true);
  assert.deepEqual(writes[0].patch.source_events, []);
  assert.equal(writes[0].patch.sync_cursor, null);
  assert.equal(writes[0].patch.next_sync_at, "2026-10-11T15:00:00.000Z");
});

test("a stale worker cannot report a completed sync after its lease was revoked", async () => {
  const { run } = worker({ ...base, sync_cursor: 8 }, async () => [], false);
  const result = await run();
  assert.equal(result.processed, false);
  assert.equal(result.complete, false);
});

test("no due calendar triggers no source reads", async () => {
  const { run, writes } = worker(null, () => { throw new Error("Should not fetch"); });
  assert.deepEqual(await run(), { processed: false });
  assert.equal(writes.length, 0);
});

test("personal calendar preview uses the saved admin role, not email or a claimed browser role", async () => {
  async function check(user, profile, enabled = false, profileError = null) {
    const server = load("server", { "server-only": {}, "./config": { PUBLIC_CALENDAR_ENABLED: enabled }, "@/lib/admin-users-server": {}, "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: profileError }) }) }) }) }) } });
    return server.getCalendarUser();
  }
  const user = { id: "student", email_confirmed_at: "2026-10-11" };
  const medicine = { facolta: "medicina", corso_di_laurea: "medicina_e_chirurgia", role: "user" };
  const admin = { id: "student", facolta: "psicologia", corso_di_laurea: "psicologia", role: "admin", locked: false };
  assert.deepEqual(await check({ ...user, email: "any-admin@example.com" }, admin), { id: "student", isAdmin: true });
  assert.deepEqual(await check({ ...user, email: "another-admin@example.com" }, admin), { id: "student", isAdmin: true });
  assert.equal(await check(user, { ...medicine, id: "student", locked: false }), null);
  assert.equal(await check({ ...user, role: "admin" }, { ...medicine, id: "student", locked: false }), null);
  assert.equal(await check(user, { ...admin, locked: true }), null);
  assert.equal(await check({ ...user, email_confirmed_at: null }, admin), null);
  assert.equal(await check(user, admin, false, { message: "profile lookup failed" }), null);
  assert.deepEqual(await check(user, { ...medicine, id: "student", locked: false }, true), { id: "student", isAdmin: false });
  assert.equal(await check(user, { ...medicine, id: "student", locked: true }), null);
  assert.equal(await check(user, null), null);
  assert.equal(await check(user, { ...medicine, id: "student", locked: false, corso_di_laurea: "fisioterapia" }, true), null);
  assert.equal(await check(user, { ...medicine, id: "student", locked: false, facolta: "psicologia" }, true), null);
  assert.equal(await check({ ...user, email_confirmed_at: null }, { ...medicine, id: "student", locked: false }), null);
  assert.equal(await check(null, null), null);
});
