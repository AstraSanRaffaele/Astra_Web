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
  BOOK_YEARS_BY_STUDY_AREA,
  BOOK_YEAR_LABELS,
  BOOK_YEARS,
  DELIVERY_MODE_LABELS,
  DELIVERY_MODES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPES,
  STUDY_AREAS,
  normalizeBookBundleItems,
  normalizeBookConventionCoverUrl,
  normalizeBookYears,
  type BookConventionAdhesion,
  type BookConventionBook,
  type BookConventionCatalogBook,
  type BookConventionRound,
  type BookConventionSummary,
  type BookYear,
  type DeliveryMode,
  type PaymentMethod,
  type ProductType,
  type SelectedBookSnapshot,
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function hasOnlyValidUniqueBookIds(value: unknown) {
  if (!Array.isArray(value)) return false;

  const parsedIds: number[] = [];

  for (const item of value) {
    if (
      !(
        typeof item === "number" ||
        (typeof item === "string" && item.trim().length > 0)
      )
    ) {
      return false;
    }

    const parsedId = Number(item);
    if (!Number.isInteger(parsedId) || parsedId <= 0) return false;
    parsedIds.push(parsedId);
  }

  return new Set(parsedIds).size === parsedIds.length;
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

function isDeliveryMode(value: unknown): value is DeliveryMode {
  return (
    typeof value === "string" && DELIVERY_MODES.includes(value as DeliveryMode)
  );
}

function parseDatabasePrice(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && !value.trim())
  ) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeIsbn(value: unknown) {
  const isbn = cleanRequiredString(value)
    .toUpperCase()
    .replace(/[\s-]/g, "");

  return /^(?:[0-9]{13}|[0-9]{9}[0-9X])$/.test(isbn) ? isbn : null;
}

function normalizeConventionRow(value: unknown): BookConventionSummary | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  const id = Number(row.id);
  const titolo = cleanRequiredString(row.titolo);
  const ordine = Number(row.ordine);

  if (!Number.isInteger(id) || id <= 0 || !titolo) return null;

  return {
    id,
    titolo,
    descrizione: cleanRequiredString(row.descrizione) || null,
    attiva: row.attiva === true,
    ordine: Number.isInteger(ordine) ? ordine : 0,
  };
}

function normalizeRoundRow(value: unknown): BookConventionRound | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  const id = cleanRequiredString(row.id);
  const conventionId = Number(row.convention_id);
  const startsAt = cleanRequiredString(row.starts_at);
  const endsAt = cleanRequiredString(row.ends_at);

  if (
    !id ||
    !Number.isInteger(conventionId) ||
    conventionId <= 0 ||
    !startsAt ||
    !endsAt ||
    !isDeliveryMode(row.delivery_mode)
  ) {
    return null;
  }

  return {
    id,
    convention_id: conventionId,
    starts_at: startsAt,
    ends_at: endsAt,
    delivery_mode: row.delivery_mode,
  };
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
  const price = parseDatabasePrice(row.price);
  const originalPrice = parseDatabasePrice(row.original_price);
  const referenceYear = row.reference_year as BookYear;
  const studyArea = row.study_area as StudyArea;
  const referenceYears = normalizeBookYears(
    row.reference_years,
    referenceYear
  );
  const hasInvalidStoredYears =
    row.reference_years !== undefined &&
    row.reference_years !== null &&
    (!Array.isArray(row.reference_years) ||
      row.reference_years.length !== referenceYears.length);

  if (
    hasInvalidStoredYears ||
    referenceYears.length === 0 ||
    referenceYears.some(
      (year) =>
        !(BOOK_YEARS_BY_STUDY_AREA[studyArea] as readonly BookYear[]).includes(year)
    )
  ) {
    return null;
  }

  return {
    id,
    convention_id: conventionId,
    title,
    price,
    reference_year: referenceYear,
    reference_years: referenceYears,
    description: cleanRequiredString(row.description) || null,
    sort_order: Number.isInteger(sortOrder) ? sortOrder : null,
    product_type: row.product_type,
    bundle_items: normalizeBookBundleItems(row.bundle_items),
    study_area: studyArea,
    is_active: row.is_active === true,
    cover_image: normalizeBookConventionCoverUrl(row.cover_image),
    isbn: normalizeIsbn(row.isbn),
    original_price:
      originalPrice !== null && (price === null || originalPrice >= price)
        ? originalPrice
        : null,
  };
}

function normalizeSelectedBookSnapshot(
  value: unknown
): SelectedBookSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const row = value as Record<string, unknown>;
  const id = Number(row.id);
  const title = cleanRequiredString(row.title);
  const price = parseDatabasePrice(row.price);
  const originalPrice = parseDatabasePrice(row.original_price);

  return {
    id: Number.isInteger(id) && id > 0 ? id : undefined,
    title: title || undefined,
    price,
    reference_year: isBookYear(row.reference_year)
      ? row.reference_year
      : undefined,
    reference_years: normalizeBookYears(
      row.reference_years,
      isBookYear(row.reference_year) ? row.reference_year : null
    ),
    description: cleanRequiredString(row.description) || null,
    product_type: isProductType(row.product_type)
      ? row.product_type
      : undefined,
    bundle_items: normalizeBookBundleItems(row.bundle_items),
    study_area: isStudyArea(row.study_area) ? row.study_area : undefined,
    cover_image: normalizeBookConventionCoverUrl(row.cover_image),
    isbn: normalizeIsbn(row.isbn),
    original_price:
      originalPrice !== null && (price === null || originalPrice >= price)
        ? originalPrice
        : null,
  };
}

