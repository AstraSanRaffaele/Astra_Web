import test from "node:test";
import assert from "node:assert/strict";
import load from "./load.mjs";

const { calendarReadyForGuide, queueSubscriptionGuide, markSubscriptionGuideSeen } = load("subscription-guide");
const pending = { id: "new-calendar", enabled: true, last_synced_at: null };
const ready = { ...pending, last_synced_at: "2026-10-27T12:00:00Z" };
function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

test("existing calendars do not automatically open onboarding without a queued creation", () => {
  assert.equal(calendarReadyForGuide([ready], null, storage()), null);
  assert.equal(calendarReadyForGuide([], ready.id, storage()), null);
});

test("new-calendar onboarding waits for a usable subscription link", () => {
  const saved = storage();
  queueSubscriptionGuide(pending.id, saved);
  assert.equal(calendarReadyForGuide([pending], pending.id, saved), null);
  assert.equal(calendarReadyForGuide([{ ...ready, enabled: false }], pending.id, saved), null);
  assert.equal(calendarReadyForGuide([ready], pending.id, saved), ready.id);
});

test("pending onboarding survives a reload while the full import is still running", () => {
  const saved = storage();
  queueSubscriptionGuide(pending.id, saved);
  assert.equal(calendarReadyForGuide([pending], null, saved), null);
  assert.equal(calendarReadyForGuide([ready], null, saved), ready.id);
  assert.equal(calendarReadyForGuide([{ ...ready, id: "another-account-calendar" }], null, saved), null);
});

test("an already shown guide stays closed on later reloads and a new yearly calendar can open its own", () => {
  const saved = storage();
  queueSubscriptionGuide(ready.id, saved);
  markSubscriptionGuideSeen(ready.id, saved);
  assert.equal(calendarReadyForGuide([ready], null, saved), null);
  const nextYear = { ...ready, id: "next-year-calendar" };
  queueSubscriptionGuide(nextYear.id, saved);
  assert.equal(calendarReadyForGuide([nextYear], null, saved), nextYear.id);
});

test("unavailable browser storage never breaks creation and the current-page ID still opens the guide", () => {
  const blocked = { getItem() { throw new Error("Storage blocked"); }, setItem() { throw new Error("Storage blocked"); } };
  for (const saved of [null, blocked]) {
    assert.doesNotThrow(() => queueSubscriptionGuide(ready.id, saved));
    assert.doesNotThrow(() => markSubscriptionGuideSeen(ready.id, saved));
    assert.equal(calendarReadyForGuide([ready], null, saved), null);
    assert.equal(calendarReadyForGuide([ready], ready.id, saved), ready.id);
  }
});

test("a saved partial subscription can open the guide before the full publication", () => {
  const saved = storage();
  const partial = { ...pending, cachedThrough: "2026-10-30" };
  queueSubscriptionGuide(partial.id, saved);
  assert.equal(calendarReadyForGuide([partial], null, saved), partial.id);
  assert.equal(calendarReadyForGuide([{ ...partial, enabled: false }], null, saved), null);
});
