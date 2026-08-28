"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BOOK_YEAR_LABELS,
  BOOK_YEARS,
  PRODUCT_TYPE_LABELS,
  STUDY_AREAS,
  STUDY_AREA_LABELS,
  type BookYear,
  type ProductType,
  type StudyArea,
} from "@/lib/book-convention";

// ── Types ─────────────────────────────────────────────────────────
type Convenzione = {
  id: number;
  titolo: string;
  partner: string;
  descrizione: string;
  vantaggio: string;
  categoria: string;
  link: string;
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
  reference_year: BookYear;
  description: string | null;
  sort_order: number;
  product_type: ProductType;
  bundle_items: string[];
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

function createEmptyBook(sortOrder = 0): BookConventionBook {
  return {
    id: null,
    title: "",
    price: 0,
    reference_year: "primo_anno",
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
        partner: initial.partner,
        descrizione: initial.descrizione,
        vantaggio: initial.vantaggio,
        categoria: scope === "books"
          ? initial.categoria || BOOK_CONVENTION_CATEGORY
          : initial.categoria,
        link: initial.link,
        ordine: String(initial.ordine),
        attiva: initial.attiva,
        is_book_convention: scope === "books",
        books:
          initialBooks.length > 0
            ? initialBooks.map((book, index) => ({
              id: book.id ?? null,
              convention_id: book.convention_id ?? initial.id,
              title: book.title ?? "",
              price: typeof book.price === "number" && Number.isFinite(book.price) ? book.price : 0,
              reference_year: book.reference_year ?? "primo_anno",
              description: book.description ?? "",
              sort_order: book.sort_order ?? index,
              product_type: book.product_type ?? "book",
              bundle_items: Array.isArray(book.bundle_items) ? book.bundle_items : [],
              study_area: book.study_area ?? "medicina_chirurgia",
              is_active: book.is_active !== false,
              round_ids: Array.isArray(book.round_ids) ? book.round_ids : [],
              cover_image: book.cover_image ?? null,
            }))
            : Array.isArray(initial.book_items) && initial.book_items.length > 0
              ? initial.book_items.map((item, index) => ({
                id: null,
                convention_id: initial.id,
                title: item.title,
                price: typeof item.price === "number" && Number.isFinite(item.price) ? item.price : 0,
                reference_year: "primo_anno" as BookYear,
                description: "",
                sort_order: index,
                product_type: "book" as ProductType,
                bundle_items: [],
                study_area: "medicina_chirurgia" as StudyArea,
                is_active: true,
                round_ids: [],
                cover_image: null,
              }))
              : [],
      }
      : {
        ...EMPTY_FORM,
        categoria: scope === "books" ? BOOK_CONVENTION_CATEGORY : "",
        is_book_convention: scope === "books",
        books: [],
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

  const addBook = () => {
    setForm(current => ({
      ...current,
      books: [...current.books, createEmptyBook(current.books.length)],
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

    const titolo = form.titolo.trim();
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

    if (!partner) {
      setErr("Il partner è obbligatorio.");
      return;
    }

    if (!categoria) {
      setErr("Seleziona una categoria.");
      return;
    }

    if (link && link !== "#") {
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
      const invalidBook = form.books.find(book => !book.title.trim());

      if (invalidBook) {
        setErr("Ogni libro/promozione deve avere un titolo.");
        return;
      }

      const invalidPrice = form.books.find(book => book.price === null || !Number.isFinite(Number(book.price)) || Number(book.price) < 0);
      if (invalidPrice) {
        setErr("Ogni libro/promozione deve avere un prezzo valido.");
        return;
      }

      const invalidBundle = form.books.find(
        book =>
          book.product_type === "bundle" &&
          !book.bundle_items.some(item => item.trim().length > 0)
      );
      if (invalidBundle) {
        setErr(`Il bundle “${invalidBundle.title}” deve contenere almeno un prodotto.`);
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

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,20,50,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        style={{ background: "#fff", borderRadius: "2rem", padding: "2.5rem", width: "100%", maxWidth: 660, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(10,20,50,.22)" }}
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
                ? mode === "create" ? "Nuova convenzione libri" : "Modifica convenzione libri"
                : mode === "create" ? "Nuova convenzione" : "Modifica convenzione"}
            </h2>
            <p style={{ margin: ".3rem 0 0", color: "#6b7280", fontSize: ".9rem" }}>
              {scope === "books"
                ? "Configura dati generali, catalogo, bundle e disponibilità."
                : mode === "create" ? "Compila i campi per aggiungere una convenzione." : "Modifica i dettagli della convenzione."}
            </p>
          </div>
          <button onClick={onClose} disabled={saving} style={{ background: "rgba(15,47,110,.06)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: saving ? "not-allowed" : "pointer", fontSize: "1rem", color: "#6b7280", opacity: saving ? .6 : 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

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
                    Libri e bundle collegati
                  </label>
                  <button
                    type="button"
                    onClick={addBook}
                    style={{ border: "1px solid rgba(15,47,110,.14)", background: "white", color: "#0f2f6e", borderRadius: "999px", padding: ".5rem .85rem", fontWeight: 800, cursor: "pointer", fontSize: ".78rem" }}
                  >
                    + Aggiungi elemento
                  </button>
                </div>

                {form.books.length === 0 ? (
                  <div style={{ border: "1px dashed rgba(15,47,110,.2)", borderRadius: "14px", padding: "1rem", color: "#6b7280", fontSize: ".86rem", lineHeight: 1.5 }}>
                    Nessun libro aggiunto. Aggiungi libri singoli o bundle/promozioni, ad esempio “Libro A + Libro B”.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
                    {form.books.map((book, index) => (
                      <div key={book.id ?? `new-${index}`} style={{ border: "1px solid rgba(15,47,110,.1)", background: "white", borderRadius: "16px", padding: "1rem", display: "grid", gap: ".85rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".75rem" }}>
                          <strong style={{ color: "#0f2f6e", fontSize: ".85rem" }}>
                            {PRODUCT_TYPE_LABELS[book.product_type]} #{index + 1}
                          </strong>
                          <button
                            type="button"
                            onClick={() => requestRemoveBook(index)}
                            style={{ border: "1px solid rgba(190,39,39,.14)", background: "white", color: "#8b1d1d", borderRadius: "999px", padding: ".35rem .7rem", fontWeight: 800, cursor: "pointer", fontSize: ".72rem" }}
                          >
                            Rimuovi
                          </button>
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

                        <div className="book-admin-grid-3" style={{ display: "grid", gridTemplateColumns: "1.4fr .8fr .9fr", gap: ".75rem" }}>
                          <MField label="Titolo *" value={book.title} onChange={v => updateBook(index, { title: v })} placeholder="es. Anatomia Gray" />
                          <MField label="Prezzo *" type="number" value={String(book.price ?? "")} onChange={v => updateBook(index, { price: v === "" ? null : Number(v) })} placeholder="45" />
                          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                            <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Anno *</label>
                            <select
                              value={book.reference_year}
                              onChange={e => updateBook(index, { reference_year: e.target.value as BookYear })}
                              style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#102a56", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".95rem", outline: "none" }}
                            >
                              {BOOK_YEARS.map(year => (
                                <option key={year} value={year}>{BOOK_YEAR_LABELS[year]}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="book-admin-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr .8fr", gap: ".75rem" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                            <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Tipologia *</label>
                            <select
                              value={book.product_type}
                              onChange={e => {
                                const productType = e.target.value as ProductType;
                                updateBook(index, {
                                  product_type: productType,
                                  bundle_items: productType === "book" ? [] : book.bundle_items,
                                });
                              }}
                              style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#102a56", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".9rem", outline: "none" }}
                            >
                              <option value="book">Libro singolo</option>
                              <option value="bundle">Bundle</option>
                            </select>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                            <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Macro-area *</label>
                            <select
                              value={book.study_area}
                              onChange={e => updateBook(index, { study_area: e.target.value as StudyArea })}
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

                        {book.product_type === "bundle" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                            <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Prodotti inclusi nel bundle *</label>
                            <textarea
                              value={book.bundle_items.join("\n")}
                              onChange={e => updateBook(index, {
                                bundle_items: e.target.value.split("\n"),
                              })}
                              placeholder={"Un prodotto per riga\nAnatomia Umana - Volume 1\nAtlante"}
                              rows={4}
                              style={{ border: "1px solid rgba(15,47,110,.12)", background: "rgba(15,47,110,.02)", color: "#102a56", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".88rem", outline: "none", width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                            />
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}

                <p style={{ margin: 0, color: "#6b7280", fontSize: ".82rem", lineHeight: 1.5 }}>
                  Ogni elemento può essere un libro singolo oppure un bundle/promozione. Gli studenti vedranno la lista divisa per anno.
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
                  ? scope === "books" ? "Crea convenzione libri" : "Crea convenzione"
                  : "Salva modifiche"}
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
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
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
  const [filter, setFilter] = useState<"tutte" | "attive" | "disattive">("tutte");
  const [search, setSearch] = useState("");
  const isFetchingRef = useRef(false);
  const [rounds, setRounds] = useState<BookConventionRound[]>([]);
  const [bookConventionBooks, setBookConventionBooks] = useState<Record<number, BookConventionBook[]>>({});
  const [collectionActionKey, setCollectionActionKey] = useState<string | null>(null);
  const [collectionConfirmation, setCollectionConfirmation] = useState<CollectionConfirmation | null>(null);

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

    const titolo = form.titolo.trim();
    const partner = form.partner.trim();
    const categoria = booksScope
      ? BOOK_CONVENTION_CATEGORY
      : form.categoria.trim();
    const linkValue = form.link.trim();
    const ordineValue = form.ordine.trim();

    if (!titolo) return { ok: false, message: "Il titolo è obbligatorio." };
    if (!partner) return { ok: false, message: "Il partner è obbligatorio." };
    if (!categoria) return { ok: false, message: "Seleziona una categoria." };

    if (linkValue && linkValue !== "#") {
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
      descrizione: form.descrizione.trim(),
      vantaggio: form.vantaggio.trim(),
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
            partner,
            description: form.descrizione.trim(),
            vantaggio: form.vantaggio.trim(),
            categoria,
            link: linkValue || "#",
            ordine: Number(ordineValue || "0"),
            attiva: form.attiva,
            books: form.books.map((book, index) => ({
              id: book.id ?? null,
              title: book.title.trim(),
              price: Number(book.price ?? 0),
              reference_year: book.reference_year,
              description: book.description?.trim() || null,
              sort_order: Number(book.sort_order ?? index),
              product_type: book.product_type,
              bundle_items: book.product_type === "bundle"
                ? book.bundle_items.map(item => item.trim()).filter(Boolean)
                : [],
              study_area: book.study_area,
              is_active: book.is_active,
              round_ids: book.round_ids,
            })),
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

  async function handleDelete(conv: Convenzione) {
    const confirmationMessage = booksScope
      ? `Archiviare “${conv.titolo}”? I prodotti verranno disattivati, mentre periodi e adesioni storiche saranno conservati.`
      : `Eliminare “${conv.titolo}”?`;

    if (!window.confirm(confirmationMessage)) return;

    setDeletingId(conv.id);
    setError("");
    setSuccess("");

    try {
      if (booksScope) {
        const response = await fetch("/api/admin/book-convention", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ convention_id: conv.id }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };

        if (!response.ok) {
          setError(payload.error || "Archiviazione non riuscita.");
          return;
        }

        await fetchConvenzioni();
        setSuccess(payload.message || "Convenzione libri archiviata.");
        return;
      }

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

  async function toggleAttiva(conv: Convenzione) {
    setError("");
    setSuccess("");

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

  async function openCollection(conventionId: number) {
    const actionKey = `open:${conventionId}`;
    setCollectionActionKey(actionKey);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/book-convention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open_collection",
          convention_id: conventionId,
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
      list = list.filter(c => c.titolo.toLowerCase().includes(q) || c.partner.toLowerCase().includes(q) || c.categoria.toLowerCase().includes(q));
    }
    return list;
  }, [convenzioni, filter, search]);

  const attive = convenzioni.filter(c => c.attiva).length;
  const categories = useMemo(() => [...new Set(convenzioni.map(c => c.categoria).filter(Boolean))], [convenzioni]);
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

      <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f7f9fc 0%,#eef3fb 100%)", padding: "8.5rem 1.5rem 4rem" }}>
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
                  {booksScope ? "Catalogo e periodi." : "Gestione convenzioni."}
                </h1>
                <p style={{ margin: 0, color: "rgba(255,255,255,.8)", lineHeight: 1.6, maxWidth: 500 }}>
                  {booksScope
                    ? "Gestisci convenzioni libri, prodotti singoli, bundle, copertine e periodi di adesione."
                    : "Crea, modifica, attiva e disattiva le convenzioni generali visibili alla community."}
                </p>
              </div>
              <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => setModal({ mode: "create" })}
                  style={{ border: "none", background: "#fff", color: "#0f2f6e", padding: ".85rem 1.5rem", borderRadius: "999px", fontWeight: 800, cursor: "pointer", fontSize: ".9rem", display: "inline-flex", alignItems: "center", gap: ".5rem", boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}
                >
                  <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>＋</span>
                  {booksScope ? "Nuova convenzione libri" : "Nuova convenzione"}
                </button>
                <Link
                  href={booksScope
                    ? "/admin/convenzione-libri?view=adesioni"
                    : "/admin/convenzione-libri"}
                  style={{ textDecoration: "none", color: "white", padding: ".85rem 1.3rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.1)", fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  {booksScope ? "Visualizza adesioni" : "Convenzioni Libri"}
                </Link>
                <Link href="/admin" style={{ textDecoration: "none", color: "white", padding: ".85rem 1.3rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.1)", fontWeight: 700, whiteSpace: "nowrap" }}>
                  Pannello admin
                </Link>
              </div>
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

          {/* ── Messages ── */}
          {(error || success) && (
            <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              {error && (
                <div style={{ background: "rgba(190,39,39,.08)", color: "#8b1d1d", border: "1px solid rgba(190,39,39,.14)", borderRadius: "1rem", padding: ".9rem 1.1rem", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {error}
                  <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#8b1d1d", fontSize: "1rem" }}>✕</button>
                </div>
              )}
              {success && (
                <div style={{ background: "rgba(12,122,77,.08)", color: "#0b6b46", border: "1px solid rgba(12,122,77,.14)", borderRadius: "1rem", padding: ".9rem 1.1rem", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {success}
                  <button onClick={() => setSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#0b6b46", fontSize: "1rem" }}>✕</button>
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
                placeholder="Cerca per titolo, partner o categoria..."
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
                  const catStyle = getCatStyle(c.categoria);
                  const deleting = deletingId === c.id;
                  const initials = c.partner?.slice(0, 2).toUpperCase() ?? "??";
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
                          <span style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", background: catStyle.bg, color: catStyle.text, padding: ".22rem .65rem", borderRadius: "999px" }}>
                            {formatCategoryLabel(c.categoria)}
                          </span>
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
                        <p style={{ margin: 0, fontSize: ".84rem", color: "#2E4080", fontWeight: 600 }}>{c.partner}</p>
                        {c.vantaggio && (
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
                                {activeRound ? "Raccolta aperta" : "Raccolta chiusa"}
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
                                      Aperta il {formatDateTime(activeRound.starts_at)} · {activeProducts.length} prodotti inclusi
                                    </p>
                                  </div>
                                  <div style={{ display: "flex", gap: ".45rem", flexWrap: "wrap" }}>
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
                                  Il catalogo di questa raccolta è stato fissato all’apertura. Le modifiche successive saranno incluse nella prossima raccolta.
                                </p>
                              </div>
                            ) : (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}>
                                <p style={{ margin: 0, color: "#6b7280", fontSize: ".76rem", lineHeight: 1.5, maxWidth: 520 }}>
                                  Aprendo una nuova raccolta verranno inclusi automaticamente tutti i libri e bundle attivi. Lo storico precedente non verrà modificato.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => void openCollection(c.id)}
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
                                      </span>
                                      <Link
                                        href={`/admin/convenzione-libri?view=adesioni&convention_id=${c.id}&round_id=${round.id}&download=csv`}
                                        style={{ color: "#1847a3", fontSize: ".7rem", fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}
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
                          style={{ border: "1px solid rgba(15,47,110,.14)", background: "white", color: "#0f2f6e", borderRadius: "999px", padding: ".5rem 1rem", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", transition: "background .18s" }}
                          className="btn-edit-conv"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={deleting}
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
        @media (max-width: 720px) {
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
          .book-admin-grid-description,
          .book-admin-cover,
          form div[style*="grid-template-columns: 1.4fr .8fr .9fr"],
          form div[style*="grid-template-columns: 1fr 120px"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 520px) {
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