function normalizeAdhesionRow(value: unknown): BookConventionAdhesion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const row = value as Record<string, unknown>;
  const id = cleanRequiredString(row.id);
  const conventionId = Number(row.convention_id);
  const createdAt = cleanRequiredString(row.created_at);

  if (
    !id ||
    !Number.isInteger(conventionId) ||
    conventionId <= 0 ||
    !createdAt
  ) {
    return null;
  }

  const selectedBookIds = Array.isArray(row.selected_book_ids)
    ? cleanBookIds(row.selected_book_ids)
    : null;
  const selectedBooks = Array.isArray(row.selected_books)
    ? row.selected_books
        .map((book) => normalizeSelectedBookSnapshot(book))
        .filter((book): book is SelectedBookSnapshot => book !== null)
    : null;

  return {
    id,
    convention_id: conventionId,
    round_id: cleanRequiredString(row.round_id) || null,
    selected_year: isBookYear(row.selected_year)
      ? row.selected_year
      : selectedBooks?.[0]?.reference_year ?? BOOK_YEARS[0],
    selected_book_ids: selectedBookIds,
    selected_books: selectedBooks,
    total_price: parseDatabasePrice(row.total_price),
    fiscal_code_or_vat: cleanRequiredString(row.fiscal_code_or_vat) || null,
    billing_shipping_address:
      cleanRequiredString(row.billing_shipping_address) || null,
    payment_method: cleanRequiredString(row.payment_method) || null,
    created_at: createdAt,
  };
}

function priceToCents(price: number) {
  return Math.round((price + Number.EPSILON) * 100);
}

function groupBooksByYear(books: BookConventionBook[]) {
  return BOOK_YEARS.reduce<Record<BookYear, BookConventionBook[]>>(
    (acc, year) => {
      acc[year] = books.filter((book) => book.reference_years.includes(year));
      return acc;
    },
    {
      primo_anno: [],
      secondo_anno: [],
      terzo_anno: [],
      quarto_anno: [],
      quinto_anno: [],
      sesto_anno: [],
    }
  );
}

