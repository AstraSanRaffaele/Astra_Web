import test from "node:test";
import assert from "node:assert/strict";
import load from "./load.mjs";

const { calendarPeriod } = load("period");
const { daysBetween } = load("types");

test("the calendar runs from today in Rome to the next June 15 without manual semester dates", () => {
  for (const [now, start, end] of [
    ["2026-10-11T10:00:00Z", "2026-10-11", "2027-06-15"],
    ["2027-02-02T10:00:00Z", "2027-02-02", "2027-06-15"],
    ["2027-06-15T10:00:00Z", "2027-06-15", "2027-06-15"],
    ["2027-06-16T10:00:00Z", "2027-06-16", "2028-06-15"],
  ]) {
    const period = calendarPeriod(new Date(now));
    assert.deepEqual(period, { start, end });
    assert.ok(daysBetween(start, end).length <= 366);
  }
});

test("Italian midnight and daylight saving determine the start and the June cutoff", () => {
  assert.deepEqual(calendarPeriod(new Date("2027-06-15T21:59:00Z")), { start: "2027-06-15", end: "2027-06-15" });
  assert.deepEqual(calendarPeriod(new Date("2027-06-15T22:00:00Z")), { start: "2027-06-16", end: "2028-06-15" });
  assert.equal(calendarPeriod(new Date("2026-12-31T23:00:00Z")).start, "2027-01-01");
});
