"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  default: { bg: "rgba(8,16,42,.06)", text: "#2E4080", dot: "#2E4080" },
  trasporti: { bg: "rgba(16,107,60,.08)", text: "#0a6638", dot: "#0a6638" },
  sport: { bg: "rgba(107,16,16,.08)", text: "#8b1111", dot: "#c0392b" },
  libri_e_materiale_didattico: { bg: "rgba(107,60,16,.08)", text: "#7a4010", dot: "#c06a1a" },
  tech: { bg: "rgba(14,31,107,.08)", text: "#0E1F6B", dot: "#1A3399" },
  bar_e_ristoranti: { bg: "rgba(120,16,107,.08)", text: "#7a0f70", dot: "#9b12a0" },
};

function normalizeCategoryKey(cat: string) {
  return cat?.trim().toLowerCase().replace(/[\s-]+/g, "_") as keyof typeof categoryColors;
}

function formatCategoryLabel(cat: string) {
  return cat?.replace(/[_-]+/g, " ") ?? "";
}

function getCategoryStyle(cat: string) {
  const key = normalizeCategoryKey(cat);
  return categoryColors[key] ?? categoryColors.default;
}

type PaymentMethod =
  | "contanti"
  | "bonifico"
  | "carta"
  | "bonus_cultura"
  | "carta_del_docente"
  | "bonus_di_merito";

type BookYear = "primo_anno" | "secondo_anno" | "terzo_anno";

type BookItem = {
  id?: number;
  title: string;
  price: number | null;
  reference_year?: BookYear;
  description?: string | null;
};

type BookConventionRound = {
  id: string;
  convention_id: number;
  label?: string | null;
  starts_at: string;
  ends_at: string;
};

type BookConventionApiResponse = {
  ok?: boolean;
  convention?: any;
  activeRound?: BookConventionRound | null;
  rounds?: BookConventionRound[];
  books?: BookItem[];
  booksByYear?: Record<BookYear, BookItem[]>;
  hasAdhered?: boolean;
  adhesion?: any;
  error?: string;
};

type BookConvention = {
  id: string;
  titolo?: string | null;
  partner?: string | null;
  libri_titoli?: string[] | string | null;
  book_titles?: string[] | string | null;
  libri?: string[] | string | null;
  book_items?: BookItem[] | null;
  convenzione_libri?: boolean | null;
  is_book_convention?: boolean | null;
  activeRound?: BookConventionRound | null;
  canAdhere?: boolean;
};

function isBookConvention(c: any) {
  return Boolean(c?.convenzione_libri || c?.is_book_convention);
}

function getBookTitles(c: BookConvention | null) {
  if (!c) return [];

  const raw = c.libri_titoli ?? c.book_titles ?? c.libri ?? null;

  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof raw === "string") {
    return raw
      .split(/\n|,|;/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getBookItems(c: BookConvention | null): BookItem[] {
  if (!c) return [];

  if (Array.isArray(c.book_items) && c.book_items.length > 0) {
    return c.book_items
      .map((item) => ({
        title: String(item?.title ?? "").trim(),
        price:
          typeof item?.price === "number" && Number.isFinite(item.price)
            ? item.price
            : null,
      }))
      .filter((item) => item.title.length > 0);
  }

  return getBookTitles(c).map((title) => ({
    title,
    price: null,
  }));
}

function formatBookPrice(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Prezzo non indicato";
  }

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const YEAR_LABELS: Record<BookYear, string> = {
  primo_anno: "Primo anno",
  secondo_anno: "Secondo anno",
  terzo_anno: "Terzo anno",
};

const YEAR_ORDER: BookYear[] = ["primo_anno", "secondo_anno", "terzo_anno"];

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "contanti", label: "Contanti" },
  { value: "bonifico", label: "Bonifico" },
  { value: "carta", label: "Carta" },
  { value: "bonus_cultura", label: "Bonus cultura" },
  { value: "carta_del_docente", label: "Carta del docente" },
  { value: "bonus_di_merito", label: "Bonus di merito" },
];

function formatRoundLabel(round: BookConventionRound | null | undefined) {
  if (!round) return "Periodo non disponibile";

  const start = new Date(round.starts_at).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const end = new Date(round.ends_at).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return round.label ? `${round.label} • ${start} - ${end}` : `${start} - ${end}`;
}

