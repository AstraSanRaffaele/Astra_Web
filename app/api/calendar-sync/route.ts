import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-users-server";
import { equalSecret, processSyncBatch } from "@/lib/university-calendar/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!/^[a-f0-9]{64}$/.test(supplied)) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  try {
    const { data: config, error } = await createAdminClient().from("university_calendar_sync_config").select("token,enabled").eq("id", true).maybeSingle();
    if (error) throw error;
    if (!config?.enabled || !equalSecret(supplied, config.token)) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
    return NextResponse.json(await processSyncBatch(), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Sincronizzazione temporaneamente non disponibile." }, { status: 503 }); }
}
