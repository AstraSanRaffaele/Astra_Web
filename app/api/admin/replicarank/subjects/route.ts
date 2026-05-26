// app/api/admin/replicarank/subjects/route.ts
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

function parsePositiveDecimal(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().replace(/,/g, ".") : value;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
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

    if (!editionId) {
      return NextResponse.json({ error: "Edizione non valida." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("replicarank_subjects")
      .select("*")
      .eq("edition_id", editionId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      subjects: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento degli esami.",
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

  let body: Record<string, unknown> = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const editionId = cleanString(body.edition_id);
  const name = cleanString(body.name);
  const cfu = parsePositiveDecimal(body.cfu);
  const sortOrder = parseInteger(body.sort_order) ?? 0;

  if (!editionId) {
    return NextResponse.json({ error: "Edizione non valida." }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "Inserisci il nome dell'esame." }, { status: 400 });
  }

  if (!cfu) {
    return NextResponse.json({ error: "CFU non validi." }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("replicarank_subjects")
      .insert({
        edition_id: editionId,
        name,
        cfu,
        year_label: cleanString(body.year_label) || null,
        semester_label: cleanString(body.semester_label) || null,
        category: cleanString(body.category) || null,
        sort_order: sortOrder,
        is_eligibility: Boolean(body.is_eligibility),
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      subject: data,
      message: "Esame creato correttamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante la creazione dell'esame.",
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

  const subjectId = cleanString(body.id);

  if (!subjectId) {
    return NextResponse.json({ error: "Esame non valido." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if ("name" in body) {
    const name = cleanString(body.name);
    if (!name) return NextResponse.json({ error: "Nome esame non valido." }, { status: 400 });
    updates.name = name;
  }

  if ("cfu" in body) {
    const cfu = parsePositiveDecimal(body.cfu);
    if (!cfu) return NextResponse.json({ error: "CFU non validi." }, { status: 400 });
    updates.cfu = cfu;
  }

  if ("year_label" in body) updates.year_label = cleanString(body.year_label) || null;
  if ("semester_label" in body) updates.semester_label = cleanString(body.semester_label) || null;
  if ("category" in body) updates.category = cleanString(body.category) || null;
  if ("sort_order" in body) updates.sort_order = parseInteger(body.sort_order) ?? 0;
  if ("is_eligibility" in body) updates.is_eligibility = Boolean(body.is_eligibility);

  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("replicarank_subjects")
      .update(updates)
      .eq("id", subjectId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      subject: data,
      message: "Esame aggiornato correttamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante l'aggiornamento dell'esame.",
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

  const subjectId = cleanString(body.id);

  if (!subjectId) {
    return NextResponse.json({ error: "Esame non valido." }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    const { error } = await supabase
      .from("replicarank_subjects")
      .delete()
      .eq("id", subjectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Esame eliminato correttamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante l'eliminazione dell'esame.",
      },
      { status: 500 }
    );
  }
}