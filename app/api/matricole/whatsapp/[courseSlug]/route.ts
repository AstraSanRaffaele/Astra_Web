import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isFreshersCourseSlugValid } from "@/lib/matricole/static-data";

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

async function getCurrentUserId() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

type RouteContext = {
  params: Promise<{
    courseSlug: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { courseSlug } = await context.params;

    if (!courseSlug || !isFreshersCourseSlugValid(courseSlug)) {
      return NextResponse.json(
        { error: "Corso non valido." },
        { status: 404 },
      );
    }

    const userId = await getCurrentUserId();

    if (!userId) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", req.nextUrl.pathname);

      return NextResponse.redirect(loginUrl);
    }

    const supabase = getAdminClient();

    const { data: settings, error: settingsError } = await supabase
      .from("freshers_info_carousel")
      .select("is_page_active")
      .eq("type", "settings")
      .maybeSingle();

    if (settingsError) {
      return NextResponse.json(
        { error: settingsError.message },
        { status: 500 },
      );
    }

    if (!settings?.is_page_active) {
      return NextResponse.json(
        { error: "Pagina matricole non ancora disponibile." },
        { status: 403 },
      );
    }

    const { data: courseSettings, error: courseSettingsError } = await supabase
      .from("freshers_course_settings")
      .select("whatsapp_url")
      .eq("course_slug", courseSlug)
      .maybeSingle();

    if (courseSettingsError) {
      return NextResponse.json(
        { error: courseSettingsError.message },
        { status: 500 },
      );
    }

    const whatsappUrl = courseSettings?.whatsapp_url?.trim();

    if (!whatsappUrl) {
      return NextResponse.json(
        { error: "Link WhatsApp non ancora disponibile." },
        { status: 404 },
      );
    }

    let parsedWhatsappUrl: URL;

    try {
      parsedWhatsappUrl = new URL(whatsappUrl);
    } catch {
      return NextResponse.json(
        { error: "Link WhatsApp non valido." },
        { status: 500 },
      );
    }

    const allowedHosts = new Set([
      "chat.whatsapp.com",
      "wa.me",
      "www.whatsapp.com",
      "whatsapp.com",
    ]);

    if (
      !["https:", "http:"].includes(parsedWhatsappUrl.protocol) ||
      !allowedHosts.has(parsedWhatsappUrl.hostname)
    ) {
      return NextResponse.json(
        { error: "Link WhatsApp non consentito." },
        { status: 500 },
      );
    }

    return NextResponse.redirect(parsedWhatsappUrl);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante l'accesso al gruppo WhatsApp.",
      },
      { status: 500 },
    );
  }
}