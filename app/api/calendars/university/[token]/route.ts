import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/admin-users-server";
import { createCalendar } from "@/lib/university-calendar/ical";
import { calendarExpired } from "@/lib/university-calendar/period";
import type { CalendarRecord } from "@/lib/university-calendar/types";
import { applySharedSource, readSharedSource } from "@/lib/university-calendar/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return new Response("Calendario non trovato.", { status: 404, headers });
  if (request.nextUrl.searchParams.has("subject")) return new Response("Calendario non trovato.", { status: 404, headers });
  try {
    const { data, error } = await createAdminClient().from("university_calendars").select("*").eq("token", token).eq("enabled", true).maybeSingle();
    if (error) throw error;
    if (!data) return new Response("Calendario non trovato.", { status: 404, headers });
    const original = data as CalendarRecord;
    if (calendarExpired(original.semester_end)) return new Response("Calendario scaduto.", { status: 404, headers });
    const record = applySharedSource(original, await readSharedSource(original.course, original.year));
    if (!record.last_synced_at) return new Response("Prima sincronizzazione in corso. Riprova più tardi.", { status: 503, headers: { ...headers, "Retry-After": "600" } });
    const calendar = createCalendar(record);
    const etag = `"${createHash("sha256").update(calendar).digest("hex")}"`;
    const responseHeaders = { ...headers, ETag: etag, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="astra-unisr.ics"' };
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: responseHeaders });
    return new Response(calendar, { headers: responseHeaders });
  } catch { return new Response("Calendario temporaneamente non disponibile.", { status: 503, headers: { ...headers, "Retry-After": "600" } }); }
}
