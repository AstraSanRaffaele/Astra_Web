import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isFreshersCourseSlugValid } from "@/lib/matricole/static-data";

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

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableString(value: unknown) {
  const cleaned = cleanString(value);
  return cleaned || null;
}

function cleanNullableDate(value: unknown) {
  const cleaned = cleanString(value);

  if (!cleaned) return null;

  const parsed = new Date(cleaned);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

export async function GET() {
  const role = await getCallerRole();

  if (role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("freshers_course_settings")
      .select("id, course_slug, first_lesson_at, whatsapp_url, created_at, updated_at")
      .order("course_slug", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      courses:
        data?.map((course) => ({
          id: course.id,
          courseSlug: course.course_slug,
          firstLessonAt: course.first_lesson_at,
          whatsappUrl: course.whatsapp_url,
          createdAt: course.created_at,
          updatedAt: course.updated_at,
        })) ?? [],
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

export async function POST(req: NextRequest) {
  const role = await getCallerRole();

  if (role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  let body: {
    course_slug?: unknown;
    courseSlug?: unknown;
    first_lesson_at?: unknown;
    firstLessonAt?: unknown;
    whatsapp_url?: unknown;
    whatsappUrl?: unknown;
  } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const courseSlug = cleanString(body.courseSlug ?? body.course_slug);
  const firstLessonAt = cleanNullableDate(body.firstLessonAt ?? body.first_lesson_at);
  const whatsappUrl = cleanNullableString(body.whatsappUrl ?? body.whatsapp_url);

  if (!courseSlug) {
    return NextResponse.json({ error: "Course slug mancante." }, { status: 400 });
  }

  if (!isFreshersCourseSlugValid(courseSlug)) {
    return NextResponse.json(
      { error: "Il corso indicato non esiste nel file statico." },
      { status: 400 }
    );
  }

  if (firstLessonAt === undefined) {
    return NextResponse.json(
      { error: "Data e ora della prima lezione non valide." },
      { status: 400 }
    );
  }

  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("freshers_course_settings")
      .upsert(
        {
          course_slug: courseSlug,
          first_lesson_at: firstLessonAt,
          whatsapp_url: whatsappUrl,
        },
        {
          onConflict: "course_slug",
        }
      )
      .select("id, course_slug, first_lesson_at, whatsapp_url, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      course: {
        id: data.id,
        courseSlug: data.course_slug,
        firstLessonAt: data.first_lesson_at,
        whatsappUrl: data.whatsapp_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      message: "Impostazioni corso salvate correttamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante il salvataggio delle impostazioni corso.",
      },
      { status: 500 }
    );
  }
}