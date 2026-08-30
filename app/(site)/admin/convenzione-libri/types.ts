import type {
  BookBundleItem,
  BookYear,
  DeliveryMode,
  PaymentMethod,
  ProductType,
  StudyArea,
} from "@/lib/book-convention";

export type AdminProfile = {
  id: string;
  nome: string | null;
  cognome: string | null;
  email_istituzionale?: string | null;
  corso_di_laurea?: string | null;
  anno_di_laurea?: string | number | null;
};

export type AdminBookConvention = {
  id: number;
  titolo?: string | null;
  descrizione?: string | null;
  attiva?: boolean | null;
  ordine?: number | null;
};

export type AdminBookConventionRound = {
  id: string;
  convention_id: number;
  starts_at: string;
  ends_at: string;
  created_at?: string;
  delivery_mode?: DeliveryMode | string | null;
  book_conventions?: AdminBookConvention | null;
};

export type AdminBookConventionProduct = {
  id: number;
  convention_id: number;
  title: string;
  price: number | string | null;
  original_price?: number | string | null;
  isbn?: string | null;
  reference_year: BookYear;
  description: string | null;
  sort_order: number | null;
  product_type: ProductType;
  bundle_items: BookBundleItem[];
  study_area: StudyArea;
  is_active: boolean;
  cover_image: string | null;
  round_ids?: string[];
};

export type SelectedProductSnapshot = {
  id?: number;
  title?: string;
  price?: number | string | null;
  original_price?: number | string | null;
  isbn?: string | null;
  reference_year?: BookYear;
  description?: string | null;
  product_type?: ProductType;
  bundle_items?: Array<BookBundleItem | string>;
  study_area?: StudyArea;
  cover_image?: string | null;
};

export type LegacyBookItem = {
  title?: string;
  price?: number | string | null;
  original_price?: number | string | null;
  isbn?: string | null;
  bundle_items?: Array<BookBundleItem | string>;
};

export type AdminBookAdhesion = {
  id: string;
  user_id: string;
  convention_id: number | null;
  payment_method: PaymentMethod | string | null;
  fiscal_code_or_vat?: string | null;
  billing_shipping_address?: string | null;
  selected_book_ids?: number[] | null;
  selected_books?: SelectedProductSnapshot[] | null;
  total_price?: number | string | null;
  book_titles?: string[] | null;
  book_items?: LegacyBookItem[] | null;
  created_at: string;
  profiles: AdminProfile | null;
  book_conventions?: AdminBookConvention | null;
  round_id: string | null;
  book_convention_rounds: Omit<AdminBookConventionRound, "convention_id"> | null;
};

export type DisplaySelectedProduct = {
  id?: number;
  title: string;
  price: number | null;
  original_price: number | null;
  isbn: string | null;
  reference_year?: BookYear;
  description?: string | null;
  product_type: ProductType;
  bundle_items: BookBundleItem[];
  study_area?: StudyArea;
  cover_image: string | null;
};

export type AdminBookConventionApiResponse = {
  conventions?: AdminBookConvention[];
  books?: AdminBookConventionProduct[];
  rounds?: AdminBookConventionRound[];
  adhesions?: AdminBookAdhesion[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  error?: string;
};

export type AdhesionSort = "newest" | "oldest" | "total_desc" | "name";

export type AdhesionFilters = {
  conventionId: number | "all";
  roundId: string;
  paymentMethod: string;
  productId: number | "all";
  year: BookYear | "all";
  studyArea: StudyArea | "all";
  deliveryMode: DeliveryMode | "all";
  dateFrom: string;
  dateTo: string;
};