function groupBooksByArea(books: BookConventionCatalogBook[]) {
  return STUDY_AREAS.reduce<Record<StudyArea, Record<BookYear, BookConventionCatalogBook[]>>>(
    (areas, area) => {
      areas[area] = BOOK_YEARS.reduce<Record<BookYear, BookConventionCatalogBook[]>>(
        (years, year) => {
          years[year] = books.filter(
            (book) => book.study_area === area && book.reference_years.includes(year)
          );
          return years;
        },
        {
          primo_anno: [],
          secondo_anno: [],
          terzo_anno: [],
          quarto_anno: [],
          quinto_anno: [],
          sesto_anno: [],
        }
      );
      return areas;
    },
    {
      medicina_chirurgia: {
        primo_anno: [],
        secondo_anno: [],
        terzo_anno: [],
        quarto_anno: [],
        quinto_anno: [],
        sesto_anno: [],
      },
      odontoiatria_igiene_dentale: {
        primo_anno: [],
        secondo_anno: [],
        terzo_anno: [],
        quarto_anno: [],
        quinto_anno: [],
        sesto_anno: [],
      },
      professioni_sanitarie: {
        primo_anno: [],
        secondo_anno: [],
        terzo_anno: [],
        quarto_anno: [],
        quinto_anno: [],
        sesto_anno: [],
      },
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
  billingShippingAddress: string | null;
  paymentMethod: PaymentMethod;
  selectedBooks: BookConventionBook[];
  totalPrice: number;
  activeRounds: BookConventionRound[];
}) {
  const {
    profile,
    fiscalCodeOrVat,
    billingShippingAddress,
    paymentMethod,
    selectedBooks,
    totalPrice,
    activeRounds,
  } = params;

  const originalTotalInCents = selectedBooks.reduce((sum, book) => {
    const conventionPrice = book.price ?? 0;
    const originalPrice = book.original_price;

    return (
      sum +
      priceToCents(
        typeof originalPrice === "number" && originalPrice >= conventionPrice
          ? originalPrice
          : conventionPrice
      )
    );
  }, 0);
  const totalSavings =
    Math.max(0, originalTotalInCents - priceToCents(totalPrice)) / 100;

  const orderedBooksRows = selectedBooks
    .map((book) => {
      const price =
        typeof book.price === "number" && Number.isFinite(book.price)
          ? book.price
          : 0;
      const originalPrice =
        typeof book.original_price === "number" &&
        Number.isFinite(book.original_price)
          ? book.original_price
          : null;
      const saving =
        originalPrice !== null && originalPrice > price
          ? originalPrice - price
          : 0;
      const bundleContents =
        book.product_type === "bundle" && book.bundle_items.length > 0
          ? `<div style="margin-top: 6px; color: #6b7280; font-size: 12px;">
              <strong>Include:</strong>
              <ul style="margin: 4px 0 0; padding-left: 18px;">
                ${book.bundle_items
                  .map(
                    (item) =>
                      `<li>${escapeHtml(item.title)}${
                        item.isbn
                          ? ` <span style="color: #8a909d;">(ISBN ${escapeHtml(item.isbn)})</span>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : "";
      const isbn = book.isbn
        ? `<div style="margin-top: 4px; color: #6b7280; font-size: 12px;">${
            book.product_type === "bundle" ? "ISBN generale bundle" : "ISBN"
          } ${escapeHtml(book.isbn)}</div>`
        : "";
      const savingLabel =
        saving > 0
          ? `<div style="margin-top: 3px; color: #16794b; font-size: 11px; font-weight: 600;">Risparmio ${escapeHtml(formatEuro(saving))}</div>`
          : "";

      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
            <strong>${escapeHtml(book.title)}</strong>
            ${isbn}
            ${bundleContents}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
            ${escapeHtml(PRODUCT_TYPE_LABELS[book.product_type])}<br />
            <span style="color: #6b7280; font-size: 12px;">${escapeHtml(BOOK_YEAR_LABELS[book.reference_year])}</span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">
            ${originalPrice === null ? "—" : `<span style="text-decoration: ${saving > 0 ? "line-through" : "none"};">${escapeHtml(formatEuro(originalPrice))}</span>`}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <strong>${escapeHtml(formatEuro(price))}</strong>
            ${savingLabel}
          </td>
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
            Banca: <strong>${escapeHtml(BOOK_CONVENTION_BANK_DETAILS.bank)}</strong><br />
            IBAN: <strong>${escapeHtml(BOOK_CONVENTION_BANK_DETAILS.iban)}</strong><br />
            Intestatario: <strong>${escapeHtml(BOOK_CONVENTION_BANK_DETAILS.accountHolder)}</strong><br />
            Causale: <strong>Adesione convenzione libri - ${escapeHtml(profile.firstName)} ${escapeHtml(profile.lastName)}</strong>
          </p>
        </div>
      `
      : "";

  const deliveryModes = Array.from(
    new Set(activeRounds.map((round) => round.delivery_mode))
  );
  const deliveryLabel =
    deliveryModes.length === 1
      ? DELIVERY_MODE_LABELS[deliveryModes[0]]
      : "Consegna in università e a domicilio";
  const deliveryAddressRow =
    deliveryModes.includes("home")
      ? `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Indirizzo di consegna</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: pre-line;">${escapeHtml(billingShippingAddress || "-")}</td>
              </tr>
        `
      : "";
  const roundLabel =
    activeRounds.length === 1
      ? `Aperta dal ${new Date(activeRounds[0].starts_at).toLocaleDateString("it-IT")}`
      : `${activeRounds.length} raccolte attive`;
  const savingsTotalRow =
    totalSavings > 0
      ? `
              <tr>
                <td colspan="3" style="padding: 8px 10px; text-align: right; color: #16794b;"><strong>Risparmio totale</strong></td>
                <td style="padding: 8px 10px; text-align: right; color: #16794b;"><strong>${escapeHtml(formatEuro(totalSavings))}</strong></td>
              </tr>
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
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Modalità di consegna</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(deliveryLabel)}</td>
              </tr>
              ${deliveryAddressRow}
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Metodo di pagamento</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(PAYMENT_METHOD_LABELS[paymentMethod])}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Raccolta</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(roundLabel)}</td>
              </tr>
            </tbody>
          </table>

          <h2 style="margin: 0 0 12px; color: #0f2f6e; font-size: 18px;">Libri/promozioni ordinati</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr>
                <th align="left" style="padding: 10px; border-bottom: 2px solid #d1d5db; background: #f9fafb;">Titolo</th>
                <th align="left" style="padding: 10px; border-bottom: 2px solid #d1d5db; background: #f9fafb;">Tipologia</th>
                <th align="right" style="padding: 10px; border-bottom: 2px solid #d1d5db; background: #f9fafb;">Originale</th>
                <th align="right" style="padding: 10px; border-bottom: 2px solid #d1d5db; background: #f9fafb;">Convenzione</th>
              </tr>
            </thead>
            <tbody>
              ${orderedBooksRows}
              <tr>
                <td colspan="3" style="padding: 12px 10px; text-align: right;"><strong>Totale</strong></td>
                <td style="padding: 12px 10px; text-align: right;"><strong>${escapeHtml(formatEuro(totalPrice))}</strong></td>
              </tr>
              ${savingsTotalRow}
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
  billingShippingAddress: string | null;
  paymentMethod: PaymentMethod;
  selectedBooks: BookConventionBook[];
  totalPrice: number;
  activeRounds: BookConventionRound[];
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
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
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
      activeRounds: params.activeRounds,
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
    .select("id, convention_id, starts_at, ends_at, delivery_mode")
    .eq("convention_id", conventionId)
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  const round = normalizeRoundRow(data);
  if (!round) {
    throw new Error("Configurazione della raccolta libri non valida.");
  }

  return round;
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
// Restituisce la convenzione libri, le raccolte disponibili, i libri collegati e l'eventuale adesione dell'utente.
export async function GET() {
  const authClient = await getSupabase();

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return privateJson({ error: "Non autenticato." }, 401);
  }

  try {
    const serviceClient = getServiceClient();
    const { data: conventionRows, error: conventionError } = await serviceClient
      .from("book_conventions")
      .select("id, titolo, descrizione, attiva, ordine")
      .eq("attiva", true)
      .order("ordine", { ascending: true })
      .order("id", { ascending: true })
      .limit(100);

    if (conventionError) throw conventionError;

    const conventions = (conventionRows ?? [])
      .map((item) => normalizeConventionRow(item))
      .filter(
        (item): item is BookConventionSummary => item !== null
      );
    const convention = conventions[0] ?? null;

    if (!convention) {
      return privateJson({ error: "Convenzione libri non trovata." }, 404);
    }

    const conventionIds = conventions.map((item) => item.id);
    const adhesionFields =
      "id, convention_id, round_id, selected_year, selected_book_ids, selected_books, total_price, fiscal_code_or_vat, billing_shipping_address, payment_method, created_at";

    const [roundsResult, booksResult, adhesionsResult, profileResult] = await Promise.all([
      serviceClient
        .from("book_convention_rounds")
        .select("id, convention_id, starts_at, ends_at, delivery_mode")
        .in("convention_id", conventionIds)
        .order("starts_at", { ascending: true }),
      serviceClient
        .from("book_convention_books")
        .select(
          "id, convention_id, title, price, original_price, isbn, reference_year, reference_years, description, sort_order, product_type, bundle_items, study_area, is_active, cover_image"
        )
        .in("convention_id", conventionIds)
        .eq("is_active", true)
        .order("study_area", { ascending: true })
        .order("reference_year", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true }),
      serviceClient
        .from("book_convention_adhesions")
        .select(adhesionFields)
        .eq("user_id", user.id)
        .in("convention_id", conventionIds)
        .order("created_at", { ascending: false })
        .limit(200),
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

    const rounds = (roundsResult.data ?? []).map((round) => {
      const normalizedRound = normalizeRoundRow(round);
      if (!normalizedRound) {
        throw new Error("Configurazione di una raccolta libri non valida.");
      }
      return normalizedRound;
    });

    const now = Date.now();
    const activeRoundsByConvention = new Map<number, BookConventionRound>();

    for (const round of rounds) {
      const startsAt = new Date(round.starts_at).getTime();
      const endsAt = new Date(round.ends_at).getTime();
      if (!(startsAt <= now && now < endsAt)) continue;

      const current = activeRoundsByConvention.get(round.convention_id);
      if (
        !current ||
        new Date(current.starts_at).getTime() < startsAt
      ) {
        activeRoundsByConvention.set(round.convention_id, round);
      }
    }

    const activeRounds = Array.from(activeRoundsByConvention.values()).sort(
      (first, second) =>
        new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime()
    );
    const activeRoundIds = activeRounds.map((round) => round.id);
    const linkedBookRoundKeys = new Set<string>();

    if (activeRoundIds.length > 0) {
      const { data: links, error: linksError } = await serviceClient
        .from("book_convention_book_rounds")
        .select("book_id, round_id, convention_id")
        .in("convention_id", conventionIds)
        .in("round_id", activeRoundIds);

      if (linksError) throw linksError;

      for (const link of links ?? []) {
        const bookId = Number(link.book_id);
        const roundId = cleanRequiredString(link.round_id);
        if (Number.isInteger(bookId) && bookId > 0 && roundId) {
          linkedBookRoundKeys.add(`${roundId}:${bookId}`);
        }
      }
    }

    const adhesions = (adhesionsResult.data ?? [])
      .map((adhesion) => normalizeAdhesionRow(adhesion))
      .filter(
        (adhesion): adhesion is BookConventionAdhesion => adhesion !== null
      );
    const activeAdhesions = adhesions.filter((adhesion) => {
      const activeRound = activeRoundsByConvention.get(adhesion.convention_id);
      return Boolean(activeRound && adhesion.round_id === activeRound.id);
    });
    const adheredYearsByRound = new Map<string, Set<BookYear>>();

    for (const adhesion of activeAdhesions) {
      if (!adhesion.round_id) continue;
      const adheredYears = adheredYearsByRound.get(adhesion.round_id) ?? new Set<BookYear>();
      adheredYears.add(adhesion.selected_year);
      adheredYearsByRound.set(adhesion.round_id, adheredYears);
    }

    const normalizedBooks = (booksResult.data ?? [])
      .map((book) => normalizeBookRow(book))
      .filter((book): book is BookConventionBook => book !== null)
      .filter((book) =>
        book.reference_years.every((year) =>
          (BOOK_YEARS_BY_STUDY_AREA[book.study_area] as readonly BookYear[]).includes(
            year
          )
        )
      );

    const catalogBooks: BookConventionCatalogBook[] = normalizedBooks.map((book) => {
      let availabilityReason: BookConventionCatalogBook["availability_reason"] = null;
      const activeRound = activeRoundsByConvention.get(book.convention_id) ?? null;
      const adheredYears = activeRound
        ? Array.from(adheredYearsByRound.get(activeRound.id) ?? []).filter((year) =>
            book.reference_years.includes(year)
          )
        : [];

      if (!activeRound) availabilityReason = "round_inactive";
      else if (!linkedBookRoundKeys.has(`${activeRound.id}:${book.id}`)) {
        availabilityReason = "not_in_round";
      }
      else if (book.price === null) availabilityReason = "price_unavailable";
      else if (adheredYears.length === book.reference_years.length) {
        availabilityReason = "already_adhered";
      }

      return {
        ...book,
        is_available: availabilityReason === null,
        availability_reason: availabilityReason,
        adhered_years: normalizeBookYears(adheredYears),
        active_round_id: activeRound?.id ?? null,
        delivery_mode: activeRound?.delivery_mode ?? null,
      };
    });

    // Compatibilità con la modale esistente: `books` contiene solo elementi selezionabili.
    const selectableBooks = catalogBooks.filter(
      (book) =>
        book.is_available &&
        book.reference_years.some((year) => !book.adhered_years.includes(year))
    );
    const activeAdhesion = activeAdhesions[0] ?? null;
    const latestAdhesion = adhesions[0] ?? null;
    const receiptProfile = getUserProfileForReceipt(
      user,
      (profileResult.data as BookProfileRow | null) ?? null
    );

    return privateJson({
      ok: true,
      convention,
      conventions,
      activeRound: activeRounds[0] ?? null,
      activeRounds,
      rounds,
      canAdhere: selectableBooks.length > 0,
      books: selectableBooks,
      booksByYear: groupBooksByYear(selectableBooks),
      catalogBooks,
      catalogByArea: groupBooksByArea(catalogBooks),
      studyAreas: STUDY_AREAS,
      hasAdhered: Boolean(activeAdhesion),
      adhesion: activeAdhesion ?? latestAdhesion,
      activeAdhesion,
      activeAdhesions,
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

type GroupedAdhesionInput = {
  conventionId: number;
  roundId: string;
  selectedYear: BookYear;
  bookIds: number[];
};

async function submitGroupedAdhesions(params: {
  serviceClient: SupabaseClient;
  user: User;
  submissions: unknown[];
  paymentMethod: PaymentMethod;
  fiscalCodeOrVat: string;
  billingShippingAddress: string;
}) {
  const {
    serviceClient,
    user,
    submissions,
    paymentMethod,
    fiscalCodeOrVat,
    billingShippingAddress,
  } = params;

  if (submissions.length === 0 || submissions.length > 50) {
    return privateJson({ error: "Selezione delle raccolte non valida." }, 400);
  }

  const normalizedGroups: GroupedAdhesionInput[] = [];

  for (const rawSubmission of submissions) {
    if (
      !rawSubmission ||
      typeof rawSubmission !== "object" ||
      Array.isArray(rawSubmission)
    ) {
      return privateJson({ error: "Selezione delle raccolte non valida." }, 400);
    }

    const row = rawSubmission as Record<string, unknown>;
    const rawConventionId = row.convention_id;
    if (
      !(
        typeof rawConventionId === "number" ||
        (typeof rawConventionId === "string" && rawConventionId.trim().length > 0)
      )
    ) {
      return privateJson({ error: "Convenzione non valida." }, 400);
    }

    const conventionId = Number(rawConventionId);
    const roundId = cleanRequiredString(row.round_id);
    const selectedYear = row.selected_year;

    if (!hasOnlyValidUniqueBookIds(row.selected_book_ids)) {
      return privateJson({ error: "Selezione delle proposte non valida." }, 400);
    }

    const bookIds = cleanBookIds(row.selected_book_ids);

    if (!Number.isInteger(conventionId) || conventionId <= 0) {
      return privateJson({ error: "Convenzione non valida." }, 400);
    }

    if (!UUID_PATTERN.test(roundId)) {
      return privateJson({ error: "Raccolta non valida." }, 400);
    }

    if (!isBookYear(selectedYear)) {
      return privateJson({ error: "Anno di corso non valido." }, 400);
    }

    if (bookIds.length === 0) {
      return privateJson({ error: "Seleziona almeno una proposta." }, 400);
    }

    normalizedGroups.push({ conventionId, roundId, selectedYear, bookIds });
  }

  const groupKeys = normalizedGroups.map(
    (group) => `${group.conventionId}:${group.roundId}:${group.selectedYear}`
  );
  if (new Set(groupKeys).size !== groupKeys.length) {
    return privateJson({ error: "La stessa raccolta è presente più di una volta." }, 400);
  }

  const selectedBookIds = normalizedGroups.flatMap((group) => group.bookIds);
  if (selectedBookIds.length > 50) {
    return privateJson({ error: "La selezione contiene troppe proposte." }, 400);
  }
  const uniqueSelectedBookIds = Array.from(new Set(selectedBookIds));

  const conventionIds = Array.from(
    new Set(normalizedGroups.map((group) => group.conventionId))
  );
  const { data: conventionRows, error: conventionsError } = await serviceClient
    .from("book_conventions")
    .select("id, attiva")
    .in("id", conventionIds);

  if (conventionsError) throw conventionsError;

  const activeConventionIds = new Set(
    (conventionRows ?? [])
      .filter((convention) => convention.attiva === true)
      .map((convention) => Number(convention.id))
  );
  if (conventionIds.some((conventionId) => !activeConventionIds.has(conventionId))) {
    return privateJson(
      { error: "Una o più convenzioni non sono più disponibili." },
      409
    );
  }

  const activeRoundEntries = await Promise.all(
    conventionIds.map(async (conventionId) => [
      conventionId,
      await getActiveRound(serviceClient, conventionId),
    ] as const)
  );
  const activeRoundsByConvention = new Map(activeRoundEntries);

  for (const group of normalizedGroups) {
    const activeRound = activeRoundsByConvention.get(group.conventionId);
    if (!activeRound || activeRound.id !== group.roundId) {
      return privateJson(
        { error: "Una raccolta è stata chiusa o aggiornata. Ricarica la pagina." },
        409
      );
    }
  }

  const activeRounds = activeRoundEntries
    .map(([, round]) => round)
    .filter((round): round is BookConventionRound => round !== null);
  const requiresAddress = activeRounds.some(
    (round) => round.delivery_mode === "home"
  );

  if (
    requiresAddress &&
    (billingShippingAddress.length < 8 || billingShippingAddress.length > 1000)
  ) {
    return privateJson(
      { error: "Inserisci un indirizzo di consegna completo." },
      400
    );
  }

  const [booksResult, linksResult, existingResult] = await Promise.all([
    serviceClient
      .from("book_convention_books")
      .select(
        "id, convention_id, title, price, original_price, isbn, reference_year, reference_years, description, sort_order, product_type, bundle_items, study_area, is_active, cover_image"
      )
      .eq("is_active", true)
      .in("id", uniqueSelectedBookIds),
    serviceClient
      .from("book_convention_book_rounds")
      .select("book_id, convention_id, round_id")
      .in("book_id", uniqueSelectedBookIds)
      .in("convention_id", conventionIds)
      .in("round_id", normalizedGroups.map((group) => group.roundId)),
    serviceClient
      .from("book_convention_adhesions")
      .select("id, convention_id, round_id, selected_year")
      .eq("user_id", user.id)
      .in("convention_id", conventionIds)
      .in("round_id", normalizedGroups.map((group) => group.roundId)),
  ]);

  if (booksResult.error) throw booksResult.error;
  if (linksResult.error) throw linksResult.error;
  if (existingResult.error) throw existingResult.error;

  const normalizedBooks = (booksResult.data ?? [])
    .map((book) => normalizeBookRow(book))
    .filter((book): book is BookConventionBook => book !== null);
  const booksById = new Map(normalizedBooks.map((book) => [book.id, book]));
  const linkKeys = new Set(
    (linksResult.data ?? []).map(
      (link) => `${Number(link.convention_id)}:${String(link.round_id)}:${Number(link.book_id)}`
    )
  );
  const existingByGroup = new Map(
    (existingResult.data ?? []).map((adhesion) => [
      `${Number(adhesion.convention_id)}:${String(adhesion.round_id)}:${String(adhesion.selected_year)}`,
      String(adhesion.id),
    ])
  );

  for (const group of normalizedGroups) {
    const selectedBooks = group.bookIds
      .map((bookId) => booksById.get(bookId))
      .filter((book): book is BookConventionBook => Boolean(book));

    if (
      selectedBooks.length !== group.bookIds.length ||
      selectedBooks.some((book) => book.convention_id !== group.conventionId) ||
      selectedBooks.some(
        (book) =>
          !book.reference_years.includes(group.selectedYear) ||
          !(BOOK_YEARS_BY_STUDY_AREA[book.study_area] as readonly BookYear[]).includes(
            group.selectedYear
          )
      ) ||
      selectedBooks.some((book) => book.price === null) ||
      group.bookIds.some(
        (bookId) =>
          !linkKeys.has(`${group.conventionId}:${group.roundId}:${bookId}`)
      )
    ) {
      return privateJson(
        { error: "Una o più proposte selezionate non sono disponibili." },
        409
      );
    }
  }

  const preparedGroups = normalizedGroups.map((group) => {
    const selectedBooks = group.bookIds.map((bookId) => booksById.get(bookId)!);

    const activeRound = activeRoundsByConvention.get(group.conventionId);
    if (!activeRound) {
      throw new Error("Raccolta attiva non disponibile dopo la validazione.");
    }

    return {
      ...group,
      activeRound,
      selectedBooks,
      totalPrice:
        selectedBooks.reduce(
          (sum, book) => sum + priceToCents(book.price ?? 0),
          0
        ) / 100,
      existingAdhesionId:
        existingByGroup.get(
          `${group.conventionId}:${group.roundId}:${group.selectedYear}`
        ) ?? null,
    };
  });

  const latestRounds = await Promise.all(
    conventionIds.map((conventionId) => getActiveRound(serviceClient, conventionId))
  );
  if (
    latestRounds.some((round) => !round) ||
    latestRounds.some((round, index) => {
      const previous = activeRoundsByConvention.get(conventionIds[index]);
      return (
        !round ||
        !previous ||
        round.id !== previous.id ||
        round.delivery_mode !== previous.delivery_mode
      );
    })
  ) {
    return privateJson(
      { error: "Una raccolta è stata chiusa. Aggiorna la pagina prima di riprovare." },
      409
    );
  }

  const groupsToInsert = preparedGroups.filter(
    (group) => !group.existingAdhesionId
  );
  let insertedRows: Array<{
    id: string;
    convention_id: number;
    round_id: string;
    selected_year: BookYear;
  }> = [];

  if (groupsToInsert.length > 0) {
    const { data: inserted, error: insertError } = await serviceClient
      .from("book_convention_adhesions")
      .insert(
        groupsToInsert.map((group) => ({
          user_id: user.id,
          convention_id: group.conventionId,
          round_id: group.roundId,
          selected_year: group.selectedYear,
          selected_book_ids: group.selectedBooks.map((book) => book.id),
          selected_books: group.selectedBooks.map((book) => ({
            id: book.id,
            title: book.title,
            price: book.price,
            reference_year: group.selectedYear,
            reference_years: book.reference_years,
            description: book.description,
            product_type: book.product_type,
            bundle_items: book.bundle_items,
            study_area: book.study_area,
            cover_image: book.cover_image,
            isbn: book.isbn,
            original_price: book.original_price,
          })),
          total_price: group.totalPrice,
          fiscal_code_or_vat: fiscalCodeOrVat,
          billing_shipping_address:
            group.activeRound.delivery_mode === "home"
              ? billingShippingAddress
              : null,
          payment_method: paymentMethod,
        }))
      )
      .select("id, convention_id, round_id, selected_year");

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: concurrentRows, error: concurrentError } =
          await serviceClient
            .from("book_convention_adhesions")
            .select("id, convention_id, round_id, selected_year")
            .eq("user_id", user.id)
            .in("convention_id", conventionIds)
            .in(
              "round_id",
              normalizedGroups.map((group) => group.roundId)
            )
            .in(
              "selected_year",
              normalizedGroups.map((group) => group.selectedYear)
            );

        if (concurrentError) throw concurrentError;

        const concurrentIdsByGroup = new Map(
          (concurrentRows ?? []).map((row) => [
            `${Number(row.convention_id)}:${String(row.round_id)}:${String(row.selected_year)}`,
            String(row.id),
          ])
        );
        const concurrentAdhesionIds = preparedGroups
          .map((group) =>
            concurrentIdsByGroup.get(
              `${group.conventionId}:${group.roundId}:${group.selectedYear}`
            )
          )
          .filter((id): id is string => Boolean(id));

        if (concurrentAdhesionIds.length === preparedGroups.length) {
          return privateJson({
            ok: true,
            hasAdhered: true,
            adhesionIds: concurrentAdhesionIds,
            message: "Le adesioni selezionate risultano già registrate.",
          });
        }

        return privateJson(
          {
            error:
              "Una delle adesioni è stata registrata nel frattempo. Aggiorna la pagina e riprova per le altre proposte.",
          },
          409
        );
      }
      throw insertError;
    }

    insertedRows = (inserted ?? []).map((row) => ({
      id: String(row.id),
      convention_id: Number(row.convention_id),
      round_id: String(row.round_id),
      selected_year: isBookYear(row.selected_year)
        ? row.selected_year
        : BOOK_YEARS[0],
    }));
  }

  const adhesionIds = [
    ...preparedGroups
      .map((group) => group.existingAdhesionId)
      .filter((id): id is string => Boolean(id)),
    ...insertedRows.map((row) => row.id),
  ];

  if (groupsToInsert.length === 0) {
    return privateJson({
      ok: true,
      hasAdhered: true,
      adhesionIds,
      message: "Le adesioni selezionate risultano già registrate.",
    });
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
    const insertedBooks = groupsToInsert.flatMap((group) =>
      group.selectedBooks.map((book) => ({
        ...book,
        reference_year: group.selectedYear,
      }))
    );
    const insertedTotal = groupsToInsert.reduce(
      (sum, group) => sum + priceToCents(group.totalPrice),
      0
    ) / 100;
    const insertedRounds = Array.from(
      new Map(
        groupsToInsert.map((group) => [group.activeRound.id, group.activeRound])
      ).values()
    );

    emailSent = await sendBookConventionReceiptEmail({
      to: profile.email,
      profile,
      fiscalCodeOrVat,
      billingShippingAddress: requiresAddress ? billingShippingAddress : null,
      paymentMethod,
      selectedBooks: insertedBooks,
      totalPrice: insertedTotal,
      activeRounds: insertedRounds,
    });
  } catch (mailError) {
    logRouteError(
      `Errore invio email ricevuta convenzioni libri (${insertedRows
        .map((row) => row.id)
        .join(",")})`,
      mailError
    );
  }

  return privateJson({
    ok: true,
    hasAdhered: true,
    adhesionIds,
    emailSent,
    message: emailSent
      ? "Adesione registrata correttamente. Ti abbiamo inviato una mail di conferma."
      : "Adesione registrata correttamente. La mail di conferma non è al momento disponibile.",
  });
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
    submissions?: unknown;
    convention_id?: unknown;
    round_id?: unknown;
    selected_year?: unknown;
    selected_book_ids?: unknown;
    payment_method?: unknown;
    fiscal_code_or_vat?: unknown;
    billing_shipping_address?: unknown;
  } = {};

  try {
    const parsedBody: unknown = await req.json();
    if (
      parsedBody &&
      typeof parsedBody === "object" &&
      !Array.isArray(parsedBody)
    ) {
      body = parsedBody;
    }
  } catch {
    body = {};
  }

  const conventionId =
    typeof body.convention_id === "number" ||
    typeof body.convention_id === "string"
      ? Number(body.convention_id)
      : null;
  const requestedRoundId = cleanRequiredString(body.round_id);
  const requestedSelectedYear = body.selected_year;
  const selectedBookIds = cleanBookIds(body.selected_book_ids);
  const paymentMethod = body.payment_method;
  const fiscalCodeOrVat = cleanRequiredString(body.fiscal_code_or_vat)
    .toUpperCase()
    .replace(/\s+/g, "");
  const billingShippingAddress = cleanRequiredString(body.billing_shipping_address);

  if (billingShippingAddress.length > 1000) {
    return privateJson({ error: "L’indirizzo inserito è troppo lungo." }, 400);
  }

  if (!/^[A-Z0-9]{11,20}$/.test(fiscalCodeOrVat)) {
    return privateJson({ error: "Inserisci un codice fiscale o una partita IVA validi." }, 400);
  }

  if (!isPaymentMethod(paymentMethod)) {
    return privateJson({ error: "Metodo di pagamento non valido." }, 400);
  }

  if (requestedSelectedYear !== undefined && !isBookYear(requestedSelectedYear)) {
    return privateJson({ error: "Anno di corso non valido." }, 400);
  }

  if (body.submissions !== undefined) {
    if (!Array.isArray(body.submissions)) {
      return privateJson({ error: "Selezione delle raccolte non valida." }, 400);
    }

    try {
      return await submitGroupedAdhesions({
        serviceClient: getServiceClient(),
        user,
        submissions: body.submissions,
        paymentMethod,
        fiscalCodeOrVat,
        billingShippingAddress,
      });
    } catch (error) {
      logRouteError("Errore registrazione adesioni convenzioni libri", error);
      return privateJson(
        { error: "Non è stato possibile registrare le adesioni. Riprova tra poco." },
        500
      );
    }
  }

  if (!conventionId || !Number.isInteger(conventionId) || conventionId <= 0) {
    return privateJson({ error: "Convenzione non valida." }, 400);
  }

  if (!hasOnlyValidUniqueBookIds(body.selected_book_ids)) {
    return privateJson({ error: "Selezione delle proposte non valida." }, 400);
  }

  if (selectedBookIds.length === 0) {
    return privateJson({ error: "Seleziona almeno una proposta." }, 400);
  }

  if (selectedBookIds.length > 50) {
    return privateJson({ error: "Hai selezionato troppi elementi." }, 400);
  }

  try {
    const serviceClient = getServiceClient();
    const { data: convention, error: conventionError } = await serviceClient
      .from("book_conventions")
      .select("id, attiva")
      .eq("id", conventionId)
      .maybeSingle();

    if (conventionError) throw conventionError;

    if (!convention) {
      return privateJson({ error: "Convenzione non trovata." }, 404);
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
        { error: "La raccolta selezionata non è attualmente disponibile." },
        409
      );
    }

    const addressForAdhesion =
      activeRound.delivery_mode === "home" ? billingShippingAddress : null;

    if (
      activeRound.delivery_mode === "home" &&
      (billingShippingAddress.length < 8 ||
        billingShippingAddress.length > 1000)
    ) {
      return privateJson(
        { error: "Inserisci un indirizzo di consegna completo." },
        400
      );
    }

    const [booksResult, linksResult] = await Promise.all([
      serviceClient
        .from("book_convention_books")
        .select(
          "id, convention_id, title, price, original_price, isbn, reference_year, reference_years, description, sort_order, product_type, bundle_items, study_area, is_active, cover_image"
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
    const selectedYear = isBookYear(requestedSelectedYear)
      ? requestedSelectedYear
      : selectedBooks[0]?.reference_year ?? BOOK_YEARS[0];
    const linkedBookIds = new Set(
      (linksResult.data ?? [])
        .map((link) => Number(link.book_id))
        .filter((bookId) => Number.isInteger(bookId) && bookId > 0)
    );

    if (
      selectedBooks.length !== selectedBookIds.length ||
      selectedBookIds.some((bookId) => !linkedBookIds.has(bookId)) ||
      selectedBooks.some(
        (book) =>
          !book.reference_years.includes(selectedYear) ||
          !(BOOK_YEARS_BY_STUDY_AREA[book.study_area] as readonly BookYear[]).includes(
            selectedYear
          )
      )
    ) {
      return privateJson(
        { error: "Uno o più elementi selezionati non sono disponibili nella raccolta attiva." },
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
      .eq("selected_year", selectedYear)
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

    if (
      !latestActiveRound ||
      latestActiveRound.id !== activeRound.id ||
      latestActiveRound.delivery_mode !== activeRound.delivery_mode
    ) {
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
        selected_year: selectedYear,
        selected_book_ids: selectedBooks.map((book) => book.id),
        selected_books: selectedBooks.map((book) => ({
          id: book.id,
          title: book.title,
          price: book.price,
          reference_year: selectedYear,
          reference_years: book.reference_years,
          description: book.description,
          product_type: book.product_type,
          bundle_items: book.bundle_items,
          study_area: book.study_area,
          cover_image: book.cover_image,
          isbn: book.isbn,
          original_price: book.original_price,
        })),
        total_price: totalPrice,
        fiscal_code_or_vat: fiscalCodeOrVat,
        billing_shipping_address: addressForAdhesion,
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
        billingShippingAddress: addressForAdhesion,
        paymentMethod,
        selectedBooks: selectedBooks.map((book) => ({
          ...book,
          reference_year: selectedYear,
        })),
        totalPrice,
        activeRounds: [activeRound],
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
