// app/api/replicarank/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

async function getCurrentUserId() {
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

  return user?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const userId = await getCurrentUserId();

    const { searchParams } = new URL(req.url);
    const editionIdParam = searchParams.get("edition_id");

    let editionQuery = supabase
      .from("replicarank_editions")
      .select("*")
      .eq("is_page_visible", true)
      .order("cohort_year", { ascending: false });

    if (editionIdParam) {
      editionQuery = editionQuery.eq("id", editionIdParam);
    } else {
      editionQuery = editionQuery.eq("is_current", true);
    }

    const { data: editions, error: editionError } = await editionQuery;

    if (editionError) {
      return NextResponse.json({ error: editionError.message }, { status: 500 });
    }

    const edition = editions?.[0] ?? null;

    if (!edition) {
      return NextResponse.json({
        ok: true,
        edition: null,
        subjects: [],
        ranking: [],
        archives: [],
        participant: null,
        isAuthenticated: Boolean(userId),
        canAccessReplicaRank: false,
        profileCohortYear: null,
        message: "Pagina ReplicaRANK non disponibile.",
      });
    }

    const { data: profile, error: profileError } = userId
      ? await supabase
          .from("profiles")
          .select("anno_di_laurea")
          .eq("id", userId)
          .maybeSingle()
      : { data: null, error: null };

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const canAccessReplicaRank =
      Boolean(userId) &&
      Number(profile?.anno_di_laurea) === Number(edition.cohort_year);

    const [
      subjectsResult,
      rankingResult,
      archivesResult,
      participantResult,
    ] = await Promise.all([
      supabase
        .from("replicarank_subjects")
        .select("*")
        .eq("edition_id", edition.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      edition.is_ranking_published
        ? supabase
            .from("replicarank_rankings")
            .select(`
              id,
              edition_id,
              position,
              fake_matricola,
              final_score,
              assigned_group,
              assignment_status,
              is_within_available_places,
              generated_at
            `)
            .eq("edition_id", edition.id)
            .order("position", { ascending: true })
        : Promise.resolve({ data: [], error: null }),

      supabase
        .from("replicarank_editions")
        .select("id, name, slug, cohort_year, archive_pdf_url, is_ranking_published")
        .neq("id", edition.id)
        .not("archive_pdf_url", "is", null)
        .order("cohort_year", { ascending: false }),

      userId
        ? supabase
            .from("replicarank_participants")
            .select(`
              id,
              edition_id,
              user_id,
              fake_matricola,
              nome,
              cognome,
              email_istituzionale,
              numero_telefono,
              data_di_nascita,
              total_cfu,
              weighted_average,
              final_score,
              assigned_group,
              assignment_status,
              registered_at,
              replicarank_participant_subjects (
                id,
                subject_id,
                grade,
                has_honors,
                cfu
              ),
              replicarank_preferences (
                id,
                group_name,
                preference_order
              )
            `)
            .eq("edition_id", edition.id)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (subjectsResult.error) {
      return NextResponse.json({ error: subjectsResult.error.message }, { status: 500 });
    }

    if (rankingResult.error) {
      return NextResponse.json({ error: rankingResult.error.message }, { status: 500 });
    }

    if (archivesResult.error) {
      return NextResponse.json({ error: archivesResult.error.message }, { status: 500 });
    }

    if (participantResult.error) {
      return NextResponse.json({ error: participantResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      edition,
      subjects: subjectsResult.data ?? [],
      ranking: rankingResult.data ?? [],
      archives: archivesResult.data ?? [],
      participant: participantResult.data ?? null,
      isAuthenticated: Boolean(userId),
      canAccessReplicaRank,
      profileCohortYear: profile?.anno_di_laurea ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento di ReplicaRANK.",
      },
      { status: 500 }
    );
  }
}