function groupBooksByYear(books: BookItem[]) {
  return YEAR_ORDER.reduce<Record<BookYear, BookItem[]>>(
    (acc, year) => {
      acc[year] = books.filter((book) => book.reference_year === year);
      return acc;
    },
    { primo_anno: [], secondo_anno: [], terzo_anno: [] }
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(8,16,42,.06)",
        borderRadius: "1.75rem",
        padding: "1.6rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            width: 80,
            height: 26,
            borderRadius: "999px",
            background: "rgba(8,16,42,.06)",
            animation: "sk 1.4s ease infinite",
          }}
        />
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            background: "rgba(8,16,42,.06)",
            animation: "sk 1.4s ease infinite",
          }}
        />
      </div>
      <div
        style={{
          width: "70%",
          height: 20,
          borderRadius: "999px",
          background: "rgba(8,16,42,.06)",
          animation: "sk 1.4s ease infinite",
        }}
      />
      <div
        style={{
          width: "45%",
          height: 16,
          borderRadius: "999px",
          background: "rgba(8,16,42,.06)",
          animation: "sk 1.4s ease infinite",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            width: "100%",
            height: 12,
            borderRadius: "999px",
            background: "rgba(8,16,42,.05)",
            animation: "sk 1.4s ease infinite",
          }}
        />
        <div
          style={{
            width: "80%",
            height: 12,
            borderRadius: "999px",
            background: "rgba(8,16,42,.05)",
            animation: "sk 1.4s ease infinite",
          }}
        />
      </div>
      <div
        style={{
          marginTop: "auto",
          height: 56,
          borderRadius: "1rem",
          background: "rgba(8,16,42,.04)",
          animation: "sk 1.4s ease infinite",
        }}
      />
    </div>
  );
}

