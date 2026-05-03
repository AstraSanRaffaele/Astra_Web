"use client";

import { useEffect, useMemo, useState } from "react";

type Profile = {
    id: string;
    nome: string | null;
    cognome: string | null;
    email: string | null;
    corso: string | null;
    anno: string | number | null;
};

type Convenzione = {
    id: number;
    titolo: string | null;
    partner: string | null;
    categoria: string | null;
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

function formatPrice(value: number | null | undefined) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return "—";
    }

    return new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

export default function AdminConvenzioneLibriPage() {
    const [adhesions, setAdhesions] = useState<Adhesion[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const filteredAdhesions = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        if (!q) return adhesions;

        return adhesions.filter((item) => {
            const profile = item.profiles;
            const convention = item.convenzioni;

            const fullName = `${profile?.nome ?? ""} ${profile?.cognome ?? ""}`;
            const books = [
                item.book_titles?.join(" ") ?? "",
                Array.isArray(item.book_items)
                    ? item.book_items
                        .map((book) => `${book.title} ${book.price ?? ""}`)
                        .join(" ")
                    : "",
            ].join(" ");
            return (
                fullName.toLowerCase().includes(q) ||
                (profile?.email ?? "").toLowerCase().includes(q) ||
                (profile?.corso ?? "").toLowerCase().includes(q) ||
                (convention?.titolo ?? "").toLowerCase().includes(q) ||
                (convention?.partner ?? "").toLowerCase().includes(q) ||
                books.toLowerCase().includes(q) ||
                formatPaymentMethod(item.payment_method).toLowerCase().includes(q)
            );
        });
    }, [adhesions, searchTerm]);

    async function loadAdhesions() {
        try {
            setLoading(true);
            setMessage("");

            const res = await fetch("/api/admin/book-convention", {
                method: "GET",
                cache: "no-store",
            });

            const json = await res.json();

            if (!res.ok) {
                setMessage(json.error || "Errore durante il caricamento delle adesioni.");
                return;
            }

            setAdhesions(json.adhesions ?? []);
        } catch {
            setMessage("Errore di connessione.");
        } finally {
            setLoading(false);
        }
    }

    async function deleteAdhesion(adhesionId: string) {
        const confirmDelete = window.confirm(
            "Vuoi eliminare questa adesione dalla convenzione libri?"
        );

        if (!confirmDelete) return;

        try {
            setDeletingId(adhesionId);
            setMessage("");

            const res = await fetch("/api/admin/book-convention", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    adhesion_id: adhesionId,
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                setMessage(json.error || "Errore durante l'eliminazione.");
                return;
            }

            setAdhesions((prev) => prev.filter((item) => item.id !== adhesionId));
            setMessage("Adesione eliminata correttamente.");
        } catch {
            setMessage("Errore di connessione.");
        } finally {
            setDeletingId(null);
        }
    }

    useEffect(() => {
        loadAdhesions();
    }, []);

    return (
        <main className="books-admin-page">
            <style>{`
        .books-admin-page {
          min-height: 100vh;
          background: var(--cream);
          color: var(--ink);
          padding: 7.5rem 1.5rem 5rem;
        }

        .books-admin-wrap {
          width: 100%;
          max-width: 1220px;
          margin: 0 auto;
        }

        .books-admin-eyebrow {
          margin: 0 0 .8rem;
          font-size: .72rem;
          font-weight: 800;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--ink-soft);
          font-family: "DM Sans", sans-serif;
        }

        .books-admin-title {
          margin: 0;
          font-size: clamp(2rem, 5vw, 4rem);
          line-height: 1;
          color: var(--ink);
          font-family: var(--font-serif);
        }

        .books-admin-subtitle {
          margin: 1rem 0 0;
          max-width: 760px;
          color: var(--ink-soft);
          font-family: "DM Sans", sans-serif;
          font-size: 1rem;
          line-height: 1.7;
        }

        .books-admin-toolbar {
          margin: 2rem 0 1rem;
          display: flex;
          gap: .8rem;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .books-admin-search {
          width: min(100%, 420px);
          border: 1px solid rgba(8,16,42,.12);
          border-radius: 999px;
          padding: .85rem 1.1rem;
          background: #fff;
          color: #08102A;
          outline: none;
          font-family: "DM Sans", sans-serif;
          font-weight: 600;
        }

        .books-admin-count {
          color: var(--ink-soft);
          font-family: "DM Sans", sans-serif;
          font-weight: 700;
          font-size: .9rem;
        }

        .books-admin-message {
          margin-bottom: 1rem;
          padding: 1rem;
          border-radius: 16px;
          background: rgba(8,16,42,.06);
          color: var(--ink);
          font-family: "DM Sans", sans-serif;
          font-weight: 700;
        }

        .books-admin-card {
          background: #fff;
          border: 1px solid rgba(8,16,42,.1);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 18px 45px rgba(8,16,42,.08);
        }

        .books-admin-empty {
          padding: 1.5rem;
          margin: 0;
          color: var(--ink-soft);
          font-family: "DM Sans", sans-serif;
        }

        .books-admin-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .books-admin-table {
          width: 100%;
          border-collapse: collapse;
          font-family: "DM Sans", sans-serif;
          min-width: 1080px;
        }

        .books-admin-table thead tr {
          background: rgba(8,16,42,.04);
          text-align: left;
        }

        .books-admin-table th {
          padding: 1rem;
          font-size: .72rem;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--ink-soft);
          font-weight: 800;
          white-space: nowrap;
        }

        .books-admin-table td {
          padding: 1rem;
          color: var(--ink);
          font-size: .92rem;
          vertical-align: top;
          border-top: 1px solid rgba(8,16,42,.08);
        }

        .books-admin-name {
          font-weight: 800;
          color: #08102A;
        }

        .books-admin-muted {
          color: var(--ink-soft);
          font-size: .84rem;
          margin-top: .25rem;
        }

        .books-admin-pill {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          border-radius: 999px;
          padding: .35rem .7rem;
          background: rgba(46,64,128,.08);
          color: #2E4080;
          font-weight: 800;
          font-size: .78rem;
          white-space: nowrap;
        }

        .books-admin-books {
          display: grid;
          gap: .3rem;
          margin: 0;
          padding-left: 1rem;
        }

        .books-admin-delete {
          border: 1px solid rgba(220,38,38,.25);
          background: rgba(220,38,38,.08);
          color: #991b1b;
          border-radius: 999px;
          padding: .55rem .9rem;
          font-weight: 800;
          cursor: pointer;
          font-family: "DM Sans", sans-serif;
          white-space: nowrap;
        }

        .books-admin-delete:disabled {
          cursor: not-allowed;
          opacity: .6;
        }

        @media (max-width: 720px) {
          .books-admin-page {
            padding: 6.5rem 1rem 4rem;
          }

          .books-admin-toolbar {
            align-items: stretch;
          }

          .books-admin-search {
            width: 100%;
          }
        }
      `}</style>

            <section className="books-admin-wrap">
                <div>
                    <p className="books-admin-eyebrow">Admin</p>

                    <h1 className="books-admin-title">
                        Adesioni convenzione libri
                    </h1>

                    <p className="books-admin-subtitle">
                        Gestisci gli studenti che hanno aderito alle convenzioni libri,
                        controlla i libri selezionati, i prezzi e il metodo di pagamento scelto.
                    </p>
                </div>

                <div className="books-admin-toolbar">
                    <input
                        className="books-admin-search"
                        type="search"
                        placeholder="Cerca per nome, email, corso, libro, convenzione..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <div className="books-admin-count">
                        {filteredAdhesions.length} adesioni
                    </div>
                </div>

                {message && (
                    <div className="books-admin-message">
                        {message}
                    </div>
                )}

                <div className="books-admin-card">
                    {loading ? (
                        <p className="books-admin-empty">
                            Caricamento adesioni...
                        </p>
                    ) : filteredAdhesions.length === 0 ? (
                        <p className="books-admin-empty">
                            Nessuna adesione trovata.
                        </p>
                    ) : (
                        <div className="books-admin-table-wrap">
                            <table className="books-admin-table">
                                <thead>
                                    <tr>
                                        <th>Studente</th>
                                        <th>Email</th>
                                        <th>Corso</th>
                                        <th>Convenzione</th>
                                        <th>Libri</th>
                                        <th>Totale</th>
                                        <th>Pagamento</th>
                                        <th>Data adesione</th>
                                        <th>Azioni</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredAdhesions.map((adhesion) => {
                                        const profile = adhesion.profiles;
                                        const convention = adhesion.convenzioni;

                                        const fullName =
                                            [profile?.nome, profile?.cognome]
                                                .filter(Boolean)
                                                .join(" ") || "Utente senza nome";

                                        const bookItems = Array.isArray(adhesion.book_items)
                                            ? adhesion.book_items.filter((book) => book?.title)
                                            : [];

                                        const books = bookItems.length > 0
                                            ? bookItems.map((book) => book.title).filter(Boolean)
                                            : Array.isArray(adhesion.book_titles)
                                                ? adhesion.book_titles.filter(Boolean)
                                                : [];

                                        const total = bookItems.reduce((sum, book) => {
                                            const price =
                                                typeof book.price === "number" && Number.isFinite(book.price)
                                                    ? book.price
                                                    : 0;

                                            return sum + price;
                                        }, 0);

                                        return (
                                            <tr key={adhesion.id}>
                                                <td>
                                                    <div className="books-admin-name">
                                                        {fullName}
                                                    </div>
                                                    <div className="books-admin-muted">
                                                        ID: {adhesion.user_id}
                                                    </div>
                                                </td>

                                                <td>{profile?.email || "—"}</td>

                                                <td>
                                                    <div>{profile?.corso || "—"}</div>
                                                    <div className="books-admin-muted">
                                                        Anno: {profile?.anno || "—"}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="books-admin-name">
                                                        {convention?.titolo || "Convenzione non trovata"}
                                                    </div>
                                                    <div className="books-admin-muted">
                                                        {convention?.partner || "—"}
                                                    </div>
                                                </td>

                                                <td>
                                                    {bookItems.length > 0 ? (
                                                        <ul className="books-admin-books">
                                                            {bookItems.map((book) => (
                                                                <li key={`${book.title}-${book.price ?? "no-price"}`}>
                                                                    <strong>{book.title}</strong>
                                                                    <span className="books-admin-muted">
                                                                        {" "}· {formatPrice(book.price)}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : books.length > 0 ? (
                                                        <ul className="books-admin-books">
                                                            {books.map((book) => (
                                                                <li key={book}>{book}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>

                                                <td>
                                                    <span className="books-admin-pill">
                                                        {bookItems.length > 0 ? formatPrice(total) : "—"}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span className="books-admin-pill">
                                                        {formatPaymentMethod(adhesion.payment_method)}
                                                    </span>
                                                </td>

                                                <td>{formatDate(adhesion.created_at)}</td>

                                                <td>
                                                    <button
                                                        type="button"
                                                        className="books-admin-delete"
                                                        onClick={() => deleteAdhesion(adhesion.id)}
                                                        disabled={deletingId === adhesion.id}
                                                    >
                                                        {deletingId === adhesion.id
                                                            ? "Elimino..."
                                                            : "Elimina"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}