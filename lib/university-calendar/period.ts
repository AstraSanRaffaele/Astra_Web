export function calendarToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function calendarExpired(semesterEnd: string, now = new Date()) {
  // June 15 is included; expiration starts at midnight in Italy on June 16.
  return semesterEnd < calendarToday(now);
}

export function calendarSeasonOpen(now = new Date()) {
  const monthDay = calendarToday(now).slice(5);
  return monthDay <= "06-15" || monthDay >= "09-01";
}

export function calendarPeriod(now = new Date()) {
  const start = calendarToday(now);
  const year = Number(start.slice(0, 4));
  const endYear = start > `${year}-06-15` ? year + 1 : year;
  return { start, end: `${endYear}-06-15` };
}
