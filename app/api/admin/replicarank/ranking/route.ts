// app/api/admin/replicarank/ranking/route.ts
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

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

type ParticipantSubject = {
  grade: number;
  cfu: number;
};

type Preference = {
  group_name: string;
  preference_order: number;
};

type Participant = {
  id: string;
  edition_id: string;
  fake_matricola: string;
  data_di_nascita: string;
  intermediate_out_of_course_count: number;
  replicarank_participant_subjects?: ParticipantSubject[];
  replicarank_preferences?: Preference[];
};

function calculateWeightedAverage(subjects: ParticipantSubject[]) {
  const totalCfu = subjects.reduce((sum, item) => sum + Number(item.cfu || 0), 0);

  if (totalCfu <= 0) {
    return {
      totalCfu: 0,
      weightedAverage: 0,
    };
  }

  const weightedSum = subjects.reduce((sum, item) => {
    return sum + Number(item.grade || 0) * Number(item.cfu || 0);
  }, 0);

  return {
    totalCfu,
    weightedAverage: Number((weightedSum / totalCfu).toFixed(2)),
  };
}

function assignGroup(preferences: Preference[] | undefined, fallbackIndex: number) {
  const orderedPreferences = [...(preferences ?? [])].sort(
    (a, b) => a.preference_order - b.preference_order
  );

  if (orderedPreferences.length > 0) {
    return orderedPreferences[0].group_name;
  }

  const automaticGroups = ["Gruppo A", "Gruppo B", "Gruppo C", "Gruppo D"];
  return automaticGroups[fallbackIndex % automaticGroups.length];
}

export async function GET(req: NextRequest) {
  const role = await getCallerRole();

  if (role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(req.url);
    const editionId = searchParams.get("edition_id");

    if (!editionId) {
      return NextResponse.json({ error: "Edizione non valida." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("replicarank_rankings")
      .select(`
        id,
        edition_id,
        participant_id,
        position,
        fake_matricola,
        final_score,
        weighted_average,
        total_cfu,
        assigned_group,
        assignment_status,
        is_within_available_places,
        generated_at
      `)
      .eq("edition_id", editionId)
      .order("position", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      ranking: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento della graduatoria.",
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

  let body: { edition_id?: unknown } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const editionId = cleanString(body.edition_id);

  if (!editionId) {
    return NextResponse.json({ error: "Edizione non valida." }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    const { data: edition, error: editionError } = await supabase
      .from("replicarank_editions")
      .select("id, available_places")
      .eq("id", editionId)
      .single();

    if (editionError || !edition) {
      return NextResponse.json(
        { error: editionError?.message ?? "Edizione non trovata." },
        { status: 404 }
      );
    }

    const { data: participants, error: participantsError } = await supabase
      .from("replicarank_participants")
      .select(`
        id,
        edition_id,
        fake_matricola,
        data_di_nascita,
        intermediate_out_of_course_count,
        replicarank_participant_subjects (
          grade,
          cfu
        ),
        replicarank_preferences (
          group_name,
          preference_order
        )
      `)
      .eq("edition_id", editionId);

    if (participantsError) {
      return NextResponse.json({ error: participantsError.message }, { status: 500 });
    }

    const rows = ((participants ?? []) as Participant[]).map((participant) => {
      const { totalCfu, weightedAverage } = calculateWeightedAverage(
        participant.replicarank_participant_subjects ?? []
      );

      return {
        participant,
        totalCfu,
        weightedAverage,
      };
    });

    // I massimi della formula devono essere calcolati sulla coorte effettiva,
    // cioè sui partecipanti iscritti a questa specifica edizione/graduatoria.
    const cohortWeightedAverages = rows
      .map((row) => row.weightedAverage)
      .filter((value) => Number.isFinite(value) && value > 0);

    const cohortCfuValues = rows
      .map((row) => row.totalCfu)
      .filter((value) => Number.isFinite(value) && value > 0);

    const maxWeightedAverage = cohortWeightedAverages.length > 0
      ? Math.max(...cohortWeightedAverages)
      : 0;

    const maxCfu = cohortCfuValues.length > 0
      ? Math.max(...cohortCfuValues)
      : 0;

    const scoredRows = rows.map((row) => {
      const mediaScore = maxWeightedAverage > 0
        ? (row.weightedAverage * 500) / maxWeightedAverage
        : 0;

      const cfuScore = maxCfu > 0
        ? (row.totalCfu * 500) / maxCfu
        : 0;

      return {
        ...row,
        finalScore: Number((mediaScore + cfuScore).toFixed(2)),
      };
    });

    scoredRows.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      if (b.weightedAverage !== a.weightedAverage) return b.weightedAverage - a.weightedAverage;
      if (b.totalCfu !== a.totalCfu) return b.totalCfu - a.totalCfu;

      const outOfCourseA = a.participant.intermediate_out_of_course_count ?? 0;
      const outOfCourseB = b.participant.intermediate_out_of_course_count ?? 0;

      if (outOfCourseA !== outOfCourseB) return outOfCourseA - outOfCourseB;

      const birthA = new Date(a.participant.data_di_nascita).getTime();
      const birthB = new Date(b.participant.data_di_nascita).getTime();

      return birthB - birthA;
    });

    const availablePlaces = Number(edition.available_places || 250);

    const rankingRows = scoredRows.map((row, index) => {
      const isWithinAvailablePlaces = index < availablePlaces;
      const assignedGroup = isWithinAvailablePlaces
        ? assignGroup(row.participant.replicarank_preferences, index)
        : null;

      const assignmentStatus = isWithinAvailablePlaces ? "assegnato" : "non_assegnato";

      return {
        edition_id: editionId,
        participant_id: row.participant.id,
        position: index + 1,
        fake_matricola: row.participant.fake_matricola,
        final_score: row.finalScore,
        weighted_average: row.weightedAverage,
        total_cfu: row.totalCfu,
        assigned_group: assignedGroup,
        assignment_status: assignmentStatus,
        is_within_available_places: isWithinAvailablePlaces,
        generated_at: new Date().toISOString(),
      };
    });

    for (const row of scoredRows) {
      const index = scoredRows.indexOf(row);
      const rankingRow = rankingRows[index];

      const { error: updateParticipantError } = await supabase
        .from("replicarank_participants")
        .update({
          total_cfu: row.totalCfu,
          weighted_average: row.weightedAverage,
          final_score: row.finalScore,
          assigned_group: rankingRow.assigned_group,
          assignment_status: rankingRow.assignment_status,
        })
        .eq("id", row.participant.id);

      if (updateParticipantError) {
        return NextResponse.json({ error: updateParticipantError.message }, { status: 500 });
      }
    }

    const { error: deleteOldRankingError } = await supabase
      .from("replicarank_rankings")
      .delete()
      .eq("edition_id", editionId);

    if (deleteOldRankingError) {
      return NextResponse.json({ error: deleteOldRankingError.message }, { status: 500 });
    }

    if (rankingRows.length > 0) {
      const { error: insertRankingError } = await supabase
        .from("replicarank_rankings")
        .insert(rankingRows);

      if (insertRankingError) {
        return NextResponse.json({ error: insertRankingError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      ranking: rankingRows,
      message: "Graduatoria ReplicaRANK generata correttamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante la generazione della graduatoria.",
      },
      { status: 500 }
    );
  }
}