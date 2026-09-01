"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, LayoutDashboard, Plus, Trash2, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  BOOK_YEARS_BY_STUDY_AREA,
  BOOK_YEAR_LABELS,
  DELIVERY_MODE_LABELS,
  STUDY_AREAS,
  STUDY_AREA_LABELS,
  isBookYearAllowedForStudyArea,
  normalizeBookBundleItems,
  type BookBundleItem,
  type BookYear,
  type DeliveryMode,
  type ProductType,
  type StudyArea,
} from "@/lib/book-convention";

// ── Types ─────────────────────────────────────────────────────────
type Convenzione = {
  id: number;
  titolo: string;
  partner?: string | null;
  descrizione?: string | null;
  vantaggio?: string | null;
  categoria?: string | null;
  link?: string | null;
  ordine: number;
  attiva: boolean;
  is_book_convention: boolean | null;
  convenzione_libri?: boolean | null;
  book_titles?: string[] | null;
  book_items?: { title: string; price: number | null }[] | null;
  created_at: string;
  updated_at: string;
};

type ConventionScope = "general" | "books";

type BookConventionBook = {
  id?: number | null;
  convention_id?: number | null;
  title: string;
  price: number | null;
  original_price: number | null;
  isbn: string | null;
  reference_year: BookYear;
  reference_years?: BookYear[] | null;
  description: string | null;
  sort_order: number;
  product_type: ProductType;
  bundle_items: BookBundleItem[];
  study_area: StudyArea;
  is_active: boolean;
  round_ids: string[];
  cover_image: string | null;
  cover_image_file?: File | null;
  cover_image_preview?: string | null;
  remove_cover_image?: boolean;
};

type BookConventionRound = {
  id: string;
  convention_id: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
  delivery_mode: DeliveryMode;
};

type BookConventionAdminApiResponse = {
  conventions?: Convenzione[];
  books?: BookConventionBook[];
  rounds?: BookConventionRound[];
  error?: string;
};

type BookConventionSaveResponse = {
  ok?: boolean;
  convention_id?: number;
  saved_book_ids?: number[];
  error?: string;
};

type ConvForm = {
  titolo: string;
  partner: string;
  descrizione: string;
  vantaggio: string;
  categoria: string;
  link: string;
  ordine: string;
  attiva: boolean;
  is_book_convention: boolean;
  books: BookConventionBook[];
};

type CollectionConfirmation = {
  conventionId: number;
  conventionTitle: string;
  roundId: string;
  exportAfterClose: boolean;
};

type OpenCollectionConfirmation = {
  conventionId: number;
  conventionTitle: string;
  deliveryMode: DeliveryMode;
};

type BookConventionDeleteConfirmation = {
  convention: Convenzione;
  acknowledged: boolean;
};

const EMPTY_FORM: ConvForm = {
  titolo: "",
  partner: "",
  descrizione: "",
  vantaggio: "",
  categoria: "",
  link: "#",
  ordine: "0",
  attiva: true,
  is_book_convention: false,
  books: [],
};

const GENERAL_CATEGORY_OPTIONS = [
  "Trasporti",
  "Sport",
  "Tech",
  "Bar_e_Ristoranti",
  "Altro",
];

const BOOK_CONVENTION_CATEGORY = "Libri_e_Materiale_Didattico";
const BOOK_CONVENTION_INTERNAL_TITLE = "Convenzioni Libri";

function createEmptyBook(sortOrder = 0): BookConventionBook {
  return {
    id: null,
    title: "",
    price: 0,
    original_price: null,
    isbn: null,
    reference_year: "primo_anno",
    reference_years: ["primo_anno"],
    description: "",
    sort_order: sortOrder,
    product_type: "book",
    bundle_items: [],
    study_area: "medicina_chirurgia",
    is_active: true,
    round_ids: [],
    cover_image: null,
  };
}

function getValidReferenceYear(
  studyArea: StudyArea,
  referenceYear: BookYear | null | undefined
): BookYear {
  if (
    referenceYear &&
    isBookYearAllowedForStudyArea(studyArea, referenceYear)
  ) {
    return referenceYear;
  }

  return BOOK_YEARS_BY_STUDY_AREA[studyArea][0];
}

function getValidReferenceYears(
  studyArea: StudyArea,
  referenceYears: unknown,
  legacyReferenceYear: BookYear | null | undefined
): BookYear[] {
  const allowedYears = BOOK_YEARS_BY_STUDY_AREA[studyArea] as readonly BookYear[];
  const selectedYears = new Set(
    Array.isArray(referenceYears)
      ? referenceYears.filter(
        (year): year is BookYear =>
          typeof year === "string" &&
          (allowedYears as readonly string[]).includes(year)
      )
      : []
  );
  const normalizedYears = allowedYears.filter(year => selectedYears.has(year));

  if (normalizedYears.length > 0) return [...normalizedYears];

  return [getValidReferenceYear(studyArea, legacyReferenceYear)];
}

function normalizeEditableBundleItems(value: unknown): BookBundleItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap(item => {
    if (typeof item === "string") {
      return [{ title: item, isbn: null }];
    }

    if (!item || typeof item !== "object" || Array.isArray(item)) return [];

    const row = item as Record<string, unknown>;
    return [{
      title: typeof row.title === "string" ? row.title : "",
      isbn: typeof row.isbn === "string" ? row.isbn : null,
    }];
  });
}

function getIncludedBooks(book: BookConventionBook): BookBundleItem[] {
  if (book.product_type === "bundle" || book.bundle_items.length > 0) {
    return normalizeEditableBundleItems(book.bundle_items);
  }

  return [{
    title: book.title,
    isbn: normalizeIsbn(book.isbn) || null,
  }];
}

function buildAutomaticProductTitle(includedBooks: BookBundleItem[]) {
  const titles = Array.from(
    new Set(includedBooks.map(item => item.title.trim()).filter(Boolean))
  );

  if (includedBooks.length <= 1) return titles[0] ?? "";
  if (titles.length === 0) return "";

  const fullTitle = `Bundle – ${titles.join(" + ")}`;
  return fullTitle.length <= 240
    ? fullTitle
    : `${fullTitle.slice(0, 239).trimEnd()}…`;
}

function normalizeIsbn(value: string | null | undefined) {
  return value?.trim().toUpperCase().replace(/[\s-]/g, "") ?? "";
}

function isValidIsbn(value: string) {
  return /^\d{13}$/.test(value) || /^\d{9}[\dX]$/.test(value);
}

function getAutomaticBookConventionTitle(form: ConvForm) {
  if (form.books.length === 1) {
    return buildAutomaticProductTitle(getIncludedBooks(form.books[0]));
  }

  return form.titolo.trim() || BOOK_CONVENTION_INTERNAL_TITLE;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  trasporti: { bg: "rgba(16,107,60,.08)", text: "#0a6638" },
  sport: { bg: "rgba(107,16,16,.08)", text: "#8b1111" },
  libri_e_materiale_didattico: { bg: "rgba(107,60,16,.08)", text: "#7a4010" },
  tech: { bg: "rgba(14,31,107,.08)", text: "#0E1F6B" },
  bar_e_ristoranti: { bg: "rgba(120,16,107,.08)", text: "#7a0f70" },
  altro: { bg: "rgba(8,16,42,.06)", text: "#2E4080" },
  default: { bg: "rgba(8,16,42,.06)", text: "#2E4080" },
};

function normalizeCategoryKey(cat: string) {
  return cat?.trim().toLowerCase().replace(/[\s-]+/g, "_") as keyof typeof categoryColors;
}

function formatCategoryLabel(cat: string) {
  return cat?.replace(/[_-]+/g, " ") ?? "";
}

function getCatStyle(cat: string) {
  const key = normalizeCategoryKey(cat);
  return categoryColors[key] ?? categoryColors.default;
}

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isRoundActive(round: BookConventionRound) {
  const now = Date.now();
  return new Date(round.starts_at).getTime() <= now && now < new Date(round.ends_at).getTime();
}

function isRoundUpcoming(round: BookConventionRound) {
  return new Date(round.starts_at).getTime() > Date.now();
}

function isRoundClosed(round: BookConventionRound) {
  return new Date(round.ends_at).getTime() <= Date.now();
}

