import {
  DELIVERY_MODE_LABELS,
  PAYMENT_METHOD_LABELS,
  PRODUCT_TYPES,
  normalizeBookBundleItems,
  normalizeBookConventionCoverUrl,
  type DeliveryMode,
  type PaymentMethod,
  type ProductType,
} from "@/lib/book-convention";
import type {
  AdminBookAdhesion,
  AdminBookConvention,
  AdminBookConventionProduct,
  AdminBookConventionRound,
  AdminProfile,
  DisplaySelectedProduct,
  SelectedProductSnapshot,
} from "./types";

export function toFiniteNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

export function formatPrice(value: number | string | null | undefined) {
  const normalized = toFiniteNumber(value);
  if (normalized === null) return "—";

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized);
}

export function formatPaymentMethod(value: string | null | undefined) {
  if (!value) return "—";
  return PAYMENT_METHOD_LABELS[value as PaymentMethod] ?? value.replaceAll("_", " ");
}

export function formatDeliveryMode(value: string | null | undefined) {
  if (!value) return "—";
  return DELIVERY_MODE_LABELS[value as DeliveryMode] ?? value.replaceAll("_", " ");
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getConventionTitle(convention: AdminBookConvention | null | undefined) {
  return convention?.titolo?.trim() || "Convenzione libri";
}

export function getAdhesionConvention(adhesion: AdminBookAdhesion) {
  return adhesion.book_conventions ?? adhesion.book_convention_rounds?.book_conventions ?? null;
}

export function getAdhesionConventionTitle(adhesion: AdminBookAdhesion) {
  return getConventionTitle(getAdhesionConvention(adhesion));
}

export function formatRoundLabel(
  round: Pick<AdminBookConventionRound, "starts_at" | "ends_at"> | null | undefined
) {
  if (!round) return "Senza raccolta";

  const now = Date.now();
  const startsAt = new Date(round.starts_at).getTime();
  const endsAt = new Date(round.ends_at).getTime();

  if (startsAt <= now && now < endsAt) {
    return `Aperta dal ${formatDateOnly(round.starts_at)}`;
  }

  return `${formatDateOnly(round.starts_at)} – ${formatDateOnly(round.ends_at)}`;
}

export function getFullName(profile: AdminProfile | null | undefined) {
  return [profile?.nome, profile?.cognome].filter(Boolean).join(" ") || "Utente senza nome";
}

export function getProfileEmail(profile: AdminProfile | null | undefined) {
  return profile?.email_istituzionale?.trim() || "—";
}

export function getProfileCourse(profile: AdminProfile | null | undefined) {
  return profile?.corso_di_laurea?.trim() || "—";
}

export function getProfileYear(profile: AdminProfile | null | undefined) {
  return profile?.anno_di_laurea ?? "—";
}

function isProductType(value: unknown): value is ProductType {
  return typeof value === "string" && PRODUCT_TYPES.includes(value as ProductType);
}

function findCatalogProduct(
  snapshot: SelectedProductSnapshot,
  catalog: AdminBookConventionProduct[]
) {
  if (typeof snapshot.id === "number") {
    const byId = catalog.find((product) => product.id === snapshot.id);
    if (byId) return byId;
  }

  const title = String(snapshot.title ?? "").trim().toLowerCase();
  return title
    ? catalog.find((product) => product.title.trim().toLowerCase() === title)
    : undefined;
}

function normalizeSnapshot(
  snapshot: SelectedProductSnapshot,
  catalog: AdminBookConventionProduct[]
): DisplaySelectedProduct | null {
  const catalogProduct = findCatalogProduct(snapshot, catalog);
  const title = String(snapshot.title ?? catalogProduct?.title ?? "").trim();
  if (!title) return null;

  const bundleItems = Object.prototype.hasOwnProperty.call(snapshot, "bundle_items")
    ? normalizeBookBundleItems(snapshot.bundle_items)
    : normalizeBookBundleItems(catalogProduct?.bundle_items);
  const productType = isProductType(snapshot.product_type)
    ? snapshot.product_type
    : catalogProduct?.product_type ?? (bundleItems.length > 0 ? "bundle" : "book");
  const snapshotHasPrice = Object.prototype.hasOwnProperty.call(snapshot, "price");
  const snapshotHasOriginalPrice = Object.prototype.hasOwnProperty.call(
    snapshot,
    "original_price"
  );
  const snapshotHasIsbn = Object.prototype.hasOwnProperty.call(snapshot, "isbn");
  const snapshotHasDescription = Object.prototype.hasOwnProperty.call(snapshot, "description");
  const snapshotHasCover = Object.prototype.hasOwnProperty.call(snapshot, "cover_image");

  return {
    id: typeof snapshot.id === "number" ? snapshot.id : catalogProduct?.id,
    title,
    price: toFiniteNumber(snapshotHasPrice ? snapshot.price : catalogProduct?.price),
    original_price: toFiniteNumber(
      snapshotHasOriginalPrice ? snapshot.original_price : catalogProduct?.original_price
    ),
    isbn: String(snapshotHasIsbn ? snapshot.isbn ?? "" : catalogProduct?.isbn ?? "").trim() || null,
    reference_year: snapshot.reference_year ?? catalogProduct?.reference_year,
    description: snapshotHasDescription
      ? snapshot.description ?? null
      : catalogProduct?.description ?? null,
    product_type: productType,
    bundle_items: productType === "bundle" ? bundleItems : [],
    study_area: snapshot.study_area ?? catalogProduct?.study_area,
    cover_image: snapshotHasCover
      ? normalizeBookConventionCoverUrl(snapshot.cover_image)
      : normalizeBookConventionCoverUrl(catalogProduct?.cover_image),
  };
}

export function getSelectedProducts(
  adhesion: AdminBookAdhesion,
  catalog: AdminBookConventionProduct[]
): DisplaySelectedProduct[] {
  if (Array.isArray(adhesion.selected_books) && adhesion.selected_books.length > 0) {
    return adhesion.selected_books
      .map((snapshot) => normalizeSnapshot(snapshot, catalog))
      .filter((product): product is DisplaySelectedProduct => product !== null);
  }

  if (Array.isArray(adhesion.book_items) && adhesion.book_items.length > 0) {
    return adhesion.book_items
      .map((item) => normalizeSnapshot(item, catalog))
      .filter((product): product is DisplaySelectedProduct => product !== null);
  }

  if (Array.isArray(adhesion.book_titles) && adhesion.book_titles.length > 0) {
    return adhesion.book_titles
      .map((title) => normalizeSnapshot({ title }, catalog))
      .filter((product): product is DisplaySelectedProduct => product !== null);
  }

  if (Array.isArray(adhesion.selected_book_ids)) {
    return adhesion.selected_book_ids
      .map((id) => {
        const product = catalog.find((item) => item.id === id);
        return product ? normalizeSnapshot(product, catalog) : null;
      })
      .filter((product): product is DisplaySelectedProduct => product !== null);
  }

  return [];
}

export function getAdhesionTotal(
  adhesion: AdminBookAdhesion,
  catalog: AdminBookConventionProduct[]
) {
  const savedTotal = toFiniteNumber(adhesion.total_price);
  if (savedTotal !== null) return savedTotal;

  return getSelectedProducts(adhesion, catalog).reduce(
    (sum, product) => sum + (product.price ?? 0),
    0
  );
}

export function getProductSavings(product: DisplaySelectedProduct) {
  if (
    product.price === null ||
    product.original_price === null ||
    product.original_price <= product.price
  ) {
    return 0;
  }

  return product.original_price - product.price;
}

export function getAdhesionSavings(
  adhesion: AdminBookAdhesion,
  catalog: AdminBookConventionProduct[]
) {
  return getSelectedProducts(adhesion, catalog).reduce(
    (sum, product) => sum + getProductSavings(product),
    0
  );
}

export function getAdhesionOriginalTotal(
  adhesion: AdminBookAdhesion,
  catalog: AdminBookConventionProduct[]
) {
  const products = getSelectedProducts(adhesion, catalog);
  const hasOriginalPrice = products.some((product) => product.original_price !== null);
  if (!hasOriginalPrice) return null;

  return getAdhesionTotal(adhesion, catalog) +
    products.reduce((sum, product) => sum + getProductSavings(product), 0);
}

export function adhesionHasProduct(
  adhesion: AdminBookAdhesion,
  productId: number,
  catalog: AdminBookConventionProduct[]
) {
  if (adhesion.selected_book_ids?.includes(productId)) return true;
  return getSelectedProducts(adhesion, catalog).some((product) => product.id === productId);
}

export function matchesAdhesionSearch(
  adhesion: AdminBookAdhesion,
  catalog: AdminBookConventionProduct[],
  search: string
) {
  const query = search.trim().toLocaleLowerCase("it");
  if (!query) return true;

  const products = getSelectedProducts(adhesion, catalog);
  const searchable = [
    adhesion.id,
    adhesion.user_id,
    getFullName(adhesion.profiles),
    getProfileEmail(adhesion.profiles),
    getProfileCourse(adhesion.profiles),
    String(getProfileYear(adhesion.profiles)),
    getAdhesionConventionTitle(adhesion),
    adhesion.fiscal_code_or_vat ?? "",
    adhesion.billing_shipping_address ?? "",
    formatPaymentMethod(adhesion.payment_method),
    formatDeliveryMode(adhesion.book_convention_rounds?.delivery_mode),
    products
      .flatMap((product) => [
        product.title,
        product.isbn ?? "",
        ...product.bundle_items.flatMap((item) => [item.title, item.isbn ?? ""]),
      ])
      .join(" "),
  ];

  return searchable.some((value) => value.toLocaleLowerCase("it").includes(query));
}

export function shortenId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}
