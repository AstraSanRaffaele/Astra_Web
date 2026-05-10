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

// --- Types and helpers for Book Convention ---
type BookYear = "primo_anno" | "secondo_anno" | "terzo_anno";

type PaymentMethod =
  | "contanti"
  | "bonifico"
  | "carta"
  | "bonus_cultura"
  | "carta_del_docente"
  | "bonus_di_merito";

type IncomingBook = {
  id?: number | string | null;
  title?: unknown;
  price?: unknown;
  reference_year?: unknown;
  description?: unknown;
  sort_order?: unknown;
};

const BOOK_YEARS: BookYear[] = ["primo_anno", "secondo_anno", "terzo_anno"];
const PAYMENT_METHODS: PaymentMethod[] = [
  "contanti",
  "bonifico",
  "carta",
  "bonus_cultura",
  "carta_del_docente",
  "bonus_di_merito",
];

function isBookYear(value: unknown): value is BookYear {
  return typeof value === "string" && BOOK_YEARS.includes(value as BookYear);
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && PAYMENT_METHODS.includes(value as PaymentMethod);
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseNullableInteger(value: unknown) {
  const parsed = parseNullableNumber(value);
  if (parsed === null) return null;
  return Number.isInteger(parsed) ? parsed : Math.trunc(parsed);
}

function normalizeBooks(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const book = (item ?? {}) as IncomingBook;
    const id = book.id ? Number(book.id) : null;
    const title = cleanString(book.title);
    const price = parseNullableNumber(book.price);
    const description = cleanString(book.description);
    const sortOrder = parseNullableInteger(book.sort_order) ?? index;

    if (!title) {
      throw new Error("Ogni libro/promozione deve avere un titolo.");
    }

    if (price === null || price < 0) {
      throw new Error(`Prezzo non valido per: ${title}`);
    }

    if (!isBookYear(book.reference_year)) {
      throw new Error(`Anno di riferimento non valido per: ${title}`);
    }

    return {
      id: id && Number.isInteger(id) && id > 0 ? id : null,
      title,
      price,
      reference_year: book.reference_year,
      description: description || null,
      sort_order: sortOrder,
    };
  });
}

