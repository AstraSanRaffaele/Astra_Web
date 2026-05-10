"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  book_titles: string[] | null;
  book_items: { title: string; price: number | null }[] | null;
  created_at: string;
  updated_at: string;
};

type BookYear = "primo_anno" | "secondo_anno" | "terzo_anno";

type BookConventionBook = {
  id?: number | null;
  convention_id?: number | null;
  title: string;
  price: number | null;
  reference_year: BookYear;
  description: string | null;
  sort_order: number;
};

type BookConventionRound = {
  id: string;
  convention_id: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
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

const CATEGORY_OPTIONS = [
  "Trasporti",
  "Sport",
  "Libri_e_Materiale_Didattico",
  "Tech",
  "Bar_e_Ristoranti",
  "Altro",
];

const BOOK_YEAR_OPTIONS: Array<{ value: BookYear; label: string }> = [
  { value: "primo_anno", label: "Primo anno" },
  { value: "secondo_anno", label: "Secondo anno" },
  { value: "terzo_anno", label: "Terzo anno" },
];

function createEmptyBook(sortOrder = 0): BookConventionBook {
  return {
    id: null,
    title: "",
    price: 0,
    reference_year: "primo_anno",
    description: "",
    sort_order: sortOrder,
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

function isRoundActive(round: BookConventionRound) {
  const now = Date.now();
  return new Date(round.starts_at).getTime() <= now && now <= new Date(round.ends_at).getTime();
}

// ── Modal ─────────────────────────────────────────────────────────
function ConvModal({
  mode, initial, initialBooks = [], onClose, onSave,
}: {
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
        categoria: initial.categoria,
        link: initial.link,
        ordine: String(initial.ordine),
        attiva: initial.attiva,
        is_book_convention: Boolean(initial.is_book_convention),
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
              }))
              : [],
      }
      : { ...EMPTY_FORM, books: [] }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [bookRemovalIndex, setBookRemovalIndex] = useState<number | null>(null);
  const [bookRemovalChecked, setBookRemovalChecked] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const requestRemoveBook = (index: number) => {
    setBookRemovalIndex(index);
    setBookRemovalChecked(false);
  };

  const confirmRemoveBook = () => {
    if (bookRemovalIndex === null || !bookRemovalChecked) return;

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
    const categoria = form.categoria.trim();
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
    }

    setSaving(true);
    setErr("");

    timeoutRef.current = setTimeout(() => {
      setSaving(false);
      setErr("Il salvataggio sta impiegando troppo tempo. Riprova.");
    }, 15000);

    try {
      const result = await onSave(form);
      if (!result.ok) {
        setErr(result.message || "Salvataggio non riuscito. Controlla i dati e riprova.");
      }
    } catch (error) {
      console.error("Errore salvataggio convenzione:", error);
      setErr("Si è verificato un errore durante il salvataggio.");
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
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
                Se il libro è già stato salvato, al prossimo salvataggio verranno eliminate anche tutte le adesioni collegate a questo libro/promozione.
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
                Confermo di voler rimuovere il libro e le eventuali adesioni collegate.
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
              {mode === "create" ? "Nuova convenzione" : "Modifica convenzione"}
            </h2>
            <p style={{ margin: ".3rem 0 0", color: "#6b7280", fontSize: ".9rem" }}>
              {mode === "create" ? "Compila i campi per aggiungere una convenzione." : "Modifica i dettagli della convenzione."}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
              <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Categoria *</label>
              <select
                value={form.categoria}
                onChange={e => set("categoria", e.target.value)}
                style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: form.categoria ? "#102a56" : "#9ca3af", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".95rem", outline: "none", appearance: "none" }}
              >
                <option value="">Seleziona...</option>
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c} value={c}>
                    {formatCategoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <MField label="Ordine" type="number" value={form.ordine} onChange={v => set("ordine", v)} placeholder="0" />
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

          <SectionLabel>Convenzione libri</SectionLabel>

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
            <button
              type="button"
              onClick={() => set("is_book_convention", !form.is_book_convention)}
              style={{
                border: "none",
                background: "transparent",
                color: form.is_book_convention ? "#0f2f6e" : "#4a5a7a",
                padding: 0,
                fontWeight: 800,
                cursor: "pointer",
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
                  border: `2px solid ${form.is_book_convention ? "#0f2f6e" : "rgba(15,47,110,.25)"
                    }`,
                  background: form.is_book_convention ? "#0f2f6e" : "#fff",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: ".82rem",
                  flexShrink: 0,
                }}
              >
                {form.is_book_convention ? "✓" : ""}
              </span>

              Questa è una convenzione libri
            </button>

            {form.is_book_convention && (
              <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem", flexWrap: "wrap" }}>
                  <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>
                    Libri/promozioni collegati
                  </label>
                  <button
                    type="button"
                    onClick={addBook}
                    style={{ border: "1px solid rgba(15,47,110,.14)", background: "white", color: "#0f2f6e", borderRadius: "999px", padding: ".5rem .85rem", fontWeight: 800, cursor: "pointer", fontSize: ".78rem" }}
                  >
                    + Aggiungi libro
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
                          <strong style={{ color: "#0f2f6e", fontSize: ".85rem" }}>Libro/promozione #{index + 1}</strong>
                          <button
                            type="button"
                            onClick={() => requestRemoveBook(index)}
                            style={{ border: "1px solid rgba(190,39,39,.14)", background: "white", color: "#8b1d1d", borderRadius: "999px", padding: ".35rem .7rem", fontWeight: 800, cursor: "pointer", fontSize: ".72rem" }}
                          >
                            Rimuovi
                          </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1.4fr .8fr .9fr", gap: ".75rem" }}>
                          <MField label="Titolo *" value={book.title} onChange={v => updateBook(index, { title: v })} placeholder="es. Anatomia Gray" />
                          <MField label="Prezzo *" type="number" value={String(book.price ?? "")} onChange={v => updateBook(index, { price: v === "" ? null : Number(v) })} placeholder="45" />
                          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                            <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Anno *</label>
                            <select
                              value={book.reference_year}
                              onChange={e => updateBook(index, { reference_year: e.target.value as BookYear })}
                              style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#102a56", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".95rem", outline: "none" }}
                            >
                              {BOOK_YEAR_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: ".75rem" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                            <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Descrizione/promozione</label>
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
                    ))}
                  </div>
                )}

                <p style={{ margin: 0, color: "#6b7280", fontSize: ".82rem", lineHeight: 1.5 }}>
                  Ogni elemento può essere un libro singolo oppure un bundle/promozione. Gli studenti vedranno la lista divisa per anno.
                </p>
              </div>
            )}
          </div>
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
              {saving ? "Salvataggio..." : mode === "create" ? "Crea convenzione" : "Salva modifiche"}
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
export default function AdminConvenzioni() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [convenzioni, setConvenzioni] = useState<Convenzione[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; conv?: Convenzione } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<"tutte" | "attive" | "disattive">("tutte");
  const [search, setSearch] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [rounds, setRounds] = useState<BookConventionRound[]>([]);
  const [bookConventionBooks, setBookConventionBooks] = useState<Record<number, BookConventionBook[]>>({});
  const [roundForms, setRoundForms] = useState<Record<number, { starts_at: string; ends_at: string }>>({});
  const [savingRoundId, setSavingRoundId] = useState<number | null>(null);
  const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!profile || profile.role !== "admin") { router.replace("/"); return; }
      await fetchConvenzioni();
    }
    load();
  }, [supabase, router]);

  async function fetchConvenzioni() {
    if (isFetching) return;

    setIsFetching(true);
    setLoading(true);
    setError("");

    try {
      const { data, error: err } = await supabase
        .from("convenzioni")
        .select("*")
        .order("ordine", { ascending: true });

      if (err) {
        setError(`Caricamento convenzioni non riuscito: ${err.message}`);
        return;
      }

      setConvenzioni((data ?? []) as Convenzione[]);

      const bookConventionIds = (data ?? [])
        .filter(item => Boolean(item.is_book_convention))
        .map(item => Number(item.id));

      if (bookConventionIds.length > 0) {
        const { data: booksData, error: booksErr } = await supabase
          .from("book_convention_books")
          .select("id, convention_id, title, price, reference_year, description, sort_order")
          .in("convention_id", bookConventionIds)
          .order("reference_year", { ascending: true })
          .order("sort_order", { ascending: true })
          .order("title", { ascending: true });

        if (booksErr) {
          setError(`Caricamento libri non riuscito: ${booksErr.message}`);
          return;
        }

        const groupedBooks = ((booksData ?? []) as BookConventionBook[]).reduce<Record<number, BookConventionBook[]>>((acc, book) => {
          const conventionId = Number(book.convention_id);
          if (!acc[conventionId]) acc[conventionId] = [];
          acc[conventionId].push(book);
          return acc;
        }, {});

        setBookConventionBooks(groupedBooks);
      } else {
        setBookConventionBooks({});
      }

      const { data: roundData, error: roundErr } = await supabase
        .from("book_convention_rounds")
        .select("id, convention_id, starts_at, ends_at, created_at")
        .order("starts_at", { ascending: false });

      if (roundErr) {
        setError(`Caricamento periodi non riuscito: ${roundErr.message}`);
        return;
      }

      setRounds((roundData ?? []) as BookConventionRound[]);
    } catch (error) {
      console.error("Errore fetch convenzioni:", error);
      setError("Si è verificato un errore durante il caricamento delle convenzioni.");
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }

  async function handleSave(form: ConvForm, editingId?: number): Promise<{ ok: boolean; message?: string }> {
    setError("");
    setSuccess("");

    const titolo = form.titolo.trim();
    const partner = form.partner.trim();
    const categoria = form.categoria.trim();
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
      is_book_convention: form.is_book_convention,
      book_titles: form.is_book_convention ? form.books.map(item => item.title.trim()).filter(Boolean) : [],
      book_items: form.is_book_convention
        ? form.books.map(item => ({ title: item.title.trim(), price: Number(item.price ?? 0) }))
        : [],
    };

    try {
      if (form.is_book_convention) {
        const res = await fetch("/api/admin/book-convention", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            convention_id: editingId,
            title: titolo,
            partner,
            description: form.descrizione.trim(),
            books: form.books.map((book, index) => ({
              id: book.id ?? null,
              title: book.title.trim(),
              price: Number(book.price ?? 0),
              reference_year: book.reference_year,
              description: book.description?.trim() || null,
              sort_order: Number(book.sort_order ?? index),
            })),
          }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          const message = json.error || "Salvataggio convenzione libri non riuscito.";
          setError(message);
          return { ok: false, message };
        }

        const savedId = Number(json.convention_id || editingId);
        const { error: extraErr } = await supabase
          .from("convenzioni")
          .update({
            vantaggio: form.vantaggio.trim(),
            categoria,
            link: linkValue || "#",
            ordine: Number(ordineValue || "0"),
            attiva: form.attiva,
            book_titles: form.books.map(item => item.title.trim()).filter(Boolean),
            book_items: form.books.map(item => ({ title: item.title.trim(), price: Number(item.price ?? 0) })),
          })
          .eq("id", savedId);

        if (extraErr) {
          const message = `Salvataggio dettagli convenzione non riuscito: ${extraErr.message}`;
          setError(message);
          return { ok: false, message };
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

  async function handleDelete(id: number, titolo: string) {
    if (!window.confirm(`Eliminare "${titolo}"?`)) return;

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      const { error: err } = await supabase.from("convenzioni").delete().eq("id", id);

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

  function updateRoundForm(conventionId: number, key: "starts_at" | "ends_at", value: string) {
    setRoundForms(current => ({
      ...current,
      [conventionId]: {
        starts_at: current[conventionId]?.starts_at ?? "",
        ends_at: current[conventionId]?.ends_at ?? "",
        [key]: value,
      },
    }));
  }

  async function createRound(conventionId: number) {
    const form = roundForms[conventionId];

    if (!form?.starts_at || !form?.ends_at) {
      setError("Inserisci sia la data di inizio sia la data di fine del periodo.");
      return;
    }

    const startsAt = new Date(`${form.starts_at}T00:00:00`).toISOString();
    const endsAt = new Date(`${form.ends_at}T23:59:59`).toISOString();

    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setError("La data di fine deve essere successiva alla data di inizio.");
      return;
    }

    setSavingRoundId(conventionId);
    setError("");
    setSuccess("");

    try {
      const { error: err } = await supabase
        .from("book_convention_rounds")
        .insert({
          convention_id: conventionId,
          starts_at: startsAt,
          ends_at: endsAt,
        });

      if (err) {
        setError(`Creazione periodo non riuscita: ${err.message}`);
        return;
      }

      setRoundForms(current => ({
        ...current,
        [conventionId]: { starts_at: "", ends_at: "" },
      }));
      await fetchConvenzioni();
      setSuccess("Periodo creato.");
    } catch (error) {
      console.error("Errore creazione periodo:", error);
      setError("Si è verificato un errore durante la creazione del periodo.");
    } finally {
      setSavingRoundId(null);
    }
  }

  async function deleteRound(round: BookConventionRound) {
    if (
      !window.confirm(
        `Eliminare il periodo ${formatDateOnly(round.starts_at)} - ${formatDateOnly(round.ends_at)}? Verranno eliminate anche tutte le adesioni collegate a questo periodo.`
      )
    ) {
      return;
    }

    setDeletingRoundId(round.id);
    setError("");
    setSuccess("");

    try {
      const { error: adhesionErr } = await supabase
        .from("book_convention_adhesions")
        .delete()
        .eq("round_id", round.id);

      if (adhesionErr) {
        setError(`Eliminazione adesioni del periodo non riuscita: ${adhesionErr.message}`);
        return;
      }

      const { error: err } = await supabase
        .from("book_convention_rounds")
        .delete()
        .eq("id", round.id);

      if (err) {
        setError(`Eliminazione periodo non riuscita: ${err.message}`);
        return;
      }

      await fetchConvenzioni();
      setSuccess("Periodo e adesioni collegate eliminati.");
    } catch (error) {
      console.error("Errore eliminazione periodo:", error);
      setError("Si è verificato un errore durante l'eliminazione del periodo.");
    } finally {
      setDeletingRoundId(null);
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

  return (
    <>
      {modal && (
        <ConvModal
          mode={modal.mode}
          initial={modal.conv}
          initialBooks={modal.conv ? bookConventionBooks[modal.conv.id] ?? [] : []}
          onClose={() => setModal(null)}
          onSave={f => handleSave(f, modal.conv?.id)}
        />
      )}

      <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f7f9fc 0%,#eef3fb 100%)", padding: "8.5rem 1.5rem 4rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* ── Hero ── */}
          <section style={{ background: "linear-gradient(135deg,#0f2f6e 0%,#1847a3 100%)", borderRadius: "2rem", padding: "clamp(1.5rem,3vw,2.5rem)", color: "white", boxShadow: "0 24px 60px rgba(15,47,110,.18)", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                <span style={{ alignSelf: "flex-start", padding: ".4rem .9rem", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: ".85rem", fontWeight: 700 }}>
                  Amministrazione • Gestione convenzioni
                </span>
                <h1 style={{ margin: 0, fontSize: "clamp(2rem,5vw,3rem)", lineHeight: 1.05, fontWeight: 800 }}>
                  Gestione convenzioni.
                </h1>
                <p style={{ margin: 0, color: "rgba(255,255,255,.8)", lineHeight: 1.6, maxWidth: 500 }}>
                  Crea, modifica, attiva e disattiva le convenzioni visibili agli studenti della community.
                </p>
              </div>
              <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => setModal({ mode: "create" })}
                  style={{ border: "none", background: "#fff", color: "#0f2f6e", padding: ".85rem 1.5rem", borderRadius: "999px", fontWeight: 800, cursor: "pointer", fontSize: ".9rem", display: "inline-flex", alignItems: "center", gap: ".5rem", boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}
                >
                  <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>＋</span> Nuova convenzione
                </button>
                <a href="/admin" style={{ textDecoration: "none", color: "white", padding: ".85rem 1.3rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.1)", fontWeight: 700, whiteSpace: "nowrap" }}>
                  Pannello admin
                </a>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem" }}>
              {[["Totale", convenzioni.length], ["Attive", attive], ["Disattive", convenzioni.length - attive], ["Categorie", categories.length]].map(([l, v]) => (
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
                          {c.is_book_convention && (
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
                        {c.is_book_convention && (bookConventionBooks[c.id]?.length ?? 0) > 0 && (
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
                            Libri: {bookConventionBooks[c.id]
                              .map(item =>
                                `${item.title}${item.price !== null && item.price !== undefined
                                  ? ` (€${item.price})`
                                  : ""
                                }`
                              )
                              .join(", ")}
                          </p>
                        )}
                        {c.is_book_convention && (
                          <div
                            style={{
                              marginTop: ".75rem",
                              border: "1px solid rgba(15,47,110,.08)",
                              background: "rgba(15,47,110,.025)",
                              borderRadius: "1rem",
                              padding: ".85rem",
                              display: "flex",
                              flexDirection: "column",
                              gap: ".75rem",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: ".75rem", flexWrap: "wrap", alignItems: "center" }}>
                              <strong style={{ color: "#0f2f6e", fontSize: ".82rem" }}>Periodi di attivazione</strong>
                              {rounds.filter(round => round.convention_id === c.id && isRoundActive(round)).length > 0 && (
                                <span style={{ fontSize: ".68rem", fontWeight: 800, color: "#0b6b46", background: "rgba(12,122,77,.08)", padding: ".22rem .6rem", borderRadius: 999 }}>
                                  Periodo attivo ora
                                </span>
                              )}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr)) auto", gap: ".55rem", alignItems: "end" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
                                <label style={{ fontSize: ".68rem", fontWeight: 700, color: "#4a5a7a" }}>Dal</label>
                                <input
                                  type="date"
                                  value={roundForms[c.id]?.starts_at ?? ""}
                                  onChange={e => updateRoundForm(c.id, "starts_at", e.target.value)}
                                  style={{ border: "1px solid rgba(15,47,110,.12)", borderRadius: "10px", padding: ".55rem .65rem", fontSize: ".82rem", color: "#102a56", background: "white" }}
                                />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
                                <label style={{ fontSize: ".68rem", fontWeight: 700, color: "#4a5a7a" }}>Al</label>
                                <input
                                  type="date"
                                  value={roundForms[c.id]?.ends_at ?? ""}
                                  onChange={e => updateRoundForm(c.id, "ends_at", e.target.value)}
                                  style={{ border: "1px solid rgba(15,47,110,.12)", borderRadius: "10px", padding: ".55rem .65rem", fontSize: ".82rem", color: "#102a56", background: "white" }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => createRound(c.id)}
                                disabled={savingRoundId === c.id}
                                style={{ border: "none", background: savingRoundId === c.id ? "#8ca4d7" : "#1847a3", color: "white", borderRadius: "999px", padding: ".62rem .95rem", fontWeight: 800, fontSize: ".78rem", cursor: savingRoundId === c.id ? "wait" : "pointer", whiteSpace: "nowrap" }}
                              >
                                {savingRoundId === c.id ? "Creo..." : "Crea periodo"}
                              </button>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: ".45rem" }}>
                              {rounds.filter(round => round.convention_id === c.id).length === 0 ? (
                                <p style={{ margin: 0, color: "#6b7280", fontSize: ".78rem" }}>Nessun periodo creato.</p>
                              ) : (
                                rounds
                                  .filter(round => round.convention_id === c.id)
                                  .map(round => (
                                    <div key={round.id} style={{ display: "flex", justifyContent: "space-between", gap: ".75rem", alignItems: "center", background: "white", border: "1px solid rgba(15,47,110,.07)", borderRadius: ".8rem", padding: ".55rem .65rem" }}>
                                      <span style={{ color: "#374151", fontSize: ".78rem", fontWeight: 700 }}>
                                        {formatDateOnly(round.starts_at)} - {formatDateOnly(round.ends_at)}
                                      </span>
                                      <div style={{ display: "flex", gap: ".45rem", alignItems: "center" }}>
                                        {isRoundActive(round) && (
                                          <span style={{ fontSize: ".65rem", fontWeight: 800, color: "#0b6b46", background: "rgba(12,122,77,.08)", padding: ".18rem .5rem", borderRadius: 999 }}>
                                            Attivo
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => deleteRound(round)}
                                          disabled={deletingRoundId === round.id}
                                          style={{ border: "1px solid rgba(190,39,39,.14)", background: "white", color: deletingRoundId === round.id ? "#b57b7b" : "#8b1d1d", borderRadius: "999px", padding: ".28rem .55rem", fontWeight: 800, fontSize: ".68rem", cursor: deletingRoundId === round.id ? "wait" : "pointer" }}
                                        >
                                          {deletingRoundId === round.id ? "..." : "Elimina"}
                                        </button>
                                      </div>
                                    </div>
                                  ))
                              )}
                            </div>
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
                        <button
                          onClick={() => setModal({ mode: "edit", conv: c })}
                          style={{ border: "1px solid rgba(15,47,110,.14)", background: "white", color: "#0f2f6e", borderRadius: "999px", padding: ".5rem 1rem", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", transition: "background .18s" }}
                          className="btn-edit-conv"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.titolo)}
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