"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  BOOK_YEARS,
  BOOK_YEARS_BY_STUDY_AREA,
  BOOK_YEAR_LABELS,
  STUDY_AREAS,
  STUDY_AREA_LABELS,
  DELIVERY_MODE_LABELS,
  type BookConventionApiResponse,
  type BookConventionCatalogBook,
  type BookYear,
  type StudyArea,
} from "@/lib/book-convention";
import AdhesionDialog from "./adhesion-dialog";
import ActiveAdhesionsPanel from "./active-adhesions-panel";
import BookConventionStyles from "./book-convention-styles";
import BookProductCard from "./book-product-card";
import OrderSummary from "./order-summary";

type LoadState = "loading" | "ready" | "error";

function formatRoundDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

function hasDisplayableEndDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() < 9000;
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it")
    .trim();
}

function PageSkeleton() {
  return (
    <>
      <BookConventionStyles />
      <main className="book-page" aria-busy="true" aria-label="Caricamento catalogo libri">
        <section className="conv-hero book-hero book-shell">
          <div className="h-11 w-40 rounded-full bg-[#E2E5EC]" style={{ animation: "sk 1.4s ease infinite" }} />
          <div className="book-hero-grid">
            <div>
              <div className="h-3 w-36 rounded-full bg-[#E2E5EC]" style={{ animation: "sk 1.4s ease infinite" }} />
              <div className="mt-5 h-24 w-full max-w-xl rounded-[1.5rem] bg-[#E2E5EC]" style={{ animation: "sk 1.4s ease infinite" }} />
              <div className="mt-5 h-4 w-full max-w-2xl rounded-full bg-[#E7E9EE]" style={{ animation: "sk 1.4s ease infinite" }} />
              <div className="mt-2 h-4 w-4/5 max-w-xl rounded-full bg-[#E7E9EE]" style={{ animation: "sk 1.4s ease infinite" }} />
            </div>
            <div className="h-40 rounded-[1.5rem] bg-[#E2E5EC]" style={{ animation: "sk 1.4s ease infinite" }} />
          </div>
        </section>

        <section className="book-shop book-shell">
          <div className="book-loading-grid">
            <div>
              <div className="h-48 rounded-[1.75rem] bg-[#E2E5EC]" style={{ animation: "sk 1.4s ease infinite" }} />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="book-skeleton-card" />
                ))}
              </div>
            </div>
            <div className="h-80 rounded-[1.5rem] bg-[#E2E5EC]" style={{ animation: "sk 1.4s ease infinite" }} />
          </div>
        </section>
      </main>
    </>
  );
}

