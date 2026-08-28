"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  RotateCcw,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  BOOK_YEARS,
  BOOK_YEAR_LABELS,
  STUDY_AREAS,
  STUDY_AREA_LABELS,
  type BookConventionApiResponse,
  type BookConventionCatalogBook,
  type BookYear,
  type StudyArea,
} from "@/lib/book-convention";
import AdhesionDialog from "./adhesion-dialog";
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

function PageSkeleton() {
  return (
    <main className="min-h-screen bg-[#F8F7F3] px-4 pt-28 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-3 w-28 rounded-full bg-[#E2E5EC]" />
        <div className="mt-5 h-12 w-72 max-w-full rounded-2xl bg-[#E2E5EC]" />
        <div className="mt-4 h-4 w-full max-w-2xl rounded-full bg-[#E7E9EE]" />
        <div className="mt-2 h-4 w-4/5 max-w-xl rounded-full bg-[#E7E9EE]" />
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <div className="h-14 rounded-2xl bg-[#E2E5EC]" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-52 rounded-[1.35rem] bg-[#E7E9EE]" />
              ))}
            </div>
          </div>
          <div className="h-72 rounded-[1.5rem] bg-[#E2E5EC]" />
        </div>
      </div>
    </main>
  );
}

export default function BookConventionClient() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [data, setData] = useState<BookConventionApiResponse | null>(null);
  const [activeArea, setActiveArea] = useState<StudyArea>(STUDY_AREAS[0]);
  const [activeYear, setActiveYear] = useState<BookYear>(BOOK_YEARS[0]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const goToLogin = useCallback(() => {
    window.location.replace("/login?next=/convenzioni-libri");
  }, []);

  const loadConvention = useCallback(
    async (quiet = false) => {
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

    const firstYearWithProducts = BOOK_YEARS.find((year) =>
      catalog.some(
        (product) => product.study_area === activeArea && product.reference_year === year
      )
    );

    if (firstYearWithProducts) setActiveYear(firstYearWithProducts);
  }, [activeArea, activeYear, catalog]);

  const visibleProducts = useMemo(
    () =>
      catalog.filter(
        (product) =>
          product.study_area === activeArea && product.reference_year === activeYear
      ),
    [activeArea, activeYear, catalog]
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

  const canAdhere = Boolean(data?.canAdhere && !data.hasAdhered);

  function toggleProduct(productId: number) {
    if (!canAdhere) return;

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

  if (loadState === "error" || !data?.convention) {
    return (
      <main className="min-h-screen bg-[#F8F7F3] px-4 pt-32 pb-20 sm:px-6">
        <div className="mx-auto max-w-xl rounded-[1.5rem] border border-[rgba(14,31,107,.1)] bg-white p-6 text-center shadow-[0_12px_36px_rgba(14,31,107,.06)] sm:p-8">
          <CircleAlert className="mx-auto text-[#9A3B3B]" size={28} />
          <h1
            className="mt-4 text-3xl font-bold text-[#08102A]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Convenzione non disponibile
          </h1>
          <p className="mt-2 text-[.85rem] leading-relaxed text-[#6B7280]">
            {loadError || "La sezione non può essere caricata in questo momento."}
          </p>
          <Button
            type="button"
            onClick={() => void loadConvention()}
            className="mt-5 h-10 rounded-full bg-[#0E1F6B] px-5 text-white hover:bg-[#1A3399]"
          >
            <RotateCcw size={14} />
            Riprova
          </Button>
        </div>
      </main>
    );
  }

  const convention = data.convention;
  const activeAdhesion = data.activeAdhesion ?? null;

  return (
    <main className="min-h-screen bg-[#F8F7F3] text-[#08102A]">
      <section className="px-4 pt-28 pb-16 sm:px-6 lg:px-8 lg:pt-32 lg:pb-24">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/convenzioni"
            className="inline-flex items-center gap-1.5 text-[.72rem] font-bold text-[#2E4080] no-underline transition hover:text-[#0E1F6B]"
          >
            <ArrowLeft size={13} />
            Tutte le convenzioni
          </Link>

          <header className="mt-5 grid items-end gap-5 border-b border-[rgba(14,31,107,.1)] pb-7 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-3xl">
              <p className="text-[.66rem] font-bold uppercase tracking-[.22em] text-[#2E4080]">
                Area riservata agli associati
              </p>
              <h1
                className="mt-2 text-[clamp(2.65rem,6vw,4.4rem)] leading-[.95] font-bold tracking-[-.035em] text-[#08102A]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {convention.titolo || "Convenzioni Libri"}
              </h1>
              <p className="mt-4 max-w-2xl text-[.9rem] leading-relaxed text-[#596174] sm:text-[.96rem]">
                {convention.descrizione ||
                  "Seleziona i libri o i bundle disponibili per il tuo percorso di studi e invia la richiesta di adesione."}
              </p>
              {convention.partner ? (
                <p className="mt-2 text-[.72rem] font-semibold text-[#7B8290]">
                  In collaborazione con {convention.partner}
                </p>
              ) : null}
            </div>

            <div className="md:text-right">
              {data.activeRound ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(14,31,107,.12)] bg-white px-3.5 py-2 text-[.72rem] font-semibold text-[#344363]">
                  <CalendarDays size={14} className="text-[#2E4080]" />
                  {formatRoundDate(data.activeRound.starts_at)} – {formatRoundDate(data.activeRound.ends_at)}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E7D7B5] bg-[#FFF9ED] px-3.5 py-2 text-[.72rem] font-semibold text-[#73551A]">
                  <CalendarDays size={14} />
                  Nessun periodo attivo
                </div>
              )}
            </div>
          </header>

          <div className="mt-6 space-y-3">
            {successMessage ? (
              <Alert className="rounded-2xl border-[#CFE6D6] bg-[#F2FAF4] p-4 text-[#145C31]">
                <CheckCircle2 size={18} />
                <AlertTitle>Adesione completata</AlertTitle>
                <AlertDescription className="text-[#477257]">{successMessage}</AlertDescription>
              </Alert>
            ) : null}

            {activeAdhesion && !successMessage ? (
              <Alert className="rounded-2xl border-[#CFE6D6] bg-[#F2FAF4] p-4 text-[#145C31]">
                <CheckCircle2 size={18} />
                <AlertTitle>Adesione già registrata</AlertTitle>
                <AlertDescription className="text-[#477257]">
                  Hai già aderito per il periodo attivo. Puoi consultare qui sotto il catalogo e il riepilogo della richiesta.
                </AlertDescription>
              </Alert>
            ) : null}

            {!data.canAdhere && !activeAdhesion ? (
              <Alert className="rounded-2xl border-[#E7D7B5] bg-[#FFF9ED] p-4 text-[#73551A]">
                <CircleAlert size={18} />
                <AlertTitle>Adesioni non aperte</AlertTitle>
                <AlertDescription className="text-[#806934]">
                  Il catalogo resta consultabile, ma al momento non è possibile selezionare o inviare una richiesta.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          {catalog.length === 0 ? (
            <div className="mt-8 rounded-[1.5rem] border border-dashed border-[rgba(14,31,107,.18)] bg-white px-5 py-14 text-center">
              <p className="text-[.9rem] font-bold text-[#344363]">Nessun libro disponibile</p>
              <p className="mt-1 text-[.78rem] text-[#7B8290]">
                Il catalogo della convenzione non contiene ancora elementi attivi.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
              <div className="min-w-0">
                <div className="md:hidden">
                  <label htmlFor="study-area" className="mb-1.5 block text-[.7rem] font-bold text-[#344363]">
                    Area di studio
                  </label>
                  <select
                    id="study-area"
                    value={activeArea}
                    onChange={(event) => setActiveArea(event.target.value as StudyArea)}
                    className="h-12 w-full rounded-xl border border-[rgba(14,31,107,.14)] bg-white px-3.5 text-[.82rem] font-semibold text-[#08102A] outline-none focus:border-[#1A3399] focus:ring-3 focus:ring-[#1A3399]/10"
                  >
                    {STUDY_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {STUDY_AREA_LABELS[area]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hidden grid-cols-3 gap-2 rounded-2xl border border-[rgba(14,31,107,.09)] bg-white p-1.5 md:grid">
                  {STUDY_AREAS.map((area) => {
                    const active = activeArea === area;
                    const count = catalog.filter((product) => product.study_area === area).length;

                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setActiveArea(area)}
                        aria-pressed={active}
                        className={`min-h-11 rounded-xl px-3 py-2 text-[.73rem] leading-snug font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3399]/20 ${
                          active
                            ? "bg-[#0E1F6B] text-white shadow-[0_5px_14px_rgba(14,31,107,.16)]"
                            : "text-[#596174] hover:bg-[#F1F3F8] hover:text-[#0E1F6B]"
                        }`}
                      >
                        {STUDY_AREA_LABELS[area]}
                        <span className={`ml-1.5 text-[.62rem] ${active ? "text-white/65" : "text-[#A0A6B2]"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex gap-1 overflow-x-auto border-b border-[rgba(14,31,107,.1)] pb-px">
                  {BOOK_YEARS.map((year) => {
                    const active = activeYear === year;
                    const count = catalog.filter(
                      (product) =>
                        product.study_area === activeArea && product.reference_year === year
                    ).length;

                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => setActiveYear(year)}
                        aria-pressed={active}
                        className={`relative shrink-0 px-3 py-3 text-[.76rem] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3399]/20 ${
                          active ? "text-[#0E1F6B]" : "text-[#7B8290] hover:text-[#344363]"
                        }`}
                      >
                        {BOOK_YEAR_LABELS[year]}
                        <span className="ml-1 text-[.62rem] text-[#A0A6B2]">{count}</span>
                        {active ? (
                          <span className="absolute inset-x-2 bottom-[-1px] h-0.5 rounded-full bg-[#0E1F6B]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[.66rem] font-bold uppercase tracking-[.16em] text-[#2E4080]">
                      {STUDY_AREA_LABELS[activeArea]}
                    </p>
                    <h2
                      className="mt-1 text-[1.65rem] leading-tight font-bold text-[#08102A]"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {BOOK_YEAR_LABELS[activeYear]}
                    </h2>
                  </div>
                  <p className="shrink-0 text-[.7rem] font-semibold text-[#8A909D]">
                    {visibleProducts.length} {visibleProducts.length === 1 ? "proposta" : "proposte"}
                  </p>
                </div>

                {visibleProducts.length > 0 ? (
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
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
                  <div className="mt-4 rounded-[1.35rem] border border-dashed border-[rgba(14,31,107,.16)] bg-white px-5 py-10 text-center">
                    <p className="text-[.82rem] font-semibold text-[#596174]">
                      Nessuna proposta per quest’anno
                    </p>
                    <p className="mt-1 text-[.72rem] text-[#8A909D]">
                      Seleziona un altro anno o un’altra area di studio.
                    </p>
                  </div>
                )}
              </div>

              <OrderSummary
                products={selectedProducts}
                total={total}
                canAdhere={canAdhere}
                activeAdhesion={activeAdhesion}
                onRemove={toggleProduct}
                onProceed={() => setDialogOpen(true)}
              />
            </div>
          )}
        </div>
      </section>

      {data.activeRound ? (
        <AdhesionDialog
          open={dialogOpen}
          conventionId={convention.id}
          roundId={data.activeRound.id}
          products={selectedProducts}
          total={total}
          profile={data.profile}
          initialFiscalCodeOrVat={data.latestAdhesion?.fiscal_code_or_vat}
          initialAddress={data.latestAdhesion?.billing_shipping_address}
          onClose={() => setDialogOpen(false)}
          onCompleted={handleCompleted}
          onUnauthorized={goToLogin}
        />
      ) : null}

    </main>
  );
}
