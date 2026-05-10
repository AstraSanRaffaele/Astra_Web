// app/api/book-convention/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type PaymentMethod =
  | "contanti"
  | "bonifico"
  | "carta"
  | "bonus_cultura"
  | "carta_del_docente"
  | "bonus_di_merito";

type BookYear = "primo_anno" | "secondo_anno" | "terzo_anno";

type BookConventionBook = {
  id: number;
  convention_id: number;
  title: string;
  price: number | null;
  reference_year: BookYear;
  description: string | null;
  sort_order: number | null;
};

type BookConventionRound = {
  id: string;
  convention_id: number;
  label: string | null;
  starts_at: string;
  ends_at: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  "contanti",
  "bonifico",
  "carta",
  "bonus_cultura",
  "carta_del_docente",
  "bonus_di_merito",
];

const BOOK_YEARS: BookYear[] = ["primo_anno", "secondo_anno", "terzo_anno"];

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && PAYMENT_METHODS.includes(value as PaymentMethod);
}

function cleanRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanBookIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  );
}

function groupBooksByYear(books: BookConventionBook[]) {
  return BOOK_YEARS.reduce<Record<BookYear, BookConventionBook[]>>(
    (acc, year) => {
      acc[year] = books.filter((book) => book.reference_year === year);
      return acc;
    },
    {
      primo_anno: [],
      secondo_anno: [],
      terzo_anno: [],
    }
  );
}

async function getSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    }
  );
}

async function getActiveRound(supabase: Awaited<ReturnType<typeof getSupabase>>, conventionId: number) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("book_convention_rounds")
    .select("id, convention_id, label, starts_at, ends_at")
    .eq("convention_id", conventionId)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data as BookConventionRound | null;
}

