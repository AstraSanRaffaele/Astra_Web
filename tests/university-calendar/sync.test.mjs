import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import load from "./load.mjs";

const lesson = { date: "2026-10-12", start: "09:00", end: "10:00", title: "Lezione conservata", teacher: "Docente", year: 4, line: "BIANCA", room: "CA101", building: "CANOVA", mapUrl: null, onlineUrl: null };
const base = { id: "calendar", course: "medicina", year: 4, semester_start: "2026-10-12", semester_end: "2026-11-10", source_events: [lesson], staging_events: [], sync_cursor: 0, sync_started_at: "2026-10-11T12:00:00.000Z", lease_token: "lease" };

function worker(record, fetchDay, accepted = true, expired = (end) => end < "2026-10-11", seasonOpen = () => true) {
  const writes = [], claims = [];
  const client = { rpc: async (name, args) => {
    if (name === "claim_university_calendar_source") { claims.push({ name, args }); return { data: record ? [record] : [], error: null }; }
    assert.equal(name, "save_university_calendar_source");
    writes.push(args); return { data: accepted, error: null };
  } };
  const server = load("server", { "server-only": {}, "@/lib/supabase/server": {}, "@/lib/admin-users-server": { createAdminClient: () => client }, "./source": { fetchDay, deduplicateLessons: load("source").deduplicateLessons }, "./period": { calendarExpired: expired, calendarSeasonOpen: seasonOpen } });
  return { run: server.processSyncBatch, writes, claims };
}

test("one course batch reads all years, staging progress without publishing partial data", async () => {
  const years = [];
  const { run, writes, claims } = worker(base, async (dateCourse, year, date) => { years.push(year); return [{ ...lesson, date }]; });
  const result = await run();
  assert.equal(result.complete, false);
  assert.equal(result.days, 24);
  assert.equal(writes[0].next_cursor, 24);
  assert.equal(writes[0].events.length, 24);
  assert.equal(writes[0].finished, false);
  assert.equal(writes[0].requested_course, "medicina");
  assert.equal(writes[0].requested_lease, "lease");
  assert.deepEqual(claims[0].args, { requested_course: null });
  assert.ok(years.every((year) => year === 0));
});

test("a source outage preserves events and cursor, releases the lease, and schedules a retry", async () => {
  const { run, writes } = worker({ ...base, sync_cursor: 2, staging_events: [lesson] }, async () => { throw new Error("UniSR non disponibile"); });
  const result = await run();
  assert.equal(result.complete, false);
  assert.equal(writes[0].next_cursor, 2);
  assert.deepEqual(writes[0].events, [lesson]);
  assert.equal(writes[0].finished, false);
  assert.equal(writes[0].failure, "UniSR non disponibile");
});

test("only a complete import replaces the full snapshot, removing old cancelled lessons", async () => {
  const { run, writes } = worker({ ...base, sync_cursor: 24 }, async () => []);
  const result = await run();
  assert.equal(result.complete, true);
  assert.deepEqual(writes[0].events, []);
  assert.equal(writes[0].finished, true);
  assert.equal(writes[0].next_cursor, 30);
});

test("a stale worker cannot report a completed sync after its lease was revoked", async () => {
  const { run } = worker({ ...base, sync_cursor: 24 }, async () => [], false);
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
  assert.deepEqual(await check(user, { ...admin, locked: true }), { id: "student", isAdmin: true });
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

test("expired calendars are never fetched or written even if a worker already claimed one", async () => {
  const { run, writes } = worker({ ...base, semester_end: "2026-06-15" }, () => { throw new Error("Should not fetch"); });
  assert.deepEqual(await run(), { processed: false, expired: true });
  assert.deepEqual(writes, []);
});

test("an import crossing the June cutoff cannot publish its staged events", async () => {
  let finished = false;
  const { run, writes } = worker({ ...base, sync_cursor: 24 }, async () => { finished = true; return []; }, true, () => finished);
  assert.deepEqual(await run(), { processed: false, expired: true });
  assert.deepEqual(writes, []);
});

test("an import crossing midnight stops before the next batch of source reads", async () => {
  const dates = [];
  const { run, writes } = worker(base, async (_course, _year, date) => { dates.push(date); return []; }, true, () => dates.length > 0);
  assert.deepEqual(await run(), { processed: false, expired: true });
  assert.deepEqual(dates, ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"]);
  assert.deepEqual(writes, []);
});

test("a source error after expiration does not schedule another automatic retry", async () => {
  let expired = false;
  const { run, writes } = worker(base, async () => { expired = true; throw new Error("Source stopped at midnight"); }, true, () => expired);
  assert.deepEqual(await run(), { processed: false, expired: true });
  assert.deepEqual(writes, []);
});

test("disabling the global service rejects queued automatic requests before a worker starts", async () => {
  const token = "a".repeat(64);
  let started = 0;
  const config = { token, enabled: true };
  const route = load("../../app/api/calendar-sync/route", {
    "@/lib/admin-users-server": { createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: config, error: null }) }) }) }) }) },
    "@/lib/university-calendar/period": { calendarSeasonOpen: () => true },
    "@/lib/university-calendar/types": load("types"),
    "@/lib/university-calendar/server": { equalSecret: (actual, expected) => actual === expected, processSyncBatch: async () => { started++; return { processed: false }; } },
  });
  const request = () => new NextRequest("https://astra.test/api/calendar-sync", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ course: "medicina" }) });
  assert.equal((await route.POST(request())).status, 200);
  assert.equal(started, 1);
  config.enabled = false;
  assert.equal((await route.POST(request())).status, 403);
  assert.equal(started, 1);
});

test("summer synchronization stops before claiming a calendar even if its end date is in the future", async () => {
  const { run, writes, claims } = worker({ ...base, semester_end: "2028-06-15" }, () => { throw new Error("Should not fetch"); }, true, () => false, () => false);
  assert.deepEqual(await run(), { processed: false, paused: true });
  assert.deepEqual(claims, []);
  assert.deepEqual(writes, []);
});

test("a worker entering the summer pause does not start a second batch for a future calendar", async () => {
  const dates = [];
  const { run, writes } = worker(base, async (_course, _year, date) => { dates.push(date); return []; }, true, () => false, () => dates.length === 0);
  assert.deepEqual(await run(), { processed: false, paused: true });
  assert.equal(dates.length, 4);
  assert.deepEqual(writes, []);
});
