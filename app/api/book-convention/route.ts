// app/api/book-convention/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";
import {
  BOOK_CONVENTION_BANK_DETAILS,
  BOOK_YEAR_LABELS,
  BOOK_YEARS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPES,
  STUDY_AREAS,
  normalizeBookConventionCoverUrl,
  type BookConventionBook,
  type BookConventionCatalogBook,
  type BookConventionRound,
  type BookYear,
  type PaymentMethod,
  type ProductType,
  type StudyArea,
} from "@/lib/book-convention";

type BookReceiptProfile = {
  firstName: string;
  lastName: string;
  email: string;
};

type BookProfileRow = {
  nome: string | null;
  cognome: string | null;
  email_istituzionale: string | null;
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

function isBookYear(value: unknown): value is BookYear {
  return typeof value === "string" && BOOK_YEARS.includes(value as BookYear);
}

function isProductType(value: unknown): value is ProductType {
  return typeof value === "string" && PRODUCT_TYPES.includes(value as ProductType);
}

function isStudyArea(value: unknown): value is StudyArea {
  return typeof value === "string" && STUDY_AREAS.includes(value as StudyArea);
}

function normalizeBundleItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanRequiredString(item))
    .filter(Boolean);
}

function parseDatabasePrice(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeBookRow(value: unknown): BookConventionBook | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  const id = Number(row.id);
  const conventionId = Number(row.convention_id);
  const title = cleanRequiredString(row.title);

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !Number.isInteger(conventionId) ||
    conventionId <= 0 ||
    !title ||
    !isBookYear(row.reference_year) ||
    !isProductType(row.product_type) ||
    !isStudyArea(row.study_area)
  ) {
    return null;
  }

  const sortOrder = Number(row.sort_order);

  return {
    id,
    convention_id: conventionId,
    title,
    price: parseDatabasePrice(row.price),
    reference_year: row.reference_year,
    description: cleanRequiredString(row.description) || null,
    sort_order: Number.isInteger(sortOrder) ? sortOrder : null,
    product_type: row.product_type,
    bundle_items: normalizeBundleItems(row.bundle_items),
    study_area: row.study_area,
    is_active: row.is_active === true,
    cover_image: normalizeBookConventionCoverUrl(row.cover_image),
  };
}

