// app/api/admin/book-convention/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  BOOK_YEARS,
  PAYMENT_METHODS,
  STUDY_AREAS,
  normalizeBookConventionCoverUrl,
  type BookYear,
  type PaymentMethod,
  type ProductType,
  type StudyArea,
} from "@/lib/book-convention";

type IncomingBook = {
  id?: number | string | null;
  title?: unknown;
  price?: unknown;
  original_price?: unknown;
  isbn?: unknown;
  reference_year?: unknown;
  description?: unknown;
  sort_order?: unknown;
  bundle_items?: unknown;
  included_books?: unknown;
  study_area?: unknown;
  is_active?: unknown;
};

type NormalizedBookInput = {
  id: number | null;
  title: string;
  price: number;
  original_price: number | null | undefined;
  isbn: string | null | undefined;
  reference_year: BookYear;
  description: string | null;
  sort_order: number;
  bundle_items: string[] | undefined;
  included_books: string[] | undefined;
  study_area: StudyArea | undefined;
  is_active: boolean | undefined;
};

type ExistingBookRow = {
  id: number;
  convention_id: number;
  title: string;
  price: number | string | null;
  original_price: number | string | null;
  isbn: string | null;
  reference_year: BookYear;
  description: string | null;
  sort_order: number | null;
  product_type: ProductType;
  bundle_items: unknown;
  study_area: StudyArea;
  is_active: boolean;
  cover_image: string | null;
};

type AdminAuthResult =
  | { authorized: true; user: User }
  | { authorized: false; status: 401 | 403 };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRODUCT_IMAGE_BUCKET = "book-conventions";
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PRODUCT_IMAGE_REQUEST_SIZE = MAX_PRODUCT_IMAGE_SIZE + 128 * 1024;
const OPEN_COLLECTION_ENDS_AT = "9999-12-31T23:59:59.999Z";
const PRODUCT_IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type DeliveryMode = "university" | "home";

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

async function getAdminAuth(): Promise<AdminAuthResult> {
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

  if (!user) return { authorized: false, status: 401 };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logRouteError("Errore verifica ruolo admin convenzione libri", error);
    return { authorized: false, status: 403 };
  }

  if (profile?.role !== "admin") {
    return { authorized: false, status: 403 };
  }

  return { authorized: true, user };
}

function getAdminClient() {
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

function unauthorizedResponse(auth: Extract<AdminAuthResult, { authorized: false }>) {
  return privateJson(
    { error: auth.status === 401 ? "Non autenticato." : "Non autorizzato." },
    auth.status
  );
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

function parsePositiveInteger(value: unknown) {
  const parsed = parseNullableNumber(value);
  return parsed !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseInteger(value: unknown) {
  const parsed = parseNullableNumber(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function isBookYear(value: unknown): value is BookYear {
  return typeof value === "string" && BOOK_YEARS.includes(value as BookYear);
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === "string" &&
    PAYMENT_METHODS.includes(value as PaymentMethod)
  );
}

function isStudyArea(value: unknown): value is StudyArea {
  return typeof value === "string" && STUDY_AREAS.includes(value as StudyArea);
}

function isDeliveryMode(value: unknown): value is DeliveryMode {
  return value === "university" || value === "home";
}

function normalizeIsbn(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("ISBN non valido.");
  }

  const rawIsbn = value.trim();
  if (!/^[0-9Xx\s-]*$/.test(rawIsbn)) {
    throw new Error("L’ISBN contiene caratteri non validi.");
  }

  const isbn = rawIsbn.toUpperCase().replace(/[\s-]/g, "");
  if (!isbn) return null;

  if (!/^(?:[0-9]{13}|[0-9]{9}[0-9X])$/.test(isbn)) {
    throw new Error("L’ISBN deve contenere 10 o 13 caratteri validi.");
  }

  return isbn;
}

function normalizeStringArray(
  value: unknown,
  fieldLabel: string,
  maxItems: number,
  maxItemLength: number
) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`${fieldLabel} non valido.`);
  }

  const normalized = Array.from(
    new Set(value.map((item) => cleanString(item)).filter(Boolean))
  );

  if (normalized.length > maxItems) {
    throw new Error(`${fieldLabel}: sono consentiti al massimo ${maxItems} elementi.`);
  }

  if (normalized.some((item) => item.length > maxItemLength)) {
    throw new Error(`${fieldLabel}: uno degli elementi è troppo lungo.`);
  }

  return normalized;
}

function buildAutomaticProductTitle(includedBooks: string[]) {
  if (includedBooks.length === 1) return includedBooks[0];

  const fullTitle = `Bundle – ${includedBooks.join(" + ")}`;
  return fullTitle.length <= 240
    ? fullTitle
    : `${fullTitle.slice(0, 239).trimEnd()}…`;
}

function normalizeIncludedBooks(value: unknown, proposalIndex: number) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    throw new Error(
      `La proposta ${proposalIndex + 1} deve contenere da uno a 50 libri.`
    );
  }

  const normalized = value.map(item => cleanString(item));

  if (normalized.some(title => !title || title.length > 240)) {
    throw new Error(`Inserisci un titolo valido per ogni libro della proposta ${proposalIndex + 1}.`);
  }

  const uniqueTitles = new Set(normalized.map(title => title.toLocaleLowerCase("it-IT")));
  if (uniqueTitles.size !== normalized.length) {
    throw new Error(`La proposta ${proposalIndex + 1} contiene lo stesso libro più di una volta.`);
  }

  return normalized;
}

