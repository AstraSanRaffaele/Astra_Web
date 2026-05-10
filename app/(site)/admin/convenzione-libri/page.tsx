// REPLACED FILE CONTENT
"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type BookYear = "primo_anno" | "secondo_anno" | "terzo_anno";

type Profile = {
  id: string;
  nome: string | null;
  cognome: string | null;
  email?: string | null;
  email_istituzionale?: string | null;
  corso?: string | null;
  anno?: string | number | null;
  corso_di_laurea?: string | null;
  anno_di_laurea?: string | number | null;
};

type Convenzione = {
  id: number;
  titolo?: string | null;
  title?: string | null;
  nome?: string | null;
  partner?: string | null;
  categoria?: string | null;
  descrizione?: string | null;
  description?: string | null;
  is_book_convention?: boolean | null;
};

type BookConventionRound = {
  id: string;
  convention_id: number;
  label?: string | null;
  starts_at: string;
  ends_at: string;
  created_at?: string;
  convenzioni?: Convenzione | null;
};

type BookConventionBook = {
  id: number;
  convention_id: number;
  title: string;
  price: number | null;
  reference_year: BookYear;
  description: string | null;
  sort_order: number | null;
  created_at?: string;
  updated_at?: string;
};

type SelectedBookSnapshot = {
  id?: number;
  title?: string;
  price?: number | null;
  reference_year?: BookYear;
  description?: string | null;
};

type OldBookItem = {
  title: string;
  price: number | null;
};

type Adhesion = {
  id: string;
  user_id: string;
  convention_id: number | null;
  payment_method:
    | "contanti"
    | "bonifico"
    | "carta"
    | "bonus_cultura"
    | "carta_del_docente"
    | "bonus_di_merito"
    | string
    | null;
  fiscal_code_or_vat?: string | null;
  billing_shipping_address?: string | null;
  selected_book_ids?: number[] | null;
  selected_books?: SelectedBookSnapshot[] | null;
  total_price?: number | null;
  book_titles?: string[] | null;
  book_items?: OldBookItem[] | null;
  created_at: string;
  profiles: Profile | null;
  convenzioni: Convenzione | null;
  round_id: string | null;
  book_convention_rounds: BookConventionRound | null;
};

type ApiResponse = {
  conventions?: Convenzione[];
  books?: BookConventionBook[];
  rounds?: BookConventionRound[];
  adhesions?: Adhesion[];
  error?: string;
};

const YEAR_LABELS: Record<BookYear, string> = {
  primo_anno: "Primo anno",
  secondo_anno: "Secondo anno",
  terzo_anno: "Terzo anno",
};

const YEAR_ORDER: BookYear[] = ["primo_anno", "secondo_anno", "terzo_anno"];

function formatPaymentMethod(value: string | null) {
  const labels: Record<string, string> = {
    contanti: "Contanti",
    bonifico: "Bonifico",
    carta: "Carta",
    bonus_cultura: "Bonus cultura",
    carta_del_docente: "Carta del docente",
    bonus_di_merito: "Bonus di merito",
  };

  return value ? labels[value] ?? value : "—";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getConventionTitle(convention: Convenzione | null | undefined) {
  return convention?.titolo || convention?.title || convention?.nome || "Convenzione libri";
}

function formatRoundLabel(round: BookConventionRound | null | undefined) {
  if (!round) return "Senza periodo";

  if (round.label) {
    return `${round.label} • ${formatDateOnly(round.starts_at)} - ${formatDateOnly(round.ends_at)}`;
  }

  return `${formatDateOnly(round.starts_at)} - ${formatDateOnly(round.ends_at)}`;
}

function formatPrice(value: number | null | undefined) {
  const normalized = typeof value === "string" ? Number(value) : value;
  if (normalized === null || normalized === undefined || !Number.isFinite(normalized)) return "—";

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized);
}

function getFullName(profile: Profile | null) {
  return [profile?.nome, profile?.cognome].filter(Boolean).join(" ") || "Utente senza nome";
}

function getProfileEmail(profile: Profile | null) {
  return profile?.email || profile?.email_istituzionale || "—";
}

function getProfileCourse(profile: Profile | null) {
  return profile?.corso || profile?.corso_di_laurea || "—";
}

function getProfileYear(profile: Profile | null) {
  return profile?.anno || profile?.anno_di_laurea || "—";
}

