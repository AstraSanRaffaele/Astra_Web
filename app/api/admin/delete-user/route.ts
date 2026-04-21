import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function isProbablyJwt(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.split(".").length === 3 &&
    value.length > 20
  );
}

function extractJwtFromUnknown(value: unknown): string | null {
  if (isProbablyJwt(value)) return value;

  if (Array.isArray(value)) {
    for (const item of value) {
      const jwt = extractJwtFromUnknown(item);
      if (jwt) return jwt;
    }
  }

  if (value && typeof value === "object") {
    for (const nestedValue of Object.values(value)) {
      const jwt = extractJwtFromUnknown(nestedValue);
      if (jwt) return jwt;
    }
  }

  return null;
}

function getAccessTokenFromCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  const allCookies = cookieStore.getAll();

  const directTokenCandidates = [
    cookieStore.get("sb-access-token")?.value,
    cookieStore.get("supabase-auth-token")?.value,
  ];

  for (const candidate of directTokenCandidates) {
    if (!candidate) continue;

    try {
      const parsed = JSON.parse(candidate);
      const parsedJwt = extractJwtFromUnknown(parsed);
      if (parsedJwt) return parsedJwt;
    } catch {
      if (isProbablyJwt(candidate)) return candidate;
    }
  }

  const possibleCookie = allCookies.find(
    (cookie) =>
      cookie.name.includes("auth-token") ||
      cookie.name.endsWith("-access-token")
  );

  if (!possibleCookie?.value) return null;

  try {
    const parsed = JSON.parse(possibleCookie.value);
    return extractJwtFromUnknown(parsed);
  } catch {
    return isProbablyJwt(possibleCookie.value) ? possibleCookie.value : null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = String(body?.userId ?? "").trim();

    if (!userId) {
      return NextResponse.json({ error: "userId mancante." }, { status: 400 });
    }

    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Variabili Supabase mancanti." },
        { status: 500 }
      );
    }

    const accessToken = getAccessTokenFromCookies(cookieStore);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Token admin valido non trovato nei cookie." },
        { status: 401 }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: userError?.message || "Utente non autenticato.",
          debug: {
            hasAccessToken: !!accessToken,
            tokenPreview: `${accessToken.slice(0, 12)}...`,
          },
        },
        { status: 401 }
      );
    }

    const { data: adminProfile, error: adminError } = await supabaseUser
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (adminError || !adminProfile || adminProfile.role !== "admin") {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
    }

    if (user.id === userId) {
      return NextResponse.json(
        { error: "Non puoi eliminare il tuo stesso account." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { error: deleteRsvpError } = await supabaseAdmin
      .from("rsvps")
      .delete()
      .eq("user_id", userId);

    if (deleteRsvpError) {
      return NextResponse.json(
        { error: deleteRsvpError.message || "Errore eliminazione RSVP." },
        { status: 500 }
      );
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (deleteProfileError) {
      return NextResponse.json(
        {
          error:
            deleteProfileError.message ||
            "Errore eliminazione profilo collegato.",
        },
        { status: 500 }
      );
    }

    const { error: deleteAuthError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      return NextResponse.json(
        { error: deleteAuthError.message || "Errore eliminazione auth." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore interno.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}