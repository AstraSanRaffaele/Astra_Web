import test from "node:test";
import assert from "node:assert/strict";
import load from "./load.mjs";

const { createRevokedCalendar } = load("ical");
const { REVOKED_CALENDAR_NOTICE } = load("revocation-notice");
const notice = { calendarId: "personal-calendar", revokedAt: "2026-11-02T10:00:00Z", profileUrl: "https://astra.test/profile/calendario-universita" };
const unfold = value => value.replace(/\r\n /g, "");

test("blocked subscriptions contain exactly three all-day site warnings and a regeneration link", () => {
  const raw = createRevokedCalendar(notice);
  const body = unfold(raw);
  const events = body.split("BEGIN:VEVENT\r\n").slice(1);
  assert.equal(events.length, 3);
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    assert.match(event, new RegExp(`DTSTART;VALUE=DATE:2026110${i + 2}\\r\\n`));
    assert.match(event, new RegExp(`DTEND;VALUE=DATE:2026110${i + 3}\\r\\n`));
    assert.ok(event.includes(`SUMMARY:${REVOKED_CALENDAR_NOTICE.title}\r\n`));
    assert.ok(event.includes(`DESCRIPTION:${REVOKED_CALENDAR_NOTICE.description}`));
    assert.ok(event.includes(`URL:${notice.profileUrl}\r\n`));
    assert.match(event, /DTSTAMP:20261102T100000Z/);
    assert.match(event, /TRANSP:TRANSPARENT/);
    assert.doesNotMatch(event, /LOCATION:|ORGANIZER:|ATTENDEE:|BEGIN:VALARM|RRULE:/);
  }
  assert.ok(raw.endsWith("END:VCALENDAR\r\n"));
  assert.ok(raw.split("\r\n").every(line => Buffer.byteLength(line) <= 75));
  assert.equal(createRevokedCalendar(notice), raw);
  const uids = [...body.matchAll(/^UID:(.+)\r$/gm)].map(match => match[1]);
  assert.equal(new Set(uids).size, 3);
  assert.notEqual(createRevokedCalendar({ ...notice, revokedAt: "2026-11-02T11:00:00Z" }), raw);
});

test("warning dates use the Italian revocation date across midnight, DST and year changes", () => {
  for (const [revokedAt, dates] of [
    ["2026-11-02T23:30:00Z", ["20261103", "20261104", "20261105"]],
    ["2026-03-27T23:30:00Z", ["20260328", "20260329", "20260330"]],
    ["2026-10-24T22:30:00Z", ["20261025", "20261026", "20261027"]],
    ["2026-12-31T23:30:00Z", ["20270101", "20270102", "20270103"]],
  ]) {
    const body = unfold(createRevokedCalendar({ ...notice, revokedAt }));
    assert.deepEqual([...body.matchAll(/DTSTART;VALUE=DATE:(\d{8})/g)].map(match => match[1]), dates);
    assert.equal((body.match(/DTEND;VALUE=DATE:/g) ?? []).length, 3);
  }
});

test("a replaced URL returns valid empty ICS to remove warnings instead of reviving lessons", () => {
  const blocked = createRevokedCalendar(notice);
  const replaced = createRevokedCalendar();
  assert.notEqual(blocked, replaced);
  assert.match(replaced, /BEGIN:VCALENDAR\r\nVERSION:2.0/);
  assert.ok(replaced.endsWith("END:VCALENDAR\r\n"));
  assert.doesNotMatch(replaced, /BEGIN:VEVENT|UID:|SUMMARY:|DESCRIPTION:|URL:/);
  assert.equal(createRevokedCalendar(), replaced);
});
