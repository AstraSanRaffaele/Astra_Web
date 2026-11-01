import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/admin-users-server";
import { PUBLIC_CALENDAR_LIMIT } from "@/app/(site)/profile/calendario-universita/_lib/config";
import { calendarView, getCalendarUser, newFeedToken, serviceError } from "@/app/(site)/profile/calendario-universita/_lib/server";
import { validateSettings, type CalendarRecord } from "@/app/(site)/profile/calendario-universita/_lib/types";
import { calendarExpired, calendarPeriod, calendarRefreshOpen, calendarSeasonOpen } from "@/app/(site)/profile/calendario-universita/_lib/period";
import { cachedSourceThrough, readSharedSource, WEEKEND_CACHE_UNAVAILABLE } from "@/app/(site)/profile/calendario-universita/_lib/shared";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "private, no-store" };

function automaticSettings(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Impostazioni non valide.");
  const period = calendarPeriod();
  return validateSettings({ ...input, semester_start: period.start, semester_end: period.end });
}

export async function GET(request: NextRequest) {
  const owner = await getCalendarUser();
  if (!owner) return NextResponse.json({ error: "Non autorizzato." }, { status: 403, headers: noStore });
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("university_calendars").select("*").eq("owner_id", owner.id).order("created_at", { ascending: false }).limit(PUBLIC_CALENDAR_LIMIT);
    if (error) throw error;
    const { data: config, error: configError } = await supabase.from("university_calendar_sync_config").select("enabled,last_dispatch_at").eq("id", true).maybeSingle();
    if (configError) throw configError;
    const records = (data as CalendarRecord[]).filter((record) => !calendarExpired(record.semester_end));
    const calendars = await Promise.all(records.map(async (record) => calendarView(record, request.nextUrl.origin, await readSharedSource(record.course, record.year))));
    return NextResponse.json({ calendars, scheduler: { enabled: calendarSeasonOpen() && Boolean(config?.enabled) } }, { headers: noStore });
  } catch (error) { return NextResponse.json({ error: serviceError(error) }, { status: 503, headers: noStore }); }
}

export async function POST(request: NextRequest) {
  const owner = await getCalendarUser();
  if (!owner) return NextResponse.json({ error: "Non autorizzato." }, { status: 403, headers: noStore });
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Richiesta non autorizzata." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Calendario non valido." }, { status: 400 });
  if (!calendarSeasonOpen()) return NextResponse.json({ error: "Il calendario è in pausa estiva. Potrai creare il nuovo calendario dal 1° settembre." }, { status: 403, headers: noStore });
  try {
    const supabase = createAdminClient();
    if (body.action === "create") {
      let settings;
      try { settings = automaticSettings(body.settings); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Impostazioni non valide." }, { status: 400 }); }
      if (!calendarRefreshOpen() && !cachedSourceThrough(settings, await readSharedSource(settings.course, settings.year))) return NextResponse.json({ error: WEEKEND_CACHE_UNAVAILABLE }, { status: 503, headers: noStore });
      const { data: createdId, error: createError } = await supabase.rpc("create_university_calendar", {
        requested_id: id, requested_owner: owner.id, requested_token: newFeedToken(), settings,
        maximum_calendars: PUBLIC_CALENDAR_LIMIT,
      });
      if (createError?.code === "P0001") return NextResponse.json({ error: "Hai già un calendario personale. Puoi modificarlo mantenendo lo stesso link." }, { status: 409, headers: noStore });
      if (createError?.code === "23505") return NextResponse.json({ error: "Identificativo del calendario non disponibile. Riprova." }, { status: 409, headers: noStore });
      if (createError) throw createError;
      if (createdId !== id) throw new Error("Impossibile creare il calendario.");
    } else {
      const { data: current, error } = await supabase.from("university_calendars").select("*").eq("id", id).eq("owner_id", owner.id).maybeSingle();
      if (error) throw error;
      if (!current || calendarExpired(current.semester_end)) return NextResponse.json({ error: "Calendario non trovato." }, { status: 404 });
      if (body.action === "continue" || body.action === "sync") {
        // Personal requests never restart a shared import or bypass fixed times.
        await readSharedSource(current.course, current.year);
      } else {
        let patch: Record<string, unknown>;
        if (body.action === "settings") {
          let settings;
          try { settings = automaticSettings(body.settings); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Impostazioni non valide." }, { status: 400 }); }
          const changedSource = settings.course !== current.course || settings.year !== current.year;
          if (changedSource && !calendarRefreshOpen() && !cachedSourceThrough(settings, await readSharedSource(settings.course, settings.year))) return NextResponse.json({ error: WEEKEND_CACHE_UNAVAILABLE }, { status: 503, headers: noStore });
          patch = { ...settings, enabled: true, ...(changedSource ? { source_events: [], last_synced_at: null } : {}), sync_cursor: null, staging_events: [], retry_at: null, sync_error: null, lease_token: null, leased_until: null };
        }
        else if (body.action === "rotate") patch = { token: newFeedToken() };
        else if (body.action === "toggle" && typeof body.enabled === "boolean") patch = { enabled: body.enabled };
        else if (body.action === "subjects" && Array.isArray(body.included_subjects)) {
          let settings;
          try { settings = validateSettings({ ...current, included_subjects: body.included_subjects }); } catch { return NextResponse.json({ error: "Selezione non valida." }, { status: 400 }); }
          patch = { included_subjects: settings.included_subjects };
        } else return NextResponse.json({ error: "Azione non valida." }, { status: 400 });
        const { error: updateError } = await supabase.from("university_calendars").update(patch).eq("id", id).eq("owner_id", owner.id);
        if (updateError) throw updateError;
      }
    }
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) { return NextResponse.json({ error: serviceError(error) }, { status: 503, headers: noStore }); }
}
