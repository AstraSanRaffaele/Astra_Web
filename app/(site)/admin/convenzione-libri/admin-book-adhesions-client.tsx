"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FilterX,
  Package,
  PiggyBank,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  BOOK_YEARS,
  BOOK_YEAR_LABELS,
  DELIVERY_MODES,
  DELIVERY_MODE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  STUDY_AREAS,
  STUDY_AREA_LABELS,
  type BookYear,
  type StudyArea,
} from "@/lib/book-convention";
import AdhesionDetailDialog from "./adhesion-detail-dialog";
import {
  adhesionHasProduct,
  formatDate,
  formatDateOnly,
  formatDeliveryMode,
  formatBookYear,
  formatPaymentMethod,
  formatPrice,
  formatRoundLabel,
  getAdhesionConventionTitle,
  getAdhesionSavings,
  getAdhesionSelectedYear,
  getAdhesionTotal,
  getConventionTitle,
  getFullName,
  getProfileEmail,
  getProfilePhone,
  getSelectedProducts,
  matchesAdhesionSearch,
} from "./adhesion-utils";
import type {
  AdhesionFilters,
  AdhesionSort,
  AdminBookAdhesion,
  AdminBookConvention,
  AdminBookConventionApiResponse,
  AdminBookConventionProduct,
  AdminBookConventionRound,
} from "./types";
import styles from "./admin-book-adhesions-client.module.css";

const API_PAGE_SIZE = 500;
const UI_PAGE_SIZE = 25;

const EMPTY_FILTERS: AdhesionFilters = {
  conventionId: "all",
  roundId: "all",
  paymentMethod: "all",
  productId: "all",
  year: "all",
  studyArea: "all",
  deliveryMode: "all",
  dateFrom: "",
  dateTo: "",
};

type LoadedData = {
  conventions: AdminBookConvention[];
  books: AdminBookConventionProduct[];
  rounds: AdminBookConventionRound[];
  adhesions: AdminBookAdhesion[];
};

type AdminBookAdhesionsClientProps = {
  initialConventionId?: number;
  initialRoundId?: string;
  autoExport?: boolean;
};

