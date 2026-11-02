import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server.js";
import load from "./load.mjs";

const { calendarClient } = load("feed-usage-types");

test("calendar clients are coarse declared categories, never unique device fingerprints", () => {
  for (const agent of ["Google-Calendar-Importer", "FeedFetcher-Google; Mozilla/5.0", "Google Calendar Fetcher"]) assert.equal(calendarClient(agent), "google");
  for (const agent of ["macOS/15 CalendarAgent/123", "iOS/18 dataaccessd/1.0", "Apple Calendar"]) assert.equal(calendarClient(agent), "apple");
  assert.equal(calendarClient("Mozilla/5.0 Safari/600"), "browser");
  assert.equal(calendarClient("curl/8"), "other");
  assert.equal(calendarClient(null), "other");
});

test("feed counts are deferred and store only a hash, request category and response status", async () => {
  const queued = [], writes = [];
  const usage = load("feed-usage", {
    "server-only": {}, "next/server": { after: callback => queued.push(callback) },
    "@/lib/admin-users-server": { createAdminClient: () => ({ rpc: (name, args) => ({ abortSignal: async signal => { assert.ok(signal instanceof AbortSignal); writes.push({ name, args }); return { data: null, error: null }; } }) }) },
  });
  const token = "A".repeat(43);
  usage.trackCalendarFeedRequest({ calendarId: "11111111-1111-4111-8111-111111111111", token, userAgent: "Google-Calendar-Importer", method: "GET", status: 304 });
  assert.equal(writes.length, 0);
  assert.equal(queued.length, 1);
  await queued[0]();
  assert.equal(writes[0].name, "record_university_calendar_feed_request");
  assert.deepEqual(writes[0].args, {
    requested_calendar: "11111111-1111-4111-8111-111111111111",
    requested_feed_hash: createHash("sha256").update(token).digest("hex"),
    requested_client: "google", requested_method: "GET", requested_status: 304,
  });
  assert.ok(!JSON.stringify(writes).includes(token));
  assert.ok(!JSON.stringify(writes).includes("Google-Calendar-Importer"));
});

test("missing SQL activation, background failures and non-read methods never break subscriptions", async () => {
  const access = { calendarId: "calendar", token: "B".repeat(43), userAgent: null, method: "GET", status: 200 };
  for (const failure of ["rpc", "after"]) {
    let callback;
    const usage = load("feed-usage", {
      "server-only": {}, "next/server": { after: work => { if (failure === "after") throw new Error("No request scope"); callback = work; } },
      "@/lib/admin-users-server": { createAdminClient: () => { throw new Error("Database unavailable"); } },
    });
    assert.doesNotThrow(() => usage.trackCalendarFeedRequest(access));
    if (callback) await assert.doesNotReject(callback);
  }
  const usage = load("feed-usage", { "server-only": {}, "next/server": { after: () => assert.fail("Only GET/HEAD are counted") }, "@/lib/admin-users-server": {} });
  usage.trackCalendarFeedRequest({ ...access, method: "POST" });
});

const ownerId = "33333333-3333-4333-8333-333333333333";
const calendarId = "22222222-2222-4222-8222-222222222222";
const feedHash = "a".repeat(64);
function reportApi({ owner = true, error = null, revoked = true, outcomes = {}, delay = 0 } = {}) {
  const calls = [];
  const concurrency = { active: 0, maximum: 0 };
  const report = { since: "2026-11-02", days: 1, page: 1, pageSize: 25, totalLinks: 0, totalRequests: 0, attentionLinks: 0, highTrafficLinks: 0, rows: [] };
  const route = load("@/app/api/admin/university-calendar-usage/route", {
    "./feed-usage-owner": { getCalendarUsageOwner: async () => owner ? { userId: ownerId } : null },
    "@/lib/admin-users-server": {
      createAdminClient: () => ({ rpc: (name, args) => {
        calls.push({ name, args });
        const result = outcomes[args.requested_feed_hash] ?? { data: error ? null : name === "revoke_university_calendar_feed" ? revoked : report, error };
        return { abortSignal: async signal => {
          assert.ok(signal instanceof AbortSignal);
          concurrency.active++;
          concurrency.maximum = Math.max(concurrency.maximum, concurrency.active);
          try {
            if (delay) await new Promise(resolve => setTimeout(resolve, delay));
            if (result.throws) throw new Error("Network failure");
            return result;
          } finally { concurrency.active--; }
        } };
      } }),
    },
  });
  return {
    get: query => route.GET(new NextRequest(`https://astra.test/api/admin/university-calendar-usage${query ?? ""}`)),
    post: (body, options = {}) => route.POST(new NextRequest("https://astra.test/api/admin/university-calendar-usage", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "https://astra.test", ...options.headers },
      body: options.raw ?? JSON.stringify(body),
    })), calls, report, concurrency,
  };
}

