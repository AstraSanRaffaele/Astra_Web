import {
  BOOK_YEAR_LABELS,
  DELIVERY_MODE_LABELS,
  PAYMENT_METHOD_LABELS,
  type BookConventionAdhesion,
  type BookConventionRound,
  type BookConventionSummary,
  type PaymentMethod,
} from "@/lib/book-convention";

function formatPrice(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Data non disponibile";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(date);
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(date);
}

function formatRound(round: BookConventionRound | undefined) {
  if (!round) return "Periodo non disponibile";

  const start = formatShortDate(round.starts_at);
  const endDate = new Date(round.ends_at);
  const end =
    Number.isFinite(endDate.getTime()) && endDate.getUTCFullYear() < 9000
      ? formatShortDate(round.ends_at)
      : null;

  if (!start) return "Periodo non disponibile";
  return end ? `Dal ${start} al ${end}` : `Dal ${start}`;
}

function formatPaymentMethod(value: string | null) {
  if (!value) return "Non indicato";

  if (Object.prototype.hasOwnProperty.call(PAYMENT_METHOD_LABELS, value)) {
    return PAYMENT_METHOD_LABELS[value as PaymentMethod];
  }

  return value.replaceAll("_", " ");
}

export default function ActiveAdhesionsPanel({
  activeAdhesions,
  latestAdhesion,
  rounds,
  conventions,
}: {
  activeAdhesions: BookConventionAdhesion[];
  latestAdhesion?: BookConventionAdhesion | null;
  rounds: BookConventionRound[];
  conventions: BookConventionSummary[];
}) {
  const activeIds = new Set(activeAdhesions.map((adhesion) => adhesion.id));
  const displayedAdhesions = [
    ...activeAdhesions.map((adhesion) => ({ adhesion, current: true })),
    ...(latestAdhesion && !activeIds.has(latestAdhesion.id)
      ? [{ adhesion: latestAdhesion, current: false }]
      : []),
  ];

  if (displayedAdhesions.length === 0) return null;

  return (
    <section
      className="book-shell mt-3 px-5 md:px-12"
      aria-labelledby="registered-book-adhesions-title"
    >
      <div className="overflow-hidden rounded-[1.35rem] border border-[rgba(14,31,107,.1)] bg-white shadow-[0_5px_20px_rgba(8,16,42,.045)]">
        <header className="flex flex-col gap-1 border-b border-[rgba(14,31,107,.08)] bg-[#FBFCFE] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-[.61rem] font-bold uppercase tracking-[.15em] text-[#2E4080]">
              Storico personale
            </p>
            <h2
              id="registered-book-adhesions-title"
              className="mt-0.5 text-[.9rem] font-bold text-[#08102A]"
            >
              Le tue adesioni registrate
            </h2>
          </div>
          <p className="text-[.68rem] text-[#697083]">
            {displayedAdhesions.length}{" "}
            {displayedAdhesions.length === 1 ? "adesione disponibile" : "adesioni disponibili"}
          </p>
        </header>

        <div className="divide-y divide-[rgba(14,31,107,.08)]">
          {displayedAdhesions.map(({ adhesion, current }) => {
            const round = rounds.find((item) => item.id === adhesion.round_id);
            const convention = conventions.find(
              (item) => item.id === adhesion.convention_id
            );
            const products = adhesion.selected_books ?? [];
            const productCount =
              products.length || adhesion.selected_book_ids?.length || 0;

            return (
              <details key={adhesion.id} className="group">
                <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 outline-none transition hover:bg-[#FAFBFD] focus-visible:bg-[#F4F6FB] focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#1A3399]/15 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="truncate text-[.78rem] text-[#08102A]">
                        {convention?.titolo || "Convenzione libri"}
                      </strong>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[.57rem] font-bold uppercase tracking-[.07em] ${
                          current
                            ? "bg-[#EAF7EE] text-[#166534]"
                            : "bg-[#EEF1F8] text-[#596174]"
                        }`}
                      >
                        {current ? "Raccolta corrente" : "Ultima precedente"}
                      </span>
                    </span>
                    <span className="mt-1 block text-[.66rem] text-[#697083]">
                      Inviata il {formatDateTime(adhesion.created_at)} · {productCount}{" "}
                      {productCount === 1 ? "prodotto" : "prodotti"}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <strong className="block text-[.82rem] text-[#1E347D]">
                      {formatPrice(adhesion.total_price)}
                    </strong>
                    <span className="mt-0.5 block text-[.61rem] font-semibold text-[#697083]">
                      Dettagli
                      <span
                        aria-hidden="true"
                        className="ml-1 inline-block transition-transform group-open:rotate-180"
                      >
                        ↓
                      </span>
                    </span>
                  </span>
                </summary>

                <div className="border-t border-[rgba(14,31,107,.06)] bg-[#FCFCFD] px-4 py-4 sm:px-5">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(15rem,.8fr)]">
                    <div className="min-w-0">
                      <h3 className="text-[.68rem] font-bold uppercase tracking-[.11em] text-[#2E4080]">
                        Prodotti
                      </h3>

                      {products.length > 0 ? (
                        <ul className="mt-2 divide-y divide-[rgba(14,31,107,.07)] rounded-xl border border-[rgba(14,31,107,.08)] bg-white px-3.5">
                          {products.map((product, index) => (
                            <li
                              key={`${adhesion.id}-${product.id ?? "snapshot"}-${index}`}
                              className="flex items-start justify-between gap-4 py-3"
                            >
                              <div className="min-w-0">
                                <p className="text-[.73rem] leading-snug font-semibold text-[#08102A]">
                                  {product.title || `Prodotto ${index + 1}`}
                                </p>
                                {product.reference_year ? (
                                  <p className="mt-0.5 text-[.61rem] text-[#697083]">
                                    {BOOK_YEAR_LABELS[product.reference_year]}
                                  </p>
                                ) : null}
                                {product.bundle_items?.length ? (
                                  <p className="mt-1 text-[.63rem] leading-relaxed text-[#697083]">
                                    <span className="font-semibold text-[#4E586F]">Include: </span>
                                    {product.bundle_items
                                      .map((item) => item.title)
                                      .join(", ")}
                                  </p>
                                ) : null}
                              </div>
                              <strong className="shrink-0 text-[.72rem] text-[#24304B]">
                                {formatPrice(product.price)}
                              </strong>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 rounded-xl border border-dashed border-[rgba(14,31,107,.13)] bg-white p-3.5 text-[.7rem] leading-relaxed text-[#697083]">
                          {adhesion.selected_book_ids?.length
                            ? `${adhesion.selected_book_ids.length} prodotti registrati. Il dettaglio non è disponibile per questa adesione storica.`
                            : "Il dettaglio dei prodotti non è disponibile per questa adesione storica."}
                        </p>
                      )}
                    </div>

                    <dl className="grid content-start gap-2 rounded-xl border border-[rgba(14,31,107,.08)] bg-white p-3.5 text-[.68rem]">
                      <div className="flex justify-between gap-4">
                        <dt className="font-semibold text-[#697083]">Periodo</dt>
                        <dd className="text-right font-semibold text-[#24304B]">
                          {formatRound(round)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-semibold text-[#697083]">Consegna</dt>
                        <dd className="text-right font-semibold text-[#24304B]">
                          {round ? DELIVERY_MODE_LABELS[round.delivery_mode] : "Non indicata"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-semibold text-[#697083]">Pagamento</dt>
                        <dd className="text-right font-semibold capitalize text-[#24304B]">
                          {formatPaymentMethod(adhesion.payment_method)}
                        </dd>
                      </div>
                      {adhesion.fiscal_code_or_vat ? (
                        <div className="flex justify-between gap-4">
                          <dt className="font-semibold text-[#697083]">CF / P. IVA</dt>
                          <dd className="break-all text-right font-semibold text-[#24304B]">
                            {adhesion.fiscal_code_or_vat}
                          </dd>
                        </div>
                      ) : null}
                      {adhesion.billing_shipping_address ? (
                        <div className="border-t border-[rgba(14,31,107,.07)] pt-2">
                          <dt className="font-semibold text-[#697083]">Indirizzo</dt>
                          <dd className="mt-1 whitespace-pre-line leading-relaxed font-semibold text-[#24304B]">
                            {adhesion.billing_shipping_address}
                          </dd>
                        </div>
                      ) : null}
                      <div className="mt-1 flex items-end justify-between gap-4 border-t border-[rgba(14,31,107,.08)] pt-2.5">
                        <dt className="font-bold text-[#596174]">Totale</dt>
                        <dd className="text-[.9rem] font-extrabold text-[#08102A]">
                          {formatPrice(adhesion.total_price)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