function getSelectedBooks(adhesion: Adhesion): SelectedBookSnapshot[] {
  if (Array.isArray(adhesion.selected_books) && adhesion.selected_books.length > 0) {
    return adhesion.selected_books
      .map((book) => ({
        id: typeof book?.id === "number" ? book.id : undefined,
        title: String(book?.title ?? "").trim(),
        price: typeof book?.price === "number" && Number.isFinite(book.price) ? book.price : null,
        reference_year: book?.reference_year,
        description: book?.description ?? null,
      }))
      .filter((book) => Boolean(book.title));
  }

  if (Array.isArray(adhesion.book_items) && adhesion.book_items.length > 0) {
    return adhesion.book_items
      .map((book) => ({
        title: String(book?.title ?? "").trim(),
        price: typeof book?.price === "number" && Number.isFinite(book.price) ? book.price : null,
      }))
      .filter((book) => Boolean(book.title));
  }

  if (Array.isArray(adhesion.book_titles)) {
    return adhesion.book_titles
      .map((title) => ({ title: String(title ?? "").trim(), price: null }))
      .filter((book) => Boolean(book.title));
  }

  return [];
}

function getAdhesionTotal(adhesion: Adhesion) {
  if (typeof adhesion.total_price === "number" && Number.isFinite(adhesion.total_price)) {
    return adhesion.total_price;
  }

  return getSelectedBooks(adhesion).reduce((sum, book) => {
    const price = typeof book.price === "number" && Number.isFinite(book.price) ? book.price : 0;
    return sum + price;
  }, 0);
}

function adhesionHasBook(adhesion: Adhesion, bookId: number | "all") {
  if (bookId === "all") return true;
  if (Array.isArray(adhesion.selected_book_ids) && adhesion.selected_book_ids.includes(bookId)) return true;
  return getSelectedBooks(adhesion).some((book) => book.id === bookId);
}