test("usage and manual revocation require the verified owner, including forged role parameters", async () => {
  const h = reportApi({ owner: false });
  for (const response of [await h.get("?role=admin"), await h.post({ calendarId, feedHash, role: "admin", actor: ownerId })]) {
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.deepEqual(h.calls, []);
});

test("report filters are bounded, parameterized and never expose the feed URL", async () => {
  const h = reportApi();
  const response = await h.get("?days=7&page=2&q=%20Edoardo%20");
  assert.equal(response.status, 200);
  assert.deepEqual(h.calls, [{ name: "read_university_calendar_feed_usage", args: { requested_days: 7, requested_page: 2, requested_query: "Edoardo", requested_state: "active" } }]);
  assert.deepEqual(await response.json(), h.report);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  for (const query of ["?state=invalid", "?state=", "?days=30", "?days=0", "?page=0", "?page=1.5", "?page=100001", `?q=${"x".repeat(101)}`]) {
    const invalid = reportApi();
    assert.equal((await invalid.get(query)).status, 400);
    assert.deepEqual(invalid.calls, []);
  }
});

test("reports distinguish an unactivated monitor from an empty successful count", async () => {
  const h = reportApi({ error: { code: "PGRST202" } });
  const response = await h.get();
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /non è ancora attivo/);
  assert.equal((await reportApi().get()).status, 200);
});

test("reading high traffic never revokes; only an explicit owner POST invokes revocation", async () => {
  const h = reportApi();
  await h.get();
  assert.ok(h.calls.every(call => call.name !== "revoke_university_calendar_feed"));
  const result = await h.post({ calendarId, feedHash, actor: "forged", enabled: true });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ok: true });
  assert.deepEqual(h.calls[1], { name: "revoke_university_calendar_feed", args: {
    requested_calendar: calendarId, requested_feed_hash: feedHash, requested_actor: ownerId,
  } });
  assert.equal(result.headers.get("cache-control"), "private, no-store");
});

test("manual revocation rejects cross-origin, malformed and obsolete links", async () => {
  for (const [body, options, status] of [
    [{ calendarId, feedHash }, { headers: { Origin: "https://other.test" } }, 403],
    [{ calendarId, feedHash }, { headers: { "Content-Type": "text/plain" } }, 400],
    [null, { raw: "{" }, 400], [null, {}, 400], [{ calendarId: "invalid", feedHash }, {}, 400],
    [{ calendarId, feedHash: "raw-token" }, {}, 400],
  ]) {
    const h = reportApi();
    assert.equal((await h.post(body, options)).status, status);
    assert.deepEqual(h.calls, []);
  }
  assert.equal((await reportApi({ revoked: false }).post({ calendarId, feedHash })).status, 409);
  assert.equal((await reportApi({ error: { code: "offline" } }).post({ calendarId, feedHash })).status, 503);
});

test("only the confirmed owner email unlocks the monitor; admin metadata and locked are irrelevant", async () => {
  const confirmed = { id: ownerId, email: "scopeledoardo@gmail.com", email_confirmed_at: "2026-01-01T00:00:00Z", locked: true };
  for (const [user, allowed] of [
    [confirmed, true], [{ ...confirmed, email: "SCOPELEDOARDO@gmail.com" }, true],
    [{ ...confirmed, email_confirmed_at: null }, false],
    [{ ...confirmed, email: "another@example.invalid", role: "admin", user_metadata: { email: confirmed.email } }, false],
    [null, false],
  ]) {
    const owner = load("feed-usage-owner", {
      "server-only": {}, "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) },
    });
    assert.equal(owner.isCalendarUsageOwner(user), allowed);
    assert.equal(Boolean(await owner.getCalendarUsageOwner()), allowed);
  }
});

test("traffic thresholds use daily counts and never imply a device count", () => {
  const { calendarTrafficLevel } = load("feed-usage-types");
  for (const [requests, level] of [[0,"ordinary"],[9,"ordinary"],[10,"attention"],[199,"attention"],[200,"high"],[1000,"high"]]) assert.equal(calendarTrafficLevel(requests), level);
});

