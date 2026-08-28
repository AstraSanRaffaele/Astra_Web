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
  PRODUCT_TYPES,
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
  reference_year?: unknown;
  description?: unknown;
  sort_order?: unknown;
  product_type?: unknown;
  bundle_items?: unknown;
  study_area?: unknown;
  is_active?: unknown;
  round_ids?: unknown;
};

type NormalizedBookInput = {
  id: number | null;
  title: string;
  price: number;
  reference_year: BookYear;
  description: string | null;
  sort_order: number;
  product_type: ProductType | undefined;
  bundle_items: string[] | undefined;
  study_area: StudyArea | undefined;
  is_active: boolean | undefined;
  round_ids: string[] | undefined;
};

type ExistingBookRow = {
  id: number;
  convention_id: number;
  title: string;
  price: number | string | null;
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

function isProductType(value: unknown): value is ProductType {
  return (
    typeof value === "string" && PRODUCT_TYPES.includes(value as ProductType)
  );
}

function isStudyArea(value: unknown): value is StudyArea {
  return typeof value === "string" && STUDY_AREAS.includes(value as StudyArea);
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

function normalizeRoundIds(value: unknown) {
  const roundIds = normalizeStringArray(value, "Lista periodi", 100, 36);

  if (roundIds?.some((roundId) => !UUID_PATTERN.test(roundId))) {
    throw new Error("Uno o più periodi selezionati non sono validi.");
  }

  return roundIds;
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
    const title = cleanString(book.title);
    const price = parseNullableNumber(book.price);
    const description = cleanString(book.description);
    const sortOrder = parseInteger(book.sort_order) ?? index;
    const productType =
      book.product_type === undefined
        ? undefined
        : isProductType(book.product_type)
          ? book.product_type
          : null;
    const studyArea =
      book.study_area === undefined
        ? undefined
        : isStudyArea(book.study_area)
          ? book.study_area
          : null;

    if (book.id !== null && book.id !== undefined && book.id !== "" && !id) {
      throw new Error(`Identificativo non valido per: ${title || `elemento ${index + 1}`}`);
    }

    if (!title || title.length > 240) {
      throw new Error("Ogni libro o bundle deve avere un titolo valido.");
    }

    if (price === null || price < 0 || price > 1_000_000) {
      throw new Error(`Prezzo non valido per: ${title}`);
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

    if (productType === null) {
      throw new Error(`Tipo prodotto non valido per: ${title}`);
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
      reference_year: book.reference_year,
      description: description || null,
      sort_order: sortOrder,
      product_type: productType,
      bundle_items: normalizeStringArray(
        book.bundle_items,
        `Contenuto bundle “${title}”`,
        50,
        240
      ),
      study_area: studyArea,
      is_active: book.is_active as boolean | undefined,
      round_ids: normalizeRoundIds(book.round_ids),
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
  if (product.product_type === "bundle" && product.bundle_items.length === 0) {
    throw new Error(`Il bundle “${product.title}” deve contenere almeno un prodotto.`);
  }

  if (product.product_type === "book" && product.bundle_items.length > 0) {
    throw new Error(`Un libro singolo non può avere prodotti inclusi: ${product.title}`);
  }
}
async function getConventionOrNull(supabase: SupabaseClient, conventionId: number) {
  const { data, error } = await supabase
    .from("convenzioni")
    .select("id, titolo, is_book_convention, attiva")
    .eq("id", conventionId)
    .maybeSingle();

  if (error) throw error;
  return data;
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

  if (!convention || convention.is_book_convention !== true) {
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

async function replaceBookRoundLinks(
  supabase: SupabaseClient,
  conventionId: number,
  bookId: number,
  roundIds: string[]
) {
  const { error: deleteError } = await supabase
    .from("book_convention_book_rounds")
    .delete()
    .eq("convention_id", conventionId)
    .eq("book_id", bookId);

  if (deleteError) throw deleteError;

  if (roundIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("book_convention_book_rounds")
    .insert(
      roundIds.map((roundId) => ({
        convention_id: conventionId,
        book_id: bookId,
        round_id: roundId,
      }))
    );

  if (insertError) throw insertError;
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

  if (!conventionId) {
    return privateJson({ error: "Convenzione non valida." }, 400);
  }

  const convention = await getConventionOrNull(supabase, conventionId);

  if (!convention || convention.is_book_convention !== true) {
    return privateJson({ error: "Convenzione libri non trovata." }, 404);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const { data: existingCollection, error: existingCollectionError } = await supabase
    .from("book_convention_rounds")
    .select("id, starts_at, ends_at")
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
    })
    .select("id, convention_id, starts_at, ends_at")
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
      .from("convenzioni")
      .update({ attiva: true })
      .eq("id", conventionId)
      .eq("is_book_convention", true);

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

  if (!convention || convention.is_book_convention !== true) {
    return privateJson({ error: "Convenzione libri non trovata." }, 404);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  let activeRoundQuery = supabase
    .from("book_convention_rounds")
    .select("id, convention_id, starts_at, ends_at")
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
    .select("id, convention_id, starts_at, ends_at")
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
      "id, convention_id, title, price, reference_year, description, sort_order, product_type, bundle_items, study_area, is_active, cover_image, created_at, updated_at"
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

async function saveRound(
  supabase: SupabaseClient,
  body: Record<string, unknown>
) {
  const conventionId = parsePositiveInteger(body.convention_id);
  const roundId = cleanString(body.round_id);
  const startsAtValue = cleanString(body.starts_at);
  const endsAtValue = cleanString(body.ends_at);
  const startsAt = new Date(startsAtValue);
  const endsAt = new Date(endsAtValue);

  if (!conventionId) {
    return privateJson({ error: "Convenzione non valida." }, 400);
  }

  if (roundId && !UUID_PATTERN.test(roundId)) {
    return privateJson({ error: "Periodo non valido." }, 400);
  }

  if (
    !startsAtValue ||
    !endsAtValue ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    endsAt.getTime() <= startsAt.getTime()
  ) {
    return privateJson({ error: "Inserisci un intervallo temporale valido." }, 400);
  }

  const convention = await getConventionOrNull(supabase, conventionId);

  if (!convention || convention.is_book_convention !== true) {
    return privateJson({ error: "Convenzione libri non trovata." }, 404);
  }

  let bookIds: number[] | undefined;

  if (body.book_ids !== undefined) {
    if (!Array.isArray(body.book_ids)) {
      return privateJson({ error: "Lista prodotti del periodo non valida." }, 400);
    }

    bookIds = Array.from(
      new Set(
        body.book_ids
          .map((bookId) => parsePositiveInteger(bookId))
          .filter((bookId): bookId is number => bookId !== null)
      )
    );

    if (bookIds.length !== body.book_ids.length) {
      return privateJson({ error: "Uno o più prodotti del periodo non sono validi." }, 400);
    }
  }

  if (bookIds !== undefined && bookIds.length > 0) {
    const { data: matchingBooks, error: booksError } = await supabase
      .from("book_convention_books")
      .select("id")
      .eq("convention_id", conventionId)
      .in("id", bookIds);

    if (booksError) throw booksError;

    if ((matchingBooks ?? []).length !== bookIds.length) {
      return privateJson(
        { error: "Uno o più prodotti non appartengono alla convenzione selezionata." },
        400
      );
    }
  }

  let savedRoundId = roundId;

  if (roundId) {
    const { data: existingRound, error: roundError } = await supabase
      .from("book_convention_rounds")
      .select("id")
      .eq("id", roundId)
      .eq("convention_id", conventionId)
      .maybeSingle();

    if (roundError) throw roundError;
    if (!existingRound) return privateJson({ error: "Periodo non trovato." }, 404);

    const { error: updateError } = await supabase
      .from("book_convention_rounds")
      .update({
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .eq("id", roundId)
      .eq("convention_id", conventionId);

    if (updateError) {
      if (updateError.code === "23P01") {
        return privateJson(
          { error: "Il periodo si sovrappone a un altro periodo della convenzione." },
          409
        );
      }
      throw updateError;
    }
  } else {
    const { data: createdRound, error: createError } = await supabase
      .from("book_convention_rounds")
      .insert({
        convention_id: conventionId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select("id")
      .single();

    if (createError) {
      if (createError.code === "23P01") {
        return privateJson(
          { error: "Il periodo si sovrappone a un altro periodo della convenzione." },
          409
        );
      }
      throw createError;
    }

    savedRoundId = String(createdRound.id);
  }

  if (bookIds === undefined && !roundId) {
    const { data: activeBooks, error: booksError } = await supabase
      .from("book_convention_books")
      .select("id")
      .eq("convention_id", conventionId)
      .eq("is_active", true);

    if (booksError) throw booksError;
    bookIds = (activeBooks ?? []).map((book) => Number(book.id));
  }

  if (bookIds !== undefined) {
    const { error: deleteLinksError } = await supabase
      .from("book_convention_book_rounds")
      .delete()
      .eq("convention_id", conventionId)
      .eq("round_id", savedRoundId);

    if (deleteLinksError) throw deleteLinksError;

    if (bookIds.length > 0) {
      const { error: insertLinksError } = await supabase
        .from("book_convention_book_rounds")
        .insert(
          bookIds.map((bookId) => ({
            convention_id: conventionId,
            book_id: bookId,
            round_id: savedRoundId,
          }))
        );

      if (insertLinksError) throw insertLinksError;
    }
  }

  return privateJson({
    ok: true,
    round_id: savedRoundId,
    message: roundId ? "Periodo aggiornato correttamente." : "Periodo creato correttamente.",
  });
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
      return privateJson({ error: "Periodo non valido." }, 400);
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
      .from("convenzioni")
      .select(
        "id, titolo, partner, categoria, descrizione, vantaggio, link, ordine, attiva, is_book_convention, convenzione_libri, created_at, updated_at"
      )
      .eq("is_book_convention", true)
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
        created_at,
        convenzioni (
          id,
          titolo,
          partner,
          categoria
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
      return await saveRound(supabase, body);
    }

    if (body.action === "set_convention_active") {
      const conventionId = parsePositiveInteger(body.convention_id);

      if (!conventionId || typeof body.is_active !== "boolean") {
        return privateJson({ error: "Stato della convenzione non valido." }, 400);
      }

      const convention = await getConventionOrNull(supabase, conventionId);

      if (!convention || convention.is_book_convention !== true) {
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
        .from("convenzioni")
        .update({ attiva: body.is_active })
        .eq("id", conventionId)
        .eq("is_book_convention", true);

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
      if (!convention || convention.is_book_convention !== true) {
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
    const title = cleanString(body.title);
    const description = cleanString(body.description);
    const partner = cleanString(body.partner);

    if (body.convention_id && !conventionId) {
      return privateJson({ error: "Convenzione non valida." }, 400);
    }

    if (!title || title.length > 240) {
      return privateJson({ error: "Inserisci un titolo valido per la convenzione." }, 400);
    }

    if (description.length > 6000 || partner.length > 240) {
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

    let savedConventionId = conventionId;

    if (savedConventionId) {
      const existingConvention = await getConventionOrNull(supabase, savedConventionId);

      if (!existingConvention || existingConvention.is_book_convention !== true) {
        return privateJson({ error: "Convenzione libri non trovata." }, 404);
      }

      const conventionPatch: Record<string, unknown> = {
        titolo: title,
        descrizione: description || null,
        partner: partner || null,
        is_book_convention: true,
        convenzione_libri: true,
      };

      if (typeof body.attiva === "boolean") conventionPatch.attiva = body.attiva;
      if (typeof body.vantaggio === "string") {
        conventionPatch.vantaggio = cleanString(body.vantaggio) || null;
      }
      if (typeof body.categoria === "string") {
        conventionPatch.categoria = cleanString(body.categoria) || "libri";
      }
      if (typeof body.link === "string") conventionPatch.link = cleanString(body.link) || "#";

      const ordine = parseInteger(body.ordine);
      if (ordine !== null) conventionPatch.ordine = ordine;

      const { error: conventionError } = await supabase
        .from("convenzioni")
        .update(conventionPatch)
        .eq("id", savedConventionId);

      if (conventionError) throw conventionError;
    } else {
      const ordine = parseInteger(body.ordine) ?? 0;
      const { data: createdConvention, error: conventionError } = await supabase
        .from("convenzioni")
        .insert({
          titolo: title,
          descrizione: description || null,
          partner: partner || null,
          categoria: cleanString(body.categoria) || "libri",
          vantaggio: cleanString(body.vantaggio) || null,
          link: cleanString(body.link) || "#",
          ordine,
          attiva: typeof body.attiva === "boolean" ? body.attiva : true,
          is_book_convention: true,
          convenzione_libri: true,
        })
        .select("id")
        .single();

      if (conventionError) throw conventionError;
      savedConventionId = Number(createdConvention.id);
    }

    if (!savedConventionId) throw new Error("Convenzione non salvata.");

    const [currentBooksResult, roundsResult] = await Promise.all([
      supabase
        .from("book_convention_books")
        .select(
          "id, convention_id, title, price, reference_year, description, sort_order, product_type, bundle_items, study_area, is_active, cover_image"
        )
        .eq("convention_id", savedConventionId),
      supabase
        .from("book_convention_rounds")
        .select("id")
        .eq("convention_id", savedConventionId),
    ]);

    if (currentBooksResult.error) throw currentBooksResult.error;
    if (roundsResult.error) throw roundsResult.error;

    const currentBooks = (currentBooksResult.data ?? []) as ExistingBookRow[];
    const currentBooksById = new Map(currentBooks.map((book) => [Number(book.id), book]));
    const conventionRoundIds = (roundsResult.data ?? []).map((round) => String(round.id));
    const conventionRoundIdSet = new Set(conventionRoundIds);

    for (const book of books) {
      if (book.id && !currentBooksById.has(book.id)) {
        return privateJson(
          { error: `Il prodotto “${book.title}” non appartiene alla convenzione selezionata.` },
          400
        );
      }

      if (book.round_ids?.some((roundId) => !conventionRoundIdSet.has(roundId))) {
        return privateJson(
          { error: `Uno o più periodi associati a “${book.title}” non sono validi.` },
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
      const productType =
        book.product_type ??
        existing?.product_type ??
        (book.bundle_items && book.bundle_items.length > 0 ? "bundle" : "book");
      const bundleItems =
        productType === "book"
          ? []
          : book.bundle_items ?? normalizeBundleItems(existing?.bundle_items);
      const studyArea = book.study_area ?? existing?.study_area ?? STUDY_AREAS[0];
      const isActive = book.is_active ?? existing?.is_active ?? true;

      validateResolvedProduct({
        title: book.title,
        product_type: productType,
        bundle_items: bundleItems,
      });

      const productPayload = {
        title: book.title,
        price: book.price,
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

      const roundIdsToSave = book.id
        ? book.round_ids
        : book.round_ids ?? conventionRoundIds;

      if (roundIdsToSave !== undefined) {
        await replaceBookRoundLinks(
          supabase,
          savedConventionId,
          savedBookId,
          roundIdsToSave
        );
      }
    }

    const { data: finalBooks, error: finalBooksError } = await supabase
      .from("book_convention_books")
      .select("id, title, price, is_active")
      .eq("convention_id", savedConventionId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (finalBooksError) throw finalBooksError;

    const { error: legacySnapshotError } = await supabase
      .from("convenzioni")
      .update({
        book_titles: (finalBooks ?? []).map((book) => String(book.title)),
        book_items: (finalBooks ?? []).map((book) => ({
          title: String(book.title),
          price: Number(book.price ?? 0),
        })),
      })
      .eq("id", savedConventionId);

    if (legacySnapshotError) throw legacySnapshotError;

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
          { error: "Le date del periodo si sovrappongono a un periodo esistente." },
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
    return privateJson({ error: "Periodo non valido." }, 400);
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
        .select("id, title, is_active")
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
      const convention = await getConventionOrNull(supabase, conventionId);

      if (!convention || convention.is_book_convention !== true) {
        return privateJson({ error: "Convenzione libri non trovata." }, 404);
      }

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

      const { error: archiveError } = await supabase
        .from("convenzioni")
        .update({ attiva: false })
        .eq("id", conventionId)
        .eq("is_book_convention", true);

      if (archiveError) throw archiveError;

      const { error: deactivateBooksError } = await supabase
        .from("book_convention_books")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("convention_id", conventionId);

      if (deactivateBooksError) throw deactivateBooksError;

      return privateJson({
        ok: true,
        softDeleted: true,
        message: "Convenzione archiviata. Libri, periodi e adesioni storiche sono stati conservati.",
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
