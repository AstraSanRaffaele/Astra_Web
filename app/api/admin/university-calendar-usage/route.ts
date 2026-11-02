import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-users-server";
import { getCalendarUsageOwner } from "@/app/(site)/profile/calendario-universita/_lib/feed-usage-owner";
import { CALENDAR_REVOCATION_LIMIT, type CalendarRevocationTarget, type CalendarRevocationResult } from "@/app/(site)/profile/calendario-universita/_lib/feed-usage-types";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const staleLink = "Il link è cambiato o non è più disponibile. Ricarica i conteggi.";
const revocationError = "Revoca non riuscita. Riprova tra poco.";

function validTarget(value: unknown): value is CalendarRevocationTarget {
  if (!value || typeof value !== "object") return false;
  const target = value as Record<string, unknown>;
  return typeof target.calendarId === "string" && UUID.test(target.calendarId) && typeof target.feedHash === "string" && /^[0-9a-f]{64}$/.test(target.feedHash);
}

export async function GET(request: NextRequest) {
  try {
    if (!(await getCalendarUsageOwner())) return NextResponse.json({ error: "Non autorizzato." }, { status: 403, headers });
    const days = Number(request.nextUrl.searchParams.get("days") ?? "1");
    const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
    const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
    const state = request.nextUrl.searchParams.get("state") ?? "active";
    if (!["active", "revoked"].includes(state) || ![1, 7].includes(days) || !Number.isInteger(page) || page < 1 || page > 100000 || query.length > 100) return NextResponse.json({ error: "Filtri non validi." }, { status: 400, headers });
    const { data, error } = await createAdminClient().rpc("read_university_calendar_feed_usage", {
      requested_days: days, requested_page: page, requested_query: query, requested_state: state,
    }).abortSignal(AbortSignal.timeout(8000));
    if (error) {
      if (["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code)) return NextResponse.json({ error: "Il monitoraggio non è ancora attivo o richiede l’aggiornamento SQL." }, { status: 503, headers });
      throw error;
    }
    if (!data) throw new Error("Missing report");
    return NextResponse.json(data, { headers });
  } catch { return NextResponse.json({ error: "Impossibile caricare gli accessi. Riprova tra poco." }, { status: 503, headers }); }
}

export async function POST(request: NextRequest) {
  try {
    const caller = await getCalendarUsageOwner();
    if (!caller) return NextResponse.json({ error: "Non autorizzato." }, { status: 403, headers });
    if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Richiesta non autorizzata." }, { status: 403, headers });
    if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400, headers });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400, headers }); }
    const bulk = body && typeof body === "object" && "calendars" in body;
    const targets: unknown = bulk ? body.calendars : [body];
    if (!Array.isArray(targets) || targets.length < 1 || targets.length > CALENDAR_REVOCATION_LIMIT || !targets.every(validTarget)) return NextResponse.json({ error: "Seleziona da 1 a 25 link validi." }, { status: 400, headers });
    const unique = [...new Map(targets.map(target => [`${target.calendarId}:${target.feedHash}`, { calendarId: target.calendarId, feedHash: target.feedHash }])).values()];
    const client = createAdminClient();
    const results: CalendarRevocationResult[] = [];
    const revoke = async (target: CalendarRevocationTarget): Promise<CalendarRevocationResult> => {
      try {
        const { data, error } = await client.rpc("revoke_university_calendar_feed", {
          requested_calendar: target.calendarId, requested_feed_hash: target.feedHash, requested_actor: caller.userId,
        }).abortSignal(AbortSignal.timeout(5000));
        if (error) throw error;
        return data ? { ...target, ok: true } : { ...target, ok: false, status: 409, error: staleLink };
      } catch { return { ...target, ok: false, status: 503, error: revocationError }; }
    };
    // Bounded batches reuse the SQL guard for each exact token. One failed link
    // never disguises the result of the others or revokes a regenerated token.
    for (let offset = 0; offset < unique.length; offset += 5) results.push(...await Promise.all(unique.slice(offset, offset + 5).map(revoke)));
    if (!bulk) {
      const result = results[0];
      return result.ok ? NextResponse.json({ ok: true }, { headers }) : NextResponse.json({ error: result.error }, { status: result.status, headers });
    }
    return NextResponse.json({ ok: results.every(result => result.ok), results }, { headers });
  } catch { return NextResponse.json({ error: revocationError }, { status: 503, headers }); }
}
