import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type AreaName = "Chirurgia" | "Clinica" | "Ricerca";

type ParticipantRow = {
  id: string;
  edition_id: string;
  fake_matricola: string;
  total_cfu: number | null;
  weighted_average: number | null;
  final_score: number | null;
  intermediate_out_of_course_count: number | null;
  data_di_nascita: string | null;
  assigned_group: string | null;
  assignment_status: string | null;
};

type PreferenceRow = {
  participant_id: string;
  group_name: string;
  preference_order: number;
};

type RankedParticipant = ParticipantRow & {
  calculated_score: number;
};

const AREA_CAPACITY: Record<AreaName, number> = {
  Chirurgia: 250,
  Clinica: 250,
  Ricerca: 250,
};

const VALID_AREAS = Object.keys(AREA_CAPACITY) as AreaName[];

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

function parseNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function isValidArea(value: string): value is AreaName {
  return VALID_AREAS.includes(value as AreaName);
}

function compareParticipants(a: RankedParticipant, b: RankedParticipant) {
  const scoreDiff = b.calculated_score - a.calculated_score;
  if (scoreDiff !== 0) return scoreDiff;

  const averageDiff = parseNumber(b.weighted_average) - parseNumber(a.weighted_average);
  if (averageDiff !== 0) return averageDiff;

  const cfuDiff = parseNumber(b.total_cfu) - parseNumber(a.total_cfu);
  if (cfuDiff !== 0) return cfuDiff;

  const aBirth = a.data_di_nascita ? new Date(a.data_di_nascita).getTime() : 0;
  const bBirth = b.data_di_nascita ? new Date(b.data_di_nascita).getTime() : 0;

  return bBirth - aBirth;
}

function buildPreferenceMap(preferences: PreferenceRow[]) {
  const map = new Map<string, AreaName[]>();

  for (const preference of preferences) {
    if (!isValidArea(preference.group_name)) continue;

    const current = map.get(preference.participant_id) ?? [];
    current.push(preference.group_name);
    map.set(preference.participant_id, current);
  }

  for (const [participantId, values] of map.entries()) {
    const ordered = preferences
      .filter((preference) => preference.participant_id === participantId)
      .filter((preference) => isValidArea(preference.group_name))
      .sort((a, b) => a.preference_order - b.preference_order)
      .map((preference) => preference.group_name as AreaName);

    map.set(participantId, ordered);
  }

  return map;
}

