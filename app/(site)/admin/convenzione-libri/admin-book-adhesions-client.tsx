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
  PRODUCT_TYPE_LABELS,
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
  formatPaymentMethod,
  formatPrice,
  formatRoundLabel,
  getAdhesionConventionTitle,
  getAdhesionOriginalTotal,
  getAdhesionSavings,
  getAdhesionTotal,
  getConventionTitle,
  getFullName,
  getProfileEmail,
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

      const products = getSelectedProducts(adhesion, data.books);
      if (
        filters.year !== "all" &&
        !products.some((product) => product.reference_year === filters.year)
      ) {
        return false;
      }
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
        "ID adesione",
        "ID utente",
        "Data adesione",
        "Nome e cognome",
        "Email istituzionale",
        "Corso",
        "Anno utente",
        "CF / Partita IVA",
        "Indirizzo spedizione / fatturazione",
        "Convenzione",
        "Raccolta",
        "Modalità consegna",
        "Metodo pagamento",
        "Prodotti",
        "ISBN",
        "Tipi prodotto",
        "Contenuto bundle",
        "Aree di studio",
        "Anni di riferimento",
        "Prezzi originali EUR",
        "Prezzi convenzionati EUR",
        "Risparmi per prodotto EUR",
        "Totale originale EUR",
        "Risparmio totale EUR",
        "Totale convenzionato EUR",
      ],
      ...filteredAdhesions.map((adhesion) => {
        const products = getSelectedProducts(adhesion, data.books);
        const profile = adhesion.profiles;
        const originalTotal = getAdhesionOriginalTotal(adhesion, data.books);
        return [
          adhesion.id,
          adhesion.user_id,
          formatDate(adhesion.created_at),
          getFullName(profile),
          getProfileEmail(profile),
          profile?.corso_di_laurea || "",
          String(profile?.anno_di_laurea ?? ""),
          adhesion.fiscal_code_or_vat || "",
          adhesion.billing_shipping_address || "",
          getAdhesionConventionTitle(adhesion),
          formatRoundLabel(adhesion.book_convention_rounds),
          formatDeliveryMode(adhesion.book_convention_rounds?.delivery_mode),
          formatPaymentMethod(adhesion.payment_method),
          products.map((product) => `${product.title} (${formatPrice(product.price)})`).join(" | "),
          products
            .map((product) => `${product.title}: ${product.isbn || "—"}`)
            .join(" | "),
          products.map((product) => PRODUCT_TYPE_LABELS[product.product_type]).join(" | "),
          products
            .filter((product) => product.bundle_items.length > 0)
            .map((product) => `${product.title}: ${product.bundle_items.join(", ")}`)
            .join(" | "),
          products
            .map((product) =>
              product.study_area ? STUDY_AREA_LABELS[product.study_area] : ""
            )
            .filter(Boolean)
            .join(" | "),
          products
            .map((product) =>
              product.reference_year ? BOOK_YEAR_LABELS[product.reference_year] : ""
            )
            .filter(Boolean)
            .join(" | "),
          products
            .map((product) =>
              `${product.title}: ${
                product.original_price === null ? "" : product.original_price.toFixed(2)
              }`
            )
            .join(" | "),
          products
            .map(
              (product) =>
                `${product.title}: ${product.price === null ? "" : product.price.toFixed(2)}`
            )
            .join(" | "),
          products
            .map((product) => {
              const originalPrice = product.original_price ?? product.price;
              if (originalPrice === null || product.price === null) return `${product.title}: `;
              return `${product.title}: ${Math.max(0, originalPrice - product.price).toFixed(2)}`;
            })
            .join(" | "),
          originalTotal === null ? "" : originalTotal.toFixed(2),
          getAdhesionSavings(adhesion, data.books).toFixed(2),
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
    const selectedRound =
      filters.roundId === "all"
        ? null
        : data.rounds.find((round) => round.id === filters.roundId) ?? null;
    const conventionSuffix =
      filters.conventionId === "all" ? "" : `-convenzione-${filters.conventionId}`;
    const collectionSuffix = selectedRound
      ? `-raccolta-${selectedRound.starts_at.slice(0, 10)}-${selectedRound.id.slice(0, 8)}`
      : "";
    anchor.download = `adesioni-convenzioni-libri${conventionSuffix}${collectionSuffix}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [data.books, data.rounds, filteredAdhesions, filters.conventionId, filters.roundId]);

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
    <main className="min-h-screen bg-[#f4f6fa] px-4 pb-16 pt-28 text-[#172554] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <header className="flex flex-col gap-4 rounded-xl border border-[#dce3ee] bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.13em] text-[#64748b]">
              Admin · Convenzioni Libri
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#102d63] sm:text-3xl">
              Adesioni
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#64748b]">
              Consulta lo storico, filtra le richieste ed esporta i dati operativi. Le adesioni registrate non vengono cancellate.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Navigazione Convenzioni Libri admin">
            <Link
              href="/admin/convenzione-libri"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1847a3] px-4 text-sm font-bold text-white transition hover:bg-[#123b8c]"
            >
              <BookOpen className="size-4" /> Catalogo e raccolte
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-bold text-[#334155] transition hover:bg-[#f8fafc]"
            >
              Pannello admin <ExternalLink className="size-4" />
            </Link>
          </nav>
        </header>

        {error && (
          <div className="flex flex-col gap-3 rounded-xl border border-[#fecaca] bg-[#fff7f7] p-4 text-sm text-[#991b1b] sm:flex-row sm:items-center sm:justify-between" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#fecaca] bg-white px-3 font-bold"
            >
              <RefreshCw className="size-4" /> Riprova
            </button>
          </div>
        )}

        <section className="rounded-xl border border-[#dce3ee] bg-white p-4 shadow-sm sm:p-5" aria-label="Filtri adesioni">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#102d63]">
              <SlidersHorizontal className="size-4" /> Ricerca e filtri
            </h2>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#1847a3] hover:bg-[#edf3ff]"
              >
                <FilterX className="size-4" /> Azzera
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <label className="relative sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-[#475569]">Ricerca</span>
              <Search className="pointer-events-none absolute bottom-2.5 left-3 size-4 text-[#94a3b8]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, email, prodotto, CF, ID..."
                className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-3 text-sm text-[#1e293b] outline-none transition placeholder:text-[#94a3b8] focus:border-[#1847a3] focus:ring-2 focus:ring-[#1847a3]/15"
              />
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
              label="Anno prodotto"
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

            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#475569]">Dal</span>
              <input
                type="date"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onChange={(event) => updateFilter("dateFrom", event.target.value)}
                className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#1e293b] outline-none focus:border-[#1847a3] focus:ring-2 focus:ring-[#1847a3]/15"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#475569]">Al</span>
              <input
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(event) => updateFilter("dateTo", event.target.value)}
                className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#1e293b] outline-none focus:border-[#1847a3] focus:ring-2 focus:ring-[#1847a3]/15"
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

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Riepilogo adesioni filtrate">
          <MetricCard icon={<UsersRound />} label="Adesioni" value={String(filteredAdhesions.length)} />
          <MetricCard icon={<Package />} label="Proposte selezionate" value={String(metrics.productCount)} />
          <MetricCard icon={<WalletCards />} label="Valore adesioni" value={formatPrice(metrics.totalValue)} />
          <MetricCard icon={<PiggyBank />} label="Risparmio utenti" value={formatPrice(metrics.totalSavings)} />
          <MetricCard icon={<ArrowDownUp />} label="Media per adesione" value={formatPrice(metrics.average)} />
        </section>

        <section className="overflow-hidden rounded-xl border border-[#dce3ee] bg-white shadow-sm" aria-busy={loading}>
          <header className="flex flex-col gap-3 border-b border-[#dce3ee] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-extrabold text-[#102d63]">Elenco adesioni</h2>
              <p className="mt-0.5 text-xs text-[#64748b]">
                {loading
                  ? "Caricamento in corso…"
                  : `${filteredAdhesions.length} risultati su ${data.adhesions.length} adesioni registrate`}
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={loading || filteredAdhesions.length === 0}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-bold text-[#334155] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download className="size-4" /> Esporta risultati CSV
            </button>
          </header>

          {loading ? (
            <LoadingRows />
          ) : filteredAdhesions.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <BookOpen className="mx-auto mb-3 size-8 text-[#94a3b8]" />
              <h3 className="font-extrabold text-[#102d63]">Nessuna adesione trovata</h3>
              <p className="mt-1 text-sm text-[#64748b]">
                {hasFilters ? "Modifica o azzera i filtri per ampliare i risultati." : "Non risultano ancora adesioni registrate."}
              </p>
              {hasFilters && (
                <button type="button" onClick={resetFilters} className="mt-4 text-sm font-bold text-[#1847a3] hover:underline">
                  Azzera tutti i filtri
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[980px] border-collapse">
                  <thead className="bg-[#f8fafc]">
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
                          className="border-b border-[#dce3ee] px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#64748b]"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8edf4]">
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

              <div className="divide-y divide-[#e8edf4] lg:hidden">
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
    <label>
      <span className="mb-1.5 block text-xs font-bold text-[#475569]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#1e293b] outline-none focus:border-[#1847a3] focus:ring-2 focus:ring-[#1847a3]/15"
      >
        {children}
      </select>
    </label>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return (
    <article className="min-w-0 rounded-xl border border-[#dce3ee] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-[#64748b] [&_svg]:size-4">
        {icon}
        <span className="truncate text-[11px] font-extrabold uppercase tracking-[0.07em]">{label}</span>
      </div>
      <strong className="block truncate text-xl font-extrabold text-[#102d63]" title={value}>{value}</strong>
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
    <tr className="bg-white transition hover:bg-[#f8fafc]">
      <td className="whitespace-nowrap px-4 py-3 text-xs text-[#475569]">
        <strong className="block text-sm text-[#1e293b]">{formatDateOnly(adhesion.created_at)}</strong>
        {new Date(adhesion.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
      </td>
      <td className="max-w-[220px] px-4 py-3">
        <strong className="block truncate text-sm text-[#102d63]">{getFullName(adhesion.profiles)}</strong>
        <span className="block truncate text-xs text-[#64748b]">{getProfileEmail(adhesion.profiles)}</span>
      </td>
      <td className="max-w-[310px] px-4 py-3">
        <ProductSummary products={products} />
      </td>
      <td className="max-w-[260px] px-4 py-3 text-xs text-[#475569]">
        <strong className="block truncate text-[#334155]">
          {getAdhesionConventionTitle(adhesion)}
        </strong>
        <span className="block truncate">
          {formatRoundLabel(adhesion.book_convention_rounds)}
        </span>
        <span className="block truncate font-semibold text-[#1847a3]">
          {formatDeliveryMode(adhesion.book_convention_rounds?.delivery_mode)}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-[#475569]">
        {formatPaymentMethod(adhesion.payment_method)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm font-extrabold text-[#0f766e]">
        {formatPrice(getAdhesionTotal(adhesion, catalog))}
        {savings > 0 && (
          <span className="block text-[10px] font-bold text-[#047857]">
            risparmio {formatPrice(savings)}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onOpen}
          className="h-9 rounded-lg border border-[#cbd5e1] px-3 text-xs font-extrabold text-[#1847a3] transition hover:bg-[#edf3ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1847a3]"
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
    <article className="p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-extrabold text-[#102d63]">{getFullName(adhesion.profiles)}</h3>
          <p className="truncate text-xs text-[#64748b]">{getProfileEmail(adhesion.profiles)}</p>
        </div>
        <div className="shrink-0 text-right">
          <strong className="block text-sm text-[#0f766e]">
            {formatPrice(getAdhesionTotal(adhesion, catalog))}
          </strong>
          {savings > 0 && (
            <span className="block text-[10px] font-bold text-[#047857]">
              risparmio {formatPrice(savings)}
            </span>
          )}
        </div>
      </div>
      <ProductSummary products={products} />
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#e8edf4] pt-3 text-xs">
        <div>
          <dt className="font-semibold text-[#94a3b8]">Data</dt>
          <dd className="mt-0.5 font-bold text-[#475569]">{formatDate(adhesion.created_at)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#94a3b8]">Pagamento</dt>
          <dd className="mt-0.5 font-bold text-[#475569]">{formatPaymentMethod(adhesion.payment_method)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="font-semibold text-[#94a3b8]">Raccolta</dt>
          <dd className="mt-0.5 font-bold text-[#475569]">
            {formatRoundLabel(adhesion.book_convention_rounds)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="font-semibold text-[#94a3b8]">Consegna</dt>
          <dd className="mt-0.5 font-bold text-[#1847a3]">
            {formatDeliveryMode(adhesion.book_convention_rounds?.delivery_mode)}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 h-10 w-full rounded-lg border border-[#cbd5e1] text-sm font-extrabold text-[#1847a3] transition hover:bg-[#edf3ff]"
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
  if (products.length === 0) return <span className="text-xs text-[#94a3b8]">Snapshot non disponibile</span>;

  return (
    <div className="space-y-1.5">
      {products.slice(0, 2).map((product, index) => (
        <div className="flex min-w-0 items-center gap-2" key={`${product.id ?? product.title}-${index}`}>
          <span className="shrink-0 rounded bg-[#edf3ff] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.06em] text-[#1847a3]">
            {product.product_type === "bundle" ? "Bundle" : "Libro"}
          </span>
          <span className="truncate text-xs font-bold text-[#334155]">{product.title}</span>
        </div>
      ))}
      {products.length > 2 && (
        <p className="text-[11px] font-semibold text-[#64748b]">+ {products.length - 2} altre proposte</p>
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
    <footer className="flex flex-col gap-3 border-t border-[#dce3ee] px-4 py-3 text-xs text-[#64748b] sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span>Risultati {start}–{end} di {resultCount}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="grid size-9 place-items-center rounded-lg border border-[#cbd5e1] bg-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Pagina precedente"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-24 text-center font-bold text-[#334155]">Pagina {page} di {pageCount}</span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="grid size-9 place-items-center rounded-lg border border-[#cbd5e1] bg-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Pagina successiva"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </footer>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-5" aria-label="Caricamento adesioni">
      {Array.from({ length: 7 }).map((_, index) => (
        <div className="h-14 animate-pulse rounded-lg bg-[#edf1f6]" key={index} />
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
