// app/api/admin/replicarank/route.ts
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

function parseBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function parsePositiveInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
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

    const editionsQuery = supabase
      .from("replicarank_editions")
      .select("*")
      .order("cohort_year", { ascending: false });

    const { data: editions, error: editionsError } = await editionsQuery;

    if (editionsError) {
      return NextResponse.json({ error: editionsError.message }, { status: 500 });
    }

    const selectedEdition =
      editionId
        ? editions?.find((edition) => edition.id === editionId)
        : editions?.find((edition) => edition.is_current) ?? editions?.[0];

    let participants: unknown[] = [];

    if (selectedEdition?.id) {
      const { data, error } = await supabase
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
          intermediate_out_of_course_count,
          total_cfu,
          weighted_average,
          final_score,
          assigned_group,
          assignment_status,
          registered_at,
          created_at,
          updated_at
        `)
        .eq("edition_id", selectedEdition.id)
        .order("registered_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      participants = data ?? [];
    }

    return NextResponse.json({
      ok: true,
      editions: editions ?? [],
      selectedEdition: selectedEdition ?? null,
      participants,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento ReplicaRANK.",
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
    name?: unknown;
    slug?: unknown;
    cohort_year?: unknown;
    available_places?: unknown;
    is_current?: unknown;
    is_page_visible?: unknown;
    are_registrations_open?: unknown;
    is_ranking_published?: unknown;
    archive_pdf_url?: unknown;
    copy_subjects_from_edition_id?: unknown;
  } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const name = cleanString(body.name);
  const slug = cleanString(body.slug);
  const cohortYear = parsePositiveInteger(body.cohort_year);
  const availablePlaces = parsePositiveInteger(body.available_places) ?? 250;
  const copySubjectsFromEditionId = cleanString(body.copy_subjects_from_edition_id);

  if (!name) {
    return NextResponse.json({ error: "Inserisci il nome dell'edizione." }, { status: 400 });
  }

  if (!slug) {
    return NextResponse.json({ error: "Inserisci lo slug dell'edizione." }, { status: 400 });
  }

  if (!cohortYear) {
    return NextResponse.json({ error: "Anno/coorte non valido." }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    const isCurrent = parseBoolean(body.is_current) ?? false;

    if (isCurrent) {
      const { error: resetCurrentError } = await supabase
        .from("replicarank_editions")
        .update({ is_current: false })
        .eq("is_current", true);

      if (resetCurrentError) {
        return NextResponse.json({ error: resetCurrentError.message }, { status: 500 });
      }
    }

    const { data, error } = await supabase
      .from("replicarank_editions")
      .insert({
        name,
        slug,
        cohort_year: cohortYear,
        available_places: availablePlaces,
        is_current: isCurrent,
        is_page_visible: parseBoolean(body.is_page_visible) ?? false,
        are_registrations_open: parseBoolean(body.are_registrations_open) ?? false,
        is_ranking_published: parseBoolean(body.is_ranking_published) ?? false,
        archive_pdf_url: cleanString(body.archive_pdf_url) || null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let copiedSubjectsCount = 0;

    if (copySubjectsFromEditionId && data?.id) {
      const { data: subjectsToCopy, error: subjectsToCopyError } = await supabase
        .from("replicarank_subjects")
        .select("*")
        .eq("edition_id", copySubjectsFromEditionId)
        .order("sort_order", { ascending: true });

      if (subjectsToCopyError) {
        return NextResponse.json({ error: subjectsToCopyError.message }, { status: 500 });
      }

      if (subjectsToCopy?.length) {
        const copiedSubjects = subjectsToCopy.map((subject) => {
          const {
            id: _id,
            edition_id: _editionId,
            created_at: _createdAt,
            updated_at: _updatedAt,
            ...subjectData
          } = subject;

          return {
            ...subjectData,
            edition_id: data.id,
          };
        });

        const { error: copySubjectsError } = await supabase
          .from("replicarank_subjects")
          .insert(copiedSubjects);

        if (copySubjectsError) {
          return NextResponse.json({ error: copySubjectsError.message }, { status: 500 });
        }

        copiedSubjectsCount = copiedSubjects.length;
      }
    }

    return NextResponse.json({
      ok: true,
      edition: data,
      copiedSubjectsCount,
      message:
        copiedSubjectsCount > 0
          ? `Edizione ReplicaRANK creata correttamente. Copiati ${copiedSubjectsCount} esami dall’edizione precedente.`
          : "Edizione ReplicaRANK creata correttamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante la creazione dell'edizione.",
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

  let body: Record<string, unknown> = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const editionId = cleanString(body.id);

  if (!editionId) {
    return NextResponse.json({ error: "Edizione non valida." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if ("name" in body) updates.name = cleanString(body.name);
  if ("slug" in body) updates.slug = cleanString(body.slug);
  if ("cohort_year" in body) {
    const cohortYear = parsePositiveInteger(body.cohort_year);
    if (!cohortYear) return NextResponse.json({ error: "Anno/coorte non valido." }, { status: 400 });
    updates.cohort_year = cohortYear;
  }
  if ("available_places" in body) {
    const availablePlaces = parsePositiveInteger(body.available_places);
    if (!availablePlaces) return NextResponse.json({ error: "Numero posti non valido." }, { status: 400 });
    updates.available_places = availablePlaces;
  }
  if ("is_page_visible" in body) updates.is_page_visible = parseBoolean(body.is_page_visible) ?? false;
  if ("are_registrations_open" in body) updates.are_registrations_open = parseBoolean(body.are_registrations_open) ?? false;
  if ("is_ranking_published" in body) updates.is_ranking_published = parseBoolean(body.is_ranking_published) ?? false;
  if ("archive_pdf_url" in body) updates.archive_pdf_url = cleanString(body.archive_pdf_url) || null;

  const wantsCurrent = parseBoolean(body.is_current);

  try {
    const supabase = getAdminClient();

    if (wantsCurrent === true) {
      const { error: resetCurrentError } = await supabase
        .from("replicarank_editions")
        .update({ is_current: false })
        .eq("is_current", true);

      if (resetCurrentError) {
        return NextResponse.json({ error: resetCurrentError.message }, { status: 500 });
      }

      updates.is_current = true;
    } else if (wantsCurrent === false) {
      updates.is_current = false;
    }

    const { data, error } = await supabase
      .from("replicarank_editions")
      .update(updates)
      .eq("id", editionId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      edition: data,
      message: "Edizione ReplicaRANK aggiornata correttamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante l'aggiornamento dell'edizione.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const role = await getCallerRole();

  if (role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  let body: { id?: unknown } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const editionId = cleanString(body.id);

  if (!editionId) {
    return NextResponse.json({ error: "Edizione non valida." }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    const { error } = await supabase
      .from("replicarank_editions")
      .delete()
      .eq("id", editionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Edizione ReplicaRANK eliminata correttamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante l'eliminazione dell'edizione.",
      },
      { status: 500 }
    );
  }
}
