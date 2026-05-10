// app/api/book-convention/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";

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
  starts_at: string;
  ends_at: string;
};

type BookReceiptProfile = {
  firstName: string;
  lastName: string;
  email: string;
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

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  contanti: "Contanti",
  bonifico: "Bonifico",
  carta: "Carta",
  bonus_cultura: "Bonus cultura",
  carta_del_docente: "Carta del docente",
  bonus_di_merito: "Bonus di merito",
};

const BOOK_YEAR_LABELS: Record<BookYear, string> = {
  primo_anno: "Primo anno",
  secondo_anno: "Secondo anno",
  terzo_anno: "Terzo anno",
};

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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function getUserProfileForReceipt(user: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof getSupabase>>["auth"]["getUser"]>>["data"]["user"]>): BookReceiptProfile {
  const metadata = user.user_metadata ?? {};

  const firstName =
    cleanRequiredString(metadata.nome) ||
    cleanRequiredString(metadata.name) ||
    cleanRequiredString(metadata.first_name) ||
    "";

  const lastName =
    cleanRequiredString(metadata.cognome) ||
    cleanRequiredString(metadata.surname) ||
    cleanRequiredString(metadata.last_name) ||
    "";

  return {
    firstName,
    lastName,
    email: user.email ?? "",
  };
}

function buildBookConventionReceiptHtml(params: {
  profile: BookReceiptProfile;
  fiscalCodeOrVat: string;
  billingShippingAddress: string;
  paymentMethod: PaymentMethod;
  selectedBooks: BookConventionBook[];
  totalPrice: number;
  activeRound: BookConventionRound;
}) {
  const {
    profile,
    fiscalCodeOrVat,
    billingShippingAddress,
    paymentMethod,
    selectedBooks,
    totalPrice,
    activeRound,
  } = params;

  const orderedBooksRows = selectedBooks
    .map((book) => {
      const price = typeof book.price === "number" && Number.isFinite(book.price) ? book.price : 0;

      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(book.title)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(BOOK_YEAR_LABELS[book.reference_year])}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${escapeHtml(formatEuro(price))}</td>
        </tr>
      `;
    })
    .join("");

  const ibanBlock =
    paymentMethod === "bonifico"
      ? `
        <div style="margin-top: 24px; padding: 16px; border-radius: 12px; background: #eef4ff; border: 1px solid #c7d7fe;">
          <h3 style="margin: 0 0 8px; color: #0f2f6e; font-size: 16px;">Coordinate per il bonifico</h3>
          <p style="margin: 0; color: #1f2937;">
            IBAN: <strong>INSERIRE_IBAN_QUI</strong><br />
            Intestatario: <strong>INSERIRE_INTESTATARIO_QUI</strong><br />
            Causale: <strong>Adesione convenzione libri - ${escapeHtml(profile.firstName)} ${escapeHtml(profile.lastName)}</strong>
          </p>
        </div>
      `
      : "";

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #111827; background: #f7f7f7; padding: 24px;">
      <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #0f2f6e; color: #ffffff; padding: 24px;">
          <h1 style="margin: 0; font-size: 22px;">Conferma adesione convenzione libri</h1>
          <p style="margin: 8px 0 0;">La tua adesione è stata registrata correttamente.</p>
        </div>

        <div style="padding: 24px;">
          <h2 style="margin: 0 0 12px; color: #0f2f6e; font-size: 18px;">Dati adesione</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tbody>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; width: 42%;"><strong>Nome</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(profile.firstName || "-")}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Cognome</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(profile.lastName || "-")}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Email</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(profile.email || "-")}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Codice fiscale / Partita IVA</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(fiscalCodeOrVat)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Indirizzo spedizione/fatturazione</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: pre-line;">${escapeHtml(billingShippingAddress)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Metodo di pagamento</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(PAYMENT_METHOD_LABELS[paymentMethod])}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Periodo</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                  ${escapeHtml(new Date(activeRound.starts_at).toLocaleDateString("it-IT"))} - ${escapeHtml(new Date(activeRound.ends_at).toLocaleDateString("it-IT"))}
                </td>
              </tr>
            </tbody>
          </table>

          <h2 style="margin: 0 0 12px; color: #0f2f6e; font-size: 18px;">Libri/promozioni ordinati</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr>
                <th align="left" style="padding: 10px; border-bottom: 2px solid #d1d5db; background: #f9fafb;">Titolo</th>
                <th align="left" style="padding: 10px; border-bottom: 2px solid #d1d5db; background: #f9fafb;">Anno</th>
                <th align="right" style="padding: 10px; border-bottom: 2px solid #d1d5db; background: #f9fafb;">Prezzo</th>
              </tr>
            </thead>
            <tbody>
              ${orderedBooksRows}
              <tr>
                <td colspan="2" style="padding: 12px 10px; text-align: right;"><strong>Totale</strong></td>
                <td style="padding: 12px 10px; text-align: right;"><strong>${escapeHtml(formatEuro(totalPrice))}</strong></td>
              </tr>
            </tbody>
          </table>

          ${ibanBlock}

          <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px;">
            Questa email è una ricevuta riepilogativa automatica dell’adesione alla convenzione libri.
          </p>
        </div>
      </div>
    </div>
  `;
}

async function sendBookConventionReceiptEmail(params: {
  to: string;
  profile: BookReceiptProfile;
  fiscalCodeOrVat: string;
  billingShippingAddress: string;
  paymentMethod: PaymentMethod;
  selectedBooks: BookConventionBook[];
  totalPrice: number;
  activeRound: BookConventionRound;
}) {
  if (!params.to) return;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    console.warn("SMTP non configurato: email ricevuta convenzione libri non inviata.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to: params.to,
    subject: "Conferma adesione convenzione libri ASTRA",
    html: buildBookConventionReceiptHtml({
      profile: params.profile,
      fiscalCodeOrVat: params.fiscalCodeOrVat,
      billingShippingAddress: params.billingShippingAddress,
      paymentMethod: params.paymentMethod,
      selectedBooks: params.selectedBooks,
      totalPrice: params.totalPrice,
      activeRound: params.activeRound,
    }),
  });
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
    .select("id, convention_id, starts_at, ends_at")
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
        .select("id, convention_id, starts_at, ends_at")
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

  const { data: insertedAdhesion, error } = await supabase
    .from("book_convention_adhesions")
    .insert({
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
    })
    .select("id")
    .single();

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

  try {
    const profile = getUserProfileForReceipt(user);

    await sendBookConventionReceiptEmail({
      to: profile.email,
      profile,
      fiscalCodeOrVat,
      billingShippingAddress,
      paymentMethod,
      selectedBooks,
      totalPrice,
      activeRound,
    });
  } catch (mailError) {
    console.error("Errore invio email ricevuta convenzione libri", {
      adhesionId: insertedAdhesion?.id,
      error: mailError instanceof Error ? mailError.message : mailError,
    });
  }

  return NextResponse.json({
    ok: true,
    hasAdhered: true,
    message: "Adesione registrata correttamente. Ti abbiamo inviato una mail di conferma.",
  });
}