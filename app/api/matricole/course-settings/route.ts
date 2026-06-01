import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function GET() {
  try {
    const supabase = getAdminClient();

    const { data: settings, error: settingsError } = await supabase
      .from("freshers_info_carousel")
      .select("is_page_active")
      .eq("type", "settings")
      .maybeSingle();

    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    if (!settings?.is_page_active) {
      return NextResponse.json({
        ok: true,
        courses: [],
        message: "Pagina matricole non ancora disponibile.",
      });
    }

    const { data, error } = await supabase
      .from("freshers_course_settings")
      .select(
        `
        course_slug,
        first_lesson_at
      `
      )
      .order("course_slug", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const courses =
      data?.map((course) => ({
        courseSlug: course.course_slug,
        firstLessonAt: course.first_lesson_at,
      })) ?? [];

    return NextResponse.json({
      ok: true,
      courses,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento delle impostazioni corsi matricole.",
      },
      { status: 500 }
    );
  }
}