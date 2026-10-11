import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-users-server";
import { equalSecret, processSyncBatch } from "@/lib/university-calendar/server";
import { calendarSeasonOpen } from "@/lib/university-calendar/period";
import { COURSES } from "@/lib/university-calendar/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!/^[a-f0-9]{64}$/.test(supplied)) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  try {
    const { data: config, error } = await createAdminClient().from("university_calendar_sync_config").select("token,enabled").eq("id", true).maybeSingle();
    if (error) throw error;
    if (!config?.enabled || !equalSecret(supplied, config.token)) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
    if (!calendarSeasonOpen()) return NextResponse.json({ processed: false, paused: true }, { headers: { "Cache-Control": "no-store" } });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 }); }
    if (!body || !COURSES.some((course) => course.key === body.course)) return NextResponse.json({ error: "Corso non valido." }, { status: 400 });
    return NextResponse.json(await processSyncBatch(body.course), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Sincronizzazione temporaneamente non disponibile." }, { status: 503 }); }
}