test("revoked lookups use a hash and tolerate only a missing activation table", async () => {
  const token = "D".repeat(43);
  for (const code of [null, "42P01", "PGRST205", "offline"]) {
    const calls = [];
    const revoked = load("feed-revocation", { "server-only": {}, "@/lib/admin-users-server": { createAdminClient: () => ({ from: table => {
      const query = { select: fields => { calls.push([table, fields]); return query; }, eq: (key, value) => { calls.push([key, value]); return query; }, maybeSingle: async () => ({ data: null, error: code ? { code } : null }) };
      return query;
    } }) } });
    if (code === "offline") await assert.rejects(revoked.readRevokedCalendarFeed(token));
    else assert.equal(await revoked.readRevokedCalendarFeed(token), null);
    assert.deepEqual(calls[1], ["feed_hash", createHash("sha256").update(token).digest("hex")]);
  }
});


test("revoked-tab requests are filtered on the server before pagination", async () => {
  const h = reportApi();
  assert.equal((await h.get("?state=revoked&days=7&page=2")).status, 200);
  assert.deepEqual(h.calls, [{ name: "read_university_calendar_feed_usage", args: { requested_days: 7, requested_page: 2, requested_query: "", requested_state: "revoked" } }]);
});

test("bulk revocation is owner-only and validates every target before any mutation", async () => {
  const unauthorized = reportApi({ owner: false });
  assert.equal((await unauthorized.post({ calendars: [{ calendarId, feedHash }] })).status, 403);
  assert.deepEqual(unauthorized.calls, []);
  for (const calendars of [[], null, {}, [null], [{ calendarId: "invalid", feedHash }], [{ calendarId, feedHash }, { calendarId, feedHash: "invalid" }], Array.from({ length: 26 }, () => ({ calendarId, feedHash }))]) {
    const h = reportApi();
    assert.equal((await h.post({ calendars })).status, 400);
    assert.deepEqual(h.calls, []);
  }
  const h = reportApi();
  assert.equal((await h.post({ calendars: [{ calendarId, feedHash }] }, { headers: { Origin: "https://other.test" } })).status, 403);
  assert.deepEqual(h.calls, []);
});

test("bulk revocation deduplicates exact targets and never trusts a supplied actor", async () => {
  const h = reportApi();
  const target = { calendarId, feedHash };
  const response = await h.post({ calendars: [target, target], requested_actor: "forged" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { ok: true, results: [{ ...target, ok: true }] });
  assert.deepEqual(h.calls, [{ name: "revoke_university_calendar_feed", args: { requested_calendar: calendarId, requested_feed_hash: feedHash, requested_actor: ownerId } }]);
});

test("bulk results distinguish success, stale regenerated URLs and database failures", async () => {
  const second = { calendarId, feedHash: "b".repeat(64) };
  const third = { calendarId, feedHash: "c".repeat(64) };
  const h = reportApi({ outcomes: { [second.feedHash]: { data: false, error: null }, [third.feedHash]: { data: null, error: { code: "offline" } } } });
  const response = await h.post({ calendars: [{ calendarId, feedHash }, second, third] });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, false);
  assert.equal(data.results.length, 3);
  assert.deepEqual(data.results[0], { calendarId, feedHash, ok: true });
  assert.equal(data.results[1].ok, false);
  assert.equal(data.results[1].status, 409);
  assert.match(data.results[1].error, /link è cambiato/);
  assert.equal(data.results[2].ok, false);
  assert.equal(data.results[2].status, 503);
  assert.equal(h.calls.length, 3);
});

test("bulk requests keep concurrency bounded and continue after an individual network failure", async () => {
  const targets = Array.from({ length: 25 }, (_, index) => ({ calendarId, feedHash: index.toString(16).padStart(64, "0") }));
  const h = reportApi({ delay: 3, outcomes: { [targets[0].feedHash]: { throws: true } } });
  const response = await h.post({ calendars: targets });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.results.length, 25);
  assert.equal(data.results.filter(result => result.ok).length, 24);
  assert.equal(data.results[0].status, 503);
  assert.equal(h.calls.length, 25);
  assert.equal(h.concurrency.maximum, 5);
  assert.ok(h.calls.every(call => call.args.requested_actor === ownerId));
});