function normalizeBooks(value: unknown): NormalizedBookInput[] {
  if (!Array.isArray(value)) {
    throw new Error("La lista dei libri/bundle è obbligatoria.");
  }

  if (value.length > 200) {
    throw new Error("Sono consentiti al massimo 200 libri o bundle per convenzione.");
  }

  const books = value.map((item, index) => {
    const book = (item ?? {}) as IncomingBook;
    const id = book.id === null || book.id === undefined || book.id === ""
      ? null
      : parsePositiveInteger(book.id);
    const requestedTitle = cleanString(book.title);
    const price = parseNullableNumber(book.price);
    const originalPrice =
      book.original_price === undefined
        ? undefined
        : parseNullableNumber(book.original_price);
    const isbn = normalizeIsbn(book.isbn);
    const description = cleanString(book.description);
    const sortOrder = parseInteger(book.sort_order) ?? index;
    const studyArea =
      book.study_area === undefined
        ? undefined
        : isStudyArea(book.study_area)
          ? book.study_area
          : null;
    const includedBooks = normalizeIncludedBooks(book.included_books, index);
    const requestedBundleItems = normalizeStringArray(
      book.bundle_items,
      `Contenuto bundle “${requestedTitle || `proposta ${index + 1}`}”`,
      50,
      240
    );
    const resolvedProductType = includedBooks
      ? includedBooks.length >= 2 ? "bundle" : "book"
      : requestedBundleItems
        ? requestedBundleItems.length >= 2 ? "bundle" : "book"
        : undefined;
    const resolvedBundleItems = includedBooks
      ? includedBooks.length >= 2 ? includedBooks : []
      : requestedBundleItems;
    const title = includedBooks
      ? buildAutomaticProductTitle(includedBooks)
      : requestedTitle;

    if (book.id !== null && book.id !== undefined && book.id !== "" && !id) {
      throw new Error(`Identificativo non valido per: ${title || `elemento ${index + 1}`}`);
    }

    if (!title || title.length > 240) {
      throw new Error("Ogni libro o bundle deve avere un titolo valido.");
    }

    if (price === null || price < 0 || price > 1_000_000) {
      throw new Error(`Prezzo non valido per: ${title}`);
    }

    if (
      book.original_price !== undefined &&
      book.original_price !== null &&
      book.original_price !== "" &&
      originalPrice === null
    ) {
      throw new Error(`Prezzo originale non valido per: ${title}`);
    }

    if (
      originalPrice !== undefined &&
      originalPrice !== null &&
      (originalPrice < price || originalPrice > 1_000_000)
    ) {
      throw new Error(
        `Il prezzo originale di “${title}” non può essere inferiore al prezzo convenzionato.`
      );
    }

    if (!isBookYear(book.reference_year)) {
      throw new Error(`Anno di riferimento non valido per: ${title}`);
    }

    if (description.length > 4000) {
      throw new Error(`Descrizione troppo lunga per: ${title}`);
    }

    if (sortOrder < 0 || sortOrder > 100_000) {
      throw new Error(`Ordine non valido per: ${title}`);
    }

    if (resolvedProductType === "bundle" && (resolvedBundleItems?.length ?? 0) < 2) {
      throw new Error(`Il bundle “${title}” deve contenere almeno due libri.`);
    }

    if (resolvedProductType === "book" && (resolvedBundleItems?.length ?? 0) > 0) {
      throw new Error(`Un libro singolo non può contenere altri libri: ${title}`);
    }

    if (studyArea === null) {
      throw new Error(`Macro-area non valida per: ${title}`);
    }

    if (book.is_active !== undefined && typeof book.is_active !== "boolean") {
      throw new Error(`Stato non valido per: ${title}`);
    }

    return {
      id,
      title,
      price,
      original_price: originalPrice,
      isbn,
      reference_year: book.reference_year,
      description: description || null,
      sort_order: sortOrder,
      bundle_items: resolvedBundleItems,
      included_books: includedBooks,
      study_area: studyArea,
      is_active: book.is_active as boolean | undefined,
    } satisfies NormalizedBookInput;
  });

  const ids = books
    .map((book) => book.id)
    .filter((id): id is number => id !== null);

  if (new Set(ids).size !== ids.length) {
    throw new Error("La lista contiene libri o bundle duplicati.");
  }

  return books;
}

function normalizeBundleItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanString(item)).filter(Boolean);
}

