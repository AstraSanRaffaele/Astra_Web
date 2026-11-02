import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-users-server";
import { getCalendarUsageOwner } from "@/app/(site)/profile/calendario-universita/_lib/feed-usage-owner";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  try {
    if (!(await getCalendarUsageOwner())) return NextResponse.json({ error: "Non autorizzato." }, { status: 403, headers });
    const days = Number(request.nextUrl.searchParams.get("days") ?? "1");
    const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
    const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
    if (![1, 7].includes(days) || !Number.isInteger(page) || page < 1 || page > 100000 || query.length > 100) return NextResponse.json({ error: "Filtri non validi." }, { status: 400, headers });
    const { data, error } = await createAdminClient().rpc("read_university_calendar_feed_usage", {
      requested_days: days, requested_page: page, requested_query: query,
    }).abortSignal(AbortSignal.timeout(8000));
    if (error) {
      if (["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code)) return NextResponse.json({ error: "Il monitoraggio degli accessi non è ancora attivo." }, { status: 503, headers });
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
    if (!body || typeof body.calendarId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.calendarId) || typeof body.feedHash !== "string" || !/^[0-9a-f]{64}$/.test(body.feedHash)) return NextResponse.json({ error: "Link non valido." }, { status: 400, headers });
    const { data, error } = await createAdminClient().rpc("revoke_university_calendar_feed", {
      requested_calendar: body.calendarId, requested_feed_hash: body.feedHash, requested_actor: caller.userId,
    });
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Il link è cambiato o non è più disponibile. Ricarica i conteggi." }, { status: 409, headers });
    return NextResponse.json({ ok: true }, { headers });
  } catch { return NextResponse.json({ error: "Revoca non riuscita. Riprova tra poco." }, { status: 503, headers }); }
}