function priceToCents(price: number) {
  return Math.round((price + Number.EPSILON) * 100);
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

function groupBooksByArea(books: BookConventionCatalogBook[]) {
  return STUDY_AREAS.reduce<Record<StudyArea, Record<BookYear, BookConventionCatalogBook[]>>>(
    (areas, area) => {
      areas[area] = BOOK_YEARS.reduce<Record<BookYear, BookConventionCatalogBook[]>>(
        (years, year) => {
          years[year] = books.filter(
            (book) => book.study_area === area && book.reference_year === year
          );
          return years;
        },
        { primo_anno: [], secondo_anno: [], terzo_anno: [] }
      );
      return areas;
    },
    {
      medicina_chirurgia: { primo_anno: [], secondo_anno: [], terzo_anno: [] },
      odontoiatria_igiene_dentale: {
        primo_anno: [],
        secondo_anno: [],
        terzo_anno: [],
      },
      professioni_sanitarie: { primo_anno: [], secondo_anno: [], terzo_anno: [] },
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

function getUserProfileForReceipt(
  user: User,
  profile: BookProfileRow | null
): BookReceiptProfile {
  const metadata = user.user_metadata ?? {};

  const firstName =
    cleanRequiredString(profile?.nome) ||
    cleanRequiredString(metadata.nome) ||
    cleanRequiredString(metadata.name) ||
    cleanRequiredString(metadata.first_name) ||
    "";

  const lastName =
    cleanRequiredString(profile?.cognome) ||
    cleanRequiredString(metadata.cognome) ||
    cleanRequiredString(metadata.surname) ||
    cleanRequiredString(metadata.last_name) ||
    "";

  return {
    firstName,
    lastName,
    email: cleanRequiredString(profile?.email_istituzionale) || user.email || "",
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
      const bundleContents =
        book.product_type === "bundle" && book.bundle_items.length > 0
          ? `<div style="margin-top: 4px; color: #6b7280; font-size: 12px;">Include: ${escapeHtml(book.bundle_items.join(", "))}</div>`
          : "";

      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
            <strong>${escapeHtml(book.title)}</strong>
            ${bundleContents}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(PRODUCT_TYPE_LABELS[book.product_type])}</td>
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
            IBAN: <strong>${escapeHtml(BOOK_CONVENTION_BANK_DETAILS.bank)} – IBAN ${escapeHtml(BOOK_CONVENTION_BANK_DETAILS.iban)}</strong><br />
            Intestatario: <strong>${escapeHtml(BOOK_CONVENTION_BANK_DETAILS.accountHolder)}</strong><br />
            Causale: <strong>Adesione convenzione libri - ${escapeHtml(profile.firstName)} ${escapeHtml(profile.lastName)}</strong>
          </p>
        </div>
      `
      : "";

  const roundStart = new Date(activeRound.starts_at).toLocaleDateString("it-IT");
  const roundEnd = new Date(activeRound.ends_at).toLocaleDateString("it-IT");

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
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(`${roundStart} – ${roundEnd}`)}</td>
              </tr>
            </tbody>
          </table>

          <h2 style="margin: 0 0 12px; color: #0f2f6e; font-size: 18px;">Libri/promozioni ordinati</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr>
                <th align="left" style="padding: 10px; border-bottom: 2px solid #d1d5db; background: #f9fafb;">Titolo</th>
                <th align="left" style="padding: 10px; border-bottom: 2px solid #d1d5db; background: #f9fafb;">Tipo</th>
                <th align="left" style="padding: 10px; border-bottom: 2px solid #d1d5db; background: #f9fafb;">Anno</th>
                <th align="right" style="padding: 10px; border-bottom: 2px solid #d1d5db; background: #f9fafb;">Prezzo</th>
              </tr>
            </thead>
            <tbody>
              ${orderedBooksRows}
              <tr>
                <td colspan="3" style="padding: 12px 10px; text-align: right;"><strong>Totale</strong></td>
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
  if (!params.to) return false;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    console.warn("SMTP non configurato: email ricevuta convenzione libri non inviata.");
    return false;
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

  return true;
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

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configurazione Supabase server mancante.");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function getActiveRound(supabase: SupabaseClient, conventionId: number) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("book_convention_rounds")
    .select("id, convention_id, starts_at, ends_at")
    .eq("convention_id", conventionId)
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data as BookConventionRound | null;
}

function privateJson(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

function logRouteError(context: string, error: unknown) {
  console.error(context, error instanceof Error ? error.message : error);
}

// GET /api/book-convention
// Restituisce la convenzione libri, i periodi disponibili, i libri collegati e l'eventuale adesione dell'utente.
export async function GET(req: NextRequest) {
  const authClient = await getSupabase();

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return privateJson({ error: "Non autenticato." }, 401);
  }

  const { searchParams } = req.nextUrl;
  const conventionIdParam = searchParams.get("convention_id");
  const requestedConventionId = conventionIdParam ? Number(conventionIdParam) : null;

  if (
    conventionIdParam &&
    (!requestedConventionId ||
      !Number.isInteger(requestedConventionId) ||
      requestedConventionId <= 0)
  ) {
    return privateJson({ error: "Convenzione non valida." }, 400);
  }

  try {
    const serviceClient = getServiceClient();
    let conventionQuery = serviceClient
      .from("convenzioni")
      .select("id, titolo, partner, descrizione, attiva, is_book_convention")
      .eq("is_book_convention", true);

    if (requestedConventionId) {
      conventionQuery = conventionQuery.eq("id", requestedConventionId);
    }

    const { data: convention, error: conventionError } = await conventionQuery
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (conventionError) throw conventionError;

    if (!convention) {
      return privateJson({ error: "Convenzione libri non trovata." }, 404);
    }

    const conventionId = Number(convention.id);
    const activeRound = await getActiveRound(serviceClient, conventionId);
    const adhesionFields =
      "id, convention_id, round_id, selected_book_ids, selected_books, total_price, fiscal_code_or_vat, billing_shipping_address, payment_method, created_at";

    const [roundsResult, booksResult, adhesionsResult, profileResult] = await Promise.all([
      serviceClient
        .from("book_convention_rounds")
        .select("id, convention_id, starts_at, ends_at")
        .eq("convention_id", conventionId)
        .order("starts_at", { ascending: true }),
      serviceClient
        .from("book_convention_books")
        .select(
          "id, convention_id, title, price, reference_year, description, sort_order, product_type, bundle_items, study_area, is_active, cover_image"
        )
        .eq("convention_id", conventionId)
        .eq("is_active", true)
        .order("study_area", { ascending: true })
        .order("reference_year", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true }),
      serviceClient
        .from("book_convention_adhesions")
        .select(adhesionFields)
        .eq("user_id", user.id)
        .eq("convention_id", conventionId)
        .order("created_at", { ascending: false })
        .limit(50),
      serviceClient
        .from("profiles")
        .select("nome, cognome, email_istituzionale")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (roundsResult.error) throw roundsResult.error;
    if (booksResult.error) throw booksResult.error;
    if (adhesionsResult.error) throw adhesionsResult.error;
    if (profileResult.error) throw profileResult.error;

    const availableBookIds = new Set<number>();
    const conventionIsActive = convention.attiva === true;

    if (conventionIsActive && activeRound) {
      const { data: links, error: linksError } = await serviceClient
        .from("book_convention_book_rounds")
        .select("book_id")
        .eq("convention_id", conventionId)
        .eq("round_id", activeRound.id);

      if (linksError) throw linksError;

      for (const link of links ?? []) {
        const bookId = Number(link.book_id);
        if (Number.isInteger(bookId) && bookId > 0) availableBookIds.add(bookId);
      }
    }

    const normalizedBooks = (booksResult.data ?? [])
      .map((book) => normalizeBookRow(book))
      .filter((book): book is BookConventionBook => book !== null);

    const catalogBooks: BookConventionCatalogBook[] = normalizedBooks.map((book) => {
      let availabilityReason: BookConventionCatalogBook["availability_reason"] = null;

      if (!conventionIsActive) availabilityReason = "convention_inactive";
      else if (!activeRound) availabilityReason = "round_inactive";
      else if (!availableBookIds.has(book.id)) availabilityReason = "not_in_round";
      else if (book.price === null) availabilityReason = "price_unavailable";

      return {
        ...book,
        is_available: availabilityReason === null,
        availability_reason: availabilityReason,
      };
    });

    // Compatibilità con la modale esistente: `books` contiene solo elementi selezionabili.
    const selectableBooks = catalogBooks.filter((book) => book.is_available);
    const adhesions = adhesionsResult.data ?? [];
    const activeAdhesion = activeRound
      ? adhesions.find((adhesion) => adhesion.round_id === activeRound.id) ?? null
      : null;
    const latestAdhesion = adhesions[0] ?? null;
    const receiptProfile = getUserProfileForReceipt(
      user,
      (profileResult.data as BookProfileRow | null) ?? null
    );

    return privateJson({
      ok: true,
      convention,
      activeRound,
      rounds: roundsResult.data ?? [],
      canAdhere:
        conventionIsActive && Boolean(activeRound) && selectableBooks.length > 0,
      books: selectableBooks,
      booksByYear: groupBooksByYear(selectableBooks),
      catalogBooks,
      catalogByArea: groupBooksByArea(catalogBooks),
      studyAreas: STUDY_AREAS,
      hasAdhered: Boolean(activeAdhesion),
      adhesion: activeAdhesion ?? latestAdhesion,
      activeAdhesion,
      latestAdhesion,
      profile: {
        firstName: receiptProfile.firstName,
        lastName: receiptProfile.lastName,
        email: receiptProfile.email,
      },
    });
  } catch (error) {
    logRouteError("Errore caricamento convenzione libri", error);
    return privateJson(
      { error: "Non è stato possibile caricare la convenzione libri." },
      500
    );
  }
}

// POST /api/book-convention
// Crea una nuova adesione alla convenzione libri per l'utente loggato.
export async function POST(req: NextRequest) {
  const authClient = await getSupabase();

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return privateJson({ error: "Non autenticato." }, 401);
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
  const fiscalCodeOrVat = cleanRequiredString(body.fiscal_code_or_vat)
    .toUpperCase()
    .replace(/\s+/g, "");
  const billingShippingAddress = cleanRequiredString(body.billing_shipping_address);

  if (!conventionId || !Number.isInteger(conventionId) || conventionId <= 0) {
    return privateJson({ error: "Convenzione non valida." }, 400);
  }

  if (selectedBookIds.length === 0) {
    return privateJson({ error: "Seleziona almeno un libro o un bundle." }, 400);
  }

  if (selectedBookIds.length > 50) {
    return privateJson({ error: "Hai selezionato troppi elementi." }, 400);
  }

  if (!/^[A-Z0-9]{11,20}$/.test(fiscalCodeOrVat)) {
    return privateJson({ error: "Inserisci un codice fiscale o una partita IVA validi." }, 400);
  }

  if (billingShippingAddress.length < 8 || billingShippingAddress.length > 1000) {
    return privateJson(
      { error: "Inserisci un indirizzo di spedizione/fatturazione completo." },
      400
    );
  }

  if (!isPaymentMethod(paymentMethod)) {
    return privateJson({ error: "Metodo di pagamento non valido." }, 400);
  }

  try {
    const serviceClient = getServiceClient();
    const { data: convention, error: conventionError } = await serviceClient
      .from("convenzioni")
      .select("id, attiva, is_book_convention")
      .eq("id", conventionId)
      .maybeSingle();

    if (conventionError) throw conventionError;

    if (!convention) {
      return privateJson({ error: "Convenzione non trovata." }, 404);
    }

    if (!convention.is_book_convention) {
      return privateJson(
        { error: "Questa convenzione non è una convenzione libri." },
        400
      );
    }

    if (convention.attiva !== true) {
      return privateJson({ error: "La convenzione libri è chiusa." }, 409);
    }

    const activeRound = await getActiveRound(serviceClient, conventionId);

    if (!activeRound) {
      return privateJson(
        { error: "La convenzione libri non è attiva in questo momento." },
        409
      );
    }

    if (requestedRoundId && requestedRoundId !== activeRound.id) {
      return privateJson(
        { error: "Il periodo selezionato non è attualmente disponibile." },
        409
      );
    }

    const [booksResult, linksResult] = await Promise.all([
      serviceClient
        .from("book_convention_books")
        .select(
          "id, convention_id, title, price, reference_year, description, sort_order, product_type, bundle_items, study_area, is_active, cover_image"
        )
        .eq("convention_id", conventionId)
        .eq("is_active", true)
        .in("id", selectedBookIds),
      serviceClient
        .from("book_convention_book_rounds")
        .select("book_id")
        .eq("convention_id", conventionId)
        .eq("round_id", activeRound.id)
        .in("book_id", selectedBookIds),
    ]);

    if (booksResult.error) throw booksResult.error;
    if (linksResult.error) throw linksResult.error;

    const normalizedBooks = (booksResult.data ?? [])
      .map((book) => normalizeBookRow(book))
      .filter((book): book is BookConventionBook => book !== null);
    const booksById = new Map(normalizedBooks.map((book) => [book.id, book]));
    const selectedBooks = selectedBookIds
      .map((bookId) => booksById.get(bookId))
      .filter((book): book is BookConventionBook => Boolean(book));
    const linkedBookIds = new Set(
      (linksResult.data ?? [])
        .map((link) => Number(link.book_id))
        .filter((bookId) => Number.isInteger(bookId) && bookId > 0)
    );

    if (
      selectedBooks.length !== selectedBookIds.length ||
      selectedBookIds.some((bookId) => !linkedBookIds.has(bookId))
    ) {
      return privateJson(
        { error: "Uno o più elementi selezionati non sono disponibili nel periodo attivo." },
        409
      );
    }

    if (selectedBooks.some((book) => book.price === null)) {
      return privateJson(
        { error: "Uno o più elementi selezionati non hanno un prezzo valido." },
        409
      );
    }

    const totalPriceInCents = selectedBooks.reduce(
      (sum, book) => sum + priceToCents(book.price ?? 0),
      0
    );
    const totalPrice = totalPriceInCents / 100;

    const { data: existingAdhesion, error: existingError } = await serviceClient
      .from("book_convention_adhesions")
      .select("id")
      .eq("user_id", user.id)
      .eq("convention_id", conventionId)
      .eq("round_id", activeRound.id)
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingAdhesion) {
      return privateJson({
        ok: true,
        hasAdhered: true,
        adhesionId: existingAdhesion.id,
        message: "Hai già aderito a questa convenzione libri per la raccolta attiva.",
      });
    }

    const latestActiveRound = await getActiveRound(serviceClient, conventionId);

    if (!latestActiveRound || latestActiveRound.id !== activeRound.id) {
      return privateJson(
        { error: "La raccolta ordini è stata chiusa. Aggiorna la pagina prima di riprovare." },
        409
      );
    }

    const { data: insertedAdhesion, error: insertError } = await serviceClient
      .from("book_convention_adhesions")
      .insert({
        user_id: user.id,
        convention_id: conventionId,
        round_id: activeRound.id,
        selected_book_ids: selectedBooks.map((book) => book.id),
        selected_books: selectedBooks.map((book) => ({
          id: book.id,
          title: book.title,
          price: book.price,
          reference_year: book.reference_year,
          description: book.description,
          product_type: book.product_type,
          bundle_items: book.bundle_items,
          study_area: book.study_area,
          cover_image: book.cover_image,
        })),
        total_price: totalPrice,
        fiscal_code_or_vat: fiscalCodeOrVat,
        billing_shipping_address: billingShippingAddress,
        payment_method: paymentMethod,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return privateJson({
          ok: true,
          hasAdhered: true,
          message: "Hai già aderito a questa convenzione libri per la raccolta attiva.",
        });
      }

      throw insertError;
    }

    let emailSent = false;

    try {
      const { data: profileData, error: profileError } = await serviceClient
        .from("profiles")
        .select("nome, cognome, email_istituzionale")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const profile = getUserProfileForReceipt(
        user,
        (profileData as BookProfileRow | null) ?? null
      );

      emailSent = await sendBookConventionReceiptEmail({
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
      logRouteError(
        `Errore invio email ricevuta convenzione libri (${insertedAdhesion.id})`,
        mailError
      );
    }

    return privateJson({
      ok: true,
      hasAdhered: true,
      adhesionId: insertedAdhesion.id,
      emailSent,
      message: emailSent
        ? "Adesione registrata correttamente. Ti abbiamo inviato una mail di conferma."
        : "Adesione registrata correttamente. La mail di conferma non è al momento disponibile.",
    });
  } catch (error) {
    logRouteError("Errore registrazione adesione convenzione libri", error);
    return privateJson(
      { error: "Non è stato possibile registrare l’adesione. Riprova tra poco." },
      500
    );
  }
}