function validateResolvedProduct(product: {
  title: string;
  product_type: ProductType;
  bundle_items: string[];
}) {
  if (product.product_type === "bundle" && product.bundle_items.length < 2) {
    throw new Error(`Il bundle “${product.title}” deve contenere almeno due libri.`);
  }

  if (product.product_type === "book" && product.bundle_items.length > 0) {
    throw new Error(`Un libro singolo non può avere prodotti inclusi: ${product.title}`);
  }
}
async function getConventionOrNull(supabase: SupabaseClient, conventionId: number) {
  const { data, error } = await supabase
    .from("book_conventions")
    .select("id, titolo, descrizione, ordine, attiva")
    .eq("id", conventionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listConventionProductImages(
  supabase: SupabaseClient,
  conventionId: number
) {
  const rootPath = `products/${conventionId}`;
  const pendingFolders = [rootPath];
  const visitedFolders = new Set<string>();
  const objectPaths: string[] = [];

  while (pendingFolders.length > 0) {
    const currentFolder = pendingFolders.shift();
    if (!currentFolder || visitedFolders.has(currentFolder)) continue;
    visitedFolders.add(currentFolder);

    let offset = 0;
    const pageSize = 100;

    while (true) {
      const { data: entries, error } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .list(currentFolder, {
          limit: pageSize,
          offset,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) throw error;

      const page = entries ?? [];
      for (const entry of page) {
        const entryPath = `${currentFolder}/${entry.name}`;

        if (entry.id) objectPaths.push(entryPath);
        else pendingFolders.push(entryPath);
      }

      if (page.length < pageSize) break;
      offset += pageSize;
    }
  }

  return objectPaths;
}

function productImageMatchesMime(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }

  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

async function uploadProductCover(supabase: SupabaseClient, req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_PRODUCT_IMAGE_REQUEST_SIZE
  ) {
    return privateJson({ error: "La richiesta di upload è troppo grande." }, 413);
  }

  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return privateJson({ error: "File immagine non valido." }, 400);
  }

  if (formData.get("action") !== "upload_product_image") {
    return privateJson({ error: "Operazione upload non valida." }, 400);
  }

  const conventionId = parsePositiveInteger(formData.get("convention_id"));
  const bookId = parsePositiveInteger(formData.get("book_id"));
  const image = formData.get("image");

  if (!conventionId || !bookId) {
    return privateJson({ error: "Libro, bundle o convenzione non validi." }, 400);
  }

  if (!(image instanceof File) || image.size === 0) {
    return privateJson({ error: "Seleziona un’immagine valida." }, 400);
  }

  if (image.size > MAX_PRODUCT_IMAGE_SIZE) {
    return privateJson({ error: "L’immagine non può superare 5 MB." }, 400);
  }

  const extension = PRODUCT_IMAGE_EXTENSIONS[
    image.type as keyof typeof PRODUCT_IMAGE_EXTENSIONS
  ];

  if (!extension) {
    return privateJson({ error: "Sono consentite solo immagini JPEG, PNG o WebP." }, 400);
  }

  const [convention, bookResult] = await Promise.all([
    getConventionOrNull(supabase, conventionId),
    supabase
      .from("book_convention_books")
      .select("id, convention_id")
      .eq("id", bookId)
      .eq("convention_id", conventionId)
      .maybeSingle(),
  ]);

  if (!convention) {
    return privateJson({ error: "Convenzione libri non trovata." }, 404);
  }

  if (bookResult.error) throw bookResult.error;
  if (!bookResult.data) return privateJson({ error: "Libro o bundle non trovato." }, 404);

  const bytes = new Uint8Array(await image.arrayBuffer());
  if (!productImageMatchesMime(bytes, image.type)) {
    return privateJson(
      { error: "Il contenuto del file non corrisponde a un’immagine valida." },
      400
    );
  }

  const objectPath = `products/${conventionId}/${bookId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(objectPath, bytes, {
      cacheControl: "31536000",
      contentType: image.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(objectPath);
  const coverImage = normalizeBookConventionCoverUrl(publicUrlData.publicUrl);

  if (!coverImage) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([objectPath]);
    throw new Error("URL pubblico della copertina non valido.");
  }

  const { data: updatedProduct, error: updateError } = await supabase
    .from("book_convention_books")
    .update({ cover_image: coverImage, updated_at: new Date().toISOString() })
    .eq("id", bookId)
    .eq("convention_id", conventionId)
    .select("id")
    .single();

  if (updateError || !updatedProduct) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([objectPath]);
    throw updateError ?? new Error("Prodotto non più disponibile.");
  }

  return privateJson({
    ok: true,
    book_id: bookId,
    cover_image: coverImage,
    message: "Copertina caricata correttamente.",
  });
}

async function replaceRoundBookLinks(
  supabase: SupabaseClient,
  conventionId: number,
  roundId: string,
  bookIds: number[]
) {
  const { error: deleteError } = await supabase
    .from("book_convention_book_rounds")
    .delete()
    .eq("convention_id", conventionId)
    .eq("round_id", roundId);

  if (deleteError) throw deleteError;
  if (bookIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("book_convention_book_rounds")
    .insert(
      bookIds.map((bookId) => ({
        convention_id: conventionId,
        book_id: bookId,
        round_id: roundId,
      }))
    );

  if (insertError) throw insertError;
}

async function openCollection(
  supabase: SupabaseClient,
  body: Record<string, unknown>
) {
  const conventionId = parsePositiveInteger(body.convention_id);
  const deliveryMode = body.delivery_mode;

  if (!conventionId) {
    return privateJson({ error: "Convenzione non valida." }, 400);
  }

  if (!isDeliveryMode(deliveryMode)) {
    return privateJson(
      { error: "Seleziona una modalità di consegna valida." },
      400
    );
  }

  const convention = await getConventionOrNull(supabase, conventionId);

  if (!convention) {
    return privateJson({ error: "Convenzione libri non trovata." }, 404);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const { data: existingCollection, error: existingCollectionError } = await supabase
    .from("book_convention_rounds")
    .select("id, starts_at, ends_at, delivery_mode")
    .eq("convention_id", conventionId)
    .gt("ends_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingCollectionError) throw existingCollectionError;

  if (existingCollection) {
    return privateJson(
      {
        error: "Esiste già una raccolta aperta o programmata per questa convenzione.",
        round_id: existingCollection.id,
      },
      409
    );
  }

  const { data: activeBooks, error: booksError } = await supabase
    .from("book_convention_books")
    .select("id")
    .eq("convention_id", conventionId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (booksError) throw booksError;

  const activeBookIds = (activeBooks ?? [])
    .map((book) => Number(book.id))
    .filter((bookId) => Number.isInteger(bookId) && bookId > 0);

  if (activeBookIds.length === 0) {
    return privateJson(
      { error: "Attiva almeno un libro o bundle prima di aprire la raccolta." },
      409
    );
  }

  const { data: createdRound, error: createError } = await supabase
    .from("book_convention_rounds")
    .insert({
      convention_id: conventionId,
      starts_at: nowIso,
      ends_at: OPEN_COLLECTION_ENDS_AT,
      delivery_mode: deliveryMode,
    })
    .select("id, convention_id, starts_at, ends_at, delivery_mode, created_at")
    .single();

  if (createError) {
    if (createError.code === "23P01") {
      return privateJson(
        { error: "Esiste già una raccolta aperta o programmata per questa convenzione." },
        409
      );
    }
    throw createError;
  }

  const createdRoundId = String(createdRound.id);

  try {
    await replaceRoundBookLinks(
      supabase,
      conventionId,
      createdRoundId,
      activeBookIds
    );

    const { error: activateError } = await supabase
      .from("book_conventions")
      .update({ attiva: true })
      .eq("id", conventionId);

    if (activateError) throw activateError;
  } catch (error) {
    await supabase
      .from("book_convention_book_rounds")
      .delete()
      .eq("convention_id", conventionId)
      .eq("round_id", createdRoundId);
    await supabase
      .from("book_convention_rounds")
      .delete()
      .eq("id", createdRoundId)
      .eq("convention_id", conventionId);
    throw error;
  }

  return privateJson({
    ok: true,
    round: createdRound,
    round_id: createdRoundId,
    message: "Nuova raccolta ordini aperta.",
  });
}

async function closeCollection(
  supabase: SupabaseClient,
  body: Record<string, unknown>
) {
  const conventionId = parsePositiveInteger(body.convention_id);
  const requestedRoundId = cleanString(body.round_id);

  if (!conventionId) {
    return privateJson({ error: "Convenzione non valida." }, 400);
  }

  if (requestedRoundId && !UUID_PATTERN.test(requestedRoundId)) {
    return privateJson({ error: "Raccolta non valida." }, 400);
  }

  const convention = await getConventionOrNull(supabase, conventionId);

  if (!convention) {
    return privateJson({ error: "Convenzione libri non trovata." }, 404);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  let activeRoundQuery = supabase
    .from("book_convention_rounds")
    .select("id, convention_id, starts_at, ends_at, delivery_mode, created_at")
    .eq("convention_id", conventionId)
    .lte("starts_at", nowIso)
    .gt("ends_at", nowIso)
    .order("starts_at", { ascending: false })
    .limit(1);

  if (requestedRoundId) {
    activeRoundQuery = activeRoundQuery.eq("id", requestedRoundId);
  }

  const { data: activeRound, error: roundError } = await activeRoundQuery.maybeSingle();

  if (roundError) throw roundError;

  if (!activeRound) {
    return privateJson({ error: "Non risulta alcuna raccolta aperta da chiudere." }, 409);
  }

  const startsAt = new Date(activeRound.starts_at).getTime();
  const closeAt = new Date(Math.max(now.getTime(), startsAt + 1)).toISOString();
  const { data: closedRound, error: closeError } = await supabase
    .from("book_convention_rounds")
    .update({ ends_at: closeAt })
    .eq("id", activeRound.id)
    .eq("convention_id", conventionId)
    .gt("ends_at", nowIso)
    .select("id, convention_id, starts_at, ends_at, delivery_mode, created_at")
    .maybeSingle();

  if (closeError) throw closeError;

  if (!closedRound) {
    return privateJson({ error: "La raccolta risulta già chiusa." }, 409);
  }

  return privateJson({
    ok: true,
    round: closedRound,
    round_id: String(closedRound.id),
    message: "Raccolta ordini chiusa. Lo storico è stato conservato.",
  });
}

async function getBooksWithRoundIds(
  supabase: SupabaseClient,
  conventionIds: number[]
) {
  let booksQuery = supabase
    .from("book_convention_books")
    .select(
      "id, convention_id, title, price, original_price, isbn, reference_year, description, sort_order, product_type, bundle_items, study_area, is_active, cover_image, created_at, updated_at"
    )
    .order("study_area", { ascending: true })
    .order("reference_year", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  let linksQuery = supabase
    .from("book_convention_book_rounds")
    .select("book_id, round_id, convention_id");

  if (conventionIds.length > 0) {
    booksQuery = booksQuery.in("convention_id", conventionIds);
    linksQuery = linksQuery.in("convention_id", conventionIds);
  }

  const [booksResult, linksResult] = await Promise.all([booksQuery, linksQuery]);

  if (booksResult.error) throw booksResult.error;
  if (linksResult.error) throw linksResult.error;

  const roundIdsByBook = new Map<number, string[]>();

  for (const link of linksResult.data ?? []) {
    const bookId = Number(link.book_id);
    if (!Number.isInteger(bookId)) continue;
    const current = roundIdsByBook.get(bookId) ?? [];
    current.push(String(link.round_id));
    roundIdsByBook.set(bookId, current);
  }

  return {
    books: (booksResult.data ?? []).map((book) => ({
      ...book,
      cover_image: normalizeBookConventionCoverUrl(book.cover_image),
      round_ids: roundIdsByBook.get(Number(book.id)) ?? [],
    })),
    links: linksResult.data ?? [],
  };
}

export async function GET(req: NextRequest) {
  const auth = await getAdminAuth();
  if (!auth.authorized) return unauthorizedResponse(auth);

  try {
    const supabase = getAdminClient();
    const { searchParams } = req.nextUrl;
    const roundId = cleanString(searchParams.get("round_id"));
    const bookIdParam = searchParams.get("book_id");
    const conventionIdParam = searchParams.get("convention_id");
    const paymentMethodParam = searchParams.get("payment_method");
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("page_size");
    const bookId = bookIdParam ? parsePositiveInteger(bookIdParam) : null;
    const conventionId = conventionIdParam
      ? parsePositiveInteger(conventionIdParam)
      : null;
    const page = pageParam ? parsePositiveInteger(pageParam) : 1;
    const requestedPageSize = pageSizeParam ? parsePositiveInteger(pageSizeParam) : 500;

    if (roundId && !UUID_PATTERN.test(roundId)) {
      return privateJson({ error: "Raccolta non valida." }, 400);
    }

    if (bookIdParam && !bookId) {
      return privateJson({ error: "Libro o bundle non valido." }, 400);
    }

    if (conventionIdParam && !conventionId) {
      return privateJson({ error: "Convenzione non valida." }, 400);
    }

    if (paymentMethodParam && !isPaymentMethod(paymentMethodParam)) {
      return privateJson({ error: "Metodo di pagamento non valido." }, 400);
    }

    if (!page || !requestedPageSize || requestedPageSize > 500) {
      return privateJson(
        { error: "Paginazione non valida. Il numero massimo di righe per pagina è 500." },
        400
      );
    }

    const pageSize = requestedPageSize;
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let conventionsQuery = supabase
      .from("book_conventions")
      .select("id, titolo, descrizione, ordine, attiva, created_at, updated_at")
      .order("ordine", { ascending: true })
      .order("id", { ascending: true });

    if (conventionId) conventionsQuery = conventionsQuery.eq("id", conventionId);

    const { data: conventions, error: conventionsError } = await conventionsQuery;
    if (conventionsError) throw conventionsError;

    const conventionIds = (conventions ?? []).map((item) => Number(item.id));

    if (conventionIds.length === 0) {
      return privateJson({
        ok: true,
        conventions: [],
        books: [],
        rounds: [],
        bookRoundLinks: [],
        adhesions: [],
        selectedRoundId: roundId || null,
        selectedBookId: bookId,
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const roundsQuery = supabase
      .from("book_convention_rounds")
      .select(`
        id,
        convention_id,
        starts_at,
        ends_at,
        delivery_mode,
        created_at,
        book_conventions (
          id,
          titolo
        )
      `)
      .in("convention_id", conventionIds)
      .order("starts_at", { ascending: false });

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
        book_convention_rounds (
          id,
          starts_at,
          ends_at,
          delivery_mode,
          created_at,
          book_conventions (
            id,
            titolo
          )
        )
      `, { count: "exact" })
      .in("convention_id", conventionIds)
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (roundId) adhesionsQuery = adhesionsQuery.eq("round_id", roundId);
    if (bookId) adhesionsQuery = adhesionsQuery.contains("selected_book_ids", [bookId]);
    if (paymentMethodParam) {
      adhesionsQuery = adhesionsQuery.eq("payment_method", paymentMethodParam);
    }

    const [roundsResult, booksWithLinks, adhesionsResult] = await Promise.all([
      roundsQuery,
      getBooksWithRoundIds(supabase, conventionIds),
      adhesionsQuery,
    ]);

    if (roundsResult.error) throw roundsResult.error;
    if (adhesionsResult.error) throw adhesionsResult.error;

    return privateJson({
      ok: true,
      conventions: conventions ?? [],
      books: booksWithLinks.books,
      rounds: roundsResult.data ?? [],
      bookRoundLinks: booksWithLinks.links,
      adhesions: adhesionsResult.data ?? [],
      selectedRoundId: roundId || null,
      selectedBookId: bookId,
      pagination: {
        page,
        pageSize,
        total: adhesionsResult.count ?? 0,
        totalPages: Math.ceil((adhesionsResult.count ?? 0) / pageSize),
      },
    });
  } catch (error) {
    logRouteError("Errore caricamento admin convenzione libri", error);
    return privateJson(
      { error: "Non è stato possibile caricare i dati della convenzione libri." },
      500
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAdminAuth();
  if (!auth.authorized) return unauthorizedResponse(auth);

  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    try {
      return await uploadProductCover(getAdminClient(), req);
    } catch (error) {
      logRouteError("Errore upload copertina convenzione libri", error);
      return privateJson(
        { error: "Non è stato possibile caricare la copertina." },
        500
      );
    }
  }

  let body: Record<string, unknown> = {};

  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  try {
    const supabase = getAdminClient();

    if (body.action === "open_collection") {
      return await openCollection(supabase, body);
    }

    if (body.action === "close_collection") {
      return await closeCollection(supabase, body);
    }

    if (body.action === "save_round") {
      return privateJson(
        { error: "Le raccolte si aprono e si chiudono dai comandi dedicati; la modifica manuale non è più disponibile." },
        409
      );
    }

    if (body.action === "set_convention_active") {
      const conventionId = parsePositiveInteger(body.convention_id);

      if (!conventionId || typeof body.is_active !== "boolean") {
        return privateJson({ error: "Stato della convenzione non valido." }, 400);
      }

      const convention = await getConventionOrNull(supabase, conventionId);

      if (!convention) {
        return privateJson({ error: "Convenzione libri non trovata." }, 404);
      }

      if (body.is_active === false) {
        const nowIso = new Date().toISOString();
        const { data: activeRound, error: activeRoundError } = await supabase
          .from("book_convention_rounds")
          .select("id")
          .eq("convention_id", conventionId)
          .lte("starts_at", nowIso)
          .gt("ends_at", nowIso)
          .limit(1)
          .maybeSingle();

        if (activeRoundError) throw activeRoundError;
        if (activeRound) {
          return privateJson(
            { error: "Chiudi prima la raccolta ordini attualmente aperta." },
            409
          );
        }
      }

      const { error: updateError } = await supabase
        .from("book_conventions")
        .update({ attiva: body.is_active })
        .eq("id", conventionId);

      if (updateError) throw updateError;

      return privateJson({
        ok: true,
        message: body.is_active
          ? "Convenzione libri attivata."
          : "Convenzione libri disattivata.",
      });
    }

    if (body.action === "remove_product_image") {
      const conventionId = parsePositiveInteger(body.convention_id);
      const bookId = parsePositiveInteger(body.book_id);

      if (!conventionId || !bookId) {
        return privateJson({ error: "Libro, bundle o convenzione non validi." }, 400);
      }

      const convention = await getConventionOrNull(supabase, conventionId);
      if (!convention) {
        return privateJson({ error: "Convenzione libri non trovata." }, 404);
      }

      const { data: product, error: productError } = await supabase
        .from("book_convention_books")
        .select("id")
        .eq("id", bookId)
        .eq("convention_id", conventionId)
        .maybeSingle();

      if (productError) throw productError;
      if (!product) return privateJson({ error: "Libro o bundle non trovato." }, 404);

      const { data: updatedProduct, error: removeError } = await supabase
        .from("book_convention_books")
        .update({ cover_image: null, updated_at: new Date().toISOString() })
        .eq("id", bookId)
        .eq("convention_id", conventionId)
        .select("id")
        .single();

      if (removeError) throw removeError;
      if (!updatedProduct) {
        return privateJson({ error: "Libro o bundle non trovato." }, 404);
      }

      return privateJson({
        ok: true,
        message: "Copertina rimossa dal prodotto.",
      });
    }

    const conventionId = body.convention_id
      ? parsePositiveInteger(body.convention_id)
      : null;
    const requestedTitle = cleanString(body.title);
    const description = cleanString(body.description);

    if (body.convention_id && !conventionId) {
      return privateJson({ error: "Convenzione non valida." }, 400);
    }

    if (description.length > 6000) {
      return privateJson({ error: "Uno o più campi della convenzione sono troppo lunghi." }, 400);
    }

    let books: NormalizedBookInput[];

    try {
      books = normalizeBooks(body.books);
    } catch (error) {
      return privateJson(
        { error: error instanceof Error ? error.message : "Lista prodotti non valida." },
        400
      );
    }

    const title = books.length === 1 ? books[0].title : requestedTitle;

    if (!title || title.length > 240) {
      return privateJson({ error: "Inserisci un titolo valido per la convenzione." }, 400);
    }

    let savedConventionId = conventionId;

    if (savedConventionId) {
      const existingConvention = await getConventionOrNull(supabase, savedConventionId);

      if (!existingConvention) {
        return privateJson({ error: "Convenzione libri non trovata." }, 404);
      }

      const nowIso = new Date().toISOString();
      const { data: activeCollection, error: activeCollectionError } = await supabase
        .from("book_convention_rounds")
        .select("id")
        .eq("convention_id", savedConventionId)
        .lte("starts_at", nowIso)
        .gt("ends_at", nowIso)
        .limit(1)
        .maybeSingle();

      if (activeCollectionError) throw activeCollectionError;
      if (activeCollection) {
        return privateJson(
          { error: "Chiudi prima la raccolta ordini per modificare il catalogo." },
          409
        );
      }

      const conventionPatch: Record<string, unknown> = {
        titolo: title,
        descrizione: description || null,
      };

      if (typeof body.attiva === "boolean") conventionPatch.attiva = body.attiva;

      const ordine = parseInteger(body.ordine);
      if (ordine !== null) {
        if (ordine < 0 || ordine > 100_000) {
          return privateJson({ error: "Ordine della convenzione non valido." }, 400);
        }
        conventionPatch.ordine = ordine;
      }

      const { error: conventionError } = await supabase
        .from("book_conventions")
        .update(conventionPatch)
        .eq("id", savedConventionId);

      if (conventionError) throw conventionError;
    } else {
      const ordine = parseInteger(body.ordine) ?? 0;
      if (ordine < 0 || ordine > 100_000) {
        return privateJson({ error: "Ordine della convenzione non valido." }, 400);
      }

      const { data: createdConvention, error: conventionError } = await supabase
        .from("book_conventions")
        .insert({
          titolo: title,
          descrizione: description || null,
          ordine,
          attiva: typeof body.attiva === "boolean" ? body.attiva : true,
        })
        .select("id")
        .single();

      if (conventionError) throw conventionError;
      savedConventionId = Number(createdConvention.id);
    }

    if (!savedConventionId) throw new Error("Convenzione non salvata.");

    const currentBooksResult = await supabase
      .from("book_convention_books")
      .select(
        "id, convention_id, title, price, original_price, isbn, reference_year, description, sort_order, product_type, bundle_items, study_area, is_active, cover_image"
      )
      .eq("convention_id", savedConventionId);

    if (currentBooksResult.error) throw currentBooksResult.error;

    const currentBooks = (currentBooksResult.data ?? []) as ExistingBookRow[];
    const currentBooksById = new Map(currentBooks.map((book) => [Number(book.id), book]));

    for (const book of books) {
      if (book.id && !currentBooksById.has(book.id)) {
        return privateJson(
          { error: `Il prodotto “${book.title}” non appartiene alla convenzione selezionata.` },
          400
        );
      }

    }

    const incomingExistingIds = new Set(
      books.map((book) => book.id).filter((id): id is number => id !== null)
    );
    const removedBookIds = currentBooks
      .map((book) => Number(book.id))
      .filter((bookId) => !incomingExistingIds.has(bookId));

    if (removedBookIds.length > 0) {
      const { error: deactivateError } = await supabase
        .from("book_convention_books")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("convention_id", savedConventionId)
        .in("id", removedBookIds);

      if (deactivateError) throw deactivateError;
    }

    const savedBookIds: number[] = [];

    for (const book of books) {
      const existing = book.id ? currentBooksById.get(book.id) : null;
      const requestedBundleItems =
        book.bundle_items ?? normalizeBundleItems(existing?.bundle_items);

      if (requestedBundleItems.length === 1) {
        throw new Error(
          `La proposta “${book.title}” deve contenere un solo libro oppure almeno due libri per formare un bundle.`
        );
      }

      const productType: ProductType =
        requestedBundleItems.length >= 2 ? "bundle" : "book";
      const bundleItems = productType === "bundle" ? requestedBundleItems : [];
      const studyArea = book.study_area ?? existing?.study_area ?? STUDY_AREAS[0];
      const isActive = book.is_active ?? existing?.is_active ?? true;
      const isbn = book.isbn !== undefined ? book.isbn : existing?.isbn ?? null;
      const originalPrice =
        book.original_price !== undefined
          ? book.original_price
          : parseNullableNumber(existing?.original_price);

      if (
        originalPrice !== null &&
        (originalPrice < book.price || originalPrice > 1_000_000)
      ) {
        return privateJson(
          {
            error: `Il prezzo originale di “${book.title}” non può essere inferiore al prezzo convenzionato.`,
          },
          400
        );
      }

      validateResolvedProduct({
        title: book.title,
        product_type: productType,
        bundle_items: bundleItems,
      });

      const productPayload = {
        title: book.title,
        price: book.price,
        original_price: originalPrice,
        isbn,
        reference_year: book.reference_year,
        description: book.description,
        sort_order: book.sort_order,
        product_type: productType,
        bundle_items: bundleItems,
        study_area: studyArea,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      let savedBookId: number;

      if (book.id) {
        const { data: updatedBook, error: updateError } = await supabase
          .from("book_convention_books")
          .update(productPayload)
          .eq("id", book.id)
          .eq("convention_id", savedConventionId)
          .select("id")
          .single();

        if (updateError) throw updateError;
        savedBookId = Number(updatedBook.id);
      } else {
        const { data: insertedBook, error: insertError } = await supabase
          .from("book_convention_books")
          .insert({
            convention_id: savedConventionId,
            ...productPayload,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        savedBookId = Number(insertedBook.id);
      }

      savedBookIds.push(savedBookId);

    }

    return privateJson({
      ok: true,
      convention_id: savedConventionId,
      saved_book_ids: savedBookIds,
      deactivated_book_ids: removedBookIds,
      message: "Convenzione libri salvata correttamente.",
    });
  } catch (error) {
    logRouteError("Errore salvataggio admin convenzione libri", error);

    if (error && typeof error === "object" && "code" in error) {
      const code = String((error as { code?: unknown }).code ?? "");
      if (code === "23P01") {
        return privateJson(
          { error: "Le date della raccolta si sovrappongono a una raccolta esistente." },
          409
        );
      }
    }

    return privateJson(
      { error: "Non è stato possibile salvare la convenzione libri." },
      500
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAdminAuth();
  if (!auth.authorized) return unauthorizedResponse(auth);

  let body: Record<string, unknown> = {};

  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const adhesionId = cleanString(body.adhesion_id);
  const roundId = cleanString(body.round_id);
  const bookId = body.book_id ? parsePositiveInteger(body.book_id) : null;
  const conventionId = body.convention_id
    ? parsePositiveInteger(body.convention_id)
    : null;
  const targetCount = [Boolean(adhesionId), Boolean(roundId), Boolean(bookId), Boolean(conventionId)]
    .filter(Boolean)
    .length;

  if (targetCount !== 1) {
    return privateJson({ error: "Indica un solo elemento da rimuovere." }, 400);
  }

  if (adhesionId && !UUID_PATTERN.test(adhesionId)) {
    return privateJson({ error: "Adesione non valida." }, 400);
  }

  if (roundId && !UUID_PATTERN.test(roundId)) {
    return privateJson({ error: "Raccolta non valida." }, 400);
  }

  try {
    const supabase = getAdminClient();

    if (adhesionId) {
      const { data: adhesion, error } = await supabase
        .from("book_convention_adhesions")
        .select("id")
        .eq("id", adhesionId)
        .maybeSingle();

      if (error) throw error;
      if (!adhesion) return privateJson({ error: "Adesione non trovata." }, 404);

      return privateJson(
        {
          error:
            "Le adesioni registrate costituiscono lo storico della convenzione e non possono essere eliminate.",
        },
        409
      );
    }

    if (bookId) {
      let bookQuery = supabase
        .from("book_convention_books")
        .select("id, convention_id, title, is_active")
        .eq("id", bookId);

      if (body.book_convention_id) {
        const bookConventionId = parsePositiveInteger(body.book_convention_id);
        if (!bookConventionId) {
          return privateJson({ error: "Convenzione non valida." }, 400);
        }
        bookQuery = bookQuery.eq("convention_id", bookConventionId);
      }

      const { data: book, error: bookError } = await bookQuery.maybeSingle();
      if (bookError) throw bookError;
      if (!book) return privateJson({ error: "Libro o bundle non trovato." }, 404);

      const nowIso = new Date().toISOString();
      const { data: activeCollection, error: activeCollectionError } = await supabase
        .from("book_convention_rounds")
        .select("id")
        .eq("convention_id", book.convention_id)
        .lte("starts_at", nowIso)
        .gt("ends_at", nowIso)
        .limit(1)
        .maybeSingle();

      if (activeCollectionError) throw activeCollectionError;
      if (activeCollection) {
        return privateJson(
          { error: "Chiudi prima la raccolta ordini per disattivare il prodotto." },
          409
        );
      }

      const { error: deactivateError } = await supabase
        .from("book_convention_books")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", bookId);

      if (deactivateError) throw deactivateError;

      return privateJson({
        ok: true,
        softDeleted: true,
        message: "Libro o bundle disattivato. Lo storico delle adesioni è stato conservato.",
      });
    }

    if (roundId) {
      return privateJson(
        {
          error:
            "Le raccolte ordini costituiscono lo storico degli export e non possono essere eliminate.",
        },
        409
      );
    }

    if (conventionId) {
      if (body.delete_history !== true) {
        return privateJson(
          {
            error:
              "Conferma esplicitamente l’eliminazione definitiva della convenzione e dello storico.",
          },
          400
        );
      }

      const convention = await getConventionOrNull(supabase, conventionId);

      if (!convention) {
        return privateJson({ error: "Convenzione libri non trovata." }, 404);
      }

      const { data: deletionSummary, error: conventionDeleteError } = await supabase
        .rpc("delete_book_convention_with_history", {
          p_convention_id: conventionId,
        });

      if (conventionDeleteError) {
        if (conventionDeleteError.code === "PGRST202") {
          return privateJson(
            {
              error:
                "La cancellazione definitiva non è ancora configurata nel database.",
            },
            503
          );
        }

        if (conventionDeleteError.code === "P0002") {
          return privateJson({ error: "Convenzione libri non trovata." }, 404);
        }

        throw conventionDeleteError;
      }

      const validDeletionSummary =
        deletionSummary !== null &&
        typeof deletionSummary === "object" &&
        !Array.isArray(deletionSummary) &&
        (deletionSummary as Record<string, unknown>).deleted === true;

      if (!validDeletionSummary) {
        throw new Error(
          "La procedura di cancellazione non ha confermato l’eliminazione della convenzione."
        );
      }

      let coverCleanupFailed = false;
      const removedCoverPaths = new Set<string>();

      // Lo storico nel database è già stato cancellato atomicamente. La pulizia
      // Storage resta separata: un problema temporaneo sui file non deve lasciare
      // la convenzione in uno stato parzialmente eliminato.
      for (let cleanupPass = 0; cleanupPass < 2; cleanupPass += 1) {
        try {
          const coverPaths = (await listConventionProductImages(supabase, conventionId))
            .filter(path => !removedCoverPaths.has(path));

          for (let index = 0; index < coverPaths.length; index += 100) {
            const paths = coverPaths.slice(index, index + 100);
            const { error: coverDeleteError } = await supabase.storage
              .from(PRODUCT_IMAGE_BUCKET)
              .remove(paths);

            if (coverDeleteError) {
              coverCleanupFailed = true;
              logRouteError(
                `Errore pulizia copertine convenzione libri ${conventionId}`,
                coverDeleteError
              );
              continue;
            }

            paths.forEach(path => removedCoverPaths.add(path));
          }
        } catch (coverListError) {
          coverCleanupFailed = true;
          logRouteError(
            `Errore lettura copertine convenzione libri ${conventionId}`,
            coverListError
          );
        }
      }

      return privateJson({
        ok: true,
        deleted: true,
        message: "Convenzione, catalogo, raccolte e adesioni storiche eliminati definitivamente.",
        deletion_summary: deletionSummary,
        ...(coverCleanupFailed
          ? { warning: "Alcuni file immagine non sono stati rimossi dallo storage." }
          : {}),
      });
    }

    return privateJson({ error: "Richiesta non valida." }, 400);
  } catch (error) {
    logRouteError("Errore rimozione admin convenzione libri", error);
    return privateJson(
      { error: "Non è stato possibile completare l’operazione richiesta." },
      500
    );
  }
}
