"use client";

import { useEffect, type ReactElement, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  CreditCard,
  Mail,
  MapPin,
  Package,
  ReceiptText,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import {
  BOOK_YEAR_LABELS,
  PRODUCT_TYPE_LABELS,
  STUDY_AREA_LABELS,
} from "@/lib/book-convention";
import {
  formatDate,
  formatDeliveryMode,
  formatPaymentMethod,
  formatPrice,
  formatRoundLabel,
  getAdhesionConventionTitle,
  getAdhesionOriginalTotal,
  getAdhesionSavings,
  getAdhesionTotal,
  getFullName,
  getProfileCourse,
  getProfileEmail,
  getProfileYear,
  getProductSavings,
  getSelectedProducts,
  shortenId,
} from "./adhesion-utils";
import styles from "./adhesion-detail-dialog.module.css";
import type {
  AdminBookAdhesion,
  AdminBookConventionProduct,
} from "./types";

type AdhesionDetailDialogProps = {
  adhesion: AdminBookAdhesion;
  catalog: AdminBookConventionProduct[];
  onClose: () => void;
};

export default function AdhesionDetailDialog({
  adhesion,
  catalog,
  onClose,
}: AdhesionDetailDialogProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const products = getSelectedProducts(adhesion, catalog);
  const total = getAdhesionTotal(adhesion, catalog);
  const originalTotal = getAdhesionOriginalTotal(adhesion, catalog);
  const savings = getAdhesionSavings(adhesion, catalog);
  const deliveryMode = adhesion.book_convention_rounds?.delivery_mode;
  const email = getProfileEmail(adhesion.profiles);

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="adhesion-detail-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <span className={styles.mobileHandle} aria-hidden="true" />

        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>Dettaglio adesione</p>
            <h2 id="adhesion-detail-title" className={styles.title}>
              {getFullName(adhesion.profiles)}
            </h2>
            <p className={styles.idLine} title={adhesion.id}>
              ID {shortenId(adhesion.id)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Chiudi dettaglio"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.scrollRegion}>
          <div className={styles.columns}>
            <div className={styles.detailsColumn}>
              <DetailSection icon={<UserRound />} title="Utente">
                <DetailRow
                  label="Nome e cognome"
                  value={getFullName(adhesion.profiles)}
                />
                <DetailRow
                  label="Email"
                  value={
                    email === "—" ? (
                      "—"
                    ) : (
                      <a className={styles.inlineLink} href={`mailto:${email}`}>
                        {email}
                      </a>
                    )
                  }
                />
                <DetailRow
                  label="Corso"
                  value={getProfileCourse(adhesion.profiles)}
                />
                <DetailRow
                  label="Anno"
                  value={String(getProfileYear(adhesion.profiles))}
                />
                <DetailRow
                  label="ID utente"
                  value={<span className={styles.monospace}>{adhesion.user_id}</span>}
                />
              </DetailSection>

              <DetailSection
                icon={<ReceiptText />}
                title="Fatturazione e spedizione"
              >
                <DetailRow
                  label="CF / Partita IVA"
                  value={adhesion.fiscal_code_or_vat || "—"}
                />
                <DetailRow
                  label="Consegna"
                  value={formatDeliveryMode(deliveryMode)}
                />
                <DetailRow
                  label={
                    deliveryMode === "home" ? "Indirizzo domicilio" : "Indirizzo"
                  }
                  value={
                    <span className={styles.multiline}>
                      {adhesion.billing_shipping_address ||
                        (deliveryMode === "university" ? "Non richiesto" : "—")}
                    </span>
                  }
                />
              </DetailSection>

              <DetailSection icon={<CalendarDays />} title="Registrazione">
                <DetailRow
                  label="Data adesione"
                  value={formatDate(adhesion.created_at)}
                />
                <DetailRow
                  label="Convenzione"
                  value={getAdhesionConventionTitle(adhesion)}
                />
                <DetailRow
                  label="Raccolta"
                  value={formatRoundLabel(adhesion.book_convention_rounds)}
                />
              </DetailSection>
            </div>

            <div className={styles.orderColumn}>
              <section className={styles.productsPanel}>
                <div className={styles.productsHeader}>
                  <div>
                    <BookOpen size={17} aria-hidden="true" />
                    <strong>Prodotti selezionati</strong>
                  </div>
                  <span>
                    {products.length}{" "}
                    {products.length === 1 ? "proposta" : "proposte"}
                  </span>
                </div>

                {products.length === 0 ? (
                  <p className={styles.emptyProducts}>
                    Nessun prodotto salvato nello snapshot.
                  </p>
                ) : (
                  <div className={styles.productList}>
                    {products.map((product, index) => (
                      <article
                        key={`${product.id ?? product.title}-${index}`}
                        className={styles.product}
                      >
                        <div className={styles.productMain}>
                          <span
                            className={styles.cover}
                            style={
                              product.cover_image
                                ? {
                                    backgroundImage: `url(${JSON.stringify(
                                      product.cover_image
                                    )})`,
                                  }
                                : undefined
                            }
                            role={product.cover_image ? "img" : undefined}
                            aria-label={
                              product.cover_image
                                ? `Copertina di ${product.title}`
                                : undefined
                            }
                          >
                            {!product.cover_image ? (
                              product.product_type === "bundle" ? (
                                <Package
                                  size={20}
                                  strokeWidth={1.7}
                                  aria-hidden="true"
                                />
                              ) : (
                                <BookOpen
                                  size={20}
                                  strokeWidth={1.7}
                                  aria-hidden="true"
                                />
                              )
                            ) : null}
                          </span>

                          <div className={styles.productInfo}>
                            <div className={styles.productTopline}>
                              <div className={styles.productCopy}>
                                <div className={styles.productMeta}>
                                  <span className={styles.typeBadge}>
                                    {PRODUCT_TYPE_LABELS[product.product_type]}
                                  </span>
                                  {product.reference_year ? (
                                    <span>
                                      {BOOK_YEAR_LABELS[product.reference_year]}
                                    </span>
                                  ) : null}
                                </div>
                                <h3>{product.title}</h3>
                                {product.study_area ? (
                                  <p>
                                    {STUDY_AREA_LABELS[product.study_area]}
                                  </p>
                                ) : null}
                              </div>

                              <div className={styles.productPrice}>
                                {product.original_price !== null ? (
                                  <span>
                                    {formatPrice(product.original_price)}
                                  </span>
                                ) : null}
                                <strong>{formatPrice(product.price)}</strong>
                              </div>
                            </div>

                            <div className={styles.productDetails}>
                              {product.isbn ? (
                                <span className={styles.isbn}>
                                  {product.product_type === "bundle"
                                    ? "ISBN generale bundle"
                                    : "ISBN"}{" "}
                                  {product.isbn}
                                </span>
                              ) : null}
                              {getProductSavings(product) > 0 ? (
                                <span className={styles.savingBadge}>
                                  Risparmio{" "}
                                  {formatPrice(getProductSavings(product))}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {product.product_type === "bundle" &&
                        product.bundle_items.length > 0 ? (
                          <div className={styles.bundleBox}>
                            <p>
                              <Package size={14} aria-hidden="true" /> Elementi
                              inclusi
                            </p>
                            <ul>
                              {product.bundle_items.map((item, itemIndex) => (
                                <li
                                  key={`${item.title}-${
                                    item.isbn ?? "no-isbn"
                                  }-${itemIndex}`}
                                >
                                  <span>{item.title}</span>
                                  {item.isbn ? (
                                    <span className={styles.bundleIsbn}>
                                      ISBN {item.isbn}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}

                <div className={styles.totals}>
                  {originalTotal !== null ? (
                    <div className={styles.originalTotal}>
                      <span>Totale originale</span>
                      <span>{formatPrice(originalTotal)}</span>
                    </div>
                  ) : null}
                  {savings > 0 ? (
                    <div className={styles.savingsTotal}>
                      <span>Risparmio convenzione</span>
                      <span>− {formatPrice(savings)}</span>
                    </div>
                  ) : null}
                  <div className={styles.finalTotal}>
                    <span>Totale convenzionato</span>
                    <strong>{formatPrice(total)}</strong>
                  </div>
                </div>
              </section>

              <div className={styles.secondaryPanels}>
                <DetailSection icon={<Truck />} title="Consegna">
                  <DetailRow
                    label="Modalità"
                    value={formatDeliveryMode(deliveryMode)}
                  />
                  <p className={styles.deliveryInfo}>
                    {deliveryMode === "home"
                      ? "L’ordine deve essere spedito all’indirizzo indicato dall’utente."
                      : deliveryMode === "university"
                        ? "L’ordine sarà consegnato presso l’università: l’indirizzo di domicilio non è richiesto."
                        : "La modalità di consegna non è presente nello snapshot della raccolta."}
                  </p>
                </DetailSection>

                <DetailSection icon={<CreditCard />} title="Pagamento">
                  <DetailRow
                    label="Metodo"
                    value={formatPaymentMethod(adhesion.payment_method)}
                  />
                  <p className={styles.paymentInfo}>
                    Il metodo indica la scelta effettuata dall’utente. Il
                    database non contiene uno stato di incasso.
                  </p>
                </DetailSection>
              </div>

              <div className={styles.actions}>
                {email !== "—" ? (
                  <a href={`mailto:${email}`} className={styles.primaryAction}>
                    <Mail size={17} aria-hidden="true" /> Scrivi all’utente
                  </a>
                ) : null}
                {adhesion.billing_shipping_address ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      adhesion.billing_shipping_address
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.secondaryAction}
                  >
                    <MapPin size={17} aria-hidden="true" /> Apri indirizzo
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: ReactElement;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.detailSection}>
      <h3>
        {icon}
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.detailRow}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
