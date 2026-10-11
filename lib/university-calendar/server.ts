import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin-users-server";
import { fetchDay, deduplicateLessons } from "./source";
import { canUseCalendar } from "./eligibility";
import { daysBetween, selectLessons, unassignedSubjects, type CalendarRecord, type CalendarView } from "./types";

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

export function calendarView(record: CalendarRecord, origin: string): CalendarView {
  const { token, source_events, staging_events, lease_token, leased_until, owner_id, ...safe } = record;
  void staging_events; void lease_token; void leased_until; void owner_id;
  return { ...safe, feedUrl: `${origin}/api/calendars/university/${token}`, eventCount: selectLessons(source_events, record).length, totalDays: daysBetween(record.semester_start, record.semester_end).length, subjects: unassignedSubjects(source_events, record.year) };
}

export async function processSyncBatch(calendarId?: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("claim_university_calendar_sync", { requested_id: calendarId ?? null });
  if (error) throw error;
  const record = (data as CalendarRecord[] | null)?.[0];
  if (!record) return { processed: false };
  const dates = daysBetween(record.semester_start, record.semester_end);
  const cursor = record.sync_cursor ?? 0;
  const collected = [...record.staging_events];
  let nextCursor = cursor;
  const deadline = Date.now() + 42000;
  try {
    // Small, resumable batches keep a semester import within Vercel's request limits.
    while (nextCursor < Math.min(cursor + 8, dates.length) && Date.now() < deadline) {
      const batchDates = dates.slice(nextCursor, Math.min(nextCursor + 2, dates.length, cursor + 8));
      const results = await Promise.all(batchDates.map((date) => fetchDay(record.course, record.year, date)));
      collected.push(...results.flat());
      nextCursor += batchDates.length;
    }
    const complete = nextCursor === dates.length;
    const now = new Date().toISOString();
    const patch = complete ? {
      source_events: deduplicateLessons(collected), staging_events: [], sync_cursor: null,
      last_synced_at: now, next_sync_at: new Date(Date.parse(record.sync_started_at!) + 3 * 3600000).toISOString(),
      sync_started_at: null, sync_error: null, retry_at: null, lease_token: null, leased_until: null,
    } : { staging_events: collected, sync_cursor: nextCursor, sync_error: null, retry_at: null, lease_token: null, leased_until: null };
    const { data: updated, error: updateError } = await supabase.from("university_calendars").update(patch).eq("id", record.id).eq("lease_token", record.lease_token).select("id").maybeSingle();
    if (updateError) throw updateError;
    return { processed: Boolean(updated), complete: complete && Boolean(updated), days: nextCursor, total: dates.length };
  } catch (cause) {
    // A failed read never replaces the last complete calendar or erases its events.
    const message = cause instanceof Error ? cause.message : "Impossibile leggere gli orari UniSR.";
    const { error: updateError } = await supabase.from("university_calendars").update({ staging_events: collected, sync_cursor: nextCursor, sync_error: message.slice(0, 300), retry_at: new Date(Date.now() + 10 * 60000).toISOString(), lease_token: null, leased_until: null }).eq("id", record.id).eq("lease_token", record.lease_token);
    if (updateError) throw updateError;
    return { processed: true, complete: false, days: nextCursor, total: dates.length, error: message };
  }
}

export function serviceError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (["42P01", "PGRST205", "PGRST202"].includes(code)) return "Il servizio calendario deve essere attivato prima di salvare i calendari.";
  return "Il servizio calendario non è disponibile. Riprova tra poco.";
}