// GET /api/book-convention
// Restituisce la convenzione libri, i periodi disponibili, i libri collegati e l'eventuale adesione dell'utente.
export async function GET(req: NextRequest) {
  const supabase = await getSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conventionIdParam = searchParams.get("convention_id");
  const requestedConventionId = conventionIdParam ? Number(conventionIdParam) : null;

  if (
    conventionIdParam &&
    (!requestedConventionId || Number.isNaN(requestedConventionId))
  ) {
    return NextResponse.json({ error: "Convenzione non valida." }, { status: 400 });
  }

  let conventionQuery = supabase
    .from("convenzioni")
    .select("id, titolo, partner, descrizione, is_book_convention")
    .eq("is_book_convention", true);

  if (requestedConventionId) {
    conventionQuery = conventionQuery.eq("id", requestedConventionId);
  }

  const { data: convention, error: conventionError } = await conventionQuery
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (conventionError) {
    return NextResponse.json({ error: conventionError.message }, { status: 500 });
  }

  if (!convention) {
    return NextResponse.json({ error: "Convenzione libri non trovata." }, { status: 404 });
  }

  const conventionId = Number(convention.id);

  try {
    const [activeRoundResult, roundsResult, booksResult, adhesionResult] = await Promise.all([
      getActiveRound(supabase, conventionId),
      supabase
        .from("book_convention_rounds")
        .select("id, convention_id, label, starts_at, ends_at")
        .eq("convention_id", conventionId)
        .order("starts_at", { ascending: true }),
      supabase
        .from("book_convention_books")
        .select("id, convention_id, title, price, reference_year, description, sort_order")
        .eq("convention_id", conventionId)
        .order("reference_year", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true }),
      supabase
        .from("book_convention_adhesions")
        .select(
          "id, convention_id, round_id, selected_book_ids, selected_books, total_price, fiscal_code_or_vat, billing_shipping_address, payment_method, created_at"
        )
        .eq("user_id", user.id)
        .eq("convention_id", conventionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (roundsResult.error) throw roundsResult.error;
    if (booksResult.error) throw booksResult.error;
    if (adhesionResult.error) throw adhesionResult.error;

    const books = (booksResult.data ?? []) as BookConventionBook[];

    return NextResponse.json({
      ok: true,
      convention,
      activeRound: activeRoundResult,
      rounds: roundsResult.data ?? [],
      books,
      booksByYear: groupBooksByYear(books),
      hasAdhered: Boolean(adhesionResult.data),
      adhesion: adhesionResult.data ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore durante il caricamento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/book-convention
// Crea una nuova adesione alla convenzione libri per l'utente loggato.
export async function POST(req: NextRequest) {
  const supabase = await getSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  let body: {
    convention_id?: number | string | null;
    round_id?: string | null;
    selected_book_ids?: unknown;
    payment_method?: unknown;
    fiscal_code_or_vat?: unknown;
    billing_shipping_address?: unknown;
  } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const conventionId = body.convention_id ? Number(body.convention_id) : null;
  const requestedRoundId = cleanRequiredString(body.round_id);
  const selectedBookIds = cleanBookIds(body.selected_book_ids);
  const paymentMethod = body.payment_method;
  const fiscalCodeOrVat = cleanRequiredString(body.fiscal_code_or_vat).toUpperCase();
  const billingShippingAddress = cleanRequiredString(body.billing_shipping_address);

  if (!conventionId || Number.isNaN(conventionId)) {
    return NextResponse.json({ error: "Convenzione non valida." }, { status: 400 });
  }

  if (selectedBookIds.length === 0) {
    return NextResponse.json({ error: "Seleziona almeno un libro o una promozione." }, { status: 400 });
  }

  if (!fiscalCodeOrVat) {
    return NextResponse.json({ error: "Inserisci codice fiscale o partita IVA." }, { status: 400 });
  }

  if (!billingShippingAddress) {
    return NextResponse.json({ error: "Inserisci indirizzo di spedizione/fatturazione." }, { status: 400 });
  }

  if (!isPaymentMethod(paymentMethod)) {
    return NextResponse.json({ error: "Metodo di pagamento non valido." }, { status: 400 });
  }

  const { data: convention, error: conventionError } = await supabase
    .from("convenzioni")
    .select("id, is_book_convention")
    .eq("id", conventionId)
    .maybeSingle();

  if (conventionError) {
    return NextResponse.json({ error: conventionError.message }, { status: 500 });
  }

  if (!convention) {
    return NextResponse.json({ error: "Convenzione non trovata." }, { status: 404 });
  }

  if (!convention.is_book_convention) {
    return NextResponse.json(
      { error: "Questa convenzione non è una convenzione libri." },
      { status: 400 }
    );
  }

  let activeRound: BookConventionRound | null = null;

  try {
    activeRound = await getActiveRound(supabase, conventionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore durante il controllo del periodo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!activeRound) {
    return NextResponse.json(
      { error: "La convenzione libri non è attiva in questo momento." },
      { status: 400 }
    );
  }

  if (requestedRoundId && requestedRoundId !== activeRound.id) {
    return NextResponse.json(
      { error: "Il periodo selezionato non è attualmente disponibile." },
      { status: 400 }
    );
  }

  const { data: books, error: booksError } = await supabase
    .from("book_convention_books")
    .select("id, convention_id, title, price, reference_year, description, sort_order")
    .eq("convention_id", conventionId)
    .in("id", selectedBookIds);

  if (booksError) {
    return NextResponse.json({ error: booksError.message }, { status: 500 });
  }

  const selectedBooks = (books ?? []) as BookConventionBook[];

  if (selectedBooks.length !== selectedBookIds.length) {
    return NextResponse.json(
      { error: "Uno o più libri selezionati non sono validi." },
      { status: 400 }
    );
  }

  const totalPrice = selectedBooks.reduce((sum, book) => {
    const price = typeof book.price === "number" && Number.isFinite(book.price) ? book.price : 0;
    return sum + price;
  }, 0);

  const { data: existingAdhesion, error: existingError } = await supabase
    .from("book_convention_adhesions")
    .select("id")
    .eq("user_id", user.id)
    .eq("convention_id", conventionId)
    .eq("round_id", activeRound.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existingAdhesion) {
    return NextResponse.json({
      ok: true,
      hasAdhered: true,
      message: "Hai già aderito a questa convenzione libri per il periodo attivo.",
    });
  }

  const { error } = await supabase.from("book_convention_adhesions").insert({
    user_id: user.id,
    convention_id: conventionId,
    round_id: activeRound.id,
    selected_book_ids: selectedBookIds,
    selected_books: selectedBooks.map((book) => ({
      id: book.id,
      title: book.title,
      price: book.price ?? 0,
      reference_year: book.reference_year,
      description: book.description,
    })),
    total_price: totalPrice,
    fiscal_code_or_vat: fiscalCodeOrVat,
    billing_shipping_address: billingShippingAddress,
    payment_method: paymentMethod,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({
        ok: true,
        hasAdhered: true,
        message: "Hai già aderito a questa convenzione libri per il periodo attivo.",
      });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    hasAdhered: true,
    message: "Adesione registrata correttamente.",
  });
}