// ── Modal ─────────────────────────────────────────────────────────
function ConvModal({
  scope, mode, initial, initialBooks = [], onClose, onSave,
}: {
  scope: ConventionScope;
  mode: "create" | "edit";
  initial?: Convenzione;
  initialBooks?: BookConventionBook[];
  onClose: () => void;
  onSave: (f: ConvForm) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [form, setForm] = useState<ConvForm>(() =>
    mode === "edit" && initial
      ? {
        titolo: initial.titolo,
        partner: initial.partner ?? "",
        descrizione: initial.descrizione ?? "",
        vantaggio: initial.vantaggio ?? "",
        categoria: scope === "books"
          ? BOOK_CONVENTION_CATEGORY
          : initial.categoria ?? "",
        link: initial.link ?? "#",
        ordine: String(initial.ordine),
        attiva: initial.attiva,
        is_book_convention: scope === "books",
        books:
          initialBooks.length > 0
            ? initialBooks.map((book, index) => {
              const studyArea = book.study_area ?? "medicina_chirurgia";
              const referenceYears = getValidReferenceYears(
                studyArea,
                book.reference_years,
                book.reference_year
              );

              return {
                id: book.id ?? null,
                convention_id: book.convention_id ?? initial.id,
                title: book.title ?? "",
                price: typeof book.price === "number" && Number.isFinite(book.price) ? book.price : 0,
                original_price:
                  typeof book.original_price === "number" &&
                  Number.isFinite(book.original_price)
                    ? book.original_price
                    : null,
                isbn: book.isbn ?? null,
                reference_year: referenceYears[0],
                reference_years: referenceYears,
                description: book.description ?? "",
                sort_order: book.sort_order ?? index,
                product_type: book.product_type ?? "book",
                bundle_items: normalizeBookBundleItems(book.bundle_items),
                study_area: studyArea,
                is_active: book.is_active !== false,
                round_ids: Array.isArray(book.round_ids) ? book.round_ids : [],
                cover_image: book.cover_image ?? null,
              };
            })
            : [],
      }
      : {
        ...EMPTY_FORM,
        titolo: scope === "books" ? BOOK_CONVENTION_INTERNAL_TITLE : "",
        categoria: scope === "books" ? BOOK_CONVENTION_CATEGORY : "",
        is_book_convention: scope === "books",
        books: scope === "books" ? [createEmptyBook()] : [],
      }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [bookRemovalIndex, setBookRemovalIndex] = useState<number | null>(null);
  const [bookRemovalChecked, setBookRemovalChecked] = useState(false);
  const coverPreviewUrlsRef = useRef(new Set<string>());

  useEffect(() => {
    const previewUrls = coverPreviewUrlsRef.current;
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.clear();
    };
  }, []);

  const set = (k: keyof ConvForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const updateBook = (index: number, patch: Partial<BookConventionBook>) => {
    setForm(current => ({
      ...current,
      books: current.books.map((book, i) => i === index ? { ...book, ...patch } : book),
    }));
  };

  const toggleBookReferenceYear = (index: number, year: BookYear) => {
    setForm(current => ({
      ...current,
      books: current.books.map((book, bookIndex) => {
        if (bookIndex !== index) return book;
        if (!isBookYearAllowedForStudyArea(book.study_area, year)) return book;

        const currentYears = getValidReferenceYears(
          book.study_area,
          book.reference_years,
          book.reference_year
        );
        const isSelected = currentYears.includes(year);
        const nextSelection = isSelected
          ? currentYears.length > 1
            ? currentYears.filter(selectedYear => selectedYear !== year)
            : currentYears
          : [...currentYears, year];
        const referenceYears = getValidReferenceYears(
          book.study_area,
          nextSelection,
          book.reference_year
        );

        return {
          ...book,
          reference_year: referenceYears[0],
          reference_years: referenceYears,
        };
      }),
    }));
  };

  const addBook = () => {
    setForm(current => ({
      ...current,
      books: [...current.books, createEmptyBook(current.books.length)],
    }));
  };

  const addIncludedBook = (index: number) => {
    setForm(current => ({
      ...current,
      books: current.books.map((book, bookIndex) => {
        if (bookIndex !== index) return book;

        const wasBundle = book.product_type === "bundle" || book.bundle_items.length > 0;
        const includedBooks = [
          ...getIncludedBooks(book),
          { title: "", isbn: null },
        ];

        return {
          ...book,
          title: buildAutomaticProductTitle(includedBooks),
          isbn: wasBundle ? book.isbn : null,
          product_type: "bundle",
          bundle_items: includedBooks,
        };
      }),
    }));
  };

  const updateIncludedBook = (
    bookIndex: number,
    includedBookIndex: number,
    patch: Partial<BookBundleItem>
  ) => {
    setForm(current => ({
      ...current,
      books: current.books.map((book, index) => {
        if (index !== bookIndex) return book;

        const includedBooks = getIncludedBooks(book).map((item, itemIndex) =>
          itemIndex === includedBookIndex ? { ...item, ...patch } : item
        );
        const isBundle = includedBooks.length >= 2;

        return {
          ...book,
          title: buildAutomaticProductTitle(includedBooks),
          isbn: isBundle ? book.isbn : includedBooks[0]?.isbn ?? null,
          product_type: isBundle ? "bundle" : "book",
          bundle_items: isBundle ? includedBooks : [],
        };
      }),
    }));
  };

  const removeIncludedBook = (bookIndex: number, includedBookIndex: number) => {
    setForm(current => ({
      ...current,
      books: current.books.map((book, index) => {
        if (index !== bookIndex) return book;

        const includedBooks = getIncludedBooks(book).filter(
          (_, itemIndex) => itemIndex !== includedBookIndex
        );
        const nextTitle = buildAutomaticProductTitle(includedBooks);
        const isBundle = includedBooks.length >= 2;

        return {
          ...book,
          title: nextTitle,
          isbn: isBundle ? book.isbn : includedBooks[0]?.isbn ?? null,
          product_type: isBundle ? "bundle" : "book",
          bundle_items: isBundle ? includedBooks : [],
        };
      }),
    }));
  };

  const selectBookCover = (index: number, file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErr("La copertina deve essere in formato JPEG, PNG o WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErr("La copertina non può superare 5 MB.");
      return;
    }

    const previousPreview = form.books[index]?.cover_image_preview;
    if (previousPreview) {
      URL.revokeObjectURL(previousPreview);
      coverPreviewUrlsRef.current.delete(previousPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    coverPreviewUrlsRef.current.add(previewUrl);
    updateBook(index, {
      cover_image_file: file,
      cover_image_preview: previewUrl,
      remove_cover_image: false,
    });
    setErr("");
  };

  const removeBookCover = (index: number) => {
    const previewUrl = form.books[index]?.cover_image_preview;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      coverPreviewUrlsRef.current.delete(previewUrl);
    }

    updateBook(index, {
      cover_image: null,
      cover_image_file: null,
      cover_image_preview: null,
      remove_cover_image: true,
    });
  };

  const requestRemoveBook = (index: number) => {
    setBookRemovalIndex(index);
    setBookRemovalChecked(false);
  };

  const confirmRemoveBook = () => {
    if (bookRemovalIndex === null || !bookRemovalChecked) return;

    const previewUrl = form.books[bookRemovalIndex]?.cover_image_preview;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      coverPreviewUrlsRef.current.delete(previewUrl);
    }

    setForm(current => ({
      ...current,
      books: current.books
        .filter((_, i) => i !== bookRemovalIndex)
        .map((book, i) => ({ ...book, sort_order: i })),
    }));

    setBookRemovalIndex(null);
    setBookRemovalChecked(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const titolo = scope === "books"
      ? getAutomaticBookConventionTitle(form)
      : form.titolo.trim();
    const partner = form.partner.trim();
    const categoria = scope === "books"
      ? BOOK_CONVENTION_CATEGORY
      : form.categoria.trim();
    const link = form.link.trim();
    const ordine = form.ordine.trim();

    if (!titolo) {
      setErr("Il titolo è obbligatorio.");
      return;
    }

    if (scope !== "books" && !partner) {
      setErr("Il partner è obbligatorio.");
      return;
    }

    if (scope !== "books" && !categoria) {
      setErr("Seleziona una categoria.");
      return;
    }

    if (scope !== "books" && link && link !== "#") {
      try {
        const parsed = new URL(link);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          setErr("Il link deve iniziare con http:// o https://.");
          return;
        }
      } catch {
        setErr("Inserisci un link valido.");
        return;
      }
    }

    if (ordine && Number.isNaN(Number(ordine))) {
      setErr("L'ordine deve essere un numero valido.");
      return;
    }

    if (form.is_book_convention) {
      if (form.books.length === 0) {
        setErr("Aggiungi almeno un libro o bundle.");
        return;
      }

      const invalidBook = form.books.find(book =>
        getIncludedBooks(book).some(item => !item.title.trim())
      );

      if (invalidBook) {
        setErr("Inserisci il titolo di ogni libro incluso.");
        return;
      }

      const invalidReferenceYears = form.books.find(book => {
        if (!Array.isArray(book.reference_years) || book.reference_years.length === 0) {
          return true;
        }

        return (
          new Set(book.reference_years).size !== book.reference_years.length ||
          book.reference_years.some(
            year => !isBookYearAllowedForStudyArea(book.study_area, year)
          )
        );
      });
      if (invalidReferenceYears) {
        setErr("Seleziona almeno un anno valido per ogni libro o bundle.");
        return;
      }

      const invalidPrice = form.books.find(book => book.price === null || !Number.isFinite(Number(book.price)) || Number(book.price) < 0);
      if (invalidPrice) {
        setErr("Ogni libro/promozione deve avere un prezzo valido.");
        return;
      }

      const invalidOriginalPrice = form.books.find(
        book =>
          book.original_price !== null &&
          (!Number.isFinite(Number(book.original_price)) ||
            Number(book.original_price) < Number(book.price ?? 0))
      );
      if (invalidOriginalPrice) {
        setErr("Il prezzo originale deve essere uguale o superiore al prezzo convenzionato.");
        return;
      }

      const invalidIsbn = form.books.find(book => {
        const isbn = normalizeIsbn(book.isbn);
        return Boolean(isbn) && !isValidIsbn(isbn);
      });
      if (invalidIsbn) {
        setErr("L’ISBN deve contenere 10 o 13 caratteri validi.");
        return;
      }

      const invalidBundleItemIsbn = form.books.find(book =>
        getIncludedBooks(book).some(item => {
          const isbn = normalizeIsbn(item.isbn);
          return Boolean(isbn) && !isValidIsbn(isbn);
        })
      );
      if (invalidBundleItemIsbn) {
        setErr("Ogni ISBN dei libri inclusi deve contenere 10 o 13 caratteri validi.");
        return;
      }

      const bundleWithDuplicateIsbns = form.books.find(book => {
        const isbns = getIncludedBooks(book)
          .map(item => normalizeIsbn(item.isbn))
          .filter(Boolean);

        return isbns.length !== new Set(isbns).size;
      });
      if (bundleWithDuplicateIsbns) {
        setErr("Ogni libro del bundle deve avere un ISBN diverso: rimuovi gli ISBN duplicati.");
        return;
      }

      const invalidBundle = form.books.find(book => {
        const includedBooks = getIncludedBooks(book)
          .map(item => item.title.trim())
          .filter(Boolean);

        return book.product_type === "bundle" && includedBooks.length < 2;
      });
      if (invalidBundle) {
        setErr("Un bundle deve contenere almeno due libri.");
        return;
      }
    }

    setSaving(true);
    setErr("");

    try {
      const result = await onSave(form);
      if (!result.ok) {
        setErr(result.message || "Salvataggio non riuscito. Controlla i dati e riprova.");
      }
    } catch (error) {
      console.error("Errore salvataggio convenzione:", error);
      setErr("Si è verificato un errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  const creatingAutomaticBundle =
    mode === "create" &&
    form.books.length === 1 &&
    getIncludedBooks(form.books[0]).length >= 2;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,20,50,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        style={{ background: "#fff", borderRadius: "2rem", padding: "clamp(1rem,3vw,2.5rem)", width: "100%", maxWidth: scope === "books" ? 980 : 660, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(10,20,50,.22)" }}
        onClick={e => e.stopPropagation()}
      >
        {bookRemovalIndex !== null && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 260,
              background: "rgba(10,20,50,.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
            onClick={() => {
              setBookRemovalIndex(null);
              setBookRemovalChecked(false);
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 520,
                background: "white",
                borderRadius: "1.5rem",
                padding: "1.5rem",
                boxShadow: "0 24px 70px rgba(10,20,50,.28)",
                border: "1px solid rgba(190,39,39,.14)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <p style={{ margin: "0 0 .5rem", fontSize: ".75rem", fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase", color: "#8b1d1d" }}>
                Conferma rimozione libro
              </p>

              <h3 style={{ margin: "0 0 .75rem", color: "#0f2f6e", fontSize: "1.25rem", fontWeight: 900 }}>
                Vuoi rimuovere questo libro/promozione?
              </h3>

              <p style={{ margin: "0 0 1rem", color: "#4b5563", lineHeight: 1.6, fontSize: ".94rem" }}>
                Se l’elemento è già stato salvato verrà disattivato e rimosso dal catalogo pubblico. Le adesioni storiche resteranno inalterate.
              </p>

              <div style={{ border: "1px solid rgba(15,47,110,.08)", background: "rgba(15,47,110,.025)", borderRadius: "1rem", padding: ".85rem 1rem", marginBottom: "1rem" }}>
                <strong style={{ color: "#0f2f6e" }}>
                  {form.books[bookRemovalIndex]?.title || `Libro/promozione #${bookRemovalIndex + 1}`}
                </strong>
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: ".7rem", color: "#08102A", fontWeight: 700, lineHeight: 1.5, cursor: "pointer", marginBottom: "1.2rem" }}>
                <input
                  type="checkbox"
                  checked={bookRemovalChecked}
                  onChange={e => setBookRemovalChecked(e.target.checked)}
                  style={{ marginTop: ".2rem" }}
                />
                Confermo di voler rimuovere l’elemento dal catalogo attivo.
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: ".7rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    setBookRemovalIndex(null);
                    setBookRemovalChecked(false);
                  }}
                  style={{
                    border: "1px solid rgba(15,47,110,.12)",
                    background: "white",
                    color: "#0f2f6e",
                    borderRadius: "999px",
                    padding: ".7rem 1.2rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Annulla
                </button>

                <button
                  type="button"
                  onClick={confirmRemoveBook}
                  disabled={!bookRemovalChecked}
                  style={{
                    border: "none",
                    background: "#8b1d1d",
                    color: "white",
                    borderRadius: "999px",
                    padding: ".7rem 1.2rem",
                    fontWeight: 800,
                    cursor: bookRemovalChecked ? "pointer" : "not-allowed",
                    opacity: bookRemovalChecked ? 1 : .55,
                  }}
                >
                  Rimuovi libro
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#0f2f6e" }}>
              {scope === "books"
                ? mode === "create"
                  ? creatingAutomaticBundle ? "Nuovo bundle" : "Nuovo libro"
                  : "Modifica catalogo libri"
                : mode === "create" ? "Nuova convenzione" : "Modifica convenzione"}
            </h2>
            <p style={{ margin: ".3rem 0 0", color: "#6b7280", fontSize: ".9rem" }}>
              {scope === "books"
                ? mode === "create"
                  ? "Inserisci un libro; aggiungendo altri titoli la proposta diventerà automaticamente un bundle."
                  : "Gestisci titoli, composizione, copertine, prezzi e disponibilità."
                : mode === "create" ? "Compila i campi per aggiungere una convenzione." : "Modifica i dettagli della convenzione."}
            </p>
          </div>
          <button onClick={onClose} disabled={saving} style={{ background: "rgba(15,47,110,.06)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: saving ? "not-allowed" : "pointer", fontSize: "1rem", color: "#6b7280", opacity: saving ? .6 : 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {!form.is_book_convention && (
            <>

          {/* Partner info */}
          <SectionLabel>Partner</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <MField label="Titolo *" value={form.titolo} onChange={v => set("titolo", v)} placeholder="es. Visita medica sportiva" />
            <MField label="Partner *" value={form.partner} onChange={v => set("partner", v)} placeholder="es. MedSport Milano" />
          </div>

          {/* Category + order + status */}
          <SectionLabel>Impostazioni</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: scope === "books" ? "1fr 1fr" : "1fr 1fr 1fr", gap: "1rem" }}>
            {scope === "books" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Categoria</label>
                <div style={{ border: "1px solid rgba(15,47,110,.12)", background: "rgba(15,47,110,.035)", color: "#102a56", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".9rem", fontWeight: 700 }}>
                  Libri e materiale didattico
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Categoria *</label>
                <select
                  value={form.categoria}
                  onChange={e => set("categoria", e.target.value)}
                  style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: form.categoria ? "#102a56" : "#9ca3af", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".95rem", outline: "none", appearance: "none" }}
                >
                  <option value="">Seleziona...</option>
                  {GENERAL_CATEGORY_OPTIONS.map(c => (
                    <option key={c} value={c}>
                      {formatCategoryLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <MField label="Ordine" type="number" value={form.ordine} onChange={v => set("ordine", v)} placeholder="0" />
            {scope !== "books" && (
              <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", justifyContent: "flex-end" }}>
                <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Stato</label>
                <button
                  type="button"
                  onClick={() => set("attiva", !form.attiva)}
                  style={{
                    border: `1px solid ${form.attiva ? "rgba(12,122,77,.25)" : "rgba(15,47,110,.12)"}`,
                    background: form.attiva ? "rgba(12,122,77,.08)" : "rgba(15,47,110,.04)",
                    color: form.attiva ? "#0b6b46" : "#6b7280",
                    borderRadius: "12px", padding: ".8rem 1rem", fontWeight: 700, fontSize: ".9rem",
                    cursor: "pointer", transition: "all .18s", textAlign: "left",
                    display: "flex", alignItems: "center", gap: ".5rem",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: form.attiva ? "#16a34a" : "#9ca3af", flexShrink: 0 }} />
                  {form.attiva ? "Attiva" : "Non attiva"}
                </button>
              </div>
            )}
          </div>

          {/* Details */}
          <SectionLabel>Dettagli</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
            <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Descrizione</label>
            <textarea
              value={form.descrizione}
              onChange={e => set("descrizione", e.target.value)}
              placeholder="Descrivi brevemente la convenzione..."
              rows={3}
              style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#102a56", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".95rem", outline: "none", width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
            />
          </div>
          <MField label="Vantaggio" value={form.vantaggio} onChange={v => set("vantaggio", v)} placeholder="es. 30% di sconto sulla tariffa standard" />
          <MField label="Link" value={form.link} onChange={v => set("link", v)} placeholder="https://..." />

            </>
          )}

          {scope === "books" && (
            <>
          <SectionLabel>Catalogo libri e bundle</SectionLabel>

          <div
            style={{
              border: `1px solid ${form.is_book_convention
                ? "rgba(46,64,128,.24)"
                : "rgba(15,47,110,.12)"
                }`,
              background: form.is_book_convention
                ? "rgba(46,64,128,.06)"
                : "rgba(15,47,110,.025)",
              borderRadius: "16px",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: ".85rem",
            }}
          >
            <div
              style={{
                border: "none",
                background: "transparent",
                color: "#0f2f6e",
                padding: 0,
                fontWeight: 800,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: ".65rem",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  border: "2px solid #0f2f6e",
                  background: "#0f2f6e",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: ".82rem",
                  flexShrink: 0,
                }}
              >
                ✓
              </span>

              Catalogo dedicato alle Convenzioni Libri
            </div>

            {form.is_book_convention && (
              <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem", flexWrap: "wrap" }}>
                  <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>
                    Proposte del catalogo
                  </label>
                  {mode === "edit" || form.books.length === 0 ? (
                    <button
                      type="button"
                      onClick={addBook}
                      style={{ border: "1px solid rgba(15,47,110,.14)", background: "white", color: "#0f2f6e", borderRadius: "999px", padding: ".5rem .85rem", fontWeight: 800, cursor: "pointer", fontSize: ".78rem" }}
                    >
                      {mode === "edit" ? "+ Aggiungi proposta indipendente" : "+ Aggiungi nuovo libro"}
                    </button>
                  ) : null}
                </div>

                {form.books.length === 0 ? (
                  <div style={{ border: "1px dashed rgba(15,47,110,.2)", borderRadius: "14px", padding: "1rem", color: "#6b7280", fontSize: ".86rem", lineHeight: 1.5 }}>
                    Nessuna proposta aggiunta. Crea un libro singolo oppure aggiungi più libri alla stessa proposta per ottenere automaticamente un bundle.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
                    {form.books.map((book, index) => {
                      const includedBooks = getIncludedBooks(book);
                      const isBundle = includedBooks.length >= 2 || book.product_type === "bundle";
                      const automaticTitle = isBundle
                        ? buildAutomaticProductTitle(includedBooks)
                        : book.title;
                      const referenceYears = getValidReferenceYears(
                        book.study_area,
                        book.reference_years,
                        book.reference_year
                      );
                      const referenceYearsHelpId = `book-reference-years-${index}-help`;

                      return (
                      <div key={book.id ?? `new-${index}`} style={{ border: "1px solid rgba(15,47,110,.1)", background: "white", borderRadius: "16px", padding: "1rem", display: "grid", gap: ".85rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".75rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: ".55rem", flexWrap: "wrap" }}>
                            <strong style={{ color: "#0f2f6e", fontSize: ".85rem" }}>
                              Proposta #{index + 1}
                            </strong>
                            <span style={{ borderRadius: 999, padding: ".28rem .55rem", background: isBundle ? "#0f2f6e" : "rgba(15,47,110,.08)", color: isBundle ? "white" : "#38517e", fontSize: ".64rem", fontWeight: 850, letterSpacing: ".08em", textTransform: "uppercase" }}>
                              {isBundle ? `Bundle automatico · ${includedBooks.length} libri` : "Libro singolo"}
                            </span>
                          </div>
                          {mode === "edit" || form.books.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => requestRemoveBook(index)}
                              style={{ border: "1px solid rgba(190,39,39,.14)", background: "white", color: "#8b1d1d", borderRadius: "999px", padding: ".35rem .7rem", fontWeight: 800, cursor: "pointer", fontSize: ".72rem" }}
                            >
                              Rimuovi proposta
                            </button>
                          ) : null}
                        </div>

                        <div
                          className="book-admin-cover"
                          style={{ display: "grid", gridTemplateColumns: "104px minmax(0,1fr)", gap: ".85rem", alignItems: "center", border: "1px solid rgba(15,47,110,.08)", background: "rgba(15,47,110,.025)", borderRadius: "14px", padding: ".75rem" }}
                        >
                          <div
                            role="img"
                            aria-label={book.cover_image_preview || book.cover_image ? `Copertina di ${book.title || `prodotto ${index + 1}`}` : "Nessuna copertina selezionata"}
                            style={{ width: 88, height: 112, borderRadius: "10px", border: "1px solid rgba(15,47,110,.1)", backgroundColor: "#eef2f8", backgroundImage: book.cover_image_preview || book.cover_image ? `url(${book.cover_image_preview || book.cover_image})` : "none", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: "contain", display: "grid", placeItems: "center", color: "#71809a", fontSize: ".68rem", fontWeight: 700, textAlign: "center", padding: book.cover_image_preview || book.cover_image ? 0 : ".5rem" }}
                          >
                            {book.cover_image_preview || book.cover_image ? null : "Nessuna immagine"}
                          </div>

                          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: ".5rem" }}>
                            <div>
                              <p style={{ margin: 0, fontSize: ".8rem", fontWeight: 800, color: "#17315f" }}>Copertina libro/bundle</p>
                              <p style={{ margin: ".2rem 0 0", fontSize: ".72rem", lineHeight: 1.4, color: "#6b7280" }}>JPEG, PNG o WebP · massimo 5 MB.</p>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", alignItems: "center" }}>
                              <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(15,47,110,.16)", background: "white", color: "#0f2f6e", borderRadius: "999px", padding: ".48rem .8rem", fontSize: ".72rem", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .6 : 1 }}>
                                {book.cover_image_preview || book.cover_image ? "Sostituisci" : "Carica immagine"}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  disabled={saving}
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) selectBookCover(index, file);
                                    event.target.value = "";
                                  }}
                                  style={{ display: "none" }}
                                />
                              </label>
                              {book.cover_image_preview || book.cover_image ? (
                                <button
                                  type="button"
                                  onClick={() => removeBookCover(index)}
                                  disabled={saving}
                                  style={{ border: "none", background: "transparent", color: "#8b1d1d", padding: ".4rem", fontSize: ".72rem", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .6 : 1 }}
                                >
                                  Rimuovi immagine
                                </button>
                              ) : null}
                            </div>
                            {book.cover_image_file ? (
                              <p style={{ margin: 0, fontSize: ".68rem", color: "#0b6b46", fontWeight: 700, overflowWrap: "anywhere" }}>
                                Pronta per il caricamento: {book.cover_image_file.name}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div style={{ border: `1px solid ${isBundle ? "rgba(15,47,110,.16)" : "rgba(15,47,110,.08)"}`, background: isBundle ? "rgba(15,47,110,.035)" : "#fbfcfe", borderRadius: "14px", padding: ".8rem", display: "flex", flexDirection: "column", gap: ".7rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".7rem", flexWrap: "wrap" }}>
                            <div>
                              <p style={{ margin: 0, color: "#17315f", fontSize: ".78rem", fontWeight: 850 }}>
                                {isBundle ? "Libri inclusi nel bundle" : "Composizione della proposta"}
                              </p>
                              <p style={{ margin: ".18rem 0 0", color: "#6b7280", fontSize: ".68rem", lineHeight: 1.4 }}>
                                {isBundle
                                  ? "Il titolo pubblico viene generato automaticamente; puoi indicare un ISBN diverso per ogni libro."
                                  : "Aggiungendo un secondo libro la proposta diventerà automaticamente un bundle."}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addIncludedBook(index)}
                              style={{ border: "1px solid #1847a3", background: "white", color: "#1847a3", borderRadius: "999px", padding: ".48rem .75rem", fontWeight: 850, cursor: "pointer", fontSize: ".72rem", whiteSpace: "nowrap" }}
                            >
                              + Aggiungi nuovo libro
                            </button>
                          </div>

                          {isBundle ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: ".55rem" }}>
                              {includedBooks.map((includedBook, includedBookIndex) => (
                                <div
                                  key={`${book.id ?? `new-${index}`}-included-${includedBookIndex}`}
                                  className="book-admin-bundle-row"
                                  style={{ display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(180px,.8fr) auto", gap: ".5rem", alignItems: "end" }}
                                >
                                  <MField
                                    label={`Titolo libro ${includedBookIndex + 1} *`}
                                    value={includedBook.title}
                                    onChange={value => updateIncludedBook(index, includedBookIndex, { title: value })}
                                    placeholder="Titolo del libro"
                                  />
                                  <MField
                                    label={`ISBN libro ${includedBookIndex + 1} (facoltativo)`}
                                    value={includedBook.isbn ?? ""}
                                    onChange={value => updateIncludedBook(index, includedBookIndex, { isbn: value || null })}
                                    placeholder="9781234567890"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeIncludedBook(index, includedBookIndex)}
                                    title="Rimuovi libro dalla proposta"
                                    style={{ height: 44, border: "1px solid rgba(190,39,39,.14)", background: "white", color: "#8b1d1d", borderRadius: "11px", padding: "0 .75rem", fontWeight: 800, cursor: "pointer", fontSize: ".7rem" }}
                                  >
                                    Rimuovi
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="book-admin-grid-title" style={{ display: "grid", gridTemplateColumns: "1.4fr .8fr", gap: ".75rem" }}>
                          {isBundle ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                              <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Titolo pubblico del bundle</label>
                              <div style={{ minHeight: 44, display: "flex", alignItems: "center", border: "1px solid rgba(15,47,110,.1)", background: "#f4f6fa", color: automaticTitle ? "#102a56" : "#8a94a8", borderRadius: "12px", padding: ".72rem 1rem", fontSize: ".86rem", fontWeight: 750, lineHeight: 1.35 }}>
                                {automaticTitle || "Verrà generato dopo aver inserito i titoli"}
                              </div>
                            </div>
                          ) : (
                            <MField label="Titolo libro *" value={book.title} onChange={v => updateBook(index, { title: v })} placeholder="es. Anatomia Gray" />
                          )}
                          <MField
                            label={isBundle ? "ISBN generale bundle (facoltativo)" : "ISBN libro (facoltativo)"}
                            value={book.isbn ?? ""}
                            onChange={value => updateBook(index, { isbn: value || null })}
                            placeholder={isBundle ? "Solo se il bundle ha un proprio ISBN" : "9781234567890"}
                          />
                        </div>

                        <div className="book-admin-grid-3" style={{ display: "grid", gridTemplateColumns: ".72fr .72fr 1.56fr", gap: ".75rem" }}>
                          <MField
                            label="Prezzo originale"
                            type="number"
                            value={String(book.original_price ?? "")}
                            onChange={value => updateBook(index, {
                              original_price: value === "" ? null : Number(value),
                            })}
                            placeholder="60"
                          />
                          <MField
                            label="Prezzo convenzionato *"
                            type="number"
                            value={String(book.price ?? "")}
                            onChange={value => updateBook(index, {
                              price: value === "" ? null : Number(value),
                            })}
                            placeholder="45"
                          />
                          <fieldset style={{ minWidth: 0, margin: 0, padding: 0, border: 0, display: "flex", flexDirection: "column", gap: ".4rem" }}>
                            <legend style={{ padding: 0, fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>
                              Anni di corso *
                            </legend>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: ".38rem" }}>
                              {BOOK_YEARS_BY_STUDY_AREA[book.study_area].map(year => {
                                const isSelected = referenceYears.includes(year);
                                const isOnlySelectedYear = isSelected && referenceYears.length === 1;

                                return (
                                  <label
                                    key={year}
                                    style={{
                                      minHeight: 34,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: ".35rem",
                                      border: `1px solid ${isSelected ? "rgba(15,47,110,.42)" : "rgba(15,47,110,.12)"}`,
                                      background: isSelected ? "rgba(15,47,110,.08)" : "white",
                                      color: isSelected ? "#0f2f6e" : "#5d6b82",
                                      borderRadius: "999px",
                                      padding: ".35rem .58rem",
                                      fontSize: ".7rem",
                                      fontWeight: 800,
                                      cursor: isOnlySelectedYear ? "not-allowed" : "pointer",
                                      opacity: isOnlySelectedYear ? .78 : 1,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={isOnlySelectedYear}
                                      onChange={() => toggleBookReferenceYear(index, year)}
                                      aria-describedby={referenceYearsHelpId}
                                      style={{ width: 14, height: 14, margin: 0, accentColor: "#0f2f6e" }}
                                    />
                                    {BOOK_YEAR_LABELS[year]}
                                  </label>
                                );
                              })}
                            </div>
                            <span id={referenceYearsHelpId} style={{ color: "#71809a", fontSize: ".65rem", lineHeight: 1.35 }}>
                              Puoi selezionare più anni; almeno uno è obbligatorio.
                            </span>
                          </fieldset>
                        </div>

                        <div className="book-admin-grid-2" style={{ display: "grid", gridTemplateColumns: "1.25fr .8fr", gap: ".75rem" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                            <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Area di studio *</label>
                            <select
                              value={book.study_area}
                              onChange={e => {
                                const studyArea = e.target.value as StudyArea;
                                const referenceYears = getValidReferenceYears(
                                  studyArea,
                                  book.reference_years,
                                  book.reference_year
                                );
                                updateBook(index, {
                                  study_area: studyArea,
                                  reference_year: referenceYears[0],
                                  reference_years: referenceYears,
                                });
                              }}
                              style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#102a56", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".9rem", outline: "none" }}
                            >
                              {STUDY_AREAS.map(area => (
                                <option key={area} value={area}>{STUDY_AREA_LABELS[area]}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                            <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Stato</label>
                            <button
                              type="button"
                              onClick={() => updateBook(index, { is_active: !book.is_active })}
                              style={{ border: `1px solid ${book.is_active ? "rgba(12,122,77,.22)" : "rgba(15,47,110,.12)"}`, background: book.is_active ? "rgba(12,122,77,.07)" : "rgba(15,47,110,.04)", color: book.is_active ? "#0b6b46" : "#6b7280", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".82rem", fontWeight: 800, cursor: "pointer", textAlign: "left" }}
                            >
                              {book.is_active ? "Attivo" : "Disattivato"}
                            </button>
                          </div>
                        </div>

                        <div className="book-admin-grid-description" style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: ".75rem" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                            <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Descrizione</label>
                            <textarea
                              value={book.description ?? ""}
                              onChange={e => updateBook(index, { description: e.target.value })}
                              placeholder="es. Bundle Libro A + Libro B, promo valida fino a esaurimento scorte..."
                              rows={2}
                              style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#102a56", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".95rem", outline: "none", width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                            />
                          </div>
                          <MField label="Ordine" type="number" value={String(book.sort_order ?? index)} onChange={v => updateBook(index, { sort_order: Number(v || index) })} placeholder="0" />
                        </div>

                      </div>
                      );
                    })}
                  </div>
                )}

                <p style={{ margin: 0, color: "#6b7280", fontSize: ".82rem", lineHeight: 1.5 }}>
                  Ogni riquadro è una proposta acquistabile: con un solo titolo resta un libro singolo; dal secondo libro diventa automaticamente un bundle. Gli studenti vedranno la lista divisa per area e anno.
                </p>
              </div>
            )}
          </div>
            </>
          )}
          {err && (
            <div style={{ background: "rgba(190,39,39,.08)", color: "#8b1d1d", border: "1px solid rgba(190,39,39,.14)", borderRadius: "12px", padding: ".8rem 1rem", fontWeight: 600, fontSize: ".9rem" }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end", marginTop: ".5rem" }}>
            <button type="button" onClick={onClose} disabled={saving} style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#0f2f6e", borderRadius: "999px", padding: ".7rem 1.5rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1 }}>
              Annulla
            </button>
            <button type="submit" disabled={saving} style={{ border: "none", background: saving ? "#8ca4d7" : "#1847a3", color: "white", borderRadius: "999px", padding: ".7rem 2rem", fontWeight: 700, cursor: saving ? "wait" : "pointer", fontSize: ".95rem" }}>
              {saving
                ? "Salvataggio..."
                : mode === "create"
                  ? scope === "books"
                    ? creatingAutomaticBundle ? "Salva bundle" : "Salva libro"
                    : "Crea convenzione"
                  : scope === "books" ? "Salva catalogo" : "Salva modifiche"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
      <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>{label}</label>
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#102a56", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".95rem", outline: "none", width: "100%", transition: "border-color .18s" }} />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#2E4080", margin: "0.4rem 0 0" }}>
      {children}
    </p>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function AdminConventionManager({
  scope,
}: {
  scope: ConventionScope;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const booksScope = scope === "books";

  const [convenzioni, setConvenzioni] = useState<Convenzione[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; conv?: Convenzione } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");
  const [filter, setFilter] = useState<"tutte" | "attive" | "disattive">("tutte");
  const [search, setSearch] = useState("");
  const isFetchingRef = useRef(false);
  const [rounds, setRounds] = useState<BookConventionRound[]>([]);
  const [bookConventionBooks, setBookConventionBooks] = useState<Record<number, BookConventionBook[]>>({});
  const [collectionActionKey, setCollectionActionKey] = useState<string | null>(null);
  const [openCollectionConfirmation, setOpenCollectionConfirmation] =
    useState<OpenCollectionConfirmation | null>(null);
  const [collectionConfirmation, setCollectionConfirmation] = useState<CollectionConfirmation | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<BookConventionDeleteConfirmation | null>(null);
  const [deleteConfirmationError, setDeleteConfirmationError] = useState("");
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const deleteCheckboxRef = useRef<HTMLInputElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const adminMainRef = useRef<HTMLElement>(null);
  const deleteConfirmationId = deleteConfirmation?.convention.id ?? null;

  useEffect(() => {
    if (deleteConfirmationId === null) return;

    const trigger = deleteTriggerRef.current;
    const main = adminMainRef.current;
    const focusFrame = window.requestAnimationFrame(() => {
      deleteCheckboxRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      const fallbackTarget = trigger?.isConnected ? trigger : main;
      window.requestAnimationFrame(() => fallbackTarget?.focus());
    };
  }, [deleteConfirmationId]);

  useEffect(() => {
    if (deleteConfirmationId === null) return;

    function handleDialogKeyDown(event: KeyboardEvent) {
      const dialog = deleteDialogRef.current;
      if (!dialog) return;

      if (event.key === "Escape" && deletingId === null) {
        event.preventDefault();
        setDeleteConfirmation(null);
        setDeleteConfirmationError("");
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => document.removeEventListener("keydown", handleDialogKeyDown);
  }, [deleteConfirmationId, deletingId]);

  const fetchConvenzioni = useCallback(async () => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);
    setError("");

    try {
      if (booksScope) {
        const adminResponse = await fetch("/api/admin/book-convention?page=1&page_size=1", {
          method: "GET",
          cache: "no-store",
        });
        const adminPayload = (await adminResponse.json().catch(() => ({}))) as BookConventionAdminApiResponse;

        if (adminResponse.status === 401) {
          router.replace("/login?next=/admin/convenzione-libri");
          return;
        }

        if (adminResponse.status === 403) {
          router.replace("/");
          return;
        }

        if (!adminResponse.ok) {
          setError(adminPayload.error || "Caricamento catalogo libri non riuscito.");
          return;
        }

        const groupedBooks = (adminPayload.books ?? []).reduce<Record<number, BookConventionBook[]>>((acc, book) => {
          const conventionId = Number(book.convention_id);
          if (!acc[conventionId]) acc[conventionId] = [];
          acc[conventionId].push(book);
          return acc;
        }, {});

        setConvenzioni(adminPayload.conventions ?? []);
        setBookConventionBooks(groupedBooks);
        setRounds(adminPayload.rounds ?? []);
        return;
      }

      const { data, error: err } = await supabase
        .from("convenzioni")
        .select(
          "id, titolo, partner, descrizione, vantaggio, categoria, link, ordine, attiva, is_book_convention, convenzione_libri, created_at, updated_at"
        )
        .order("ordine", { ascending: true });

      if (err) {
        setError(`Caricamento convenzioni non riuscito: ${err.message}`);
        return;
      }

      const generalConventions = ((data ?? []) as Convenzione[]).filter(
        (convention) =>
          convention.is_book_convention !== true &&
          convention.convenzione_libri !== true
      );

      setConvenzioni(generalConventions);
      setBookConventionBooks({});
      setRounds([]);
    } catch (error) {
      console.error("Errore fetch convenzioni:", error);
      setError("Si è verificato un errore durante il caricamento delle convenzioni.");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [booksScope, router, supabase]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(booksScope
          ? "/login?next=/admin/convenzione-libri"
          : "/login?next=/admin/convenzioni");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!profile || profile.role !== "admin") { router.replace("/"); return; }
      await fetchConvenzioni();
    }
    void load();
  }, [booksScope, fetchConvenzioni, router, supabase]);

  async function handleSave(form: ConvForm, editingId?: number): Promise<{ ok: boolean; message?: string }> {
    setError("");
    setSuccess("");
    setWarning("");

    const titolo = booksScope
      ? getAutomaticBookConventionTitle(form)
      : form.titolo.trim();
    const partner = form.partner.trim();
    const descriptionValue = form.descrizione.trim();
    const advantageValue = form.vantaggio.trim();
    const categoria = form.categoria.trim();
    const linkValue = form.link.trim();
    const ordineValue = form.ordine.trim();

    if (!titolo) return { ok: false, message: "Il titolo è obbligatorio." };
    if (!booksScope && !partner) return { ok: false, message: "Il partner è obbligatorio." };
    if (!booksScope && !categoria) {
      return { ok: false, message: "Seleziona una categoria." };
    }

    if (!booksScope && linkValue && linkValue !== "#") {
      try {
        const parsed = new URL(linkValue);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return { ok: false, message: "Il link deve iniziare con http:// o https://." };
        }
      } catch {
        return { ok: false, message: "Inserisci un link valido." };
      }
    }

    if (ordineValue && Number.isNaN(Number(ordineValue))) {
      return { ok: false, message: "L'ordine deve essere un numero valido." };
    }

    const payload = {
      titolo,
      partner,
      descrizione: descriptionValue,
      vantaggio: advantageValue,
      categoria,
      link: linkValue || "#",
      ordine: Number(ordineValue || "0"),
      attiva: form.attiva,
      is_book_convention: booksScope,
      convenzione_libri: booksScope,
    };

    try {
      if (booksScope) {
        const res = await fetch("/api/admin/book-convention", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            convention_id: editingId,
            title: titolo,
            description: descriptionValue,
            ordine: Number(ordineValue || "0"),
            attiva: form.attiva,
            books: form.books.map((book, index) => {
              const includedBooks = getIncludedBooks(book)
                .map(item => ({
                  title: item.title.trim(),
                  isbn: normalizeIsbn(item.isbn) || null,
                }))
                .filter(item => Boolean(item.title));
              const referenceYears = getValidReferenceYears(
                book.study_area,
                book.reference_years,
                book.reference_year
              );

              return {
                id: book.id ?? null,
                title: buildAutomaticProductTitle(includedBooks),
                price: Number(book.price ?? 0),
                original_price:
                  book.original_price === null
                    ? null
                    : Number(book.original_price),
                isbn: normalizeIsbn(book.isbn) || null,
                reference_year: referenceYears[0],
                reference_years: referenceYears,
                description: book.description?.trim() || null,
                sort_order: Number(book.sort_order ?? index),
                included_books: includedBooks,
                study_area: book.study_area,
                is_active: book.is_active,
              };
            }),
          }),
        });

        const json = (await res.json().catch(() => ({}))) as BookConventionSaveResponse;

        if (!res.ok) {
          const message = json.error || "Salvataggio convenzione libri non riuscito.";
          setError(message);
          return { ok: false, message };
        }

        const coverOperations = form.books
          .map((book, index) => ({ book, index }))
          .filter(({ book }) => Boolean(book.cover_image_file || book.remove_cover_image));

        if (coverOperations.length > 0) {
          const savedConventionId = Number(json.convention_id);
          const savedBookIds = Array.isArray(json.saved_book_ids)
            ? json.saved_book_ids.map((bookId) => Number(bookId))
            : [];
          const hasValidSavedIds =
            Number.isInteger(savedConventionId) &&
            savedConventionId > 0 &&
            savedBookIds.length === form.books.length &&
            savedBookIds.every((bookId) => Number.isInteger(bookId) && bookId > 0);

          if (!hasValidSavedIds) {
            await fetchConvenzioni();
            setModal(null);
            const message =
              "I dati della convenzione sono stati salvati, ma non è stato possibile associare le copertine. Riapri la convenzione e riprova.";
            setError(message);
            return { ok: true };
          }

          const coverResults: Array<{ title: string; error: string } | null> = [];

          for (let offset = 0; offset < coverOperations.length; offset += 3) {
            const batchResults = await Promise.all(
              coverOperations.slice(offset, offset + 3).map(async ({ book, index }) => {
                const bookId = savedBookIds[index];

                try {
                  let coverResponse: Response;

                  if (book.cover_image_file) {
                    const formData = new FormData();
                    formData.set("action", "upload_product_image");
                    formData.set("convention_id", String(savedConventionId));
                    formData.set("book_id", String(bookId));
                    formData.set("image", book.cover_image_file);

                    coverResponse = await fetch("/api/admin/book-convention", {
                      method: "POST",
                      body: formData,
                    });
                  } else {
                    coverResponse = await fetch("/api/admin/book-convention", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "remove_product_image",
                        convention_id: savedConventionId,
                        book_id: bookId,
                      }),
                    });
                  }

                  const coverPayload = (await coverResponse.json().catch(() => ({}))) as {
                    error?: string;
                  };

                  if (!coverResponse.ok) {
                    return {
                      title: book.title,
                      error: coverPayload.error || "operazione non riuscita",
                    };
                  }

                  return null;
                } catch (error) {
                  console.error(`Errore copertina prodotto ${bookId}:`, error);
                  return { title: book.title, error: "errore di rete" };
                }
              })
            );

            coverResults.push(...batchResults);
          }

          const failedCovers = coverResults.filter(
            (result): result is { title: string; error: string } => result !== null
          );

          await fetchConvenzioni();
          setModal(null);

          if (failedCovers.length > 0) {
            const failedTitles = failedCovers
              .slice(0, 3)
              .map(({ title }) => `“${title}”`)
              .join(", ");
            const remainingCount = failedCovers.length - 3;
            const message = failedCovers.length === 1
              ? `Convenzione salvata, ma non è stata salvata la copertina di ${failedTitles}. Riapri la convenzione per riprovare.`
              : `Convenzione salvata, ma non sono state salvate le copertine di ${failedTitles}${remainingCount > 0 ? ` e altri ${remainingCount}` : ""}. Riapri la convenzione per riprovare.`;
            setError(message);
            return { ok: true };
          }

          setSuccess(editingId !== undefined ? "Convenzione libri aggiornata." : "Convenzione libri creata.");
          return { ok: true };
        }

        await fetchConvenzioni();
        setSuccess(editingId !== undefined ? "Convenzione libri aggiornata." : "Convenzione libri creata.");
        setModal(null);
        return { ok: true };
      }

      if (editingId !== undefined) {
        const { error: err } = await supabase
          .from("convenzioni")
          .update(payload)
          .eq("id", editingId)
          .select("id")
          .single();

        if (err) {
          const message = `Salvataggio non riuscito: ${err.message}`;
          setError(message);
          return { ok: false, message };
        }

        await fetchConvenzioni();
        setSuccess("Convenzione aggiornata.");
      } else {
        const { error: err } = await supabase
          .from("convenzioni")
          .insert(payload)
          .select("id")
          .single();

        if (err) {
          const message = `Creazione non riuscita: ${err.message}`;
          setError(message);
          return { ok: false, message };
        }

        await fetchConvenzioni();
        setSuccess("Convenzione creata.");
      }

      setModal(null);
      return { ok: true };
    } catch (error) {
      console.error("Errore handleSave convenzioni:", error);
      const message = "Si è verificato un errore imprevisto durante il salvataggio.";
      setError(message);
      return { ok: false, message };
    }
  }

  async function handleDelete(conv: Convenzione, trigger?: HTMLButtonElement) {
    if (booksScope) {
      deleteTriggerRef.current = trigger ?? null;
      setDeleteConfirmation({ convention: conv, acknowledged: false });
      setDeleteConfirmationError("");
      return;
    }

    if (!window.confirm(`Eliminare “${conv.titolo}”?`)) return;

    setDeletingId(conv.id);
    setError("");
    setSuccess("");
    setWarning("");

    try {
      const { error: err } = await supabase.from("convenzioni").delete().eq("id", conv.id);

      if (err) {
        setError(`Eliminazione non riuscita: ${err.message}`);
        return;
      }

      await fetchConvenzioni();
      setSuccess("Convenzione eliminata.");
    } catch (error) {
      console.error("Errore eliminazione convenzione:", error);
      setError("Si è verificato un errore durante l'eliminazione.");
    } finally {
      setDeletingId(null);
    }
  }

  async function confirmBookConventionDelete() {
    if (!deleteConfirmation?.acknowledged || deletingId !== null) return;

    const convention = deleteConfirmation.convention;
    setDeletingId(convention.id);
    setDeleteConfirmationError("");
    setError("");
    setSuccess("");
    setWarning("");

    try {
      const response = await fetch("/api/admin/book-convention", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          convention_id: convention.id,
          delete_history: true,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        warning?: string;
      };

      if (response.status === 401) {
        router.replace("/login?next=/admin/convenzione-libri");
        return;
      }

      if (response.status === 403) {
        router.replace("/");
        return;
      }

      if (!response.ok) {
        setDeleteConfirmationError(
          payload.error || "Eliminazione della convenzione non riuscita."
        );
        return;
      }

      setConvenzioni(current => current.filter(item => item.id !== convention.id));
      setBookConventionBooks(current => {
        const next = { ...current };
        delete next[convention.id];
        return next;
      });
      setRounds(current => current.filter(round => round.convention_id !== convention.id));
      setDeleteConfirmation(null);
      setSuccess(
        payload.message || "Convenzione e storico eliminati definitivamente."
      );
      setWarning(payload.warning || "");
    } catch (error) {
      console.error("Errore eliminazione definitiva convenzione libri:", error);
      setDeleteConfirmationError(
        "Si è verificato un errore durante l’eliminazione. Riprova."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleAttiva(conv: Convenzione) {
    setError("");
    setSuccess("");
    setWarning("");

    try {
      if (booksScope) {
        const response = await fetch("/api/admin/book-convention", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_convention_active",
            convention_id: conv.id,
            is_active: !conv.attiva,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          setError(payload.error || "Aggiornamento stato non riuscito.");
          return;
        }

        await fetchConvenzioni();
        setSuccess(`Convenzione ${!conv.attiva ? "attivata" : "disattivata"}.`);
        return;
      }

      const { error: err } = await supabase
        .from("convenzioni")
        .update({ attiva: !conv.attiva })
        .eq("id", conv.id)
        .select("id")
        .single();

      if (err) {
        setError(`Aggiornamento stato non riuscito: ${err.message}`);
        return;
      }

      await fetchConvenzioni();
      setSuccess(`Convenzione ${!conv.attiva ? "attivata" : "disattivata"}.`);
    } catch (error) {
      console.error("Errore toggle convenzione:", error);
      setError("Si è verificato un errore durante l'aggiornamento dello stato.");
    }
  }

  async function openCollection(conventionId: number, deliveryMode: DeliveryMode) {
    const actionKey = `open:${conventionId}`;
    setCollectionActionKey(actionKey);
    setError("");
    setSuccess("");
    setWarning("");

    try {
      const response = await fetch("/api/admin/book-convention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open_collection",
          convention_id: conventionId,
          delivery_mode: deliveryMode,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (response.status === 401) {
        router.replace("/login?next=/admin/convenzione-libri");
        return;
      }

      if (response.status === 403) {
        router.replace("/");
        return;
      }

      if (!response.ok) {
        setError(payload.error || "Apertura della raccolta non riuscita.");
        return;
      }

      await fetchConvenzioni();
      setOpenCollectionConfirmation(null);
      setSuccess(payload.message || "Nuova raccolta ordini aperta.");
    } catch (error) {
      console.error("Errore apertura raccolta:", error);
      setError("Si è verificato un errore durante l’apertura della raccolta.");
    } finally {
      setCollectionActionKey(null);
    }
  }

  async function closeCollection() {
    if (!collectionConfirmation) return;

    const confirmation = collectionConfirmation;
    const actionKey = `close:${confirmation.roundId}`;
    setCollectionActionKey(actionKey);
    setError("");
    setSuccess("");
    setWarning("");

    try {
      const response = await fetch("/api/admin/book-convention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close_collection",
          convention_id: confirmation.conventionId,
          round_id: confirmation.roundId,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        round_id?: string;
      };

      if (response.status === 401) {
        router.replace("/login?next=/admin/convenzione-libri");
        return;
      }

      if (response.status === 403) {
        router.replace("/");
        return;
      }

      if (!response.ok) {
        setError(payload.error || "Chiusura della raccolta non riuscita.");
        return;
      }

      setCollectionConfirmation(null);

      if (confirmation.exportAfterClose) {
        const params = new URLSearchParams({
          view: "adesioni",
          convention_id: String(confirmation.conventionId),
          round_id: payload.round_id || confirmation.roundId,
          download: "csv",
        });
        router.push(`/admin/convenzione-libri?${params.toString()}`);
        return;
      }

      await fetchConvenzioni();
      setSuccess(payload.message || "Raccolta ordini chiusa.");
    } catch (error) {
      console.error("Errore chiusura raccolta:", error);
      setError("Si è verificato un errore durante la chiusura della raccolta.");
    } finally {
      setCollectionActionKey(null);
    }
  }

  const filtered = useMemo(() => {
    let list = convenzioni;
    if (filter === "attive") list = list.filter(c => c.attiva);
    if (filter === "disattive") list = list.filter(c => !c.attiva);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.titolo.toLowerCase().includes(q) ||
        (c.partner ?? "").toLowerCase().includes(q) ||
        (c.categoria ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [convenzioni, filter, search]);

  const attive = convenzioni.filter(c => c.attiva).length;
  const categories = useMemo(
    () => [...new Set(convenzioni.map(c => c.categoria).filter(Boolean))],
    [convenzioni]
  );
  const catalogProducts = useMemo(
    () => Object.values(bookConventionBooks).flat(),
    [bookConventionBooks]
  );
  const activeCatalogProducts = catalogProducts.filter((product) => product.is_active);
  const dashboardMetrics: Array<[string, number]> = booksScope
    ? [
      ["Convenzioni", convenzioni.length],
      ["Attive", attive],
      ["Prodotti attivi", activeCatalogProducts.length],
      ["Bundle attivi", activeCatalogProducts.filter((product) => product.product_type === "bundle").length],
    ]
    : [
      ["Totale", convenzioni.length],
      ["Attive", attive],
      ["Disattive", convenzioni.length - attive],
      ["Categorie", categories.length],
    ];

  return (
    <>
      {modal && (
        <ConvModal
          scope={scope}
          mode={modal.mode}
          initial={modal.conv}
          initialBooks={modal.conv ? bookConventionBooks[modal.conv.id] ?? [] : []}
          onClose={() => setModal(null)}
          onSave={f => handleSave(f, modal.conv?.id)}
        />
      )}

      {deleteConfirmation && (
        <div
          role="presentation"
          onClick={() => {
            if (deletingId === null) {
              setDeleteConfirmation(null);
              setDeleteConfirmationError("");
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 280,
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            background: "rgba(8,16,42,.58)",
            backdropFilter: "blur(7px)",
          }}
        >
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-book-convention-title"
            aria-describedby="delete-book-convention-description"
            aria-busy={deletingId === deleteConfirmation.convention.id}
            tabIndex={-1}
            onClick={event => event.stopPropagation()}
            style={{
              width: "min(100%, 540px)",
              maxHeight: "calc(100vh - 2rem)",
              overflowY: "auto",
              borderRadius: "1.35rem",
              border: "1px solid rgba(153,27,27,.16)",
              background: "white",
              padding: "clamp(1.1rem,4vw,1.55rem)",
              boxShadow: "0 28px 80px rgba(8,16,42,.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: ".85rem" }}>
              <span style={{ width: 42, height: 42, flex: "0 0 42px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: ".8rem", background: "#fff1f1", color: "#991b1b" }}>
                <TriangleAlert size={21} aria-hidden="true" />
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, color: "#991b1b", fontSize: ".65rem", fontWeight: 900, letterSpacing: ".13em", textTransform: "uppercase" }}>
                  Operazione irreversibile
                </p>
                <h2 id="delete-book-convention-title" style={{ margin: ".3rem 0 0", color: "#0f2f6e", fontSize: "1.25rem", lineHeight: 1.25 }}>
                  Eliminare definitivamente “{deleteConfirmation.convention.titolo}”?
                </h2>
              </div>
            </div>

            <p id="delete-book-convention-description" style={{ margin: "1rem 0 0", color: "#4b5563", fontSize: ".86rem", lineHeight: 1.6 }}>
              La convenzione sparirà dall’elenco e non potrà essere recuperata. Verrà eliminato tutto lo storico collegato, compresi:
            </p>

            <ul style={{ margin: ".75rem 0 0", paddingLeft: "1.2rem", color: "#4b5563", fontSize: ".82rem", lineHeight: 1.65 }}>
              <li>libri, bundle e relative copertine;</li>
              <li>raccolte ordini aperte e concluse;</li>
              <li>tutte le adesioni e i dati usati negli export;</li>
              <li>riepiloghi di pagamento, fatturazione e spedizione.</li>
            </ul>

            <label style={{ display: "flex", alignItems: "flex-start", gap: ".7rem", marginTop: "1rem", border: "1px solid rgba(153,27,27,.16)", borderRadius: ".9rem", background: "#fff8f8", padding: ".85rem", color: "#641b1b", fontSize: ".8rem", fontWeight: 750, lineHeight: 1.5, cursor: deletingId === null ? "pointer" : "not-allowed" }}>
              <input
                ref={deleteCheckboxRef}
                type="checkbox"
                checked={deleteConfirmation.acknowledged}
                disabled={deletingId !== null}
                onChange={event => {
                  setDeleteConfirmation(current => current
                    ? { ...current, acknowledged: event.target.checked }
                    : current
                  );
                  setDeleteConfirmationError("");
                }}
                style={{ width: 18, height: 18, marginTop: ".1rem", accentColor: "#991b1b", flex: "0 0 auto" }}
              />
              Confermo di aver compreso che convenzione e storico saranno eliminati definitivamente.
            </label>

            {deleteConfirmationError ? (
              <div role="alert" style={{ marginTop: ".8rem", border: "1px solid rgba(153,27,27,.14)", borderRadius: ".8rem", background: "#fff1f1", color: "#8b1d1d", padding: ".7rem .8rem", fontSize: ".78rem", fontWeight: 700, lineHeight: 1.45 }}>
                {deleteConfirmationError}
              </div>
            ) : null}

            <div className="book-delete-dialog-actions" style={{ display: "flex", justifyContent: "flex-end", gap: ".65rem", marginTop: "1.2rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmation(null);
                  setDeleteConfirmationError("");
                }}
                disabled={deletingId !== null}
                style={{ minHeight: 44, border: "1px solid rgba(15,47,110,.14)", background: "white", color: "#0f2f6e", borderRadius: ".8rem", padding: ".65rem 1rem", fontWeight: 800, cursor: deletingId === null ? "pointer" : "not-allowed" }}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void confirmBookConventionDelete()}
                disabled={!deleteConfirmation.acknowledged || deletingId !== null}
                style={{ minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: ".5rem", border: "none", background: deleteConfirmation.acknowledged && deletingId === null ? "#991b1b" : "#d3a5a5", color: "white", borderRadius: ".8rem", padding: ".65rem 1rem", fontWeight: 850, cursor: deleteConfirmation.acknowledged && deletingId === null ? "pointer" : "not-allowed" }}
              >
                <Trash2 size={16} aria-hidden="true" />
                <span aria-live="polite">
                  {deletingId === deleteConfirmation.convention.id
                    ? "Eliminazione in corso..."
                    : "Elimina convenzione e storico"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {openCollectionConfirmation && (
        <div
          role="presentation"
          onClick={() => {
            if (!collectionActionKey) setOpenCollectionConfirmation(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 290,
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            background: "rgba(8,16,42,.52)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="open-collection-title"
            onClick={event => event.stopPropagation()}
            style={{
              width: "min(100%, 520px)",
              borderRadius: "1.4rem",
              border: "1px solid rgba(15,47,110,.1)",
              background: "white",
              padding: "1.35rem",
              boxShadow: "0 24px 70px rgba(8,16,42,.24)",
            }}
          >
            <p style={{ margin: 0, color: "#2E4080", fontSize: ".68rem", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>
              Nuova raccolta ordini
            </p>
            <h2 id="open-collection-title" style={{ margin: ".45rem 0 0", color: "#0f2f6e", fontSize: "1.25rem" }}>
              Come saranno consegnati i libri di “{openCollectionConfirmation.conventionTitle}”?
            </h2>
            <p style={{ margin: ".65rem 0 0", color: "#6b7280", fontSize: ".82rem", lineHeight: 1.55 }}>
              La modalità resterà associata a questa raccolta e sarà mostrata agli studenti durante l’adesione.
            </p>

            <fieldset style={{ display: "grid", gap: ".7rem", margin: "1rem 0 0", padding: 0, border: 0 }}>
              <legend style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                Modalità di consegna
              </legend>
              {(["university", "home"] as const).map(deliveryMode => {
                const selected = openCollectionConfirmation.deliveryMode === deliveryMode;
                return (
                  <label
                    key={deliveryMode}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: ".75rem",
                      minHeight: 62,
                      border: `1px solid ${selected ? "#1847a3" : "rgba(15,47,110,.12)"}`,
                      borderRadius: "1rem",
                      background: selected ? "#f2f6ff" : "white",
                      padding: ".85rem",
                      cursor: collectionActionKey ? "not-allowed" : "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="delivery_mode"
                      value={deliveryMode}
                      checked={selected}
                      disabled={Boolean(collectionActionKey)}
                      onChange={() => setOpenCollectionConfirmation(current =>
                        current ? { ...current, deliveryMode } : current
                      )}
                      style={{ marginTop: ".18rem", accentColor: "#1847a3" }}
                    />
                    <span>
                      <strong style={{ display: "block", color: "#0f2f6e", fontSize: ".84rem" }}>
                        {DELIVERY_MODE_LABELS[deliveryMode]}
                      </strong>
                      <small style={{ display: "block", marginTop: ".2rem", color: "#6b7280", fontSize: ".72rem", lineHeight: 1.45 }}>
                        {deliveryMode === "home"
                          ? "Nel checkout verranno richiesti indirizzo completo e dati di spedizione."
                          : "Non verrà richiesto l’indirizzo; le istruzioni per il ritiro saranno comunicate da ASTRA."}
                      </small>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: ".65rem", marginTop: "1.2rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setOpenCollectionConfirmation(null)}
                disabled={Boolean(collectionActionKey)}
                style={{ minHeight: 44, border: "1px solid rgba(15,47,110,.14)", background: "white", color: "#0f2f6e", borderRadius: 999, padding: ".65rem 1rem", fontWeight: 800, cursor: collectionActionKey ? "not-allowed" : "pointer" }}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void openCollection(
                  openCollectionConfirmation.conventionId,
                  openCollectionConfirmation.deliveryMode
                )}
                disabled={Boolean(collectionActionKey)}
                style={{ minHeight: 44, border: "none", background: collectionActionKey ? "#8ca4d7" : "#1847a3", color: "white", borderRadius: 999, padding: ".65rem 1.1rem", fontWeight: 800, cursor: collectionActionKey ? "wait" : "pointer" }}
              >
                {collectionActionKey ? "Apertura..." : "Apri raccolta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {collectionConfirmation && (
        <div
          role="presentation"
          onClick={() => {
            if (!collectionActionKey) setCollectionConfirmation(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 95,
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            background: "rgba(8,16,42,.48)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-collection-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(100%, 480px)",
              borderRadius: "1.4rem",
              border: "1px solid rgba(15,47,110,.1)",
              background: "white",
              padding: "1.35rem",
              boxShadow: "0 24px 70px rgba(8,16,42,.22)",
            }}
          >
            <p style={{ margin: 0, color: "#2E4080", fontSize: ".68rem", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>
              Conferma chiusura
            </p>
            <h2 id="close-collection-title" style={{ margin: ".45rem 0 0", color: "#0f2f6e", fontSize: "1.25rem" }}>
              Chiudere la raccolta di “{collectionConfirmation.conventionTitle}”?
            </h2>
            <p style={{ margin: ".75rem 0 0", color: "#6b7280", fontSize: ".88rem", lineHeight: 1.6 }}>
              Le adesioni raccolte resteranno nello storico e potranno essere esportate nuovamente. La prossima apertura creerà una nuova raccolta separata.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: ".65rem", marginTop: "1.2rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setCollectionConfirmation(null)}
                disabled={Boolean(collectionActionKey)}
                style={{ border: "1px solid rgba(15,47,110,.14)", background: "white", color: "#0f2f6e", borderRadius: 999, padding: ".65rem 1rem", fontWeight: 800, cursor: collectionActionKey ? "not-allowed" : "pointer" }}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void closeCollection()}
                disabled={Boolean(collectionActionKey)}
                style={{ border: "none", background: collectionActionKey ? "#8ca4d7" : "#1847a3", color: "white", borderRadius: 999, padding: ".65rem 1rem", fontWeight: 800, cursor: collectionActionKey ? "wait" : "pointer" }}
              >
                {collectionActionKey
                  ? "Chiusura..."
                  : collectionConfirmation.exportAfterClose
                    ? "Chiudi ed esporta"
                    : "Chiudi raccolta"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main
        ref={adminMainRef}
        tabIndex={-1}
        aria-hidden={deleteConfirmation ? true : undefined}
        inert={deleteConfirmation ? true : undefined}
        style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f7f9fc 0%,#eef3fb 100%)", padding: "8.5rem 1.5rem 4rem" }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* ── Hero ── */}
          <section style={{ background: "linear-gradient(135deg,#0f2f6e 0%,#1847a3 100%)", borderRadius: "2rem", padding: "clamp(1.5rem,3vw,2.5rem)", color: "white", boxShadow: "0 24px 60px rgba(15,47,110,.18)", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                <span style={{ alignSelf: "flex-start", padding: ".4rem .9rem", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: ".85rem", fontWeight: 700 }}>
                  {booksScope
                    ? "Amministrazione • Convenzioni Libri"
                    : "Amministrazione • Convenzioni generali"}
                </span>
                <h1 style={{ margin: 0, fontSize: "clamp(2rem,5vw,3rem)", lineHeight: 1.05, fontWeight: 800 }}>
                  {booksScope ? "Catalogo e raccolte." : "Gestione convenzioni."}
                </h1>
                <p style={{ margin: 0, color: "rgba(255,255,255,.8)", lineHeight: 1.6, maxWidth: 500 }}>
                  {booksScope
                    ? "Gestisci convenzioni libri, prodotti singoli, bundle, copertine e raccolte ordini."
                    : "Crea, modifica, attiva e disattiva le convenzioni generali visibili alla community."}
                </p>
              </div>
              {!booksScope && (
                <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => setModal({ mode: "create" })}
                    style={{ border: "none", background: "#fff", color: "#0f2f6e", padding: ".85rem 1.5rem", borderRadius: "999px", fontWeight: 800, cursor: "pointer", fontSize: ".9rem", display: "inline-flex", alignItems: "center", gap: ".5rem", boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}
                  >
                    <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>＋</span>
                    Nuova convenzione
                  </button>
                  <Link
                    href="/admin/convenzione-libri"
                    style={{ textDecoration: "none", color: "white", padding: ".85rem 1.3rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.1)", fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    Convenzioni Libri
                  </Link>
                  <Link href="/admin" style={{ textDecoration: "none", color: "white", padding: ".85rem 1.3rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.1)", fontWeight: 700, whiteSpace: "nowrap" }}>
                    Pannello admin
                  </Link>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem" }}>
              {dashboardMetrics.map(([l, v]) => (
                <div key={String(l)} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.14)", borderRadius: "1.2rem", padding: ".9rem 1.1rem" }}>
                  <div style={{ fontSize: ".85rem", color: "rgba(255,255,255,.7)" }}>{l}</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: ".2rem" }}>{v}</div>
                </div>
              ))}
            </div>
          </section>

          {booksScope && (
            <section className="book-admin-quick-actions" aria-labelledby="book-admin-actions-title">
              <div className="book-admin-quick-actions-heading">
                <div>
                  <span className="book-admin-quick-actions-kicker">Gestione operativa</span>
                  <h2 id="book-admin-actions-title">Catalogo e adesioni</h2>
                  <p>Crea una convenzione con i relativi libri e bundle, oppure consulta le richieste già ricevute.</p>
                </div>
                <Link className="book-admin-dashboard-link" href="/admin">
                  <LayoutDashboard size={17} aria-hidden="true" />
                  Pannello admin
                </Link>
              </div>

              <div className="book-admin-quick-actions-buttons">
                <button
                  type="button"
                  className="book-admin-action book-admin-action-primary"
                  onClick={() => setModal({ mode: "create" })}
                >
                  <span className="book-admin-action-icon" aria-hidden="true">
                    <Plus size={22} />
                  </span>
                  <span className="book-admin-action-copy">
                    <strong>Nuova convenzione libri</strong>
                    <small>Configura catalogo, prezzi e disponibilità</small>
                  </span>
                </button>

                <Link
                  className="book-admin-action book-admin-action-secondary"
                  href="/admin/convenzione-libri?view=adesioni"
                >
                  <span className="book-admin-action-icon" aria-hidden="true">
                    <ClipboardList size={21} />
                  </span>
                  <span className="book-admin-action-copy">
                    <strong>Visualizza adesioni</strong>
                    <small>Consulta, filtra ed esporta gli ordini</small>
                  </span>
                </Link>
              </div>
            </section>
          )}

          {/* ── Messages ── */}
          {(error || success || warning) && (
            <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              {error && (
                <div role="alert" style={{ background: "rgba(190,39,39,.08)", color: "#8b1d1d", border: "1px solid rgba(190,39,39,.14)", borderRadius: "1rem", padding: ".9rem 1.1rem", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {error}
                  <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#8b1d1d", fontSize: "1rem" }}>✕</button>
                </div>
              )}
              {success && (
                <div role="status" aria-live="polite" style={{ background: "rgba(12,122,77,.08)", color: "#0b6b46", border: "1px solid rgba(12,122,77,.14)", borderRadius: "1rem", padding: ".9rem 1.1rem", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {success}
                  <button onClick={() => setSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#0b6b46", fontSize: "1rem" }}>✕</button>
                </div>
              )}
              {warning && (
                <div role="status" aria-live="polite" style={{ background: "#fff8e8", color: "#73551a", border: "1px solid #ead8ad", borderRadius: "1rem", padding: ".9rem 1.1rem", fontWeight: 650, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  {warning}
                  <button onClick={() => setWarning("")} aria-label="Chiudi avviso" style={{ background: "none", border: "none", cursor: "pointer", color: "#73551a", fontSize: "1rem" }}>✕</button>
                </div>
              )}
            </div>
          )}

          {/* ── List ── */}
          <section style={{ background: "rgba(255,255,255,.82)", border: "1px solid rgba(15,47,110,.08)", boxShadow: "0 8px 32px rgba(15,47,110,.07)", backdropFilter: "blur(12px)", borderRadius: "2rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f2f6e" }}>
                {loading ? "Caricamento..." : `${filtered.length} convenzion${filtered.length === 1 ? "e" : "i"}`}
              </h2>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                {(["tutte", "attive", "disattive"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ border: filter === f ? "1px solid #0f2f6e" : "1px solid rgba(15,47,110,.12)", background: filter === f ? "#0f2f6e" : "white", color: filter === f ? "#fff" : "#4a5a7a", borderRadius: "999px", padding: ".45rem 1.1rem", fontWeight: 600, fontSize: ".82rem", cursor: "pointer", transition: "all .18s" }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#6b7280" }}>
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={booksScope ? "Cerca per titolo..." : "Cerca per titolo, partner o categoria..."}
                style={{ width: "100%", padding: ".85rem 1rem .85rem 2.6rem", border: "1px solid rgba(15,47,110,.1)", borderRadius: "999px", background: "white", fontSize: ".92rem", color: "#102a56", outline: "none" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", background: "rgba(15,47,110,.07)", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", color: "#6b7280", fontSize: ".7rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              )}
            </div>

            {/* Items */}
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ height: 88, borderRadius: "1.2rem", background: "rgba(15,47,110,.06)", animation: "sk 1.4s ease infinite" }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#6b7280" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🤝</div>
                <p style={{ fontWeight: 700, color: "#0f2f6e", marginBottom: ".5rem" }}>Nessuna convenzione trovata</p>
                <p style={{ fontSize: ".9rem" }}>Prova a cambiare i filtri o crea una nuova convenzione.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                {filtered.map(c => {
                  const catStyle = getCatStyle(c.categoria ?? "");
                  const deleting = deletingId === c.id;
                  const initials = booksScope
                    ? "LB"
                    : c.partner?.slice(0, 2).toUpperCase() ?? "??";
                  const conventionProducts = bookConventionBooks[c.id] ?? [];
                  const activeProducts = conventionProducts.filter(product => product.is_active);
                  const bundleCount = activeProducts.filter(product => product.product_type === "bundle").length;
                  const conventionRounds = rounds
                    .filter(round => round.convention_id === c.id)
                    .sort(
                      (left, right) =>
                        new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()
                    );
                  const activeRound = conventionRounds.find(isRoundActive) ?? null;
                  const upcomingRounds = conventionRounds.filter(isRoundUpcoming);
                  const closedRounds = conventionRounds.filter(isRoundClosed).reverse();
                  const activeRoundProductCount = activeRound
                    ? conventionProducts.filter((product) =>
                      product.round_ids.includes(activeRound.id)
                    ).length
                    : 0;
                  const roundNumberById = new Map(
                    conventionRounds.map((round, index) => [round.id, index + 1])
                  );
                  const collectionBusy = collectionActionKey?.endsWith(`:${c.id}`) === true ||
                    (activeRound
                      ? collectionActionKey === `close:${activeRound.id}`
                      : false);

                  return (
                    <div
                      key={c.id}
                      className="conv-admin-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.2rem",
                        padding: "1.2rem 1.4rem",
                        background: c.attiva ? "#fff" : "rgba(15,47,110,.02)",
                        border: `1px solid ${c.attiva ? "rgba(15,47,110,.08)" : "rgba(15,47,110,.05)"}`,
                        borderRadius: "1.4rem",
                        opacity: c.attiva ? 1 : .65,
                        transition: "box-shadow .2s, transform .2s",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Logo initials */}
                      <div style={{ width: 48, height: 48, borderRadius: "12px", background: "linear-gradient(135deg,#e8edfb 0%,#c8d4f5 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: ".82rem", color: "#0E1F6B", flexShrink: 0, letterSpacing: ".02em" }}>
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="conv-admin-info" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap", marginBottom: ".25rem" }}>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "1rem",
                              fontWeight: 700,
                              color: "#08102A",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                            }}
                          >
                            {c.titolo}
                          </h3>
                          {!booksScope && c.categoria ? (
                            <span style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", background: catStyle.bg, color: catStyle.text, padding: ".22rem .65rem", borderRadius: "999px" }}>
                              {formatCategoryLabel(c.categoria)}
                            </span>
                          ) : null}
                          {booksScope && (
                            <span
                              style={{
                                fontSize: ".68rem",
                                fontWeight: 700,
                                letterSpacing: ".06em",
                                textTransform: "uppercase",
                                background: "rgba(46,64,128,.08)",
                                color: "#2E4080",
                                padding: ".22rem .65rem",
                                borderRadius: "999px",
                              }}
                            >
                              Convenzione libri
                            </span>
                          )}
                          {!c.attiva && (
                            <span style={{ fontSize: ".62rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", background: "rgba(15,47,110,.06)", color: "#6b7280", padding: ".2rem .6rem", borderRadius: "999px" }}>
                              Disattiva
                            </span>
                          )}
                        </div>
                        {!booksScope && c.partner ? (
                          <p style={{ margin: 0, fontSize: ".84rem", color: "#2E4080", fontWeight: 600 }}>{c.partner}</p>
                        ) : null}
                        {!booksScope && c.vantaggio && (
                          <p
                            style={{
                              margin: ".25rem 0 0",
                              fontSize: ".82rem",
                              color: "#6b7280",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                            }}
                          >
                            {c.vantaggio}
                          </p>
                        )}
                        {booksScope && conventionProducts.length > 0 && (
                          <p
                            style={{
                              margin: ".25rem 0 0",
                              fontSize: ".8rem",
                              color: "#6b7280",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                            }}
                          >
                            {activeProducts.length} elementi attivi · {bundleCount} bundle
                            {conventionProducts.length > activeProducts.length
                              ? ` · ${conventionProducts.length - activeProducts.length} disattivati`
                              : ""}
                          </p>
                        )}
                        {booksScope && (
                          <div
                            style={{
                              marginTop: ".75rem",
                              border: `1px solid ${activeRound ? "rgba(12,122,77,.18)" : "rgba(15,47,110,.08)"}`,
                              background: activeRound ? "rgba(12,122,77,.035)" : "rgba(15,47,110,.025)",
                              borderRadius: "1rem",
                              padding: ".85rem",
                              display: "flex",
                              flexDirection: "column",
                              gap: ".75rem",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: ".75rem", flexWrap: "wrap", alignItems: "center" }}>
                              <strong style={{ color: "#0f2f6e", fontSize: ".82rem" }}>Raccolte ordini</strong>
                              <span
                                style={{
                                  fontSize: ".68rem",
                                  fontWeight: 800,
                                  color: activeRound ? "#0b6b46" : "#6b7280",
                                  background: activeRound ? "rgba(12,122,77,.08)" : "rgba(15,47,110,.06)",
                                  padding: ".22rem .6rem",
                                  borderRadius: 999,
                                }}
                              >
                                {activeRound ? "Raccolta aperta" : "Nessuna raccolta aperta"}
                              </span>
                            </div>

                            {activeRound ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}>
                                  <div>
                                    <p style={{ margin: 0, color: "#17315f", fontSize: ".78rem", fontWeight: 800 }}>
                                      Raccolta {roundNumberById.get(activeRound.id)}
                                    </p>
                                    <p style={{ margin: ".2rem 0 0", color: "#6b7280", fontSize: ".74rem" }}>
                                      Aperta il {formatDateTime(activeRound.starts_at)} · {activeRoundProductCount} prodotti inclusi
                                    </p>
                                    <p style={{ margin: ".2rem 0 0", color: "#2E4080", fontSize: ".7rem", fontWeight: 800 }}>
                                      {DELIVERY_MODE_LABELS[activeRound.delivery_mode]}
                                    </p>
                                  </div>
                                  <div className="book-collection-actions" style={{ display: "flex", gap: ".45rem", flexWrap: "wrap" }}>
                                    <button
                                      type="button"
                                      onClick={() => setCollectionConfirmation({
                                        conventionId: c.id,
                                        conventionTitle: c.titolo,
                                        roundId: activeRound.id,
                                        exportAfterClose: false,
                                      })}
                                      disabled={collectionBusy}
                                      style={{ border: "1px solid rgba(15,47,110,.14)", background: "white", color: "#0f2f6e", borderRadius: 999, padding: ".5rem .75rem", fontWeight: 800, fontSize: ".72rem", cursor: collectionBusy ? "wait" : "pointer" }}
                                    >
                                      Chiudi raccolta
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCollectionConfirmation({
                                        conventionId: c.id,
                                        conventionTitle: c.titolo,
                                        roundId: activeRound.id,
                                        exportAfterClose: true,
                                      })}
                                      disabled={collectionBusy}
                                      style={{ border: "none", background: collectionBusy ? "#8ca4d7" : "#1847a3", color: "white", borderRadius: 999, padding: ".5rem .75rem", fontWeight: 800, fontSize: ".72rem", cursor: collectionBusy ? "wait" : "pointer" }}
                                    >
                                      Chiudi ed esporta
                                    </button>
                                  </div>
                                </div>
                                <p style={{ margin: 0, color: "#6b7280", fontSize: ".72rem", lineHeight: 1.5 }}>
                                  Il catalogo è bloccato durante la raccolta. Per modificare prodotti o prezzi, chiudila prima: lo storico resterà invariato.
                                </p>
                              </div>
                            ) : (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}>
                                <p style={{ margin: 0, color: "#6b7280", fontSize: ".76rem", lineHeight: 1.5, maxWidth: 520 }}>
                                  Aprendo una nuova raccolta verranno inclusi automaticamente tutti i libri e bundle attivi. Lo storico precedente non verrà modificato.
                                </p>
                                <button
                                  className="book-collection-primary-action"
                                  type="button"
                                  onClick={() => setOpenCollectionConfirmation({
                                    conventionId: c.id,
                                    conventionTitle: c.titolo,
                                    deliveryMode: "university",
                                  })}
                                  disabled={collectionBusy || activeProducts.length === 0 || upcomingRounds.length > 0}
                                  style={{ border: "none", background: collectionBusy || activeProducts.length === 0 || upcomingRounds.length > 0 ? "#8ca4d7" : "#1847a3", color: "white", borderRadius: 999, padding: ".6rem .9rem", fontWeight: 800, fontSize: ".75rem", cursor: collectionBusy ? "wait" : activeProducts.length === 0 || upcomingRounds.length > 0 ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                                >
                                  {collectionBusy ? "Apertura..." : "Apri nuova raccolta"}
                                </button>
                              </div>
                            )}

                            {activeProducts.length === 0 && !activeRound && (
                              <p style={{ margin: 0, color: "#8b1d1d", fontSize: ".72rem", fontWeight: 700 }}>
                                Attiva almeno un libro o bundle per poter aprire la raccolta.
                              </p>
                            )}

                            {upcomingRounds.length > 0 && (
                              <div style={{ border: "1px solid rgba(180,120,20,.18)", background: "rgba(180,120,20,.06)", borderRadius: ".8rem", padding: ".65rem" }}>
                                <p style={{ margin: 0, color: "#7a4c08", fontSize: ".72rem", fontWeight: 800 }}>
                                  È presente una vecchia raccolta programmata dal {formatDateOnly(upcomingRounds[0].starts_at)} al {formatDateOnly(upcomingRounds[0].ends_at)}. L’apertura automatica resta bloccata per evitare sovrapposizioni.
                                </p>
                              </div>
                            )}

                            {closedRounds.length > 0 && (
                              <details style={{ borderTop: "1px solid rgba(15,47,110,.08)", paddingTop: ".65rem" }}>
                                <summary style={{ color: "#17315f", fontSize: ".74rem", fontWeight: 800, cursor: "pointer" }}>
                                  Storico raccolte ({closedRounds.length})
                                </summary>
                                <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", marginTop: ".55rem" }}>
                                  {closedRounds.map(round => (
                                    <div key={round.id} style={{ display: "flex", justifyContent: "space-between", gap: ".7rem", alignItems: "center", flexWrap: "wrap", background: "white", border: "1px solid rgba(15,47,110,.07)", borderRadius: ".75rem", padding: ".55rem .65rem" }}>
                                      <span style={{ color: "#374151", fontSize: ".72rem", fontWeight: 700 }}>
                                        Raccolta {roundNumberById.get(round.id)} · {formatDateOnly(round.starts_at)} – {formatDateOnly(round.ends_at)}
                                        {` · ${DELIVERY_MODE_LABELS[round.delivery_mode]}`}
                                      </span>
                                      <Link
                                        className="book-collection-export-link"
                                        href={`/admin/convenzione-libri?view=adesioni&convention_id=${c.id}&round_id=${round.id}&download=csv`}
                                        style={{ color: "#1847a3", fontSize: ".7rem", fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap", border: "1px solid rgba(24,71,163,.16)", borderRadius: 999, padding: ".42rem .65rem" }}
                                      >
                                        Esporta CSV
                                      </Link>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Order badge */}
                      <div
                        className="conv-admin-order"
                        style={{
                          flexShrink: 0,
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "rgba(15,47,110,.06)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: ".75rem",
                          fontWeight: 700,
                          color: "#4a5a7a",
                        }}
                        title="Ordine"
                      >
                        {c.ordine}
                      </div>

                      {/* Actions */}
                      <div className="conv-admin-actions" style={{ display: "flex", gap: ".5rem", flexShrink: 0 }}>
                        {!booksScope && (
                          <button
                            onClick={() => toggleAttiva(c)}
                            style={{
                              border: `1px solid ${c.attiva ? "rgba(12,122,77,.2)" : "rgba(15,47,110,.14)"}`,
                              background: c.attiva ? "rgba(12,122,77,.07)" : "white",
                              color: c.attiva ? "#0b6b46" : "#4a5a7a",
                              borderRadius: "999px", padding: ".5rem .9rem", fontWeight: 700, fontSize: ".8rem", cursor: "pointer", transition: "all .18s", whiteSpace: "nowrap",
                            }}
                          >
                            {c.attiva ? "Disattiva" : "Attiva"}
                          </button>
                        )}
                        <button
                          onClick={() => setModal({ mode: "edit", conv: c })}
                          disabled={booksScope && Boolean(activeRound)}
                          title={booksScope && activeRound ? "Chiudi prima la raccolta ordini" : undefined}
                          style={{ border: "1px solid rgba(15,47,110,.14)", background: "white", color: booksScope && activeRound ? "#8a94a8" : "#0f2f6e", borderRadius: "999px", padding: ".5rem 1rem", fontWeight: 700, fontSize: ".82rem", cursor: booksScope && activeRound ? "not-allowed" : "pointer", transition: "background .18s" }}
                          className="btn-edit-conv"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={event => void handleDelete(c, event.currentTarget)}
                          disabled={deleting}
                          title={booksScope ? "Elimina definitivamente convenzione e storico" : undefined}
                          style={{ border: "1px solid rgba(190,39,39,.18)", background: deleting ? "rgba(190,39,39,.05)" : "white", color: deleting ? "#b57b7b" : "#8b1d1d", borderRadius: "999px", padding: ".5rem 1rem", fontWeight: 700, fontSize: ".82rem", cursor: deleting ? "wait" : "pointer", transition: "background .18s" }}
                        >
                          {deleting ? "..." : "Elimina"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <style>{`
        @keyframes sk { 0%,100%{opacity:.4} 50%{opacity:.85} }
        .conv-admin-row:hover { box-shadow: 0 8px 32px rgba(15,47,110,.1) !important; transform: translateY(-2px); }
        .btn-edit-conv:hover { background: rgba(15,47,110,.05) !important; }
        .book-admin-quick-actions {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          padding: 1.35rem 1.5rem;
          border: 1px solid rgba(15,47,110,.1);
          border-radius: 1.35rem;
          background: rgba(255,255,255,.94);
          box-shadow: 0 10px 30px rgba(15,47,110,.07);
        }
        .book-admin-quick-actions-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1.25rem;
        }
        .book-admin-quick-actions-kicker {
          display: block;
          margin-bottom: .3rem;
          color: #58709f;
          font-size: .68rem;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .book-admin-quick-actions-heading h2 {
          margin: 0;
          color: #0f2f6e;
          font-size: 1.15rem;
          line-height: 1.25;
        }
        .book-admin-quick-actions-heading p {
          margin: .35rem 0 0;
          color: #667085;
          font-size: .86rem;
          line-height: 1.5;
        }
        .book-admin-dashboard-link {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: .45rem;
          color: #38517e;
          font-size: .8rem;
          font-weight: 750;
          text-decoration: none;
          white-space: nowrap;
        }
        .book-admin-dashboard-link:hover { color: #0f2f6e; }
        .book-admin-quick-actions-buttons {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: .8rem;
        }
        .book-admin-action {
          min-width: 0;
          min-height: 64px;
          display: flex;
          align-items: center;
          gap: .8rem;
          padding: .85rem 1rem;
          border-radius: .9rem;
          font: inherit;
          text-align: left;
          text-decoration: none;
          cursor: pointer;
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease;
        }
        .book-admin-action:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(15,47,110,.1);
        }
        .book-admin-action-primary {
          border: 1px solid #1847a3;
          background: #1847a3;
          color: white;
          box-shadow: 0 6px 16px rgba(24,71,163,.18);
        }
        .book-admin-action-primary:hover { background: #123c8f; }
        .book-admin-action-secondary {
          border: 1px solid rgba(24,71,163,.2);
          background: #f7f9fe;
          color: #0f2f6e;
        }
        .book-admin-action-secondary:hover {
          border-color: rgba(24,71,163,.34);
          background: #f1f5fd;
        }
        .book-admin-action-icon {
          width: 38px;
          height: 38px;
          display: inline-flex;
          flex: 0 0 38px;
          align-items: center;
          justify-content: center;
          border-radius: .7rem;
          background: rgba(255,255,255,.16);
        }
        .book-admin-action-secondary .book-admin-action-icon { background: rgba(24,71,163,.09); }
        .book-admin-action-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: .15rem;
        }
        .book-admin-action-copy strong {
          font-size: .9rem;
          line-height: 1.25;
        }
        .book-admin-action-copy small {
          color: inherit;
          font-size: .72rem;
          line-height: 1.35;
          opacity: .72;
        }
        @media (max-width: 720px) {
          .book-admin-quick-actions-heading {
            flex-direction: column;
            gap: .75rem;
          }

          .book-admin-quick-actions-buttons {
            grid-template-columns: 1fr;
          }

          .book-admin-action {
            width: 100%;
          }

          .conv-admin-row {
            align-items: flex-start !important;
            gap: .9rem !important;
            padding: 1rem !important;
          }

          .conv-admin-info {
            min-width: 0 !important;
            flex: 1 1 calc(100% - 60px) !important;
          }

          .conv-admin-order {
            order: 3;
            width: 28px !important;
            height: 28px !important;
            font-size: .72rem !important;
          }

          .conv-admin-actions {
            order: 4;
            width: 100%;
            flex-wrap: wrap;
            margin-top: .15rem;
          }

          .conv-admin-actions button {
            flex: 1 1 100%;
            justify-content: center;
            padding: .72rem 1rem !important;
          }

          .book-admin-grid-3,
          .book-admin-grid-title,
          .book-admin-grid-2,
          .book-admin-grid-description,
          .book-admin-bundle-row,
          .book-admin-cover,
          form div[style*="grid-template-columns: 1.4fr .8fr .9fr"],
          form div[style*="grid-template-columns: 1fr 120px"] {
            grid-template-columns: 1fr !important;
          }

          .book-admin-bundle-row button {
            width: 100%;
          }

          .book-collection-actions,
          .book-collection-primary-action,
          .book-collection-export-link {
            width: 100%;
          }

          .book-collection-actions button,
          .book-collection-primary-action,
          .book-collection-export-link {
            width: 100%;
            min-height: 44px;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
        }

        @media (max-width: 520px) {
          .book-delete-dialog-actions button {
            width: 100%;
            flex: 1 1 100%;
          }

          .conv-admin-row {
            display: grid !important;
            grid-template-columns: 44px 1fr;
            align-items: start !important;
            column-gap: .85rem !important;
            row-gap: .8rem !important;
          }

          .conv-admin-info {
            flex: unset !important;
          }

          .conv-admin-order {
            grid-column: 1 / -1;
            order: unset;
          }

          .conv-admin-actions {
            grid-column: 1 / -1;
            order: unset;
            margin-top: 0;
          }
        }
      `}</style>
    </>
  );
}
