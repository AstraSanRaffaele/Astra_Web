import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getCallerRole(): Promise<string | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) return null;

  return data?.role ?? null;
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variabili Supabase admin mancanti.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET() {
  const role = await getCallerRole();

  if (role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("freshers_info_carousel")
      .select("id, is_page_active, home_banner_enabled, created_at, updated_at")
      .eq("type", "settings")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      const { data: created, error: createError } = await supabase
        .from("freshers_info_carousel")
        .insert({
          type: "settings",
          is_page_active: false,
          home_banner_enabled: false,
        })
        .select("id, is_page_active, home_banner_enabled, created_at, updated_at")
        .single();

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        settings: {
          id: created.id,
          isPageActive: Boolean(created.is_page_active),
          homeBannerEnabled: Boolean(created.home_banner_enabled),
          createdAt: created.created_at,
          updatedAt: created.updated_at,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      settings: {
        id: data.id,
        isPageActive: Boolean(data.is_page_active),
        homeBannerEnabled: Boolean(data.home_banner_enabled),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento delle impostazioni matricole.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const role = await getCallerRole();

  if (role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  let body: {
    is_page_active?: unknown;
    home_banner_enabled?: unknown;
    isPageActive?: unknown;
    homeBannerEnabled?: unknown;
  } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const isPageActive =
    typeof body.isPageActive === "boolean"
      ? body.isPageActive
      : typeof body.is_page_active === "boolean"
        ? body.is_page_active
        : null;

  const homeBannerEnabled =
    typeof body.homeBannerEnabled === "boolean"
      ? body.homeBannerEnabled
      : typeof body.home_banner_enabled === "boolean"
        ? body.home_banner_enabled
        : null;

  if (isPageActive === null || homeBannerEnabled === null) {
    return NextResponse.json(
      { error: "Valori impostazioni non validi." },
      { status: 400 }
    );
  }

  try {
    const supabase = getAdminClient();

    const { data: existing, error: existingError } = await supabase
      .from("freshers_info_carousel")
      .select("id")
      .eq("type", "settings")
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (!existing) {
      const { data, error } = await supabase
        .from("freshers_info_carousel")
        .insert({
          type: "settings",
          is_page_active: isPageActive,
          home_banner_enabled: homeBannerEnabled,
        })
        .select("id, is_page_active, home_banner_enabled, created_at, updated_at")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        settings: {
          id: data.id,
          isPageActive: Boolean(data.is_page_active),
          homeBannerEnabled: Boolean(data.home_banner_enabled),
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        message: "Impostazioni matricole salvate correttamente.",
      });
    }

    const { data, error } = await supabase
      .from("freshers_info_carousel")
      .update({
        is_page_active: isPageActive,
        home_banner_enabled: homeBannerEnabled,
      })
      .eq("type", "settings")
      .select("id, is_page_active, home_banner_enabled, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      settings: {
        id: data.id,
        isPageActive: Boolean(data.is_page_active),
        homeBannerEnabled: Boolean(data.home_banner_enabled),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      message: "Impostazioni matricole salvate correttamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante il salvataggio delle impostazioni matricole.",
      },
      { status: 500 }
    );
  }
}