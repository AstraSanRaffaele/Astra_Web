import {
  BOOK_YEAR_LABELS,
  DELIVERY_MODE_LABELS,
  PAYMENT_METHOD_LABELS,
  type BookConventionAdhesion,
  type BookConventionRound,
  type BookConventionSummary,
  type PaymentMethod,
} from "@/lib/book-convention";
import styles from "./active-adhesions-panel.module.css";

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
      className={styles.section}
      aria-labelledby="registered-book-adhesions-title"
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              Storico personale
            </p>
            <h2
              id="registered-book-adhesions-title"
              className={styles.title}
            >
              Le tue adesioni registrate
            </h2>
          </div>
          <p className={styles.count}>
            {displayedAdhesions.length}{" "}
            {displayedAdhesions.length === 1 ? "adesione disponibile" : "adesioni disponibili"}
          </p>
        </header>

        <div className={styles.adhesionList}>
          {displayedAdhesions.map(({ adhesion, current }) => {
            const round = rounds.find((item) => item.id === adhesion.round_id);
            const convention = conventions.find(
              (item) => item.id === adhesion.convention_id
            );
            const products = adhesion.selected_books ?? [];
            const productCount =
              products.length || adhesion.selected_book_ids?.length || 0;

            return (
              <details key={adhesion.id} className={styles.adhesion}>
                <summary className={styles.summary}>
                  <span className={styles.summaryMain}>
                    <span className={styles.summaryTitleRow}>
                      <strong className={styles.conventionTitle}>
                        {convention?.titolo || "Convenzione libri"}
                      </strong>
                      <span
                        className={`${styles.statusBadge} ${
                          current
                            ? styles.currentBadge
                            : styles.historicalBadge
                        }`}
                      >
                        {current ? "Raccolta corrente" : "Ultima precedente"}
                      </span>
                    </span>
                    <span className={styles.summaryMeta}>
                      {BOOK_YEAR_LABELS[adhesion.selected_year]} · Inviata il{" "}
                      {formatDateTime(adhesion.created_at)} · {productCount}{" "}
                      {productCount === 1 ? "prodotto" : "prodotti"}
                    </span>
                  </span>

                  <span className={styles.summaryPrice}>
                    <strong className={styles.summaryTotal}>
                      {formatPrice(adhesion.total_price)}
                    </strong>
                    <span className={styles.detailsLabel}>
                      Dettagli
                      <span
                        aria-hidden="true"
                        className={styles.chevron}
                      >
                        ↓
                      </span>
                    </span>
                  </span>
                </summary>

                <div className={styles.detailsBody}>
                  <div className={styles.detailsGrid}>
                    <div className={styles.productsColumn}>
                      <h3 className={styles.sectionTitle}>
                        Prodotti
                      </h3>

                      {products.length > 0 ? (
                        <ul className={styles.productList}>
                          {products.map((product, index) => (
                            <li
                              key={`${adhesion.id}-${product.id ?? "snapshot"}-${index}`}
                              className={styles.productItem}
                            >
                              <div className={styles.productInfo}>
                                <p className={styles.productTitle}>
                                  {product.title || `Prodotto ${index + 1}`}
                                </p>
                                {product.reference_year ? (
                                  <p className={styles.productYear}>
                                    {BOOK_YEAR_LABELS[product.reference_year]}
                                  </p>
                                ) : null}
                                {product.bundle_items?.length ? (
                                  <p className={styles.bundleContents}>
                                    <span className={styles.bundleLabel}>Include: </span>
                                    {product.bundle_items
                                      .map((item) => item.title)
                                      .join(", ")}
                                  </p>
                                ) : null}
                              </div>
                              <strong className={styles.productPrice}>
                                {formatPrice(product.price)}
                              </strong>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={styles.productsFallback}>
                          {adhesion.selected_book_ids?.length
                            ? `${adhesion.selected_book_ids.length} prodotti registrati. Il dettaglio non è disponibile per questa adesione storica.`
                            : "Il dettaglio dei prodotti non è disponibile per questa adesione storica."}
                        </p>
                      )}
                    </div>

                    <dl className={styles.dataList}>
                      <div className={styles.dataRow}>
                        <dt className={styles.dataTerm}>Periodo</dt>
                        <dd className={styles.dataValue}>
                          {formatRound(round)}
                        </dd>
                      </div>
                      <div className={styles.dataRow}>
                        <dt className={styles.dataTerm}>Consegna</dt>
                        <dd className={styles.dataValue}>
                          {round ? DELIVERY_MODE_LABELS[round.delivery_mode] : "Non indicata"}
                        </dd>
                      </div>
                      <div className={styles.dataRow}>
                        <dt className={styles.dataTerm}>Pagamento</dt>
                        <dd className={`${styles.dataValue} ${styles.capitalize}`}>
                          {formatPaymentMethod(adhesion.payment_method)}
                        </dd>
                      </div>
                      {adhesion.fiscal_code_or_vat ? (
                        <div className={styles.dataRow}>
                          <dt className={styles.dataTerm}>CF / P. IVA</dt>
                          <dd className={`${styles.dataValue} ${styles.breakAll}`}>
                            {adhesion.fiscal_code_or_vat}
                          </dd>
                        </div>
                      ) : null}
                      {adhesion.billing_shipping_address ? (
                        <div className={styles.addressRow}>
                          <dt className={styles.dataTerm}>Indirizzo</dt>
                          <dd className={styles.address}>
                            {adhesion.billing_shipping_address}
                          </dd>
                        </div>
                      ) : null}
                      <div className={styles.totalRow}>
                        <dt className={styles.totalTerm}>Totale</dt>
                        <dd className={styles.totalValue}>
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
