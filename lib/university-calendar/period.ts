export function calendarPeriod(now = new Date()) {
  const start = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const year = Number(start.slice(0, 4));
  const endYear = start > `${year}-06-15` ? year + 1 : year;
  return { start, end: `${endYear}-06-15` };
}
