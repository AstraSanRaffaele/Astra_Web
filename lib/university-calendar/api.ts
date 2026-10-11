import "server-only";
import { PUBLIC_CALENDAR_ENABLED, PUBLIC_CALENDAR_LIMIT } from "./config";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/admin-users-server";
import { calendarView, getCalendarOwner, getCalendarUser, newFeedToken, processSyncBatch, serviceError } from "./server";
import { COURSES, daysBetween, isCalendarDate, unassignedSubjects, validateSettings, type CalendarRecord, type CourseKey } from "./types";
import { fetchDay, deduplicateLessons } from "./source";

type Audience = "admin" | "user";

async function calendarActor(audience: Audience) {
  if (audience === "admin") return getCalendarOwner();
  if (!PUBLIC_CALENDAR_ENABLED) return null;
  return getCalendarUser();
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "private, no-store" };

export async function listCalendars(request: NextRequest, audience: Audience) {
  const owner = await calendarActor(audience);
  if (!owner) return NextResponse.json({ error: "Non autorizzato." }, { status: 403, headers: noStore });
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("university_calendars").select("*").eq("owner_id", owner.id).order("created_at", { ascending: false }).limit(PUBLIC_CALENDAR_LIMIT);
    if (error) throw error;
    const { data: config, error: configError } = await supabase.from("university_calendar_sync_config").select("enabled,last_dispatch_at").eq("id", true).maybeSingle();
    if (configError) throw configError;
    return NextResponse.json({ calendars: (data as CalendarRecord[]).map((record) => calendarView(record, request.nextUrl.origin)), scheduler: { enabled: Boolean(config?.enabled) } }, { headers: noStore });
  } catch (error) { return NextResponse.json({ error: serviceError(error) }, { status: 503, headers: noStore }); }
}

export async function mutateCalendar(request: NextRequest, audience: Audience) {
  const owner = await calendarActor(audience);
  if (!owner) return NextResponse.json({ error: "Non autorizzato." }, { status: 403, headers: noStore });
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Richiesta non autorizzata." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Calendario non valido." }, { status: 400 });
  try {
    const supabase = createAdminClient();
    if (body.action === "create") {
      let settings;
      try { settings = validateSettings(body.settings); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Impostazioni non valide." }, { status: 400 }); }
      const { data: createdId, error: createError } = await supabase.rpc("create_university_calendar", {
        requested_id: id, requested_owner: owner.id, requested_token: newFeedToken(), settings,
        maximum_calendars: PUBLIC_CALENDAR_LIMIT,
      });
      if (createError?.code === "P0001") return NextResponse.json({ error: "Hai già un calendario personale. Puoi modificarlo mantenendo lo stesso link." }, { status: 409, headers: noStore });
      if (createError?.code === "23505") return NextResponse.json({ error: "Identificativo del calendario non disponibile. Riprova." }, { status: 409, headers: noStore });
      if (createError) throw createError;
      if (createdId !== id) throw new Error("Impossibile creare il calendario.");
      await processSyncBatch(id);
    } else {
      const { data: current, error } = await supabase.from("university_calendars").select("*").eq("id", id).eq("owner_id", owner.id).maybeSingle();
      if (error) throw error;
      if (!current) return NextResponse.json({ error: "Calendario non trovato." }, { status: 404 });
      if (audience === "user" && body.action === "sync") {
        const recent = current.sync_started_at || current.last_synced_at;
        if (current.sync_cursor !== null || (recent && Date.now() - Date.parse(recent) < 5 * 60000)) return NextResponse.json({ error: "Attendi qualche minuto prima di aggiornare di nuovo." }, { status: 429, headers: noStore });
      }
      if (body.action === "continue") {
        await processSyncBatch(id);
      } else {
        let patch: Record<string, unknown>;
        if (body.action === "settings") {
          let settings;
          try { settings = validateSettings(body.settings); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Impostazioni non valide." }, { status: 400 }); }
          patch = { ...settings, enabled: true, source_events: [], last_synced_at: null, next_sync_at: new Date().toISOString(), retry_at: null, sync_error: null, sync_cursor: 0, staging_events: [], sync_started_at: new Date().toISOString(), lease_token: null, leased_until: null };
        }
        else if (body.action === "rotate") patch = { token: newFeedToken() };
        else if (body.action === "toggle" && typeof body.enabled === "boolean") patch = { enabled: body.enabled };
        else if (body.action === "sync") patch = { next_sync_at: new Date().toISOString(), retry_at: null, sync_cursor: 0, staging_events: [], sync_started_at: new Date().toISOString(), lease_token: null, leased_until: null };
        else if (body.action === "subjects" && Array.isArray(body.included_subjects)) {
          let settings;
          try { settings = validateSettings({ ...current, included_subjects: body.included_subjects }); } catch { return NextResponse.json({ error: "Selezione non valida." }, { status: 400 }); }
          patch = { included_subjects: settings.included_subjects };
        } else return NextResponse.json({ error: "Azione non valida." }, { status: 400 });
        const { error: updateError } = await supabase.from("university_calendars").update(patch).eq("id", id).eq("owner_id", owner.id);
        if (updateError) throw updateError;
        if (body.action === "sync" || body.action === "settings") await processSyncBatch(id);
      }
    }
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) { return NextResponse.json({ error: serviceError(error) }, { status: 503, headers: noStore }); }
}

export async function previewCalendar(request: NextRequest, audience: Audience) {
  if (!(await calendarActor(audience))) return NextResponse.json({ error: "Non autorizzato." }, { status: 403, headers: noStore });
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Richiesta non autorizzata." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 }); }
  const year = Number(body?.year), course = body?.course as CourseKey, date = body?.date;
  if (!COURSES.some((item) => item.key === course) || !Number.isInteger(year) || year < 1 || year > 6 || !isCalendarDate(date)) return NextResponse.json({ error: "Scegli corso, anno e una data valida." }, { status: 400 });
  try {
    const parsed = new Date(`${date}T12:00:00Z`);
    const end = new Date(parsed.getTime() + 6 * 86400000).toISOString().slice(0, 10);
    const dates = daysBetween(date, end);
    const events = [];
    for (let index = 0; index < dates.length; index += 3) events.push(...(await Promise.all(dates.slice(index, index + 3).map((day) => fetchDay(course, year, day)))).flat());
    const lessons = deduplicateLessons(events);
    const lines = [...new Set(lessons.flatMap((lesson) => lesson.line ? [lesson.line] : []))].sort();
    return NextResponse.json({ lessons, lines, subjects: unassignedSubjects(lessons, year), start: date, end }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile leggere gli orari UniSR." }, { status: 502, headers: { "Cache-Control": "private, no-store" } }); }
}
