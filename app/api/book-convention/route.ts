

// app/api/book-convention/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type PaymentMethod = "contanti" | "bonifico" | "carta";

type BookItem = {
  title: string;
  price: number | null;
};

const PAYMENT_METHODS: PaymentMethod[] = ["contanti", "bonifico", "carta"];

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && PAYMENT_METHODS.includes(value as PaymentMethod);
}

function cleanBookTitles(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function cleanBookItems(value: unknown): BookItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const title = String(record.title ?? "").trim();
      const rawPrice = record.price;

      let price: number | null = null;

      if (typeof rawPrice === "number" && Number.isFinite(rawPrice)) {
        price = rawPrice;
      } else if (typeof rawPrice === "string" && rawPrice.trim()) {
        const parsed = Number(rawPrice.trim().replace(",", "."));
        price = Number.isFinite(parsed) ? parsed : null;
      }

      if (!title) return null;

      return { title, price };
    })
    .filter((item): item is BookItem => Boolean(item));
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

// GET /api/book-convention
// Controlla se l'utente loggato ha già aderito a una convenzione libri.
export async function GET(req: NextRequest) {
  const supabase = await getSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non autenticato." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const conventionIdParam = searchParams.get("convention_id");
  const conventionId = conventionIdParam ? Number(conventionIdParam) : null;

  if (conventionIdParam && (!conventionId || Number.isNaN(conventionId))) {
    return NextResponse.json(
      { error: "Convenzione non valida." },
      { status: 400 }
    );
  }

  let query = supabase
    .from("book_convention_adhesions")
    .select("id, convention_id, payment_method, book_titles, book_items, created_at")
    .eq("user_id", user.id);

  if (conventionId) {
    query = query.eq("convention_id", conventionId);
  }

  const { data, error } = conventionId
    ? await query.maybeSingle()
    : await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    hasAdhered: conventionId ? Boolean(data) : Array.isArray(data) && data.length > 0,
    adhesion: conventionId ? data ?? null : null,
    adhesions: conventionId ? [] : data ?? [],
  });
}

// POST /api/book-convention
// Crea una nuova adesione alla convenzione libri per l'utente loggato.
export async function POST(req: NextRequest) {
  const supabase = await getSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non autenticato." },
      { status: 401 }
    );
  }

  let body: {
    convention_id?: number | string | null;
    payment_method?: unknown;
    book_titles?: unknown;
    book_items?: unknown;
  } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const conventionId = body.convention_id ? Number(body.convention_id) : null;
  const paymentMethod = body.payment_method;
  const bookItems = cleanBookItems(body.book_items);
  const bookTitles = bookItems.length > 0
    ? bookItems.map((book) => book.title)
    : cleanBookTitles(body.book_titles);

  if (!conventionId || Number.isNaN(conventionId)) {
    return NextResponse.json(
      { error: "Convenzione non valida." },
      { status: 400 }
    );
  }

  if (!isPaymentMethod(paymentMethod)) {
    return NextResponse.json(
      { error: "Metodo di pagamento non valido." },
      { status: 400 }
    );
  }

  if (bookTitles.length === 0) {
    return NextResponse.json(
      { error: "Seleziona almeno un libro." },
      { status: 400 }
    );
  }

  const { data: convention, error: conventionError } = await supabase
    .from("convenzioni")
    .select("id, is_book_convention")
    .eq("id", conventionId)
    .maybeSingle();

  if (conventionError) {
    return NextResponse.json(
      { error: conventionError.message },
      { status: 500 }
    );
  }

  if (!convention) {
    return NextResponse.json(
      { error: "Convenzione non trovata." },
      { status: 404 }
    );
  }

  if (!convention.is_book_convention) {
    return NextResponse.json(
      { error: "Questa convenzione non è una convenzione libri." },
      { status: 400 }
    );
  }

  const { data: existingAdhesion, error: existingError } = await supabase
    .from("book_convention_adhesions")
    .select("id")
    .eq("user_id", user.id)
    .eq("convention_id", conventionId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    );
  }

  if (existingAdhesion) {
    return NextResponse.json({
      ok: true,
      hasAdhered: true,
      message: "Hai già aderito a questa convenzione libri.",
    });
  }

  const { error } = await supabase
    .from("book_convention_adhesions")
    .insert({
      user_id: user.id,
      convention_id: conventionId,
      payment_method: paymentMethod,
      book_titles: bookTitles,
      book_items: bookItems,
    });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({
        ok: true,
        hasAdhered: true,
        message: "Hai già aderito a questa convenzione libri.",
      });
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    hasAdhered: true,
    message: "Adesione registrata correttamente.",
  });
}