export default function BookConventionClient() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [data, setData] = useState<BookConventionApiResponse | null>(null);
  const [activeArea, setActiveArea] = useState<StudyArea>(STUDY_AREAS[0]);
  const [activeYear, setActiveYear] = useState<BookYear>(BOOK_YEARS[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const loadRequestIdRef = useRef(0);

  const goToLogin = useCallback(() => {
    window.location.replace(`/login?next=${encodeURIComponent("/convenzioni-libri")}`);
  }, []);

  const loadConvention = useCallback(
    async (quiet = false) => {
      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;
      if (!quiet) setLoadState("loading");
      setLoadError("");

      try {
        const response = await fetch("/api/book-convention", {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 401) {
          goToLogin();
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as BookConventionApiResponse;

        if (requestId !== loadRequestIdRef.current) return;

        if (!response.ok) {
          throw new Error(
            payload.error || "Non è stato possibile caricare la convenzione libri."
          );
        }

        const catalog = payload.catalogBooks ?? [];
        const firstAreaWithProducts = STUDY_AREAS.find((area) =>
          catalog.some((product) => product.study_area === area)
        );

        setData(payload);
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.has("convention_id")) {
          currentUrl.searchParams.delete("convention_id");
          window.history.replaceState(
            window.history.state,
            "",
            `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
          );
        }
        setSelectedIds((current) =>
          current.filter((productId) =>
            catalog.some((product) => product.id === productId && product.is_available)
          )
        );
        setActiveArea((current) =>
          catalog.some((product) => product.study_area === current)
            ? current
            : firstAreaWithProducts ?? STUDY_AREAS[0]
        );
        setLoadState("ready");
      } catch (error) {
        if (requestId !== loadRequestIdRef.current) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Non è stato possibile caricare la convenzione libri."
        );
        setLoadState("error");
      }
    },
    [goToLogin]
  );

  useEffect(() => {
    void loadConvention();
  }, [loadConvention]);

  const catalog = useMemo(() => data?.catalogBooks ?? [], [data]);

  useEffect(() => {
    const productsInCurrentYear = catalog.some(
      (product) =>
        product.study_area === activeArea && product.reference_year === activeYear
    );

    if (productsInCurrentYear) return;

    const allowedYears = BOOK_YEARS_BY_STUDY_AREA[activeArea];
    const firstYearWithProducts = allowedYears.find((year) =>
      catalog.some(
        (product) => product.study_area === activeArea && product.reference_year === year
      )
    );

    setActiveYear(firstYearWithProducts ?? allowedYears[0]);
  }, [activeArea, activeYear, catalog]);

  const normalizedSearch = useMemo(
    () => normalizeSearchValue(searchTerm),
    [searchTerm]
  );

  const visibleProducts = useMemo(
    () =>
      catalog.filter((product) => {
        if (
          product.study_area !== activeArea ||
          product.reference_year !== activeYear
        ) {
          return false;
        }

        if (!normalizedSearch) return true;

        return normalizeSearchValue(
          [
            product.title,
            product.isbn ?? "",
            product.description ?? "",
            product.bundle_items
              .flatMap((item) => [item.title, item.isbn ?? ""])
              .join(" "),
          ].join(" ")
        ).includes(normalizedSearch);
      }),
    [activeArea, activeYear, catalog, normalizedSearch]
  );

  const selectedProducts = useMemo(() => {
    const productsById = new Map(catalog.map((product) => [product.id, product]));

    return selectedIds
      .map((productId) => productsById.get(productId))
      .filter((product): product is BookConventionCatalogBook => Boolean(product));
  }, [catalog, selectedIds]);

  const total = useMemo(
    () =>
      selectedProducts.reduce(
        (sum, product) => sum + Math.round((product.price ?? 0) * 100),
        0
      ) / 100,
    [selectedProducts]
  );

  const canAdhere = Boolean(data?.canAdhere);

  function toggleProduct(productId: number) {
    if (!canAdhere) return;

    const product = catalog.find((item) => item.id === productId);
    if (!product?.is_available) return;

    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  function handleCompleted(message: string) {
    setDialogOpen(false);
    setSelectedIds([]);
    setSuccessMessage(message);
    void loadConvention(true);
  }

  if (loadState === "loading") return <PageSkeleton />;

  if (loadState === "error" || !data?.conventions?.length) {
    return (
      <>
        <BookConventionStyles />
        <main className="book-page">
          <section className="conv-hero book-hero book-shell">
            <Link href="/convenzioni" className="book-back-link">
              <ArrowLeft size={14} aria-hidden="true" />
              Tutte le convenzioni
            </Link>

            <div className="mx-auto mt-10 max-w-xl rounded-[1.75rem] border border-[rgba(14,31,107,.1)] bg-white p-7 text-center shadow-[0_12px_36px_rgba(14,31,107,.06)] sm:p-9">
              <CircleAlert className="mx-auto text-[#9A3B3B]" size={30} />
              <h1
                className="mt-4 text-4xl leading-none font-bold text-[#08102A]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Convenzione non disponibile
              </h1>
              <p className="mt-3 text-[.86rem] leading-relaxed text-[#596174]">
                {loadError || "La sezione non può essere caricata in questo momento."}
              </p>
              <Button
                type="button"
                onClick={() => void loadConvention()}
                className="mt-6 h-11 rounded-full bg-[#0E1F6B] px-5 text-white hover:bg-[#1A3399]"
              >
                <RotateCcw size={14} />
                Riprova
              </Button>
            </div>
          </section>
        </main>
      </>
    );
  }

  const activeAdhesions = data.activeAdhesions ?? [];
  const activeRounds = data.activeRounds ?? [];
  const availableProducts = catalog.filter((product) => product.is_available).length;
  const activeRoundHasProducts = activeRounds.length > 0 && availableProducts > 0;
  const activeDeliveryModes = Array.from(
    new Set(activeRounds.map((round) => round.delivery_mode))
  );

  return (
    <>
      <BookConventionStyles />
      <main className="book-page">
        <section className="conv-hero book-hero book-shell">
          <Link href="/convenzioni" className="book-back-link">
            <ArrowLeft size={14} aria-hidden="true" />
            Tutte le convenzioni
          </Link>

          <div className="book-hero-grid">
            <header>
              <p className="conv-hero-eyebrow text-[.68rem] font-bold uppercase tracking-[.22em] text-[#2E4080]">
                Convenzioni Libri · Area riservata
              </p>
              <h1 className="conv-hero-h1 book-hero-title">
                I libri per
                <br />
                <span>il tuo percorso.</span>
              </h1>
              <p className="conv-hero-sub book-hero-description">
                Seleziona il corso e l’anno: troverai insieme tutte le proposte
                attualmente disponibili per il tuo percorso di studi.
              </p>
            </header>

            <aside className="book-hero-meta" aria-label="Stato della convenzione libri">
              <span className="book-meta-label">Disponibilità catalogo</span>

              {activeRounds.length > 0 ? (
                <div className="book-round-status">
                  <CalendarDays size={17} className="mt-0.5 shrink-0 text-[#2E4080]" />
                  <p>
                    <strong className="block text-[#08102A]">Ordini aperti</strong>
                    {activeRounds.length === 1
                      ? `Dal ${formatRoundDate(activeRounds[0].starts_at)}${
                          hasDisplayableEndDate(activeRounds[0].ends_at)
                            ? ` al ${formatRoundDate(activeRounds[0].ends_at)}`
                            : ""
                        }`
                      : `${activeRounds.length} raccolte disponibili in questo momento`}
                    <span className="mt-1 block text-[.7rem] font-semibold text-[#596174]">
                      {activeDeliveryModes.length === 1
                        ? DELIVERY_MODE_LABELS[activeDeliveryModes[0]]
                        : "Modalità di consegna indicate al riepilogo"}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="book-round-status closed">
                  <CalendarDays size={17} className="mt-0.5 shrink-0" />
                  <p>
                    <strong className="block">Raccolta ordini chiusa</strong>
                    Il catalogo resta consultabile.
                  </p>
                </div>
              )}

              <div className="mt-4 flex gap-5 border-t border-[rgba(8,16,42,.07)] pt-4">
                <div>
                  <strong className="block text-xl text-[#08102A]">{catalog.length}</strong>
                  <span className="text-[.66rem] font-semibold text-[#596174]">Proposte</span>
                </div>
                <div>
                  <strong className="block text-xl text-[#08102A]">{availableProducts}</strong>
                  <span className="text-[.66rem] font-semibold text-[#596174]">Disponibili ora</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div className="book-shell book-notices" aria-live="polite">
          {successMessage ? (
            <Alert className="rounded-2xl border-[#CFE6D6] bg-[#F2FAF4] p-4 text-[#145C31]">
              <CheckCircle2 size={18} />
              <AlertTitle>Adesione completata</AlertTitle>
              <AlertDescription className="text-[#477257]">
                {successMessage}
              </AlertDescription>
            </Alert>
          ) : null}

          {activeAdhesions.length > 0 && !successMessage ? (
            <Alert className="rounded-2xl border-[#CFE6D6] bg-[#F2FAF4] p-4 text-[#145C31]">
              <CheckCircle2 size={18} />
              <AlertTitle>
                {activeAdhesions.length === 1
                  ? "Adesione già registrata"
                  : "Adesioni già registrate"}
              </AlertTitle>
              <AlertDescription className="text-[#477257]">
                Le proposte già ordinate nella raccolta corrente non sono più selezionabili;
                puoi comunque aderire alle altre proposte disponibili.
              </AlertDescription>
            </Alert>
          ) : null}

          {!data.canAdhere && activeAdhesions.length === 0 ? (
            <Alert className="rounded-2xl border-[#E7D7B5] bg-[#FFF9ED] p-4 text-[#73551A]">
              <CircleAlert size={18} />
              <AlertTitle>
                {activeRounds.length === 0
                  ? "Raccolta ordini non aperta"
                  : !activeRoundHasProducts
                    ? "Catalogo in aggiornamento"
                    : "Adesioni temporaneamente non disponibili"}
              </AlertTitle>
              <AlertDescription className="text-[#73551A]">
                {activeRounds.length === 0
                  ? "Puoi consultare prezzi e proposte, ma la selezione sarà disponibile alla prossima apertura."
                  : !activeRoundHasProducts
                    ? "La raccolta è aperta, ma al momento non contiene prodotti selezionabili."
                    : "Aggiorna la pagina tra poco oppure contatta ASTRA per maggiori informazioni."}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <ActiveAdhesionsPanel
          activeAdhesions={activeAdhesions}
          latestAdhesion={data.latestAdhesion}
          rounds={data.rounds ?? []}
          conventions={data.conventions ?? []}
        />

        {catalog.length === 0 ? (
          <section className="book-shell book-shop">
            <div>
              <div className="book-empty-catalog">
                <p className="text-[.95rem] font-bold text-[#344363]">
                  Nessun libro disponibile
                </p>
                <p className="mx-auto mt-2 max-w-lg text-[.8rem] leading-relaxed text-[#596174]">
                  Il catalogo non contiene ancora proposte attive.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="book-shell book-shop" aria-labelledby="book-catalog-title">
            <div className="book-shop-layout">
              <div className="book-catalog">
                <div className="conv-search-wrap book-toolbar">
                  <div className="book-search-field">
                    <Search className="book-search-icon" size={17} aria-hidden="true" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="conv-search"
                      placeholder="Cerca titolo, ISBN o contenuto della proposta…"
                      aria-label="Cerca nel catalogo libri"
                    />
                    {searchTerm ? (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="book-clear-search"
                        aria-label="Cancella ricerca"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>

                  <div className="book-filter-group">
                    <span className="book-filter-label">Area di studio</span>
                    <div className="book-filter-scroll" role="group" aria-label="Filtra per area di studio">
                      {STUDY_AREAS.map((area) => {
                        const count = catalog.filter(
                          (product) => product.study_area === area
                        ).length;
                        const active = activeArea === area;

                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() => setActiveArea(area)}
                            aria-pressed={active}
                            disabled={count === 0}
                            className={`cat-pill${active ? " active" : ""}`}
                          >
                            {STUDY_AREA_LABELS[area]}
                            <span className="book-pill-count">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="book-filter-group">
                    <span className="book-filter-label">Anno di corso</span>
                    <div className="book-filter-scroll" role="group" aria-label="Filtra per anno di corso">
                      {BOOK_YEARS_BY_STUDY_AREA[activeArea].map((year) => {
                        const count = catalog.filter(
                          (product) =>
                            product.study_area === activeArea &&
                            product.reference_year === year
                        ).length;
                        const active = activeYear === year;

                        return (
                          <button
                            key={year}
                            type="button"
                            onClick={() => setActiveYear(year)}
                            aria-pressed={active}
                            disabled={count === 0}
                            className={`cat-pill${active ? " active" : ""}`}
                          >
                            {BOOK_YEAR_LABELS[year]}
                            <span className="book-pill-count">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="book-results-head">
                  <div>
                    <p className="book-results-eyebrow">{STUDY_AREA_LABELS[activeArea]}</p>
                    <h2 id="book-catalog-title" className="book-results-title">
                      {BOOK_YEAR_LABELS[activeYear]}
                    </h2>
                  </div>
                  <p className="book-results-count" aria-live="polite">
                    {visibleProducts.length} {visibleProducts.length === 1 ? "proposta" : "proposte"}
                  </p>
                </div>

                {visibleProducts.length > 0 ? (
                  <div className="conv-grid book-product-grid">
                    {visibleProducts.map((product) => (
                      <BookProductCard
                        key={product.id}
                        product={product}
                        selected={selectedIds.includes(product.id)}
                        selectionDisabled={!canAdhere}
                        onToggle={toggleProduct}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="book-empty-catalog">
                    <p className="text-[.88rem] font-bold text-[#344363]">
                      {normalizedSearch
                        ? "Nessun prodotto corrisponde alla ricerca"
                        : "Nessuna proposta per questi filtri"}
                    </p>
                    <p className="mx-auto mt-2 max-w-md text-[.76rem] leading-relaxed text-[#596174]">
                      {normalizedSearch
                        ? "Prova con un titolo, un autore o un ISBN differente."
                        : "Seleziona un’altra area di studio o un altro anno di corso."}
                    </p>
                    {normalizedSearch ? (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="book-inline-button"
                      >
                        Cancella ricerca
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              <OrderSummary
                products={selectedProducts}
                total={total}
                canAdhere={canAdhere}
                onRemove={toggleProduct}
                onProceed={() => setDialogOpen(true)}
              />
            </div>
          </section>
        )}

        <AdhesionDialog
          open={dialogOpen}
          products={selectedProducts}
          total={total}
          profile={data.profile}
          initialFiscalCodeOrVat={data.latestAdhesion?.fiscal_code_or_vat}
          initialAddress={data.latestAdhesion?.billing_shipping_address}
          onClose={() => setDialogOpen(false)}
          onCompleted={handleCompleted}
          onUnauthorized={goToLogin}
        />
      </main>
    </>
  );
}