export async function GET(req: NextRequest) {
  const role = await getCallerRole();

  if (role !== "admin") {
    return NextResponse.json(
      { error: "Non autorizzato." },
      { status: 403 }
    );
  }

  try {
    const supabase = getAdminClient();

    const { searchParams } = new URL(req.url);
    const roundId = searchParams.get("round_id");
    const bookIdParam = searchParams.get("book_id");
    const conventionIdParam = searchParams.get("convention_id");
    const bookId = bookIdParam ? Number(bookIdParam) : null;
    const conventionId = conventionIdParam ? Number(conventionIdParam) : null;

    if (bookIdParam && (!bookId || Number.isNaN(bookId))) {
      return NextResponse.json({ error: "Libro/promozione non valido." }, { status: 400 });
    }

    if (conventionIdParam && (!conventionId || Number.isNaN(conventionId))) {
      return NextResponse.json({ error: "Convenzione non valida." }, { status: 400 });
    }

    let conventionsQuery = supabase
      .from("convenzioni")
      .select("id, titolo, partner, categoria, descrizione, is_book_convention")
      .eq("is_book_convention", true)
      .order("id", { ascending: true });

    if (conventionId) {
      conventionsQuery = conventionsQuery.eq("id", conventionId);
    }

    const { data: conventions, error: conventionsError } = await conventionsQuery;

    if (conventionsError) {
      return NextResponse.json({ error: conventionsError.message }, { status: 500 });
    }

    const conventionIds = (conventions ?? []).map((item) => Number(item.id));

    let roundsQuery = supabase
      .from("book_convention_rounds")
      .select(`
        id,
        convention_id,
        starts_at,
        ends_at,
        created_at,
        convenzioni (
          id,
          titolo,
          partner,
          categoria
        )
      `)
      .order("starts_at", { ascending: false });

    let booksQuery = supabase
      .from("book_convention_books")
      .select("id, convention_id, title, price, reference_year, description, sort_order, created_at, updated_at")
      .order("reference_year", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    let adhesionsQuery = supabase
      .from("book_convention_adhesions")
      .select(`
        id,
        user_id,
        convention_id,
        round_id,
        payment_method,
        fiscal_code_or_vat,
        billing_shipping_address,
        selected_book_ids,
        selected_books,
        total_price,
        book_titles,
        book_items,
        created_at,
        profiles (
          id,
          nome,
          cognome,
          email_istituzionale,
          corso_di_laurea,
          anno_di_laurea
        ),
        convenzioni (
          id,
          titolo,
          partner,
          categoria
        ),
        book_convention_rounds (
          id,
          starts_at,
          ends_at,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (conventionIds.length > 0) {
      roundsQuery = roundsQuery.in("convention_id", conventionIds);
      booksQuery = booksQuery.in("convention_id", conventionIds);
      adhesionsQuery = adhesionsQuery.in("convention_id", conventionIds);
    } else {
      return NextResponse.json({
        ok: true,
        conventions: [],
        books: [],
        rounds: [],
        adhesions: [],
        selectedRoundId: roundId ?? null,
        selectedBookId: bookId ?? null,
      });
    }

    if (roundId) {
      adhesionsQuery = adhesionsQuery.eq("round_id", roundId);
    }

    if (bookId) {
      adhesionsQuery = adhesionsQuery.contains("selected_book_ids", [bookId]);
    }

    const [roundsResult, booksResult, adhesionsResult] = await Promise.all([
      roundsQuery,
      booksQuery,
      adhesionsQuery,
    ]);

    if (roundsResult.error) {
      return NextResponse.json({ error: roundsResult.error.message }, { status: 500 });
    }

    if (booksResult.error) {
      return NextResponse.json({ error: booksResult.error.message }, { status: 500 });
    }

    if (adhesionsResult.error) {
      return NextResponse.json({ error: adhesionsResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      conventions: conventions ?? [],
      books: booksResult.data ?? [],
      rounds: roundsResult.data ?? [],
      adhesions: adhesionsResult.data ?? [],
      selectedRoundId: roundId ?? null,
      selectedBookId: bookId ?? null,
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

export async function POST(req: NextRequest) {
  const role = await getCallerRole();

  if (role !== "admin") {
    return NextResponse.json(
      { error: "Non autorizzato." },
      { status: 403 }
    );
  }

  let body: {
    convention_id?: number | string | null;
    title?: unknown;
    description?: unknown;
    partner?: unknown;
    books?: unknown;
  } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const conventionId = body.convention_id ? Number(body.convention_id) : null;
  const title = cleanString(body.title);
  const description = cleanString(body.description);
  const partner = cleanString(body.partner);

  if (body.convention_id && (!conventionId || Number.isNaN(conventionId))) {
    return NextResponse.json({ error: "Convenzione non valida." }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ error: "Inserisci il titolo della convenzione." }, { status: 400 });
  }

  let books;

  try {
    books = normalizeBooks(body.books);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lista libri non valida." },
      { status: 400 }
    );
  }

  try {
    const supabase = getAdminClient();
    let savedConventionId = conventionId;

    if (savedConventionId) {
      const { error: conventionError } = await supabase
        .from("convenzioni")
        .update({
          titolo: title,
          descrizione: description || null,
          partner: partner || null,
          is_book_convention: true,
        })
        .eq("id", savedConventionId);

      if (conventionError) {
        return NextResponse.json({ error: conventionError.message }, { status: 500 });
      }
    } else {
      const { data: createdConvention, error: conventionError } = await supabase
        .from("convenzioni")
        .insert({
          titolo: title,
          descrizione: description || null,
          partner: partner || null,
          categoria: "libri",
          is_book_convention: true,
        })
        .select("id")
        .single();

      if (conventionError) {
        return NextResponse.json({ error: conventionError.message }, { status: 500 });
      }

      savedConventionId = Number(createdConvention.id);
    }

    const existingBookIds = books
      .map((book) => book.id)
      .filter((id): id is number => Boolean(id));

    if (existingBookIds.length > 0) {
      const { error: deleteMissingError } = await supabase
        .from("book_convention_books")
        .delete()
        .eq("convention_id", savedConventionId)
        .not("id", "in", `(${existingBookIds.join(",")})`);

      if (deleteMissingError) {
        return NextResponse.json({ error: deleteMissingError.message }, { status: 500 });
      }
    } else {
      const { error: deleteAllError } = await supabase
        .from("book_convention_books")
        .delete()
        .eq("convention_id", savedConventionId);

      if (deleteAllError) {
        return NextResponse.json({ error: deleteAllError.message }, { status: 500 });
      }
    }

    const booksToUpsert = books.map((book) => ({
      ...(book.id ? { id: book.id } : {}),
      convention_id: savedConventionId,
      title: book.title,
      price: book.price,
      reference_year: book.reference_year,
      description: book.description,
      sort_order: book.sort_order,
      updated_at: new Date().toISOString(),
    }));

    if (booksToUpsert.length > 0) {
      const { error: booksError } = await supabase
        .from("book_convention_books")
        .upsert(booksToUpsert, { onConflict: "id" });

      if (booksError) {
        return NextResponse.json({ error: booksError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      convention_id: savedConventionId,
      message: "Convenzione libri salvata correttamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante il salvataggio della convenzione libri.",
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

  let body: { adhesion_id?: string; book_id?: number | string; convention_id?: number | string } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const bookId = body.book_id ? Number(body.book_id) : null;
  const conventionId = body.convention_id ? Number(body.convention_id) : null;

  if (!body.adhesion_id && !bookId && !conventionId) {
    return NextResponse.json(
      { error: "Richiesta non valida." },
      { status: 400 }
    );
  }

  try {
    const supabase = getAdminClient();

    if (body.adhesion_id) {
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
    }

    if (bookId) {
      const { error } = await supabase
        .from("book_convention_books")
        .delete()
        .eq("id", bookId);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: "Libro/promozione eliminato correttamente.",
      });
    }

    if (conventionId) {
      const { error } = await supabase
        .from("convenzioni")
        .delete()
        .eq("id", conventionId)
        .eq("is_book_convention", true);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: "Convenzione libri eliminata correttamente.",
      });
    }

    return NextResponse.json(
      { error: "Richiesta non valida." },
      { status: 400 }
    );
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