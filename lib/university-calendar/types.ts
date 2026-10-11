export type CourseKey = "medicina" | "medicina-2" | "medicina-3";

export const COURSES: { key: CourseKey; label: string; sourceIds: string[] }[] = [
  { key: "medicina", label: "Medicina e Chirurgia", sourceIds: ["10115", "10311"] },
  { key: "medicina-2", label: "Medicina e Chirurgia 2", sourceIds: ["10284", "10325"] },
  { key: "medicina-3", label: "Medicina e Chirurgia 3", sourceIds: ["10285", "10324"] },
];

export type Lesson = {
  date: string;
  start: string;
  end: string;
  title: string;
  teacher: string;
  year: number;
  line: string | null;
  room: string;
  building: string;
  mapUrl: string | null;
  onlineUrl: string | null;
};

export type CalendarSettings = {
  name: string;
  course: CourseKey;
  year: number;
  line: string;
  semester_start: string;
  semester_end: string;
  included_subjects: string[];
};

export type CalendarRecord = CalendarSettings & {
  id: string;
  owner_id: string;
  token: string;
  enabled: boolean;
  source_events: Lesson[];
  staging_events: Lesson[];
  sync_cursor: number | null;
  sync_started_at: string | null;
  last_synced_at: string | null;
  next_sync_at: string;
  retry_at: string | null;
  sync_error: string | null;
  lease_token: string | null;
  leased_until: string | null;
  created_at: string;
};

export type CalendarView = Omit<CalendarRecord, "token" | "source_events" | "staging_events" | "lease_token" | "leased_until" | "owner_id"> & {
  feedUrl: string;
  eventCount: number;
  totalDays: number;
  subjects: { key: string; title: string; teacher: string }[];
};

export function subjectKey(lesson: Lesson): string {
  return `${lesson.title.trim().toLocaleLowerCase("it-IT")}\u001f${lesson.teacher.trim().toLocaleLowerCase("it-IT")}`;
}

export function selectLessons(events: Lesson[], settings: CalendarSettings): Lesson[] {
  const included = new Set(settings.included_subjects);
  return events.filter((event) => event.year === settings.year && event.date >= settings.semester_start && event.date <= settings.semester_end &&
    (event.line === settings.line || (event.line === null && included.has(subjectKey(event)))));
}

export function unassignedSubjects(events: Lesson[], year: number) {
  const subjects = new Map<string, { key: string; title: string; teacher: string }>();
  for (const event of events) {
    if (event.year !== year || event.line !== null) continue;
    const key = subjectKey(event);
    subjects.set(key, { key, title: event.title, teacher: event.teacher });
  }
  return [...subjects.values()].sort((a, b) => a.title.localeCompare(b.title, "it"));
}

export function availableLines(events: Lesson[], year?: number): string[] {
  return [...new Set(events.flatMap((event) => (year === undefined || event.year === year) && event.line ? [event.line] : []))].sort((a, b) => a.localeCompare(b, "it"));
}

export function daysBetween(start: string, end: string): string[] {
  const first = Date.parse(`${start}T12:00:00Z`);
  const last = Date.parse(`${end}T12:00:00Z`);
  if (!Number.isFinite(first) || !Number.isFinite(last) || first > last || (last - first) / 86400000 > 365) throw new Error("Il periodo del calendario non può superare un anno.");
  return Array.from({ length: Math.round((last - first) / 86400000) + 1 }, (_, index) => new Date(first + index * 86400000).toISOString().slice(0, 10));
}

export function validateSettings(input: unknown): CalendarSettings {
  if (!input || typeof input !== "object") throw new Error("Impostazioni non valide.");
  const data = input as Record<string, unknown>;
  const course = COURSES.find((item) => item.key === data.course);
  const year = Number(data.year);
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const line = typeof data.line === "string" ? data.line.trim().toUpperCase() : "";
  if (!course || !Number.isInteger(year) || year < 1 || year > 6 || !name || name.length > 100 || !/^[A-ZÀ-Ü][A-ZÀ-Ü 0-9-]{0,39}$/.test(line)) throw new Error("Controlla nome, corso, anno e linea.");
  for (const field of ["semester_start", "semester_end"] as const) {
    const date = data[field];
    if (!isCalendarDate(date)) throw new Error("Date del semestre non valide.");
  }
  daysBetween(data.semester_start as string, data.semester_end as string);
  if (!Array.isArray(data.included_subjects) || data.included_subjects.length > 200 || data.included_subjects.some((item) => typeof item !== "string" || item.length > 600)) throw new Error("Selezione delle attività non valida.");
  return { name, course: course.key, year, line, semester_start: data.semester_start as string, semester_end: data.semester_end as string, included_subjects: [...new Set(data.included_subjects)] as string[] };
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T12:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}