function matchesAdhesionSearch(adhesion: Adhesion, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;

  const profile = adhesion.profiles;
  const convention = adhesion.convenzioni;
  const books = getSelectedBooks(adhesion)
    .map((book) => `${book.title} ${book.price ?? ""}`)
    .join(" ");

  return [
    getFullName(profile),
    getProfileEmail(profile),
    getProfileCourse(profile),
    String(getProfileYear(profile)),
    getConventionTitle(convention),
    convention?.partner ?? "",
    convention?.categoria ?? "",
    books,
    adhesion.fiscal_code_or_vat ?? "",
    adhesion.billing_shipping_address ?? "",
    formatPaymentMethod(adhesion.payment_method),
  ].some((field) => field.toLowerCase().includes(q));
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(esc).join(";")).join("\r\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })),
    download: filename,
  });

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export default function AdminConvenzioneLibriPage() {
  const [conventions, setConventions] = useState<Convenzione[]>([]);
  const [books, setBooks] = useState<BookConventionBook[]>([]);
  const [adhesions, setAdhesions] = useState<Adhesion[]>([]);
  const [rounds, setRounds] = useState<BookConventionRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>("all");
  const [selectedBookId, setSelectedBookId] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadAdhesions(roundId = selectedRoundId, bookId = selectedBookId) {
    try {
      setLoading(true);
      setMessage(null);

      const params = new URLSearchParams();
      if (roundId !== "all") params.set("round_id", roundId);
      if (bookId !== "all") params.set("book_id", String(bookId));

      const res = await fetch(`/api/admin/book-convention${params.toString() ? `?${params.toString()}` : ""}`, {
        method: "GET",
        cache: "no-store",
      });

      const text = await res.text();
      let json: ApiResponse = {};

      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        setMessage({ type: "error", text: "La route ha restituito una risposta non valida." });
        return;
      }

      if (!res.ok) {
        setMessage({ type: "error", text: json.error || "Errore durante il caricamento delle adesioni." });
        return;
      }

      setConventions(json.conventions ?? []);
      setBooks(json.books ?? []);
      setAdhesions(json.adhesions ?? []);
      setRounds(json.rounds ?? []);
    } catch {
      setMessage({ type: "error", text: "Errore di connessione." });
    } finally {
      setLoading(false);
    }
  }

  async function deleteAdhesion(adhesionId: string) {
    const confirmDelete = window.confirm("Vuoi eliminare questa adesione dalla convenzione libri?");
    if (!confirmDelete) return;

    try {
      setDeletingId(adhesionId);
      setMessage(null);

      const res = await fetch("/api/admin/book-convention", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adhesion_id: adhesionId }),
      });

      const text = await res.text();
      let json: { error?: string } = {};

      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        setMessage({ type: "error", text: "La route ha restituito una risposta non valida." });
        return;
      }

      if (!res.ok) {
        setMessage({ type: "error", text: json.error || "Errore durante l'eliminazione." });
        return;
      }

      setAdhesions((prev) => prev.filter((item) => item.id !== adhesionId));
      setMessage({ type: "success", text: "Adesione eliminata correttamente." });
    } catch {
      setMessage({ type: "error", text: "Errore di connessione." });
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadAdhesions(selectedRoundId, selectedBookId);
  }, [selectedRoundId, selectedBookId]);

  const booksByYear = useMemo(() => {
    return YEAR_ORDER.reduce<Record<BookYear, BookConventionBook[]>>(
      (acc, year) => {
        acc[year] = books.filter((book) => book.reference_year === year);
        return acc;
      },
      { primo_anno: [], secondo_anno: [], terzo_anno: [] }
    );
  }, [books]);

  const visibleAdhesions = useMemo(() => {
    return adhesions
      .filter((adhesion) => adhesionHasBook(adhesion, selectedBookId))
      .filter((adhesion) => selectedRoundId === "all" || adhesion.round_id === selectedRoundId)
      .filter((adhesion) => matchesAdhesionSearch(adhesion, searchTerm));
  }, [adhesions, selectedBookId, selectedRoundId, searchTerm]);

  const selectedBook = selectedBookId === "all" ? null : books.find((book) => book.id === selectedBookId) ?? null;
  const selectedRound = selectedRoundId === "all" ? null : rounds.find((round) => round.id === selectedRoundId) ?? null;
  const totalRevenue = visibleAdhesions.reduce((sum, adhesion) => sum + getAdhesionTotal(adhesion), 0);
  const totalBooks = visibleAdhesions.reduce((sum, adhesion) => sum + getSelectedBooks(adhesion).length, 0);
  const firstConvention = conventions[0] ?? null;

  function exportCsv() {
    if (visibleAdhesions.length === 0) return;

    const rows: Array<Array<string | number>> = [
      [
        "Nome",
        "Email",
        "Corso",
        "Anno",
        "Codice fiscale / Partita IVA",
        "Indirizzo spedizione / fatturazione",
        "Convenzione",
        "Periodo",
        "Libri selezionati",
        "Prezzo totale",
        "Metodo pagamento",
        "Data adesione",
      ],
      ...visibleAdhesions.map((adhesion) => {
        const profile = adhesion.profiles;
        const selectedBooks = getSelectedBooks(adhesion)
          .map((book) => `${book.title}${book.price !== null && book.price !== undefined ? ` (${formatPrice(book.price)})` : ""}`)
          .join(", ");

        return [
          getFullName(profile),
          getProfileEmail(profile),
          getProfileCourse(profile),
          String(getProfileYear(profile)),
          adhesion.fiscal_code_or_vat || "",
          adhesion.billing_shipping_address || "",
          getConventionTitle(adhesion.convenzioni),
          formatRoundLabel(adhesion.book_convention_rounds),
          selectedBooks,
          formatPrice(getAdhesionTotal(adhesion)),
          formatPaymentMethod(adhesion.payment_method),
          formatDate(adhesion.created_at),
        ];
      }),
    ];

    const bookPart = selectedBook ? selectedBook.title.replace(/\s+/g, "-").toLowerCase() : "tutti-libri";
    const roundPart = selectedRound ? formatDateOnly(selectedRound.starts_at).replace(/\//g, "-") : "tutti-periodi";
    downloadCsv(`adesioni-libri-${bookPart}-${roundPart}.csv`, rows);
  }

  const actionButtonStyle: CSSProperties = {
    border: "1px solid rgba(15,47,110,.14)",
    background: "white",
    color: "#0f2f6e",
    borderRadius: "999px",
    padding: ".55rem 1rem",
    fontWeight: 700,
    fontSize: ".8rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const dangerButtonStyle: CSSProperties = {
    ...actionButtonStyle,
    border: "1px solid rgba(220,38,38,.16)",
    color: "#b91c1c",
  };

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f7f9fc 0%,#eef3fb 100%)", padding: "8.5rem 1.5rem 4rem" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <section style={{ background: "linear-gradient(135deg,#0f2f6e 0%,#1847a3 100%)", borderRadius: "2rem", padding: "clamp(1.5rem,3vw,2.5rem)", color: "white", boxShadow: "0 24px 60px rgba(15,47,110,.18)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
            <span style={{ alignSelf: "flex-start", padding: ".4rem .9rem", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: ".85rem", fontWeight: 700 }}>
              Amministrazione • Convenzioni libri
            </span>
            <h1 style={{ margin: 0, fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 800, lineHeight: 1.05 }}>Adesioni libri.</h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,.75)", lineHeight: 1.6, maxWidth: 760 }}>
              Seleziona un libro o una promozione dalla sidebar, scegli il periodo e consulta solo le adesioni filtrate.
            </p>
          </div>

          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
            <a href="/admin/convenzioni" style={{ textDecoration: "none", color: "white", padding: ".85rem 1.3rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.1)", fontWeight: 700, whiteSpace: "nowrap" }}>
              Gestisci convenzioni
            </a>
            <a href="/admin" style={{ textDecoration: "none", color: "white", padding: ".85rem 1.3rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.1)", fontWeight: 700, whiteSpace: "nowrap" }}>
              Pannello admin
            </a>
          </div>
        </section>

        {message && (
          <div
            style={{
              borderRadius: "1rem",
              padding: ".9rem 1rem",
              fontSize: ".9rem",
              fontWeight: 700,
              background: message.type === "success" ? "rgba(52,211,153,.12)" : "rgba(248,113,113,.12)",
              color: message.type === "success" ? "#047857" : "#b91c1c",
              border: message.type === "success" ? "1px solid rgba(16,185,129,.18)" : "1px solid rgba(220,38,38,.16)",
            }}
          >
            {message.text}
          </div>
        )}

        <div className="books-rsvp-layout" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "1.5rem", alignItems: "start" }}>
          <aside className="books-sidebar" style={{ position: "sticky", top: "6.5rem", background: "rgba(255,255,255,.9)", border: "1px solid rgba(15,47,110,.08)", borderRadius: "1.8rem", overflow: "hidden", boxShadow: "0 8px 32px rgba(15,47,110,.07)" }}>
            <div style={{ padding: "1.2rem 1.4rem", borderBottom: "1px solid rgba(15,47,110,.07)", display: "flex", flexDirection: "column", gap: ".8rem" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f2f6e" }}>Libri e promozioni</h2>
                <p style={{ margin: ".25rem 0 0", fontSize: ".78rem", color: "#6b7280", lineHeight: 1.45 }}>
                  {firstConvention ? getConventionTitle(firstConvention) : "Convenzione libri"}
                </p>
              </div>

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca nome, email, libro..."
                style={{
                  width: "100%",
                  borderRadius: "1rem",
                  border: "1px solid rgba(15,47,110,.12)",
                  padding: ".75rem .9rem",
                  fontSize: ".9rem",
                  outline: "none",
                  background: "white",
                  color: "#0f2f6e",
                }}
              />

              <select
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: "1rem",
                  border: "1px solid rgba(15,47,110,.12)",
                  padding: ".75rem .9rem",
                  fontSize: ".9rem",
                  outline: "none",
                  background: "white",
                  color: "#0f2f6e",
                  fontWeight: 700,
                }}
              >
                <option value="all">Tutti i periodi</option>
                {rounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    {formatRoundLabel(round)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setSelectedBookId("all")}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "1rem",
                  padding: ".8rem 1rem",
                  cursor: "pointer",
                  background: selectedBookId === "all" ? "#0f2f6e" : "rgba(15,47,110,.06)",
                  color: selectedBookId === "all" ? "white" : "#0f2f6e",
                  fontWeight: 800,
                  textAlign: "left",
                }}
              >
                Tutti i libri/promozioni
              </button>
            </div>

            <div style={{ maxHeight: "68vh", overflowY: "auto", padding: "1rem" }}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ height: 58, borderRadius: "1rem", background: "rgba(15,47,110,.06)", animation: "sk 1.4s ease infinite" }} />
                  ))}
                </div>
              ) : books.length === 0 ? (
                <p style={{ padding: "1rem", color: "#6b7280", textAlign: "center" }}>Nessun libro configurato.</p>
              ) : (
                YEAR_ORDER.map((year) => (
                  <div key={year} style={{ marginBottom: "1.15rem" }}>
                    <h3 style={{ margin: "0 0 .55rem", fontSize: ".78rem", letterSpacing: ".08em", textTransform: "uppercase", color: "#6b7280", fontWeight: 900 }}>
                      {YEAR_LABELS[year]}
                    </h3>
                    <div style={{ display: "grid", gap: ".5rem" }}>
                      {booksByYear[year].length === 0 ? (
                        <p style={{ margin: 0, fontSize: ".82rem", color: "#9ca3af" }}>Nessun libro.</p>
                      ) : (
                        booksByYear[year].map((book) => {
                          const isSelected = selectedBookId === book.id;
                          return (
                            <button
                              key={book.id}
                              type="button"
                              onClick={() => setSelectedBookId(book.id)}
                              style={{
                                border: isSelected ? "1px solid rgba(15,47,110,.35)" : "1px solid rgba(15,47,110,.08)",
                                background: isSelected ? "rgba(15,47,110,.08)" : "white",
                                color: "#0f2f6e",
                                borderRadius: "1rem",
                                padding: ".8rem .85rem",
                                cursor: "pointer",
                                textAlign: "left",
                                display: "grid",
                                gap: ".25rem",
                              }}
                            >
                              <span style={{ fontWeight: 800, fontSize: ".88rem", lineHeight: 1.3 }}>{book.title}</span>
                              <span style={{ fontWeight: 800, fontSize: ".78rem", color: "#059669" }}>{formatPrice(book.price)}</span>
                              {book.description && <span style={{ fontSize: ".75rem", color: "#6b7280", lineHeight: 1.35 }}>{book.description}</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          <section style={{ background: "rgba(255,255,255,.9)", border: "1px solid rgba(15,47,110,.08)", borderRadius: "1.8rem", overflow: "hidden", boxShadow: "0 8px 32px rgba(15,47,110,.07)" }}>
            <div style={{ padding: "1.4rem 1.8rem", borderBottom: "1px solid rgba(15,47,110,.07)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ margin: "0 0 .25rem", fontSize: "1.15rem", fontWeight: 800, color: "#0f2f6e" }}>
                  {selectedBook ? selectedBook.title : "Tutte le adesioni"}
                </h2>
                <p style={{ margin: 0, fontSize: ".84rem", color: "#6b7280" }}>
                  {visibleAdhesions.length} adesioni • {totalBooks} libri selezionati • {formatPrice(totalRevenue)} totale
                </p>
                <p style={{ margin: ".25rem 0 0", fontSize: ".78rem", color: "#6b7280" }}>
                  Periodo: {selectedRound ? formatRoundLabel(selectedRound) : "tutti i periodi"}
                </p>
              </div>
              {visibleAdhesions.length > 0 && (
                <button onClick={exportCsv} style={actionButtonStyle}>
                  Esporta CSV
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ height: 52, borderRadius: "1rem", background: "rgba(15,47,110,.06)", animation: "sk 1.4s ease infinite" }} />
                ))}
              </div>
            ) : visibleAdhesions.length === 0 ? (
              <div style={{ padding: "5rem 2rem", textAlign: "center", color: "#6b7280" }}>
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📚</div>
                <p style={{ fontWeight: 700, color: "#0f2f6e", margin: "0 0 .35rem" }}>Nessuna adesione trovata</p>
                <p style={{ fontSize: ".9rem", margin: 0 }}>Cambia libro, periodo o ricerca per vedere altri risultati.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1280 }}>
                  <thead>
                    <tr style={{ background: "#edf3ff" }}>
                      {[
                        "Utente",
                        "Email",
                        "Corso / anno",
                        "CF / P.IVA",
                        "Indirizzo",
                        "Periodo",
                        "Libri selezionati",
                        "Totale",
                        "Pagamento",
                        "Data",
                        "Azioni",
                      ].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: ".85rem 1.2rem", fontSize: ".8rem", fontWeight: 800, color: "#123066", whiteSpace: "nowrap", borderBottom: "1px solid rgba(15,47,110,.08)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAdhesions.map((adhesion) => {
                      const profile = adhesion.profiles;
                      const selectedBooks = getSelectedBooks(adhesion);
                      const total = getAdhesionTotal(adhesion);

                      return (
                        <tr key={adhesion.id} style={{ borderBottom: "1px solid rgba(15,47,110,.06)", background: "white" }}>
                          <td style={{ padding: ".85rem 1.2rem", fontWeight: 700, color: "#0f2f6e", whiteSpace: "nowrap" }}>
                            {getFullName(profile)}
                            <div style={{ marginTop: ".18rem", fontSize: ".72rem", color: "#6b7280", fontWeight: 600 }}>ID: {adhesion.user_id}</div>
                          </td>
                          <td style={{ padding: ".85rem 1.2rem", fontSize: ".88rem", color: "#374151", whiteSpace: "nowrap" }}>{getProfileEmail(profile)}</td>
                          <td style={{ padding: ".85rem 1.2rem", fontSize: ".88rem", color: "#374151", whiteSpace: "nowrap" }}>
                            {getProfileCourse(profile)}
                            <div style={{ marginTop: ".18rem", fontSize: ".72rem", color: "#6b7280" }}>Anno: {getProfileYear(profile)}</div>
                          </td>
                          <td style={{ padding: ".85rem 1.2rem", fontSize: ".84rem", color: "#374151", whiteSpace: "nowrap" }}>
                            {adhesion.fiscal_code_or_vat || "—"}
                          </td>
                          <td style={{ padding: ".85rem 1.2rem", fontSize: ".84rem", color: "#374151", minWidth: 220 }}>
                            {adhesion.billing_shipping_address || "—"}
                          </td>
                          <td style={{ padding: ".85rem 1.2rem", fontSize: ".82rem", color: "#374151", whiteSpace: "nowrap" }}>
                            {adhesion.book_convention_rounds ? (
                              <>
                                {formatDateOnly(adhesion.book_convention_rounds.starts_at)}
                                <div style={{ marginTop: ".18rem", fontSize: ".72rem", color: "#6b7280" }}>
                                  fino al {formatDateOnly(adhesion.book_convention_rounds.ends_at)}
                                </div>
                              </>
                            ) : "—"}
                          </td>
                          <td style={{ padding: ".85rem 1.2rem", fontSize: ".86rem", color: "#374151", minWidth: 260 }}>
                            {selectedBooks.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: "1rem", display: "grid", gap: ".28rem" }}>
                                {selectedBooks.map((book, index) => (
                                  <li key={`${book.id ?? book.title}-${index}`}>
                                    <strong>{book.title}</strong>
                                    <span style={{ color: "#6b7280" }}> · {formatPrice(book.price)}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : "—"}
                          </td>
                          <td style={{ padding: ".85rem 1.2rem" }}>
                            <span style={{ fontSize: ".7rem", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", background: "rgba(52,211,153,.12)", color: "#059669", padding: ".25rem .7rem", borderRadius: "999px", whiteSpace: "nowrap" }}>
                              {formatPrice(total)}
                            </span>
                          </td>
                          <td style={{ padding: ".85rem 1.2rem" }}>
                            <span style={{ fontSize: ".7rem", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", background: "rgba(15,47,110,.08)", color: "#0f2f6e", padding: ".25rem .7rem", borderRadius: "999px", whiteSpace: "nowrap" }}>
                              {formatPaymentMethod(adhesion.payment_method)}
                            </span>
                          </td>
                          <td style={{ padding: ".85rem 1.2rem", fontSize: ".82rem", color: "#6b7280", whiteSpace: "nowrap" }}>{formatDate(adhesion.created_at)}</td>
                          <td style={{ padding: ".85rem 1.2rem" }}>
                            <button
                              type="button"
                              onClick={() => deleteAdhesion(adhesion.id)}
                              disabled={deletingId === adhesion.id}
                              style={{
                                ...dangerButtonStyle,
                                opacity: deletingId === adhesion.id ? 0.65 : 1,
                                cursor: deletingId === adhesion.id ? "wait" : "pointer",
                              }}
                            >
                              {deletingId === adhesion.id ? "Elimino..." : "Elimina"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <style>{`
        @keyframes sk{0%,100%{opacity:.4}50%{opacity:.9}}
        @media (max-width: 980px) {
          .books-rsvp-layout {
            grid-template-columns: 1fr !important;
          }
          .books-sidebar {
            position: static !important;
          }
        }
      `}</style>
    </main>
  );
}