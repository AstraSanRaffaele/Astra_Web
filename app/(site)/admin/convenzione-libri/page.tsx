"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Profile = {
  id: string;
  nome: string | null;
  cognome: string | null;
  email?: string | null;
  email_istituzionale?: string | null;
  corso: string | null;
  anno: string | number | null;
};

type Convenzione = {
  id: number;
  titolo: string | null;
  partner: string | null;
  categoria: string | null;
};

type BookConventionRound = {
  id: string;
  convention_id: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
  convenzioni: Convenzione | null;
};

type BookItem = {
  title: string;
  price: number | null;
};

type Adhesion = {
  id: string;
  user_id: string;
  convention_id: number | null;
  payment_method: "contanti" | "bonifico" | "carta" | string | null;
  book_titles: string[] | null;
  book_items: BookItem[] | null;
  created_at: string;
  profiles: Profile | null;
  convenzioni: Convenzione | null;
  round_id: string | null;
  book_convention_rounds: BookConventionRound | null;
};

type ConventionGroup = {
  id: number | null;
  title: string;
  partner: string;
  category: string;
  adhesions: Adhesion[];
  total: number;
};

function formatPaymentMethod(value: string | null) {
  if (value === "contanti") return "Contanti";
  if (value === "bonifico") return "Bonifico";
  if (value === "carta") return "Carta";
  return "—";
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

function formatRoundLabel(round: BookConventionRound | null) {
  if (!round) return "Senza periodo";

  const title = round.convenzioni?.titolo || `Convenzione #${round.convention_id}`;
  return `${title} • ${formatDateOnly(round.starts_at)} - ${formatDateOnly(round.ends_at)}`;
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getFullName(profile: Profile | null) {
  return [profile?.nome, profile?.cognome].filter(Boolean).join(" ") || "Utente senza nome";
}

function getProfileEmail(profile: Profile | null) {
  return profile?.email || profile?.email_istituzionale || "—";
}

function getBookItems(adhesion: Adhesion): BookItem[] {
  if (Array.isArray(adhesion.book_items) && adhesion.book_items.length > 0) {
    return adhesion.book_items
      .map((book) => ({
        title: String(book?.title ?? "").trim(),
        price: typeof book?.price === "number" && Number.isFinite(book.price) ? book.price : null,
      }))
      .filter((book) => book.title.length > 0);
  }

  if (Array.isArray(adhesion.book_titles)) {
    return adhesion.book_titles
      .map((title) => ({ title: String(title ?? "").trim(), price: null }))
      .filter((book) => book.title.length > 0);
  }

  return [];
}

function getAdhesionTotal(adhesion: Adhesion) {
  return getBookItems(adhesion).reduce((sum, book) => {
    const price = typeof book.price === "number" && Number.isFinite(book.price) ? book.price : 0;
    return sum + price;
  }, 0);
}

function matchesAdhesionSearch(adhesion: Adhesion, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;

  const profile = adhesion.profiles;
  const convention = adhesion.convenzioni;
  const books = getBookItems(adhesion)
    .map((book) => `${book.title} ${book.price ?? ""}`)
    .join(" ");

  return [
    getFullName(profile),
    getProfileEmail(profile),
    profile?.corso ?? "",
    String(profile?.anno ?? ""),
    convention?.titolo ?? "",
    convention?.partner ?? "",
    convention?.categoria ?? "",
    books,
    formatPaymentMethod(adhesion.payment_method),
  ].some((field) => field.toLowerCase().includes(q));
}

export default function AdminConvenzioneLibriPage() {
  const [adhesions, setAdhesions] = useState<Adhesion[]>([]);
  const [rounds, setRounds] = useState<BookConventionRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>("all");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadAdhesions(roundId = selectedRoundId) {
    try {
      setLoading(true);
      setMessage(null);

      const params = new URLSearchParams();
      if (roundId !== "all") params.set("round_id", roundId);

      const res = await fetch(`/api/admin/book-convention${params.toString() ? `?${params.toString()}` : ""}`, {
        method: "GET",
        cache: "no-store",
      });

      const text = await res.text();
      let json: { adhesions?: Adhesion[]; rounds?: BookConventionRound[]; error?: string } = {};

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
    loadAdhesions(selectedRoundId);
  }, [selectedRoundId]);

  const filteredAdhesions = useMemo(() => {
    return adhesions.filter((adhesion) => matchesAdhesionSearch(adhesion, searchTerm));
  }, [adhesions, searchTerm]);

  const groups = useMemo<ConventionGroup[]>(() => {
    const map = new Map<string, ConventionGroup>();

    filteredAdhesions.forEach((adhesion) => {
      const convention = adhesion.convenzioni;
      const key = String(adhesion.convention_id ?? "no-convention");

      if (!map.has(key)) {
        map.set(key, {
          id: adhesion.convention_id,
          title: convention?.titolo || "Convenzione non trovata",
          partner: convention?.partner || "—",
          category: convention?.categoria || "—",
          adhesions: [],
          total: 0,
        });
      }

      const group = map.get(key)!;
      group.adhesions.push(adhesion);
      group.total += getAdhesionTotal(adhesion);
    });

    return Array.from(map.values()).sort((a, b) => b.adhesions.length - a.adhesions.length);
  }, [filteredAdhesions]);

  useEffect(() => {
    if (groups.length === 0) {
      setSelectedGroupId(null);
      return;
    }

    const currentExists = groups.some((group) => String(group.id ?? "no-convention") === selectedGroupId);

    if (!selectedGroupId || !currentExists) {
      setSelectedGroupId(String(groups[0].id ?? "no-convention"));
    }
  }, [groups, selectedGroupId]);

  const selectedGroup = groups.find((group) => String(group.id ?? "no-convention") === selectedGroupId) ?? null;
  const selectedAdhesions = selectedGroup?.adhesions ?? [];
  const totalRevenue = selectedAdhesions.reduce((sum, adhesion) => sum + getAdhesionTotal(adhesion), 0);
  const totalBooks = selectedAdhesions.reduce((sum, adhesion) => sum + getBookItems(adhesion).length, 0);

  function exportCsv() {
    if (!selectedGroup || selectedAdhesions.length === 0) return;

    const cols = ["Nome", "Email", "Corso", "Anno", "Convenzione", "Partner", "Periodo", "Libri", "Totale", "Pagamento", "Data adesione"];
    const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const rows = selectedAdhesions.map((adhesion) => {
      const profile = adhesion.profiles;
      const books = getBookItems(adhesion)
        .map((book) => `${book.title}${book.price !== null && book.price !== undefined ? ` (${formatPrice(book.price)})` : ""}`)
        .join(", ");

      return [
        esc(getFullName(profile)),
        esc(getProfileEmail(profile)),
        esc(profile?.corso || ""),
        esc(String(profile?.anno ?? "")),
        esc(adhesion.convenzioni?.titolo || ""),
        esc(adhesion.convenzioni?.partner || ""),
        esc(formatRoundLabel(adhesion.book_convention_rounds)),
        esc(books),
        esc(formatPrice(getAdhesionTotal(adhesion))),
        esc(formatPaymentMethod(adhesion.payment_method)),
        esc(formatDate(adhesion.created_at)),
      ].join(";");
    });

    const csv = [cols.map(esc).join(";"), ...rows].join("\r\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })),
      download: `adesioni-libri-${selectedGroup.title.replace(/\s+/g, "-").toLowerCase()}.csv`,
    });

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <section style={{ background: "linear-gradient(135deg,#0f2f6e 0%,#1847a3 100%)", borderRadius: "2rem", padding: "clamp(1.5rem,3vw,2.5rem)", color: "white", boxShadow: "0 24px 60px rgba(15,47,110,.18)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
            <span style={{ alignSelf: "flex-start", padding: ".4rem .9rem", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: ".85rem", fontWeight: 700 }}>
              Amministrazione • Convenzioni libri
            </span>
            <h1 style={{ margin: 0, fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 800, lineHeight: 1.05 }}>Adesioni libri.</h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>
              Filtra per periodo di attivazione, seleziona una convenzione e consulta adesioni, libri scelti e totale.
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
              background:
                message.type === "success"
                  ? "rgba(52,211,153,.12)"
                  : "rgba(248,113,113,.12)",
              color: message.type === "success" ? "#047857" : "#b91c1c",
              border:
                message.type === "success"
                  ? "1px solid rgba(16,185,129,.18)"
                  : "1px solid rgba(220,38,38,.16)",
            }}
          >
            {message.text}
          </div>
        )}

        <div className="books-rsvp-layout" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem", alignItems: "start" }}>
          <div style={{ background: "rgba(255,255,255,.85)", border: "1px solid rgba(15,47,110,.08)", borderRadius: "1.8rem", overflow: "hidden", boxShadow: "0 8px 32px rgba(15,47,110,.07)" }}>
            <div style={{ padding: "1.2rem 1.4rem", borderBottom: "1px solid rgba(15,47,110,.07)", display: "flex", flexDirection: "column", gap: ".8rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f2f6e" }}>Convenzioni libri</h2>
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
            </div>

            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ height: 64, borderRadius: "1rem", background: "rgba(15,47,110,.06)", animation: "sk 1.4s ease infinite" }} />
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <p style={{ padding: "2rem", color: "#6b7280", textAlign: "center" }}>Nessuna adesione trovata.</p>
              ) : groups.map((group) => {
                const groupId = String(group.id ?? "no-convention");
                const isSelected = selectedGroupId === groupId;

                return (
                  <button
                    key={groupId}
                    onClick={() => setSelectedGroupId(groupId)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      cursor: "pointer",
                      padding: "1rem 1.4rem",
                      background: isSelected ? "rgba(15,47,110,.07)" : "transparent",
                      borderLeft: isSelected ? "3px solid #1847a3" : "3px solid transparent",
                      transition: "background .15s",
                      display: "flex",
                      flexDirection: "column",
                      gap: ".35rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: ".5rem" }}>
                      <span style={{ fontSize: ".92rem", fontWeight: 700, color: "#0f2f6e", lineHeight: 1.3 }}>{group.title}</span>
                      <span style={{
                        fontSize: ".65rem",
                        fontWeight: 700,
                        letterSpacing: ".06em",
                        whiteSpace: "nowrap",
                        background: "rgba(52,211,153,.1)",
                        color: "#059669",
                        padding: ".2rem .55rem",
                        borderRadius: "999px",
                      }}>
                        {group.adhesions.length} adesioni
                      </span>
                    </div>
                    <span style={{ fontSize: ".8rem", color: "#6b7280" }}>{group.partner}</span>
                    <span style={{ fontSize: ".78rem", color: "#6b7280" }}>Totale: {formatPrice(group.total)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,.85)", border: "1px solid rgba(15,47,110,.08)", borderRadius: "1.8rem", overflow: "hidden", boxShadow: "0 8px 32px rgba(15,47,110,.07)" }}>
            {!selectedGroup ? (
              <div style={{ padding: "5rem 2rem", textAlign: "center", color: "#6b7280" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>👈</div>
                <p style={{ fontWeight: 600, color: "#0f2f6e", marginBottom: ".5rem" }}>Seleziona una convenzione</p>
                <p style={{ fontSize: ".9rem" }}>Clicca su una convenzione a sinistra per vedere le adesioni.</p>
              </div>
            ) : (
              <>
                <div style={{ padding: "1.4rem 1.8rem", borderBottom: "1px solid rgba(15,47,110,.07)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h2 style={{ margin: "0 0 .25rem", fontSize: "1.15rem", fontWeight: 800, color: "#0f2f6e" }}>{selectedGroup.title}</h2>
                    <p style={{ margin: 0, fontSize: ".84rem", color: "#6b7280" }}>
                      {selectedAdhesions.length} adesioni • {totalBooks} libri • {formatPrice(totalRevenue)} totale
                    </p>
                    <p style={{ margin: ".25rem 0 0", fontSize: ".78rem", color: "#6b7280" }}>
                      Periodo: {selectedRoundId === "all" ? "tutti i periodi" : formatRoundLabel(rounds.find((round) => round.id === selectedRoundId) ?? null)}
                    </p>
                  </div>
                  {selectedAdhesions.length > 0 && (
                    <button onClick={exportCsv} style={actionButtonStyle}>
                      Esporta CSV
                    </button>
                  )}
                </div>

                {message && (
                  <div style={{ padding: "1.2rem 1.8rem", borderBottom: "1px solid rgba(15,47,110,.07)", background: "rgba(237,243,255,.45)" }}>
                    <div
                      style={{
                        borderRadius: "1rem",
                        padding: ".8rem 1rem",
                        fontSize: ".84rem",
                        fontWeight: 600,
                        background: message.type === "success" ? "rgba(52,211,153,.12)" : "rgba(248,113,113,.12)",
                        color: message.type === "success" ? "#047857" : "#b91c1c",
                        border: message.type === "success" ? "1px solid rgba(16,185,129,.18)" : "1px solid rgba(220,38,38,.16)",
                      }}
                    >
                      {message.text}
                    </div>
                  </div>
                )}

                {loading ? (
                  <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} style={{ height: 52, borderRadius: "1rem", background: "rgba(15,47,110,.06)", animation: "sk 1.4s ease infinite" }} />
                    ))}
                  </div>
                ) : selectedAdhesions.length === 0 ? (
                  <div style={{ padding: "5rem 2rem", textAlign: "center", color: "#6b7280" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📚</div>
                    <p style={{ fontWeight: 600, color: "#0f2f6e" }}>Nessuna adesione ancora</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                      <thead>
                        <tr style={{ background: "#edf3ff" }}>
                          {["Studente", "Email", "Corso", "Periodo", "Libri", "Totale", "Pagamento", "Data", "Azioni"].map((h) => (
                            <th key={h} style={{ textAlign: "left", padding: ".85rem 1.2rem", fontSize: ".8rem", fontWeight: 800, color: "#123066", whiteSpace: "nowrap", borderBottom: "1px solid rgba(15,47,110,.08)" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAdhesions.map((adhesion) => {
                          const profile = adhesion.profiles;
                          const books = getBookItems(adhesion);
                          const total = getAdhesionTotal(adhesion);

                          return (
                            <tr key={adhesion.id} style={{ borderBottom: "1px solid rgba(15,47,110,.06)", background: "white" }}>
                              <td style={{ padding: ".85rem 1.2rem", fontWeight: 600, color: "#0f2f6e", whiteSpace: "nowrap" }}>
                                {getFullName(profile)}
                                <div style={{ marginTop: ".18rem", fontSize: ".72rem", color: "#6b7280", fontWeight: 600 }}>
                                  ID: {adhesion.user_id}
                                </div>
                              </td>
                              <td style={{ padding: ".85rem 1.2rem", fontSize: ".88rem", color: "#374151" }}>{getProfileEmail(profile)}</td>
                              <td style={{ padding: ".85rem 1.2rem", fontSize: ".88rem", color: "#374151", whiteSpace: "nowrap" }}>
                                {profile?.corso || "—"}
                                <div style={{ marginTop: ".18rem", fontSize: ".72rem", color: "#6b7280" }}>Anno: {profile?.anno || "—"}</div>
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
                              <td style={{ padding: ".85rem 1.2rem", fontSize: ".86rem", color: "#374151", minWidth: 220 }}>
                                {books.length > 0 ? (
                                  <ul style={{ margin: 0, paddingLeft: "1rem", display: "grid", gap: ".28rem" }}>
                                    {books.map((book) => (
                                      <li key={`${book.title}-${book.price ?? "no-price"}`}>
                                        <strong>{book.title}</strong>
                                        <span style={{ color: "#6b7280" }}> · {formatPrice(book.price)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : "—"}
                              </td>
                              <td style={{ padding: ".85rem 1.2rem" }}>
                                <span style={{
                                  fontSize: ".7rem",
                                  fontWeight: 700,
                                  letterSpacing: ".06em",
                                  textTransform: "uppercase",
                                  background: "rgba(52,211,153,.12)",
                                  color: "#059669",
                                  padding: ".25rem .7rem",
                                  borderRadius: "999px",
                                  whiteSpace: "nowrap",
                                }}>
                                  {formatPrice(total)}
                                </span>
                              </td>
                              <td style={{ padding: ".85rem 1.2rem" }}>
                                <span style={{
                                  fontSize: ".7rem",
                                  fontWeight: 700,
                                  letterSpacing: ".06em",
                                  textTransform: "uppercase",
                                  background: "rgba(15,47,110,.08)",
                                  color: "#0f2f6e",
                                  padding: ".25rem .7rem",
                                  borderRadius: "999px",
                                  whiteSpace: "nowrap",
                                }}>
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
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sk{0%,100%{opacity:.4}50%{opacity:.9}}
        @media (max-width: 980px) {
          .books-rsvp-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}