export async function GET(req: NextRequest) {
  const role = await getCallerRole();

  if (role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const editionId = searchParams.get("edition_id");

    if (!editionId) {
      return NextResponse.json({ error: "Edizione mancante." }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("replicarank_rankings")
      .select(
        "id, edition_id, participant_id, position, fake_matricola, final_score, weighted_average, total_cfu, assigned_group, assignment_status, is_within_available_places, generated_at"
      )
      .eq("edition_id", editionId)
      .order("position", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ranking = data ?? [];

    const areaStats = VALID_AREAS.map((area) => {
      const assigned = ranking.filter((row) => row.assigned_group === area);
      const minimumScore = assigned.length >= AREA_CAPACITY[area]
        ? Math.min(...assigned.map((row) => parseNumber(row.final_score)))
        : null;

      return {
        area,
        assigned_count: assigned.length,
        capacity: AREA_CAPACITY[area],
        remaining_places: Math.max(AREA_CAPACITY[area] - assigned.length, 0),
        minimum_score: minimumScore,
      };
    });

    return NextResponse.json({
      ok: true,
      ranking,
      areaStats,
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

  let body: { edition_id?: string } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!body.edition_id) {
    return NextResponse.json({ error: "Edizione mancante." }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    const { data: participants, error: participantsError } = await supabase
      .from("replicarank_participants")
      .select(
        "id, edition_id, fake_matricola, total_cfu, weighted_average, final_score, intermediate_out_of_course_count, data_di_nascita, assigned_group, assignment_status"
      )
      .eq("edition_id", body.edition_id);

    if (participantsError) {
      return NextResponse.json({ error: participantsError.message }, { status: 500 });
    }

    if (!participants || participants.length === 0) {
      await supabase
        .from("replicarank_rankings")
        .delete()
        .eq("edition_id", body.edition_id);

      return NextResponse.json({
        ok: true,
        ranking: [],
        areaStats: VALID_AREAS.map((area) => ({
          area,
          assigned_count: 0,
          capacity: AREA_CAPACITY[area],
          remaining_places: AREA_CAPACITY[area],
          minimum_score: null,
        })),
        message: "Nessun partecipante da inserire in graduatoria.",
      });
    }

    const participantIds = participants.map((participant) => participant.id);

    const { data: preferences, error: preferencesError } = await supabase
      .from("replicarank_preferences")
      .select("participant_id, group_name, preference_order")
      .in("participant_id", participantIds)
      .order("preference_order", { ascending: true });

    if (preferencesError) {
      return NextResponse.json({ error: preferencesError.message }, { status: 500 });
    }

    const maxAverage = Math.max(
      ...participants.map((participant) => parseNumber(participant.weighted_average)),
      0
    );

    const maxCfu = Math.max(
      ...participants.map((participant) => parseNumber(participant.total_cfu)),
      0
    );

    const rankedParticipants: RankedParticipant[] = (participants as ParticipantRow[])
      .map((participant) => {
        const average = parseNumber(participant.weighted_average);
        const cfu = parseNumber(participant.total_cfu);

        const averageScore = maxAverage > 0 ? (average * 500) / maxAverage : 0;
        const cfuScore = maxCfu > 0 ? (cfu * 500) / maxCfu : 0;

        return {
          ...participant,
          calculated_score: Number((averageScore + cfuScore).toFixed(4)),
        };
      })
      .sort(compareParticipants);

    const preferenceMap = buildPreferenceMap((preferences ?? []) as PreferenceRow[]);

    const areaCounts: Record<AreaName, number> = {
      Chirurgia: 0,
      Clinica: 0,
      Ricerca: 0,
    };

    const now = new Date().toISOString();

    const generatedRows = rankedParticipants.map((participant, index) => {
      const orderedPreferences = preferenceMap.get(participant.id) ?? [];
      let assignedGroup: AreaName | null = null;

      for (const area of orderedPreferences) {
        if (areaCounts[area] < AREA_CAPACITY[area]) {
          assignedGroup = area;
          areaCounts[area] += 1;
          break;
        }
      }

      const assignmentStatus = assignedGroup ? "assegnato" : "non_assegnato";

      return {
        edition_id: body.edition_id!,
        participant_id: participant.id,
        position: index + 1,
        fake_matricola: participant.fake_matricola,
        final_score: participant.calculated_score,
        weighted_average: parseNumber(participant.weighted_average),
        total_cfu: parseNumber(participant.total_cfu),
        assigned_group: assignedGroup,
        assignment_status: assignmentStatus,
        is_within_available_places: Boolean(assignedGroup),
        generated_at: now,
      };
    });

    const { error: deleteError } = await supabase
      .from("replicarank_rankings")
      .delete()
      .eq("edition_id", body.edition_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const { error: insertError } = await supabase
      .from("replicarank_rankings")
      .insert(generatedRows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    for (const row of generatedRows) {
      const { error: updateParticipantError } = await supabase
        .from("replicarank_participants")
        .update({
          final_score: row.final_score,
          assigned_group: row.assigned_group,
          assignment_status: row.assignment_status,
          updated_at: now,
        })
        .eq("id", row.participant_id);

      if (updateParticipantError) {
        return NextResponse.json(
          { error: updateParticipantError.message },
          { status: 500 }
        );
      }
    }

    const areaStats = VALID_AREAS.map((area) => {
      const assigned = generatedRows.filter((row) => row.assigned_group === area);
      const minimumScore = assigned.length >= AREA_CAPACITY[area]
        ? Math.min(...assigned.map((row) => row.final_score))
        : null;

      return {
        area,
        assigned_count: assigned.length,
        capacity: AREA_CAPACITY[area],
        remaining_places: Math.max(AREA_CAPACITY[area] - assigned.length, 0),
        minimum_score: minimumScore,
      };
    });

    return NextResponse.json({
      ok: true,
      ranking: generatedRows,
      areaStats,
      message: "Graduatoria generata correttamente con assegnazione per preferenze.",
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