import test from "node:test";
import assert from "node:assert/strict";
import load from "./load.mjs";

const { calendarPeriod, calendarExpired, calendarSeasonOpen } = load("period");
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

test("calendars expire only after their own June 15 at Italian midnight", () => {
  const end = "2027-06-15";
  assert.equal(calendarExpired(end, new Date("2027-06-15T21:59:59.999Z")), false);
  assert.equal(calendarExpired(end, new Date("2027-06-15T22:00:00.000Z")), true);
  assert.equal(calendarExpired(end, new Date("2027-12-01T10:00:00Z")), true);
  assert.equal(calendarExpired("2028-06-15", new Date("2027-06-15T22:00:00Z")), false);
  assert.equal(calendarExpired("2028-06-15", new Date("2028-06-15T22:00:00Z")), true);
});

test("calendar creation and synchronization follow the Italian September 1 to June 15 season", () => {
  for (const [time, open] of [
    ["2027-01-01T12:00:00Z", true],
    ["2027-06-15T21:59:59.999Z", true],
    ["2027-06-15T22:00:00Z", false],
    ["2027-07-20T12:00:00Z", false],
    ["2027-08-31T21:59:59.999Z", false],
    ["2027-08-31T22:00:00Z", true],
    ["2027-12-31T22:00:00Z", true],
  ]) assert.equal(calendarSeasonOpen(new Date(time)), open, time);
  assert.deepEqual(calendarPeriod(new Date("2027-08-31T22:00:00Z")), { start: "2027-09-01", end: "2028-06-15" });
});