export default function ConvenzioniPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [convenzioni, setConvenzioni] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [selectedBookConvention, setSelectedBookConvention] =
    useState<BookConvention | null>(null);
  const [bookConventionDetails, setBookConventionDetails] =
    useState<BookConventionApiResponse | null>(null);
  const [bookDetailsLoading, setBookDetailsLoading] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<number[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [fiscalCodeOrVat, setFiscalCodeOrVat] = useState("");
  const [billingShippingAddress, setBillingShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("contanti");
  const [bookConfirmChecked, setBookConfirmChecked] = useState(false);
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookMessage, setBookMessage] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/convenzioni");
        return;
      }

      const { data } = await supabase
        .from("convenzioni")
        .select("*")
        .order("ordine", { ascending: true });

      const now = new Date().toISOString();

      const { data: activeRounds } = await supabase
        .from("book_convention_rounds")
        .select("id, convention_id, starts_at, ends_at")
        .lte("starts_at", now)
        .gte("ends_at", now);

      const activeRoundByConventionId = new Map(
        (activeRounds ?? []).map((round) => [round.convention_id, round])
      );

      const conventionsWithRounds = (data ?? []).map((convention) => {
        const activeRound = activeRoundByConventionId.get(convention.id) ?? null;

        return {
          ...convention,
          activeRound,
          canAdhere: Boolean(activeRound),
        };
      });

      setConvenzioni(conventionsWithRounds);
      setLoading(false);
    }

    load();
  }, [supabase, router]);

  const categories = useMemo(() => {
    const cats = [...new Set(convenzioni.map((c) => c.categoria).filter(Boolean))];
    return cats.sort();
  }, [convenzioni]);

  const filtered = useMemo(() => {
    return convenzioni.filter((c) => {
      const q = searchTerm.toLowerCase();

      const bookSearchText = Array.isArray(c.book_items)
        ? c.book_items
          .map((item: BookItem) => `${item.title} ${item.price ?? ""}`)
          .join(" ")
          .toLowerCase()
        : getBookTitles(c).join(" ").toLowerCase();

      const matchSearch =
        !q ||
        c.titolo?.toLowerCase().includes(q) ||
        c.partner?.toLowerCase().includes(q) ||
        c.categoria?.toLowerCase().includes(q) ||
        bookSearchText.includes(q);

      const matchCat = !activeCategory || c.categoria === activeCategory;

      return matchSearch && matchCat;
    });
  }, [convenzioni, searchTerm, activeCategory]);

  async function openBookConventionModal(convention: BookConvention) {
    setSelectedBookConvention(convention);
    setBookConventionDetails(null);
    setSelectedBookIds([]);
    setSelectedRoundId(convention.activeRound?.id ?? "");
    setPaymentMethod("contanti");
    setFiscalCodeOrVat("");
    setBillingShippingAddress("");
    setBookConfirmChecked(false);
    setBookMessage("");
    setBookDetailsLoading(true);

    try {
      const res = await fetch(`/api/book-convention?convention_id=${convention.id}`, {
        method: "GET",
        cache: "no-store",
      });

      if (res.status === 401) {
        router.replace("/login?next=/convenzioni");
        return;
      }

      const json: BookConventionApiResponse = await res.json();

      if (!res.ok) {
        setBookMessage(json.error || "Errore durante il caricamento della convenzione libri.");
        return;
      }

      setBookConventionDetails(json);
      setSelectedRoundId(json.activeRound?.id ?? convention.activeRound?.id ?? "");
    } catch {
      setBookMessage("Errore di connessione durante il caricamento dei libri.");
    } finally {
      setBookDetailsLoading(false);
    }
  }

  function toggleSelectedBook(bookId: number) {
    setSelectedBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  }

  async function submitBookConventionAdhesion() {
    if (!selectedBookConvention) return;

    if (selectedBookIds.length === 0) {
      setBookMessage("Seleziona almeno un libro o una promozione.");
      return;
    }

    const effectiveRoundId =
      bookConventionDetails?.activeRound?.id ??
      selectedBookConvention.activeRound?.id ??
      "";

    if (!effectiveRoundId) {
      setBookMessage("Nessun periodo attivo disponibile per questa convenzione.");
      return;
    }

    if (!fiscalCodeOrVat.trim()) {
      setBookMessage("Inserisci codice fiscale o partita IVA.");
      return;
    }

    if (!billingShippingAddress.trim()) {
      setBookMessage("Inserisci indirizzo di spedizione/fatturazione.");
      return;
    }

    if (!bookConfirmChecked) {
      setBookMessage("Devi confermare di voler aderire alla convenzione libri.");
      return;
    }

    try {
      setBookSubmitting(true);
      setBookMessage("");

      const res = await fetch("/api/book-convention", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          convention_id: selectedBookConvention.id,
          round_id: effectiveRoundId,
          selected_book_ids: selectedBookIds,
          payment_method: paymentMethod,
          fiscal_code_or_vat: fiscalCodeOrVat,
          billing_shipping_address: billingShippingAddress,
        }),
      });

      if (res.status === 401) {
        router.replace("/login?next=/convenzioni");
        return;
      }

      const json = await res.json();

      if (!res.ok) {
        setBookMessage(
          json.error || "Errore durante l'adesione alla convenzione libri."
        );
        return;
      }

      setBookMessage(json.message || "Adesione registrata correttamente.");

      window.setTimeout(() => {
        setSelectedBookConvention(null);
        setBookConventionDetails(null);
        setBookMessage("");
      }, 900);
    } catch {
      setBookMessage("Errore di connessione.");
    } finally {
      setBookSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'DM Sans', sans-serif;
          background: #F8F7F3;
          color: #08102A;
          overflow-x: hidden;
        }

        .book-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(8,16,42,.48);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}

.book-modal {
  width: min(100%, 560px);
  max-height: min(88vh, 720px);
  overflow: auto;
  background: #fff;
  border-radius: 1.75rem;
  border: 1px solid rgba(8,16,42,.1);
  box-shadow: 0 30px 90px rgba(8,16,42,.28);
  padding: 1.5rem;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: .65rem;
  border: 1px solid rgba(8,16,42,.1);
  border-radius: 1rem;
  padding: .85rem 1rem;
  cursor: pointer;
  color: #08102A;
  font-weight: 700;
}

.payment-option:hover {
  background: rgba(8,16,42,.035);
  border-color: rgba(8,16,42,.2);
}

