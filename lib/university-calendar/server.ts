import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin-users-server";
import { fetchDay, deduplicateLessons } from "./source";
import { canUseCalendar } from "./eligibility";
import { calendarExpired, calendarSeasonOpen } from "./period";
import { daysBetween, selectLessons, unassignedSubjects, type CalendarRecord, type CalendarView } from "./types";
import { applySharedSource, type SharedSource, type SourceJob } from "./shared";

export async function getCalendarUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email_confirmed_at) return null;
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id,role,locked,facolta,corso_di_laurea").eq("id", user.id).maybeSingle();
  return !profileError && profile && canUseCalendar(profile) ? { id: user.id, isAdmin: profile.role === "admin" } : null;
}

export function newFeedToken() { return randomBytes(32).toString("base64url"); }

export function equalSecret(actual: string, expected: string) {
  const left = Buffer.from(actual), right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function calendarView(original: CalendarRecord, origin: string, source: SharedSource | null = null): CalendarView {
  const record = applySharedSource(original, source);
  const { token, source_events, staging_events, lease_token, leased_until, owner_id, ...safe } = record;
  void staging_events; void lease_token; void leased_until; void owner_id;
  const feedUrl = `${origin}/api/calendars/university/${token}`;
  const selected = selectLessons(source_events, record);
  return { ...safe, feedUrl, eventCount: selected.length, totalDays: daysBetween(source?.semester_start ?? record.semester_start, record.semester_end).length, subjects: unassignedSubjects(source_events, record.year) };
}

export async function processSyncBatch(course?: string) {
  if (!calendarSeasonOpen()) return { processed: false, paused: true };
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("claim_university_calendar_source", { requested_course: course ?? null });
  if (error) throw error;
  const record = (data as SourceJob[] | null)?.[0];
  if (!record) return { processed: false };
  if (calendarExpired(record.semester_end)) return { processed: false, expired: true };
  const dates = daysBetween(record.semester_start, record.semester_end);
  const cursor = record.sync_cursor ?? 0;
  const collected = [...record.staging_events];
  let nextCursor = cursor;
  const deadline = Date.now() + 42000;
  try {
    // Small, resumable batches keep a semester import within Vercel's request limits.
    while (nextCursor < Math.min(cursor + 24, dates.length) && Date.now() < deadline) {
      // An import started before Italian midnight must not launch more reads after expiry.
      if (calendarExpired(record.semester_end)) return { processed: false, expired: true };
      if (!calendarSeasonOpen()) return { processed: false, paused: true };
      const batchDates = dates.slice(nextCursor, Math.min(nextCursor + 4, dates.length, cursor + 24));
      // One read includes every year and line: at most three course workers run.
      const results = await Promise.all(batchDates.map((date) => fetchDay(record.course, 0, date)));
      collected.push(...results.flat());
      nextCursor += batchDates.length;
    }
    if (calendarExpired(record.semester_end)) return { processed: false, expired: true };
    if (!calendarSeasonOpen()) return { processed: false, paused: true };
    const complete = nextCursor === dates.length;
    const { data: updated, error: updateError } = await supabase.rpc("save_university_calendar_source", {
      requested_course: record.course, requested_lease: record.lease_token,
      events: complete ? deduplicateLessons(collected) : collected,
      next_cursor: nextCursor, finished: complete, failure: null,
    });
    if (updateError) throw updateError;
    return { processed: Boolean(updated), complete: complete && Boolean(updated), days: nextCursor, total: dates.length };
  } catch (cause) {
    if (calendarExpired(record.semester_end)) return { processed: false, expired: true };
    if (!calendarSeasonOpen()) return { processed: false, paused: true };
    // A failed read never replaces the last complete calendar or erases its events.
    const message = cause instanceof Error ? cause.message : "Impossibile leggere gli orari UniSR.";
    const { data: saved, error: updateError } = await supabase.rpc("save_university_calendar_source", {
      requested_course: record.course, requested_lease: record.lease_token,
      events: collected, next_cursor: nextCursor, finished: false, failure: message.slice(0, 300),
    });
    if (updateError) throw updateError;
    return { processed: Boolean(saved), complete: false, days: nextCursor, total: dates.length, error: message };
  }
}

export function serviceError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (["42P01", "PGRST205", "PGRST202"].includes(code)) return "Il servizio calendario deve essere attivato prima di salvare i calendari.";
  return "Il servizio calendario non è disponibile. Riprova tra poco.";
}
