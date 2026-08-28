export const PAYMENT_METHODS = [
  "contanti",
  "bonifico",
  "carta",
  "bonus_cultura",
  "carta_del_docente",
  "bonus_di_merito",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  contanti: "Contanti",
  bonifico: "Bonifico",
  carta: "Carta",
  bonus_cultura: "Bonus cultura",
  carta_del_docente: "Carta del docente",
  bonus_di_merito: "Bonus di merito",
};

export const BOOK_YEARS = [
  "primo_anno",
  "secondo_anno",
  "terzo_anno",
] as const;

export type BookYear = (typeof BOOK_YEARS)[number];

export const BOOK_YEAR_LABELS: Record<BookYear, string> = {
  primo_anno: "Primo anno",
  secondo_anno: "Secondo anno",
  terzo_anno: "Terzo anno",
};

export const PRODUCT_TYPES = ["book", "bundle"] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  book: "Libro",
  bundle: "Bundle",
};

export const STUDY_AREAS = [
  "medicina_chirurgia",
  "odontoiatria_igiene_dentale",
  "professioni_sanitarie",
] as const;

export type StudyArea = (typeof STUDY_AREAS)[number];

export const STUDY_AREA_LABELS: Record<StudyArea, string> = {
  medicina_chirurgia: "Medicina e Chirurgia",
  odontoiatria_igiene_dentale: "Odontoiatria e Igiene Dentale",
  professioni_sanitarie: "Professioni sanitarie",
};

export const BOOK_CONVENTION_BANK_DETAILS = {
  bank: "Intesa San Paolo SPA",
  iban: "IT72D0306951150100000009695",
  accountHolder: "CP GROUP SRLS",
} as const;

const BOOK_CONVENTION_COVER_PATH =
  "/storage/v1/object/public/book-conventions/";

export function normalizeBookConventionCoverUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const baseUrl = new URL(supabaseUrl);
    const coverUrl = new URL(value.trim());
    const basePath = baseUrl.pathname.replace(/\/$/, "");
    const expectedPath = `${basePath}${BOOK_CONVENTION_COVER_PATH}`;

    if (
      coverUrl.origin !== baseUrl.origin ||
      !coverUrl.pathname.startsWith(expectedPath) ||
      coverUrl.pathname.length <= expectedPath.length ||
      coverUrl.username ||
      coverUrl.password ||
      coverUrl.search ||
      coverUrl.hash
    ) {
      return null;
    }

    return coverUrl.href;
  } catch {
    return null;
  }
}

export type BookConventionRound = {
  id: string;
  convention_id: number;
  starts_at: string;
  ends_at: string;
};

export type BookConventionBook = {
  id: number;
  convention_id: number;
  title: string;
  price: number | null;
  reference_year: BookYear;
  description: string | null;
  sort_order: number | null;
  product_type: ProductType;
  bundle_items: string[];
  study_area: StudyArea;
  is_active: boolean;
  cover_image: string | null;
};

export type BookAvailabilityReason =
  | "convention_inactive"
  | "round_inactive"
  | "not_in_round"
  | "price_unavailable"
  | null;

export type BookConventionCatalogBook = BookConventionBook & {
  is_available: boolean;
  availability_reason: BookAvailabilityReason;
};

export type SelectedBookSnapshot = {
  id?: number;
  title?: string;
  price?: number | null;
  reference_year?: BookYear;
  description?: string | null;
  product_type?: ProductType;
  bundle_items?: string[];
  study_area?: StudyArea;
  cover_image?: string | null;
};

export type BookConventionAdhesion = {
  id: string;
  convention_id: number;
  round_id: string | null;
  selected_book_ids: number[] | null;
  selected_books: SelectedBookSnapshot[] | null;
  total_price: number | null;
  fiscal_code_or_vat: string | null;
  billing_shipping_address: string | null;
  payment_method: PaymentMethod | string | null;
  created_at: string;
};

export type BookConventionApiResponse = {
  ok?: boolean;
  convention?: {
    id: number;
    titolo: string | null;
    partner: string | null;
    descrizione: string | null;
    attiva: boolean;
    is_book_convention: boolean;
  };
  activeRound?: BookConventionRound | null;
  rounds?: BookConventionRound[];
  canAdhere?: boolean;
  books?: BookConventionCatalogBook[];
  booksByYear?: Record<BookYear, BookConventionCatalogBook[]>;
  catalogBooks?: BookConventionCatalogBook[];
  catalogByArea?: Record<
    StudyArea,
    Record<BookYear, BookConventionCatalogBook[]>
  >;
  studyAreas?: StudyArea[];
  hasAdhered?: boolean;
  adhesion?: BookConventionAdhesion | null;
  activeAdhesion?: BookConventionAdhesion | null;
  latestAdhesion?: BookConventionAdhesion | null;
  profile?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  error?: string;
};

export type BookConventionSubmitResponse = {
  ok?: boolean;
  hasAdhered?: boolean;
  adhesionId?: string;
  emailSent?: boolean;
  message?: string;
  error?: string;
};