export default function AdminBookAdhesionsClient({
  initialConventionId,
  initialRoundId,
  autoExport = false,
}: AdminBookAdhesionsClientProps) {
  const router = useRouter();
  const [data, setData] = useState<LoadedData>({
    conventions: [],
    books: [],
    rounds: [],
    adhesions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<AdhesionFilters>(() => ({
    ...EMPTY_FILTERS,
    conventionId: initialConventionId ?? "all",
    roundId: initialRoundId ?? "all",
  }));
  const [sort, setSort] = useState<AdhesionSort>("newest");
  const [page, setPage] = useState(1);
  const [selectedAdhesion, setSelectedAdhesion] = useState<AdminBookAdhesion | null>(null);
  const autoExportTriggeredRef = useRef(false);

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");

      async function requestPage(pageNumber: number) {
        const params = new URLSearchParams({
          page: String(pageNumber),
          page_size: String(API_PAGE_SIZE),
        });
        const response = await fetch(`/api/admin/book-convention?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal,
        });
        const payload = (await response.json().catch(() => ({}))) as AdminBookConventionApiResponse;

        if (response.status === 401) {
          router.replace("/login?next=/admin/convenzione-libri");
          return null;
        }

        if (response.status === 403) {
          router.replace("/");
          return null;
        }

        if (!response.ok) {
          throw new Error(payload.error || "Caricamento delle adesioni non riuscito.");
        }

        return payload;
      }

      try {
        const firstPayload = await requestPage(1);
        if (!firstPayload) return;

        const totalPages = firstPayload.pagination?.totalPages ?? 1;
        const allAdhesions = [...(firstPayload.adhesions ?? [])];

        for (let firstPage = 2; firstPage <= totalPages; firstPage += 3) {
          const pageNumbers = Array.from(
            { length: Math.min(3, totalPages - firstPage + 1) },
            (_, index) => firstPage + index
          );
          const payloads = await Promise.all(pageNumbers.map((pageNumber) => requestPage(pageNumber)));

          if (payloads.some((payload) => payload === null)) return;
          payloads.forEach((payload) => allAdhesions.push(...(payload?.adhesions ?? [])));
        }

        setData({
          conventions: firstPayload.conventions ?? [],
          books: firstPayload.books ?? [],
          rounds: firstPayload.rounds ?? [],
          adhesions: allAdhesions,
        });
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Non è stato possibile caricare le adesioni."
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const availableRounds = useMemo(
    () =>
      filters.conventionId === "all"
        ? data.rounds
        : data.rounds.filter((round) => round.convention_id === filters.conventionId),
    [data.rounds, filters.conventionId]
  );

  const availableProducts = useMemo(
    () =>
      filters.conventionId === "all"
        ? data.books
        : data.books.filter((product) => product.convention_id === filters.conventionId),
    [data.books, filters.conventionId]
  );

  const paymentMethods = useMemo(() => {
    const methods = new Set<string>(PAYMENT_METHODS);
    data.adhesions.forEach((adhesion) => {
      if (adhesion.payment_method) methods.add(adhesion.payment_method);
    });
    return [...methods];
  }, [data.adhesions]);

  const filteredAdhesions = useMemo(() => {
    const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
    const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`).getTime() : null;

    const filtered = data.adhesions.filter((adhesion) => {
      if (!matchesAdhesionSearch(adhesion, data.books, search)) return false;
      if (filters.conventionId !== "all" && adhesion.convention_id !== filters.conventionId) return false;
      if (filters.roundId !== "all" && adhesion.round_id !== filters.roundId) return false;
      if (
        filters.deliveryMode !== "all" &&
        adhesion.book_convention_rounds?.delivery_mode !== filters.deliveryMode
      ) {
        return false;
      }
      if (
        filters.paymentMethod !== "all" &&
        adhesion.payment_method !== filters.paymentMethod
      ) {
        return false;
      }
      if (
        filters.productId !== "all" &&
        !adhesionHasProduct(adhesion, filters.productId, data.books)
      ) {
        return false;
      }

      if (
        filters.year !== "all" &&
        getAdhesionSelectedYear(adhesion) !== filters.year
      ) {
        return false;
      }
      const products = getSelectedProducts(adhesion, data.books);
      if (
        filters.studyArea !== "all" &&
        !products.some((product) => product.study_area === filters.studyArea)
      ) {
        return false;
      }

      const createdAt = new Date(adhesion.created_at).getTime();
      if (dateFrom !== null && createdAt < dateFrom) return false;
      if (dateTo !== null && createdAt > dateTo) return false;
      return true;
    });

    return filtered.sort((left, right) => {
      if (sort === "oldest") {
        return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      }
      if (sort === "total_desc") {
        return getAdhesionTotal(right, data.books) - getAdhesionTotal(left, data.books);
      }
      if (sort === "name") {
        return getFullName(left.profiles).localeCompare(getFullName(right.profiles), "it");
      }
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
  }, [data.adhesions, data.books, filters, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredAdhesions.length / UI_PAGE_SIZE));
  const visibleAdhesions = filteredAdhesions.slice(
    (page - 1) * UI_PAGE_SIZE,
    page * UI_PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [filters, search, sort]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const metrics = useMemo(() => {
    const productCount = filteredAdhesions.reduce(
      (sum, adhesion) => sum + getSelectedProducts(adhesion, data.books).length,
      0
    );
    const totalValue = filteredAdhesions.reduce(
      (sum, adhesion) => sum + getAdhesionTotal(adhesion, data.books),
      0
    );
    const totalSavings = filteredAdhesions.reduce(
      (sum, adhesion) => sum + getAdhesionSavings(adhesion, data.books),
      0
    );

    return {
      productCount,
      totalValue,
      totalSavings,
      average: filteredAdhesions.length > 0 ? totalValue / filteredAdhesions.length : 0,
    };
  }, [data.books, filteredAdhesions]);

  const hasFilters =
    Boolean(search.trim()) || Object.entries(filters).some(([key, value]) => {
      if (key === "dateFrom" || key === "dateTo") return Boolean(value);
      return value !== "all";
    });

  function updateFilter<Key extends keyof AdhesionFilters>(key: Key, value: AdhesionFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function selectConvention(value: string) {
    setFilters((current) => ({
      ...current,
      conventionId: value === "all" ? "all" : Number(value),
      roundId: "all",
      productId: "all",
    }));
  }

  function resetFilters() {
    setSearch("");
    setFilters(EMPTY_FILTERS);
    setSort("newest");
  }

  const exportCsv = useCallback(() => {
    const rows: Array<Array<string | number>> = [
      [
        "Nome e cognome",
        "Email",
        "Telefono",
        "Codice fiscale / Partita IVA",
        "Modalità consegna",
        "Indirizzo consegna / fatturazione",
        "Metodo pagamento",
        "Anno selezionato",
        "Prodotti ordinati",
        "ISBN",
        "Prezzo convenzione EUR",
        "Totale ordine EUR",
      ],
      ...filteredAdhesions.map((adhesion) => {
        const products = getSelectedProducts(adhesion, data.books);
        const profile = adhesion.profiles;
        return [
          getFullName(profile),
          getProfileEmail(profile),
          getProfilePhone(profile),
          adhesion.fiscal_code_or_vat || "",
          formatDeliveryMode(adhesion.book_convention_rounds?.delivery_mode),
          adhesion.billing_shipping_address || "",
          formatPaymentMethod(adhesion.payment_method),
          formatBookYear(getAdhesionSelectedYear(adhesion)),
          products
            .map((product) =>
              product.bundle_items.length === 0
                ? product.title
                : `${product.title}: ${product.bundle_items
                    .map((item) => item.title)
                    .join(", ")}`
            )
            .join(" | "),
          products
            .map((product) => {
              const isbns = [
                ...(product.isbn ? [`${product.title}: ${product.isbn}`] : []),
                ...product.bundle_items
                  .filter((item) => item.isbn)
                  .map((item) => `${item.title}: ${item.isbn}`),
              ];
              return isbns.join(", ");
            })
            .filter(Boolean)
            .join(" | "),
          products
            .map((product) =>
              `${product.title}: ${product.price === null ? "" : product.price.toFixed(2)}`
            )
            .join(" | "),
          getAdhesionTotal(adhesion, data.books).toFixed(2),
        ];
      }),
    ];

    const csv = rows.map((row) => row.map(toSafeCsvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ordini-editore-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [data.books, filteredAdhesions]);

  useEffect(() => {
    if (!autoExport || loading || error || autoExportTriggeredRef.current) return;

    autoExportTriggeredRef.current = true;

    const requestedRound = initialRoundId
      ? data.rounds.find((round) => round.id === initialRoundId)
      : null;

    if (
      !requestedRound ||
      (initialConventionId !== undefined &&
        requestedRound.convention_id !== initialConventionId)
    ) {
      setError("La raccolta richiesta non è valida per la convenzione selezionata.");
      return;
    }

    exportCsv();

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete("download");
    window.history.replaceState(
      window.history.state,
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
    );
  }, [
    autoExport,
    data.rounds,
    error,
    exportCsv,
    initialConventionId,
    initialRoundId,
    loading,
  ]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>Admin · Convenzioni Libri</p>
            <h1 className={styles.pageTitle}>Adesioni</h1>
            <p className={styles.pageLead}>
              Consulta lo storico, filtra le richieste ed esporta i dati operativi. Le adesioni registrate non vengono cancellate.
            </p>
          </div>
          <nav className={styles.adminNav} aria-label="Navigazione Convenzioni Libri admin">
            <Link href="/admin/convenzione-libri" className={styles.primaryNavLink}>
              <BookOpen className={styles.smallIcon} aria-hidden="true" />
              Catalogo e raccolte
            </Link>
            <Link href="/admin" className={styles.secondaryNavLink}>
              Pannello admin
              <ExternalLink className={styles.smallIcon} aria-hidden="true" />
            </Link>
          </nav>
        </header>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void loadData()} className={styles.retryButton}>
              <RefreshCw className={styles.smallIcon} aria-hidden="true" />
              Riprova
            </button>
          </div>
        )}

        <section className={styles.filterPanel} aria-label="Filtri adesioni">
          <div className={styles.filterHeader}>
            <h2 className={styles.sectionTitle}>
              <SlidersHorizontal className={styles.smallIcon} aria-hidden="true" />
              Ricerca e filtri
            </h2>
            {hasFilters && (
              <button type="button" onClick={resetFilters} className={styles.resetButton}>
                <FilterX className={styles.smallIcon} aria-hidden="true" />
                Azzera
              </button>
            )}
          </div>

          <div className={styles.filterGrid}>
            <label className={`${styles.filterControl} ${styles.searchControl}`}>
              <span className={styles.formLabel}>Ricerca</span>
              <span className={styles.searchField}>
                <Search className={styles.searchIcon} aria-hidden="true" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome, email, prodotto, CF, ID..."
                  className={`${styles.field} ${styles.searchInput}`}
                />
              </span>
            </label>

            <FilterSelect
              label="Convenzione"
              value={String(filters.conventionId)}
              onChange={selectConvention}
            >
              <option value="all">Tutte</option>
              {data.conventions.map((convention) => (
                <option key={convention.id} value={convention.id}>
                  {getConventionTitle(convention)}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Raccolta"
              value={filters.roundId}
              onChange={(value) => updateFilter("roundId", value)}
            >
              <option value="all">Tutti</option>
              {availableRounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {filters.conventionId === "all"
                    ? `${getConventionTitle(round.book_conventions)} · `
                    : ""}
                  {formatRoundLabel(round)}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Consegna"
              value={filters.deliveryMode}
              onChange={(value) =>
                updateFilter(
                  "deliveryMode",
                  value as AdhesionFilters["deliveryMode"]
                )
              }
            >
              <option value="all">Tutte</option>
              {DELIVERY_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {DELIVERY_MODE_LABELS[mode]}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Pagamento"
              value={filters.paymentMethod}
              onChange={(value) => updateFilter("paymentMethod", value)}
            >
              <option value="all">Tutti</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ?? formatPaymentMethod(method)}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Prodotto"
              value={String(filters.productId)}
              onChange={(value) =>
                updateFilter("productId", value === "all" ? "all" : Number(value))
              }
            >
              <option value="all">Tutti</option>
              {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {filters.conventionId === "all"
                    ? `${getConventionTitle(
                        data.conventions.find(
                          (convention) => convention.id === product.convention_id
                        )
                      )} · `
                    : ""}
                  {product.product_type === "bundle" ? "Bundle · " : ""}
                  {product.title}{product.is_active ? "" : " · disattivato"}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Anno selezionato"
              value={filters.year}
              onChange={(value) => updateFilter("year", value as BookYear | "all")}
            >
              <option value="all">Tutti</option>
              {BOOK_YEARS.map((year) => (
                <option key={year} value={year}>{BOOK_YEAR_LABELS[year]}</option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Area di studio"
              value={filters.studyArea}
              onChange={(value) => updateFilter("studyArea", value as StudyArea | "all")}
            >
              <option value="all">Tutte</option>
              {STUDY_AREAS.map((area) => (
                <option key={area} value={area}>{STUDY_AREA_LABELS[area]}</option>
              ))}
            </FilterSelect>

            <label className={styles.filterControl}>
              <span className={styles.formLabel}>Dal</span>
              <input
                type="date"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onChange={(event) => updateFilter("dateFrom", event.target.value)}
                className={styles.field}
              />
            </label>

            <label className={styles.filterControl}>
              <span className={styles.formLabel}>Al</span>
              <input
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(event) => updateFilter("dateTo", event.target.value)}
                className={styles.field}
              />
            </label>

            <FilterSelect label="Ordina" value={sort} onChange={(value) => setSort(value as AdhesionSort)}>
              <option value="newest">Più recenti</option>
              <option value="oldest">Meno recenti</option>
              <option value="total_desc">Totale più alto</option>
              <option value="name">Nome A–Z</option>
            </FilterSelect>
          </div>
        </section>

        <section className={styles.metricsGrid} aria-label="Riepilogo adesioni filtrate">
          <MetricCard icon={<UsersRound />} label="Adesioni" value={String(filteredAdhesions.length)} />
          <MetricCard icon={<Package />} label="Proposte selezionate" value={String(metrics.productCount)} />
          <MetricCard icon={<WalletCards />} label="Valore adesioni" value={formatPrice(metrics.totalValue)} />
          <MetricCard icon={<PiggyBank />} label="Risparmio utenti" value={formatPrice(metrics.totalSavings)} />
          <MetricCard icon={<ArrowDownUp />} label="Media per adesione" value={formatPrice(metrics.average)} />
        </section>

        <section className={styles.resultsPanel} aria-busy={loading}>
          <header className={styles.resultsHeader}>
            <div>
              <h2 className={styles.resultsTitle}>Elenco adesioni</h2>
              <p className={styles.resultsMeta}>
                {loading
                  ? "Caricamento in corso…"
                  : `${filteredAdhesions.length} risultati su ${data.adhesions.length} adesioni registrate`}
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={loading || filteredAdhesions.length === 0}
              className={styles.exportButton}
            >
              <Download className={styles.smallIcon} aria-hidden="true" />
              Esporta risultati CSV
            </button>
          </header>

          {loading ? (
            <LoadingRows />
          ) : filteredAdhesions.length === 0 ? (
            <div className={styles.emptyState}>
              <BookOpen className={styles.emptyIcon} aria-hidden="true" />
              <h3 className={styles.emptyTitle}>Nessuna adesione trovata</h3>
              <p className={styles.emptyCopy}>
                {hasFilters ? "Modifica o azzera i filtri per ampliare i risultati." : "Non risultano ancora adesioni registrate."}
              </p>
              {hasFilters && (
                <button type="button" onClick={resetFilters} className={styles.emptyAction}>
                  Azzera tutti i filtri
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={styles.tableViewport}>
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr>
                      {[
                        "Data",
                        "Utente",
                        "Prodotti",
                        "Convenzione / raccolta",
                        "Pagamento",
                        "Totale",
                        "",
                      ].map((heading, index) => (
                        <th
                          key={`${heading}-${index}`}
                          className={styles.tableHeading}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={styles.tableBody}>
                    {visibleAdhesions.map((adhesion) => (
                      <AdhesionTableRow
                        key={adhesion.id}
                        adhesion={adhesion}
                        catalog={data.books}
                        onOpen={() => setSelectedAdhesion(adhesion)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.mobileList}>
                {visibleAdhesions.map((adhesion) => (
                  <AdhesionMobileCard
                    key={adhesion.id}
                    adhesion={adhesion}
                    catalog={data.books}
                    onOpen={() => setSelectedAdhesion(adhesion)}
                  />
                ))}
              </div>

              <Pagination
                page={page}
                pageCount={pageCount}
                resultCount={filteredAdhesions.length}
                onPageChange={setPage}
              />
            </>
          )}
        </section>
      </div>

      {selectedAdhesion && (
        <AdhesionDetailDialog
          adhesion={selectedAdhesion}
          catalog={data.books}
          onClose={() => setSelectedAdhesion(null)}
        />
      )}
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.filterControl}>
      <span className={styles.formLabel}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.field}
      >
        {children}
      </select>
    </label>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricLabel}>
        {icon}
        <span>{label}</span>
      </div>
      <strong className={styles.metricValue} title={value}>{value}</strong>
    </article>
  );
}

function AdhesionTableRow({
  adhesion,
  catalog,
  onOpen,
}: {
  adhesion: AdminBookAdhesion;
  catalog: AdminBookConventionProduct[];
  onOpen: () => void;
}) {
  const products = getSelectedProducts(adhesion, catalog);
  const savings = getAdhesionSavings(adhesion, catalog);

  return (
    <tr className={styles.tableRow}>
      <td className={`${styles.tableCell} ${styles.dateCell}`}>
        <strong className={styles.datePrimary}>{formatDateOnly(adhesion.created_at)}</strong>
        {new Date(adhesion.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
      </td>
      <td className={`${styles.tableCell} ${styles.userCell}`}>
        <strong className={styles.userName}>{getFullName(adhesion.profiles)}</strong>
        <span className={styles.userEmail}>{getProfileEmail(adhesion.profiles)}</span>
      </td>
      <td className={`${styles.tableCell} ${styles.productsCell}`}>
        <ProductSummary products={products} />
      </td>
      <td className={`${styles.tableCell} ${styles.collectionCell}`}>
        <strong className={styles.collectionTitle}>
          {getAdhesionConventionTitle(adhesion)}
        </strong>
        <span className={styles.collectionLine}>
          {formatRoundLabel(adhesion.book_convention_rounds)}
        </span>
        <span className={styles.deliveryLine}>
          {formatDeliveryMode(adhesion.book_convention_rounds?.delivery_mode)}
        </span>
        <span className={styles.selectedYearBadge}>
          {formatBookYear(getAdhesionSelectedYear(adhesion))}
        </span>
      </td>
      <td className={`${styles.tableCell} ${styles.paymentCell}`}>
        {formatPaymentMethod(adhesion.payment_method)}
      </td>
      <td className={`${styles.tableCell} ${styles.totalCell}`}>
        {formatPrice(getAdhesionTotal(adhesion, catalog))}
        {savings > 0 && (
          <span className={styles.savingsText}>
            risparmio {formatPrice(savings)}
          </span>
        )}
      </td>
      <td className={`${styles.tableCell} ${styles.actionCell}`}>
        <button
          type="button"
          onClick={onOpen}
          className={styles.detailButton}
          aria-label={`Apri il dettaglio dell'adesione di ${getFullName(adhesion.profiles)}`}
        >
          Dettagli
        </button>
      </td>
    </tr>
  );
}

function AdhesionMobileCard({
  adhesion,
  catalog,
  onOpen,
}: {
  adhesion: AdminBookAdhesion;
  catalog: AdminBookConventionProduct[];
  onOpen: () => void;
}) {
  const products = getSelectedProducts(adhesion, catalog);
  const savings = getAdhesionSavings(adhesion, catalog);

  return (
    <article className={styles.mobileCard}>
      <div className={styles.mobileCardHeader}>
        <div className={styles.mobileUser}>
          <h3 className={styles.mobileUserName}>{getFullName(adhesion.profiles)}</h3>
          <p className={styles.mobileUserEmail}>{getProfileEmail(adhesion.profiles)}</p>
        </div>
        <div className={styles.mobileTotal}>
          <strong>
            {formatPrice(getAdhesionTotal(adhesion, catalog))}
          </strong>
          {savings > 0 && (
            <span className={styles.savingsText}>
              risparmio {formatPrice(savings)}
            </span>
          )}
        </div>
      </div>
      <ProductSummary products={products} />
      <dl className={styles.mobileDetails}>
        <div>
          <dt>Data</dt>
          <dd>{formatDate(adhesion.created_at)}</dd>
        </div>
        <div>
          <dt>Pagamento</dt>
          <dd>{formatPaymentMethod(adhesion.payment_method)}</dd>
        </div>
        <div>
          <dt>Anno selezionato</dt>
          <dd>
            <span className={styles.selectedYearBadge}>
              {formatBookYear(getAdhesionSelectedYear(adhesion))}
            </span>
          </dd>
        </div>
        <div className={styles.mobileDetailWide}>
          <dt>Raccolta</dt>
          <dd>
            {formatRoundLabel(adhesion.book_convention_rounds)}
          </dd>
        </div>
        <div className={styles.mobileDetailWide}>
          <dt>Consegna</dt>
          <dd className={styles.mobileDelivery}>
            {formatDeliveryMode(adhesion.book_convention_rounds?.delivery_mode)}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onOpen}
        className={styles.mobileDetailButton}
      >
        Apri dettaglio
      </button>
    </article>
  );
}

function ProductSummary({
  products,
}: {
  products: ReturnType<typeof getSelectedProducts>;
}) {
  if (products.length === 0) {
    return <span className={styles.noSnapshot}>Snapshot non disponibile</span>;
  }

  return (
    <div className={styles.productSummary}>
      {products.slice(0, 2).map((product, index) => (
        <div className={styles.productLine} key={`${product.id ?? product.title}-${index}`}>
          <span className={styles.productType}>
            {product.product_type === "bundle" ? "Bundle" : "Libro"}
          </span>
          <span className={styles.productTitle}>{product.title}</span>
        </div>
      ))}
      {products.length > 2 && (
        <p className={styles.moreProducts}>+ {products.length - 2} altre proposte</p>
      )}
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  resultCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  resultCount: number;
  onPageChange: (page: number) => void;
}) {
  const start = resultCount === 0 ? 0 : (page - 1) * UI_PAGE_SIZE + 1;
  const end = Math.min(page * UI_PAGE_SIZE, resultCount);

  return (
    <footer className={styles.pagination}>
      <span>Risultati {start}–{end} di {resultCount}</span>
      <div className={styles.paginationControls}>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={styles.paginationButton}
          aria-label="Pagina precedente"
        >
          <ChevronLeft className={styles.smallIcon} aria-hidden="true" />
        </button>
        <span className={styles.pageIndicator}>Pagina {page} di {pageCount}</span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className={styles.paginationButton}
          aria-label="Pagina successiva"
        >
          <ChevronRight className={styles.smallIcon} aria-hidden="true" />
        </button>
      </div>
    </footer>
  );
}

function LoadingRows() {
  return (
    <div className={styles.loadingRows} aria-label="Caricamento adesioni">
      {Array.from({ length: 7 }).map((_, index) => (
        <div className={styles.loadingRow} key={index} />
      ))}
    </div>
  );
}

function toSafeCsvCell(value: string | number) {
  let normalized = String(value ?? "");
  if (typeof value === "string" && /^[\s]*[=+\-@]/.test(normalized)) {
    normalized = `'${normalized}`;
  }
  return `"${normalized.replaceAll('"', '""')}"`;
}
