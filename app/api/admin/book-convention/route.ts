

// app/api/admin/book-convention/route.ts
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
    return NextResponse.json(
      { error: "Non autorizzato." },
      { status: 403 }
    );
  }

  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("book_convention_adhesions")
      .select(`
        id,
        user_id,
        convention_id,
        payment_method,
        book_titles,
        book_items,
        created_at,
        profiles (
          id,
          nome,
          cognome,
          email,
          corso,
          anno
        ),
        convenzioni (
          id,
          titolo,
          partner,
          categoria
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      adhesions: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento delle adesioni.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const role = await getCallerRole();

  if (role !== "admin") {
    return NextResponse.json(
      { error: "Non autorizzato." },
      { status: 403 }
    );
  }

  let body: { adhesion_id?: string } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!body.adhesion_id) {
    return NextResponse.json(
      { error: "Adesione non valida." },
      { status: 400 }
    );
  }

  try {
    const supabase = getAdminClient();

    const { error } = await supabase
      .from("book_convention_adhesions")
      .delete()
      .eq("id", body.adhesion_id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Adesione eliminata correttamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante l'eliminazione.",
      },
      { status: 500 }
    );
  }
}