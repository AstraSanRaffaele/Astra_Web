import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/admin-users-server";
import { createCalendar, createRevokedCalendar } from "@/app/(site)/profile/calendario-universita/_lib/ical";
import { calendarExpired } from "@/app/(site)/profile/calendario-universita/_lib/period";
import type { CalendarRecord } from "@/app/(site)/profile/calendario-universita/_lib/types";
import { applySharedSource, cachedSourceThrough, readSharedSource } from "@/app/(site)/profile/calendario-universita/_lib/shared";
import { trackCalendarFeedRequest } from "@/app/(site)/profile/calendario-universita/_lib/feed-usage";
import { readRevokedCalendarFeed } from "@/app/(site)/profile/calendario-universita/_lib/feed-revocation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return new Response("Calendario non trovato.", { status: 404, headers });
  if (request.nextUrl.searchParams.has("subject")) return new Response("Calendario non trovato.", { status: 404, headers });
  let access: Pick<CalendarRecord, "id" | "token"> | null = null;
  const finish = (response: Response) => {
    try {
      if (access) trackCalendarFeedRequest({ calendarId: access.id, token: access.token, method: request.method, userAgent: request.headers.get("user-agent"), status: response.status });
    } catch { /* Analytics must never change the subscription response. */ }
    return response;
  };
  const revokedFeed = (revokedAt: string, calendarId?: string) => {
    const body = createRevokedCalendar(calendarId ? { calendarId, revokedAt, profileUrl: `${request.nextUrl.origin}/profile/calendario-universita` } : undefined);
    const etag = `"${createHash("sha256").update(`${token}:${revokedAt}:${body}`).digest("hex")}"`;
    const responseHeaders = { ...headers, ETag: etag, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="astra-unisr.ics"' };
    return finish(new Response(request.headers.get("if-none-match") === etag ? null : body, { status: request.headers.get("if-none-match") === etag ? 304 : 200, headers: responseHeaders }));
  };
  try {
    const { data, error } = await createAdminClient().from("university_calendars").select("*").eq("token", token).maybeSingle();
    if (error) throw error;
    if (!data) {
      const revoked = await readRevokedCalendarFeed(token);
      if (!revoked) return new Response("Calendario non trovato.", { status: 404, headers });
      access = { id: revoked.calendar_id, token };
      if (calendarExpired(revoked.semester_end)) return finish(new Response("Calendario scaduto.", { status: 404, headers }));
      // A replaced URL stays empty so subscribed apps can remove the warnings too.
      return revokedFeed(revoked.revoked_at);
    }
    const original = data as CalendarRecord;
    access = original;
    if (calendarExpired(original.semester_end)) return finish(new Response("Calendario scaduto.", { status: 404, headers }));
    if (original.revoked_at) return revokedFeed(original.revoked_at, original.id);
    if (!original.enabled) return finish(new Response("Calendario non trovato.", { status: 404, headers }));
    const source = await readSharedSource(original.course, original.year);
    const record = applySharedSource(original, source);
    if (!record.last_synced_at && !cachedSourceThrough(original, source)) return finish(new Response("Prima sincronizzazione in corso. Riprova più tardi.", { status: 503, headers: { ...headers, "Retry-After": "600" } }));
    const calendar = createCalendar(record);
    const etag = `"${createHash("sha256").update(calendar).digest("hex")}"`;
    const responseHeaders = { ...headers, ETag: etag, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="astra-unisr.ics"' };
    if (request.headers.get("if-none-match") === etag) return finish(new Response(null, { status: 304, headers: responseHeaders }));
    return finish(new Response(calendar, { headers: responseHeaders }));
  } catch { return finish(new Response("Calendario temporaneamente non disponibile.", { status: 503, headers: { ...headers, "Retry-After": "600" } })); }
}