.payment-option input,
.book-confirm-check input {
  accent-color: #08102A;
}

        @keyframes sk {
          0%, 100% { opacity: .5; }
          50% { opacity: 1; }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        .conv-hero-eyebrow { animation: fadeUp .5s .1s cubic-bezier(.4,0,.2,1) both; }
        .conv-hero-h1 { animation: fadeUp .6s .25s cubic-bezier(.4,0,.2,1) both; }
        .conv-hero-sub { animation: fadeUp .6s .4s cubic-bezier(.4,0,.2,1) both; }
        .conv-search-wrap { animation: fadeUp .6s .5s cubic-bezier(.4,0,.2,1) both; }

        .conv-search:focus {
          border-color: rgba(46,64,128,.4) !important;
          box-shadow: 0 0 0 4px rgba(46,64,128,.08) !important;
          outline: none;
        }

        .cat-pill {
          border: 1px solid rgba(8,16,42,.12);
          background: #fff;
          border-radius: 999px;
          padding: .45rem 1.1rem;
          font-size: .8rem;
          font-weight: 600;
          color: #6B7280;
          cursor: pointer;
          transition: background .18s, color .18s, border-color .18s;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .cat-pill:hover {
          background: rgba(8,16,42,.05);
          color: #08102A;
          border-color: rgba(8,16,42,.22);
        }

        .cat-pill.active {
          background: #08102A;
          color: #fff;
          border-color: #08102A;
        }

        .conv-card {
          background: #fff;
          border: 1px solid rgba(8,16,42,.07);
          border-radius: 1.75rem;
          padding: 1.6rem;
          display: flex;
          flex-direction: column;
          gap: .5rem;
          transition: transform .28s cubic-bezier(.4,0,.2,1), box-shadow .28s, border-color .28s;
          box-shadow: 0 2px 12px rgba(8,16,42,.04);
        }

        .conv-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 48px rgba(8,16,42,.1);
          border-color: rgba(8,16,42,.12);
        }

        .card-cta:hover {
          background: rgba(8,16,42,.04) !important;
          border-color: rgba(8,16,42,.25) !important;
        }

        .empty-state {
          text-align: center;
          padding: 5rem 2rem;
          color: #6B7280;
        }

        @media (max-width: 700px) {
          .conv-page-content {
            padding-left: 1.25rem !important;
            padding-right: 1.25rem !important;
          }

          .conv-hero {
            padding: 8rem 1.25rem 2.5rem !important;
          }

          .conv-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#F8F7F3",
          fontFamily: "'DM Sans', sans-serif",
          color: "#08102A",
        }}
      >
        <section
          className="conv-hero"
          style={{ maxWidth: 1100, margin: "0 auto", padding: "9rem 3rem 3rem" }}
        >
          <p
            className="conv-hero-eyebrow"
            style={{
              fontSize: ".68rem",
              fontWeight: 700,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: "#2E4080",
              marginBottom: "1.2rem",
            }}
          >
            Convenzioni
          </p>

          <h1
            className="conv-hero-h1"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(3rem,6vw,5.5rem)",
              fontWeight: 700,
              lineHeight: 0.98,
              letterSpacing: "-.025em",
              color: "#08102A",
              marginBottom: "1.4rem",
            }}
          >
            Vantaggi per
            <br />
            <span style={{ color: "#2E4080" }}>la community.</span>
          </h1>

          <p
            className="conv-hero-sub"
            style={{
              fontSize: "1rem",
              color: "#6B7280",
              maxWidth: 760,
              lineHeight: 1.75,
              fontWeight: 400,
            }}
          >
            Scopri tutte le convenzioni attive per gli studenti ASTRA: servizi, opportunità e sconti esclusivi.
            <br />
            <span style={{ color: "#08102A", fontWeight: 600 }}>
              Mostra la tua ASTRA Card
            </span>{" "}
            nei locali convenzionati, direttamente dal wallet nella sezione “Il mio profilo”, oppure utilizza i{" "}
            <span style={{ color: "#2E4080", fontWeight: 700 }}>
              codici sconto dedicati
            </span>{" "}
            per accedere alle offerte online.
          </p>

          {!loading && convenzioni.length > 0 && (
            <div style={{ display: "flex", gap: "2.5rem", marginTop: "2.5rem", flexWrap: "wrap" }}>
              {[
                [String(convenzioni.length), "Convenzioni attive"],
                [String(categories.length), "Categorie"],
              ].map(([n, l]) => (
                <div key={l} style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "3rem",
                      fontWeight: 700,
                      color: "#08102A",
                      lineHeight: 1,
                      letterSpacing: "-.04em",
                    }}
                  >
                    {n}
                  </span>
                  <span
                    style={{
                      fontSize: ".68rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".18em",
                      color: "#6B7280",
                    }}
                  >
                    {l}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div
          className="conv-search-wrap conv-page-content"
          style={{ maxWidth: 1100, margin: "0 auto", padding: "0 3rem 1.5rem" }}
        >
          <div style={{ position: "relative", marginBottom: "1rem" }}>
            <svg
              width="17"
              height="17"
              viewBox="0 0 17 17"
              fill="none"
              style={{
                position: "absolute",
                left: "1.1rem",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "#6B7280",
              }}
            >
              <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M11.5 11.5L15 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>

            <input
              className="conv-search"
              placeholder="Cerca convenzioni, partner, categorie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: ".9rem 1.2rem .9rem 2.8rem",
                borderRadius: "999px",
                border: "1px solid rgba(8,16,42,.1)",
                background: "#fff",
                fontSize: ".93rem",
                color: "#08102A",
                boxShadow: "0 2px 12px rgba(8,16,42,.05)",
                transition: "border-color .18s, box-shadow .18s",
              }}
            />

            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(8,16,42,.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6B7280",
                  fontSize: ".7rem",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {categories.length > 0 && (
            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
              <button
                className={`cat-pill${activeCategory === null ? " active" : ""}`}
                onClick={() => setActiveCategory(null)}
              >
                Tutte
              </button>

              {categories.map((cat) => {
                const catStyle = getCategoryStyle(cat);
                const isActive = activeCategory === cat;

                return (
                  <button
                    key={cat}
                    className="cat-pill"
                    onClick={() => setActiveCategory(isActive ? null : cat)}
                    style={
                      isActive
                        ? {
                          background: catStyle.text,
                          color: "#fff",
                          borderColor: catStyle.text,
                        }
                        : {}
                    }
                  >
                    {formatCategoryLabel(cat)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!loading && searchTerm && (
          <div
            className="conv-page-content"
            style={{ maxWidth: 1100, margin: "0 auto", padding: "0 3rem .75rem" }}
          >
            <p style={{ fontSize: ".82rem", color: "#6B7280", fontWeight: 500 }}>
              {filtered.length === 0
                ? "Nessun risultato"
                : `${filtered.length} risultato${filtered.length > 1 ? "i" : ""}`}{" "}
              per &quot;{searchTerm}&quot;
            </p>
          </div>
        )}

        <section
          className="conv-page-content"
          style={{ maxWidth: 1100, margin: "0 auto", padding: "0 3rem 6rem" }}
        >
          {loading ? (
            <div
              className="conv-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                gap: "1.25rem",
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔍</div>
              <p
                style={{
                  fontWeight: 600,
                  fontSize: "1.1rem",
                  color: "#08102A",
                  marginBottom: ".5rem",
                }}
              >
                Nessuna convenzione trovata
              </p>
              <p style={{ fontSize: ".9rem" }}>Prova a cambiare i filtri o la ricerca.</p>
            </div>
          ) : (
            <div
              className="conv-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                gap: "1.25rem",
              }}
            >
              {filtered.map((c) => {
                const catStyle = getCategoryStyle(c.categoria);
                const initials = c.partner?.slice(0, 2).toUpperCase() ?? "??";

                return (
                  <div key={c.id} className="conv-card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: ".4rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: ".68rem",
                          fontWeight: 700,
                          letterSpacing: ".06em",
                          textTransform: "uppercase",
                          background: catStyle.bg,
                          color: catStyle.text,
                          padding: ".32rem .75rem",
                          borderRadius: "999px",
                        }}
                      >
                        {formatCategoryLabel(c.categoria)}
                      </span>

                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, #e8edfb 0%, #c8d4f5 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: ".82rem",
                          color: "#0E1F6B",
                          flexShrink: 0,
                          letterSpacing: ".02em",
                        }}
                      >
                        {initials}
                      </div>
                    </div>

                    <h3
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        letterSpacing: "-.01em",
                        color: "#08102A",
                        lineHeight: 1.3,
                        marginTop: ".2rem",
                      }}
                    >
                      {c.titolo}
                    </h3>

                    <p style={{ fontSize: ".85rem", fontWeight: 600, color: "#2E4080", margin: 0 }}>
                      {c.partner}
                    </p>

                    {c.descrizione && (
                      <p
                        style={{
                          fontSize: ".88rem",
                          color: "#6B7280",
                          lineHeight: 1.65,
                          marginTop: ".4rem",
                          flex: 1,
                        }}
                      >
                        {c.descrizione}
                      </p>
                    )}

                    {c.vantaggio && (
                      <div
                        style={{
                          marginTop: "auto",
                          paddingTop: ".8rem",
                          borderTop: "1px solid rgba(8,16,42,.06)",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: ".75rem",
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: catStyle.dot,
                            flexShrink: 0,
                            marginTop: ".35rem",
                          }}
                        />
                        <div>
                          <p
                            style={{
                              fontSize: ".65rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: ".15em",
                              color: "#6B7280",
                              marginBottom: ".25rem",
                            }}
                          >
                            Vantaggio
                          </p>
                          <p
                            style={{
                              fontSize: ".9rem",
                              fontWeight: 700,
                              color: "#08102A",
                              lineHeight: 1.4,
                            }}
                          >
                            {c.vantaggio}
                          </p>
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: ".6rem",
                        marginTop: ".8rem",
                      }}
                    >
                      {isBookConvention(c) && c.canAdhere && (
                        <button
                          type="button"
                          onClick={() => openBookConventionModal(c)}
                          className="card-cta"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: ".84rem",
                            fontWeight: 700,
                            color: "#fff",
                            textDecoration: "none",
                            border: "1px solid #08102A",
                            background: "#08102A",
                            borderRadius: "999px",
                            padding: ".55rem 1.15rem",
                            transition: "background .18s, border-color .18s",
                            width: "fit-content",
                            cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          Aderisci
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      )}

                      {isBookConvention(c) && !c.canAdhere && (
                        <p style={{ margin: ".2rem 0 0", color: "#6B7280", fontSize: ".84rem", fontWeight: 700 }}>
                          Adesioni non attive in questo momento.
                        </p>
                      )}

                      {c.url && (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="card-cta"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: ".84rem",
                            fontWeight: 600,
                            color: "#08102A",
                            textDecoration: "none",
                            border: "1px solid rgba(8,16,42,.12)",
                            borderRadius: "999px",
                            padding: ".5rem 1.1rem",
                            transition: "background .18s, border-color .18s",
                            width: "fit-content",
                          }}
                        >
                          Scopri di più
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {selectedBookConvention && (
        <div
          className="book-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="book-modal-title"
          onClick={() => {
            if (!bookSubmitting) setSelectedBookConvention(null);
          }}
        >
          <div className="book-modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: ".68rem",
                    fontWeight: 800,
                    letterSpacing: ".18em",
                    textTransform: "uppercase",
                    color: "#2E4080",
                    marginBottom: ".55rem",
                  }}
                >
                  Convenzione libri
                </p>

                <h2
                  id="book-modal-title"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(2rem, 5vw, 3rem)",
                    lineHeight: 1,
                    color: "#08102A",
                    margin: 0,
                  }}
                >
                  Conferma adesione
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBookConvention(null)}
                disabled={bookSubmitting}
                aria-label="Chiudi popup"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "999px",
                  border: "1px solid rgba(8,16,42,.1)",
                  background: "#fff",
                  color: "#08102A",
                  cursor: bookSubmitting ? "not-allowed" : "pointer",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                color: "#6B7280",
                lineHeight: 1.7,
                fontSize: ".95rem",
                marginBottom: "1.1rem",
              }}
            >
              Seleziona uno o più libri/promozioni e completa i dati necessari per spedizione, fatturazione e pagamento.
              Una volta inviata, l’adesione sarà registrata nell’elenco e non potrà essere rimossa autonomamente.
            </p>

            <div
              style={{
                border: "1px solid rgba(8,16,42,.08)",
                borderRadius: "1.15rem",
                padding: "1rem",
                background: "rgba(8,16,42,.025)",
                marginBottom: "1rem",
              }}
            >
              <p
                style={{
                  fontSize: ".72rem",
                  fontWeight: 800,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: "#6B7280",
                  marginBottom: ".75rem",
                }}
              >
                Libri e promozioni disponibili
              </p>

              {bookDetailsLoading ? (
                <p style={{ color: "#6B7280", fontWeight: 700 }}>Caricamento libri...</p>
              ) : (() => {
                const books = bookConventionDetails?.books ?? getBookItems(selectedBookConvention);
                const booksByYear = bookConventionDetails?.booksByYear ?? groupBooksByYear(books);
                const selectedBooks = books.filter((book) => book.id && selectedBookIds.includes(book.id));
                const total = selectedBooks.reduce((sum, book) => {
                  const price = typeof book.price === "number" && Number.isFinite(book.price) ? book.price : 0;
                  return sum + price;
                }, 0);

                return books.length > 0 ? (
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {YEAR_ORDER.map((year) => (
                      <div key={year}>
                        <p
                          style={{
                            fontSize: ".68rem",
                            fontWeight: 900,
                            letterSpacing: ".14em",
                            textTransform: "uppercase",
                            color: "#2E4080",
                            marginBottom: ".55rem",
                          }}
                        >
                          {YEAR_LABELS[year]}
                        </p>

                        {(booksByYear[year] ?? []).length > 0 ? (
                          <div style={{ display: "grid", gap: ".6rem" }}>
                            {(booksByYear[year] ?? []).map((book) => {
                              const checked = Boolean(book.id && selectedBookIds.includes(book.id));

                              return (
                                <label
                                  key={book.id ?? book.title}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "auto 1fr",
                                    gap: ".75rem",
                                    alignItems: "flex-start",
                                    border: checked ? "1px solid rgba(46,64,128,.45)" : "1px solid rgba(8,16,42,.1)",
                                    borderRadius: "1rem",
                                    padding: ".85rem 1rem",
                                    cursor: book.id ? "pointer" : "not-allowed",
                                    background: checked ? "rgba(46,64,128,.07)" : "#fff",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!book.id || bookSubmitting}
                                    onChange={() => book.id && toggleSelectedBook(book.id)}
                                    style={{ marginTop: ".2rem", accentColor: "#08102A" }}
                                  />
                                  <span style={{ display: "grid", gap: ".2rem" }}>
                                    <span style={{ fontWeight: 800, color: "#08102A", lineHeight: 1.35 }}>{book.title}</span>
                                    {book.description && (
                                      <span style={{ color: "#6B7280", fontSize: ".84rem", lineHeight: 1.45 }}>{book.description}</span>
                                    )}
                                    <span style={{ color: "#2E4080", fontWeight: 900, fontSize: ".88rem" }}>
                                      {formatBookPrice(book.price)}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <p style={{ color: "#9CA3AF", fontSize: ".86rem", fontWeight: 600 }}>Nessun libro disponibile.</p>
                        )}
                      </div>
                    ))}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "1rem",
                        borderTop: "1px solid rgba(8,16,42,.08)",
                        paddingTop: ".85rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: ".72rem",
                          fontWeight: 800,
                          letterSpacing: ".14em",
                          textTransform: "uppercase",
                          color: "#6B7280",
                        }}
                      >
                        Totale selezionato
                      </span>

                      <span style={{ color: "#08102A", fontWeight: 900, fontSize: "1rem" }}>
                        {formatBookPrice(total)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: "#08102A", fontWeight: 600, lineHeight: 1.5 }}>
                    Nessun libro configurato per questa convenzione.
                  </p>
                );
              })()}
            </div>

            <div style={{ marginBottom: "1rem", display: "grid", gap: ".9rem" }}>
              <div
                style={{
                  border: "1px solid rgba(8,16,42,.08)",
                  borderRadius: "1rem",
                  padding: ".85rem 1rem",
                  background: "rgba(46,64,128,.045)",
                }}
              >
                <p
                  style={{
                    fontSize: ".72rem",
                    fontWeight: 800,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: "#6B7280",
                    marginBottom: ".35rem",
                  }}
                >
                  Periodo applicato automaticamente
                </p>
                <p style={{ margin: 0, color: "#08102A", fontWeight: 800, lineHeight: 1.45 }}>
                  {formatRoundLabel(bookConventionDetails?.activeRound ?? selectedBookConvention.activeRound)}
                </p>
              </div>

              <div>
                <p
                  style={{
                    fontSize: ".72rem",
                    fontWeight: 800,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: "#6B7280",
                    marginBottom: ".55rem",
                  }}
                >
                  Codice fiscale / Partita IVA
                </p>
                <input
                  value={fiscalCodeOrVat}
                  onChange={(e) => setFiscalCodeOrVat(e.target.value)}
                  disabled={bookSubmitting}
                  placeholder="Inserisci codice fiscale o partita IVA"
                  style={{
                    width: "100%",
                    border: "1px solid rgba(8,16,42,.1)",
                    borderRadius: "1rem",
                    padding: ".85rem 1rem",
                    color: "#08102A",
                    fontWeight: 700,
                    background: "#fff",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
              </div>

              <div>
                <p
                  style={{
                    fontSize: ".72rem",
                    fontWeight: 800,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: "#6B7280",
                    marginBottom: ".55rem",
                  }}
                >
                  Indirizzo spedizione / fatturazione
                </p>
                <textarea
                  value={billingShippingAddress}
                  onChange={(e) => setBillingShippingAddress(e.target.value)}
                  disabled={bookSubmitting}
                  placeholder="Inserisci indirizzo completo"
                  rows={3}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(8,16,42,.1)",
                    borderRadius: "1rem",
                    padding: ".85rem 1rem",
                    color: "#08102A",
                    fontWeight: 700,
                    background: "#fff",
                    resize: "vertical",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <p
                style={{
                  fontSize: ".72rem",
                  fontWeight: 800,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: "#6B7280",
                  marginBottom: ".75rem",
                }}
              >
                Metodo di pagamento
              </p>

              <div style={{ display: "grid", gap: ".65rem" }}>
                {PAYMENT_METHOD_OPTIONS.map(({ value, label }) => (
                  <label key={value} className="payment-option">
                    <input
                      type="radio"
                      name="book-payment-method"
                      value={value}
                      checked={paymentMethod === value}
                      onChange={() => setPaymentMethod(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <label
              className="book-confirm-check"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: ".7rem",
                padding: "1rem",
                borderRadius: "1rem",
                background: "rgba(46,64,128,.06)",
                color: "#08102A",
                fontSize: ".9rem",
                lineHeight: 1.55,
                fontWeight: 600,
                marginBottom: "1rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={bookConfirmChecked}
                onChange={(e) => setBookConfirmChecked(e.target.checked)}
                style={{ marginTop: ".2rem" }}
              />
              Confermo di voler aderire alla convenzione libri, di aver selezionato correttamente libri/promozioni, dati di fatturazione/spedizione e metodo di pagamento.
            </label>

            {bookMessage && (
              <div
                style={{
                  padding: ".85rem 1rem",
                  borderRadius: "1rem",
                  background: bookMessage.toLowerCase().includes("correttamente")
                    ? "rgba(22,101,52,.08)"
                    : "rgba(220,38,38,.08)",
                  color: bookMessage.toLowerCase().includes("correttamente")
                    ? "#166534"
                    : "#991b1b",
                  fontWeight: 700,
                  fontSize: ".9rem",
                  marginBottom: "1rem",
                }}
              >
                {bookMessage}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: ".7rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedBookConvention(null)}
                disabled={bookSubmitting}
                style={{
                  border: "1px solid rgba(8,16,42,.12)",
                  background: "#fff",
                  color: "#08102A",
                  borderRadius: "999px",
                  padding: ".75rem 1.15rem",
                  cursor: bookSubmitting ? "not-allowed" : "pointer",
                  fontWeight: 800,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={submitBookConventionAdhesion}
                disabled={bookSubmitting || bookDetailsLoading || !bookConfirmChecked || selectedBookIds.length === 0}
                style={{
                  border: "1px solid #08102A",
                  background: "#08102A",
                  color: "#fff",
                  borderRadius: "999px",
                  padding: ".75rem 1.2rem",
                  cursor:
                    bookSubmitting || bookDetailsLoading || !bookConfirmChecked || selectedBookIds.length === 0 ? "not-allowed" : "pointer",
                  opacity: bookSubmitting || bookDetailsLoading || !bookConfirmChecked || selectedBookIds.length === 0 ? 0.55 : 1,
                  fontWeight: 800,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {bookSubmitting ? "Invio..." : "Conferma adesione"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}