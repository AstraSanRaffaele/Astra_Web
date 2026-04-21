import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// ── Guard: only admins can call this ─────────────────────────────
async function getCallerRole(): Promise<{ role: string | null; userId: string | null }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { role: null, userId: null };
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { role: data?.role ?? null, userId: user.id };
}

export async function POST(req: NextRequest) {
  try {
    const { role, userId: callerUserId } = await getCallerRole();

    if (role !== "admin") {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
    }

    const body = await req.json();
    const userId = String(body?.userId ?? "").trim();

    if (!userId) {
      return NextResponse.json({ error: "userId mancante." }, { status: 400 });
    }

    if (callerUserId === userId) {
      return NextResponse.json(
        { error: "Non puoi eliminare il tuo stesso account." },
        { status: 400 }
      );
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: deleteRsvpError } = await adminClient
      .from("rsvps")
      .delete()
      .eq("user_id", userId);

    if (deleteRsvpError) {
      return NextResponse.json(
        { error: "Errore eliminazione RSVP: " + deleteRsvpError.message },
        { status: 500 }
      );
    }

    const { error: deleteProfileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (deleteProfileError) {
      return NextResponse.json(
        {
          error:
            "Errore eliminazione profilo: " + deleteProfileError.message,
        },
        { status: 500 }
      );
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      return NextResponse.json(
        { error: "Errore eliminazione auth: " + deleteAuthError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Errore interno.",
      },
      { status: 500 }
    );
  }
}