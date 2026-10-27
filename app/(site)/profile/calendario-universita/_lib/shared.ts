import "server-only";
import { createAdminClient } from "@/lib/admin-users-server";
import type { CalendarRecord, CourseKey, Lesson } from "./types";

export type SharedSource = {
  course: CourseKey;
  semester_start: string;
  semester_end: string;
  events: Lesson[];
  lines: string[];
  ready: boolean;
  sync_cursor: number | null;
  sync_started_at: string | null;
  last_synced_at: string | null;
  next_sync_at: string;
  retry_at: string | null;
  sync_error: string | null;
};

export type SourceJob = Omit<SharedSource, "events" | "lines" | "ready"> & {
  staging_events: Lesson[];
  lease_token: string;
};

export async function readSharedSource(course: CourseKey, year: number, start?: string, end?: string): Promise<SharedSource | null> {
  const { data, error } = await createAdminClient().rpc("read_university_calendar_source", {
    requested_course: course, requested_year: year,
    requested_start: start ?? null, requested_end: end ?? null,
  });
  if (error) throw error;
  return data as SharedSource | null;
}

export async function ensureSharedSource(course: CourseKey, start: string, end: string) {
  const { error } = await createAdminClient().rpc("ensure_university_calendar_source", {
    requested_course: course, requested_start: start, requested_end: end,
  });
  if (error) throw error;
}

// Existing subscriptions retain their last complete data until the first shared
// import is ready. A published empty snapshot is authoritative (cancellations).
export function applySharedSource(record: CalendarRecord, source: SharedSource | null): CalendarRecord {
  if (!source || source.course !== record.course || source.semester_end !== record.semester_end || source.semester_start > record.semester_start) return record;
  const published = source.ready;
  return {
    ...record, source_events: published ? source.events : record.source_events,
    last_synced_at: published ? source.last_synced_at : record.last_synced_at,
    sync_cursor: published || record.last_synced_at ? null : source.sync_cursor ?? 0,
    sync_started_at: source.sync_started_at, next_sync_at: source.next_sync_at,
    retry_at: source.retry_at, sync_error: source.sync_error,
    staging_events: [], lease_token: null, leased_until: null,
  };
}

export function previewCovered(source: SharedSource | null, start: string, end: string) {
  if (!source || source.semester_start > start || source.semester_end < end) return false;
  if (source.ready) return true;
  const nextDay = Date.parse(`${source.semester_start}T12:00:00Z`) + (source.sync_cursor ?? 0) * 86400000;
  return nextDay > Date.parse(`${end}T12:00:00Z`);
}
