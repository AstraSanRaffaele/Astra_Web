"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Package,
  ReceiptText,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import {
  BOOK_CONVENTION_BANK_DETAILS,
  BOOK_YEAR_LABELS,
  DELIVERY_MODE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type BookBundleItem,
  type BookConventionCatalogBook,
  type BookConventionSubmitResponse,
  type BookYear,
  type DeliveryMode,
  type PaymentMethod,
} from "@/lib/book-convention";
import styles from "./adhesion-dialog.module.css";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function getOriginalPrice(product: BookConventionCatalogBook) {
  if (
    typeof product.price !== "number" ||
    !Number.isFinite(product.price) ||
    typeof product.original_price !== "number" ||
    !Number.isFinite(product.original_price) ||
    product.original_price <= product.price
  ) {
    return null;
  }

  return product.original_price;
}

function BundleItemsSummary({ items }: { items: BookBundleItem[] }) {
  if (items.length === 0) return null;

  return (
    <ul className={styles.bundleItems}>
      {items.map((item, index) => (
        <li key={`${index}-${item.title}-${item.isbn ?? ""}`}>
          <span>{item.title}</span>
          {item.isbn ? (
            <span className={styles.bundleIsbn}> · ISBN {item.isbn}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(
    (element) =>
      element.getClientRects().length > 0 &&
      element.getAttribute("aria-hidden") !== "true"
  );
}

export default function AdhesionDialog({
  open,
  products,
  total,
  profile,
  initialFiscalCodeOrVat,
  initialAddress,
  onClose,
  onCompleted,
  onUnauthorized,
}: {
  open: boolean;
  products: BookConventionCatalogBook[];
  total: number;
  profile?: { firstName: string; lastName: string; email: string };
  initialFiscalCodeOrVat?: string | null;
  initialAddress?: string | null;
  onClose: () => void;
  onCompleted: (message: string) => void;
  onUnauthorized: () => void;
}) {
  const [fiscalCodeOrVat, setFiscalCodeOrVat] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("contanti");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const submittingRef = useRef(submitting);
  const submissionGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        conventionId: number;
        roundId: string;
        selectedYear: BookYear;
        deliveryMode: DeliveryMode;
        products: BookConventionCatalogBook[];
      }
    >();

    for (const product of products) {
      if (!product.active_round_id || !product.delivery_mode) continue;

      const key = `${product.convention_id}:${product.active_round_id}:${product.reference_year}`;
      const current = groups.get(key);

      if (current) {
        current.products.push(product);
      } else {
        groups.set(key, {
          conventionId: product.convention_id,
          roundId: product.active_round_id,
          selectedYear: product.reference_year,
          deliveryMode: product.delivery_mode,
          products: [product],
        });
      }
    }

    return Array.from(groups.values());
  }, [products]);
  const deliveryModes = useMemo(
    () =>
      Array.from(
        new Set(submissionGroups.map((group) => group.deliveryMode))
      ),
    [submissionGroups]
  );
  const requiresAddress = deliveryModes.includes("home");
  const deliverySummary =
    deliveryModes.length === 1
      ? DELIVERY_MODE_LABELS[deliveryModes[0]]
      : "Consegna in università e a domicilio";

  onCloseRef.current = onClose;
  submittingRef.current = submitting;

  useEffect(() => {
    if (!open) return;

    setFiscalCodeOrVat(initialFiscalCodeOrVat ?? "");
    setAddress(requiresAddress ? initialAddress ?? "" : "");
    setPaymentMethod("contanti");
    setConfirmed(false);
    setError("");
  }, [initialAddress, initialFiscalCodeOrVat, open, requiresAddress]);

  useEffect(() => {
    if (!open) return;

    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const inertedElements: Array<{ element: HTMLElement; inert: boolean }> = [];

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    if (overlay) {
      let currentElement: HTMLElement = overlay;

      while (currentElement.parentElement) {
        const parent = currentElement.parentElement;

        Array.from(parent.children).forEach((sibling) => {
          if (
            sibling === currentElement ||
            !(sibling instanceof HTMLElement)
          ) {
            return;
          }

          inertedElements.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        });

        if (parent === document.body) break;
        currentElement = parent;
      }
    }

    const focusFrame = window.requestAnimationFrame(() => {
      dialog?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!submittingRef.current) onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = getFocusableElements(dialogRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!dialogRef.current.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (
        event.shiftKey &&
        (activeElement === firstElement || activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      inertedElements.forEach(({ element, inert }) => {
        element.inert = inert;
      });

      const previousActiveElement = previousActiveElementRef.current;
      window.requestAnimationFrame(() => {
        if (previousActiveElement?.isConnected) {
          previousActiveElement.focus({ preventScroll: true });
        }
      });
    };
  }, [open]);

  useEffect(() => {
    if (!open || !error) return;

    const frame = window.requestAnimationFrame(() => {
      errorRef.current?.focus({ preventScroll: true });
      errorRef.current?.scrollIntoView({ block: "nearest" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [error, open]);

  if (!open) return null;

  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ");
  const originalTotal = products.reduce((sum, product) => {
    return sum + (getOriginalPrice(product) ?? product.price ?? 0);
  }, 0);
  const totalSaving = Math.max(0, originalTotal - total);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError("");

    const normalizedFiscalCode = fiscalCodeOrVat
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (!/^[A-Z0-9]{11,20}$/.test(normalizedFiscalCode)) {
      setError("Inserisci un codice fiscale o una partita IVA validi.");
      return;
    }

    if (requiresAddress && address.trim().length < 8) {
      setError("Inserisci un indirizzo di spedizione/fatturazione completo.");
      return;
    }

    if (
      submissionGroups.length === 0 ||
      submissionGroups.reduce(
        (count, group) => count + group.products.length,
        0
      ) !== products.length
    ) {
      setError(
        "Una o più proposte non sono più collegate a una raccolta attiva. Aggiorna la pagina e riprova."
      );
      return;
    }

    if (!confirmed) {
      setError(
        "Conferma i dati e la volontà di aderire prima di continuare."
      );
      return;
    }

    setSubmitting(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch("/api/book-convention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          submissions: submissionGroups.map((group) => ({
            convention_id: group.conventionId,
            round_id: group.roundId,
            selected_year: group.selectedYear,
            selected_book_ids: group.products.map((product) => product.id),
          })),
          payment_method: paymentMethod,
          fiscal_code_or_vat: normalizedFiscalCode,
          billing_shipping_address: requiresAddress ? address.trim() : null,
        }),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const payload = (await response.json().catch(
        () => ({})
      )) as BookConventionSubmitResponse;

      if (!response.ok) {
        throw new Error(
          payload.error || "Non è stato possibile completare le adesioni."
        );
      }

      const completedGroups =
        payload.adhesionIds?.length ?? submissionGroups.length;
      const confirmationEmailSent = payload.emailSent === true;
      const message =
        submissionGroups.length > 1
          ? `${completedGroups} adesioni registrate correttamente.${
              confirmationEmailSent
                ? " Controlla la mail per i riepiloghi."
                : ""
            }`
          : confirmationEmailSent
            ? "Adesione registrata correttamente. Ti abbiamo inviato una mail di conferma."
            : "Adesione registrata correttamente.";

      onCompleted(message);
    } catch (submitError) {
      setError(
        submitError instanceof DOMException && submitError.name === "AbortError"
          ? "La conferma sta impiegando troppo tempo. Riprova: un ordine già registrato non verrà duplicato."
          : submitError instanceof Error
            ? submitError.message
            : "Errore di connessione. Controlla la rete e riprova."
      );
    } finally {
      window.clearTimeout(timeoutId);
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adhesion-dialog-title"
        aria-describedby="adhesion-dialog-description"
        aria-busy={submitting}
        tabIndex={-1}
        className={styles.dialog}
      >
        <span className={styles.mobileHandle} aria-hidden="true" />

        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>Checkout · Convenzioni Libri</p>
            <h2 id="adhesion-dialog-title" className={styles.title}>
              Completa la tua adesione
            </h2>
            <p id="adhesion-dialog-description" className={styles.subtitle}>
              Verifica i dati, scegli il pagamento e conferma la selezione.
            </p>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.headerTotal}>
              <span>Totale</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={styles.closeButton}
              aria-label="Chiudi il modulo di adesione"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.scrollRegion}>
            <div className={styles.contentGrid}>
              <div className={styles.mainColumn}>
                <section
                  className={cx(styles.panel, styles.profilePanel)}
                  aria-labelledby="checkout-profile-title"
                >
                  <div className={styles.sectionHeading}>
                    <span className={styles.sectionIcon}>
                      <UserRound size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 id="checkout-profile-title">Il tuo profilo</h3>
                      <p>Dati recuperati dal tuo account ASTRA.</p>
                    </div>
                  </div>

                  <div className={styles.profileGrid}>
                    <div className={styles.profileDatum}>
                      <UserRound size={16} aria-hidden="true" />
                      <div>
                        <span>Nome e cognome</span>
                        <strong>{fullName || "Utente ASTRA"}</strong>
                      </div>
                    </div>
                    <div className={styles.profileDatum}>
                      <ReceiptText size={16} aria-hidden="true" />
                      <div>
                        <span>Email</span>
                        <strong>{profile?.email || "Email del profilo"}</strong>
                      </div>
                    </div>
                  </div>
                </section>

                <section
                  className={styles.panel}
                  aria-labelledby="checkout-billing-title"
                >
                  <div className={styles.sectionHeading}>
                    <span className={styles.sectionIcon}>
                      <MapPin size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 id="checkout-billing-title">
                        Fatturazione e consegna
                      </h3>
                      <p>
                        {requiresAddress
                          ? "Completa i dati richiesti per la consegna a domicilio."
                          : "Il ritiro è previsto direttamente in università."}
                      </p>
                    </div>
                  </div>

                  <div
                    className={cx(
                      styles.fieldGrid,
                      requiresAddress && styles.fieldGridWithAddress
                    )}
                  >
                    <label className={styles.field}>
                      <span>Codice fiscale o Partita IVA</span>
                      <input
                        type="text"
                        name="tax-id"
                        value={fiscalCodeOrVat}
                        onChange={(event) =>
                          setFiscalCodeOrVat(event.target.value.toUpperCase())
                        }
                        placeholder="RSSMRA00A00F205X"
                        autoComplete="off"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={24}
                        required
                        disabled={submitting}
                      />
                    </label>

                    {requiresAddress ? (
                      <label className={styles.field}>
                        <span>Indirizzo di spedizione/fatturazione</span>
                        <textarea
                          name="street-address"
                          value={address}
                          onChange={(event) => setAddress(event.target.value)}
                          placeholder="Via, numero civico, CAP, città e provincia"
                          autoComplete="street-address"
                          rows={3}
                          maxLength={1000}
                          required
                          disabled={submitting}
                        />
                      </label>
                    ) : (
                      <div className={styles.deliveryNotice}>
                        <MapPin size={18} aria-hidden="true" />
                        <div>
                          <strong>{deliverySummary}</strong>
                          <p>
                            Non serve un indirizzo. Riceverai le indicazioni per
                            il ritiro tramite i canali ASTRA.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section
                  className={styles.panel}
                  aria-labelledby="checkout-payment-title"
                >
                  <div className={styles.sectionHeading}>
                    <span className={styles.sectionIcon}>
                      <CreditCard size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 id="checkout-payment-title">Metodo di pagamento</h3>
                      <p>Scegli una delle modalità disponibili.</p>
                    </div>
                  </div>

                  <fieldset
                    disabled={submitting}
                    className={styles.paymentFieldset}
                  >
                    <legend>Metodo di pagamento</legend>
                    <div className={styles.paymentGrid}>
                      {PAYMENT_METHODS.map((method) => {
                        const checked = paymentMethod === method;

                        return (
                          <label
                            key={method}
                            className={cx(
                              styles.paymentOption,
                              checked && styles.paymentOptionSelected,
                              submitting && styles.controlDisabled
                            )}
                          >
                            <input
                              type="radio"
                              name="payment_method"
                              value={method}
                              checked={checked}
                              onChange={() => setPaymentMethod(method)}
                            />
                            <span>{PAYMENT_METHOD_LABELS[method]}</span>
                            {checked ? (
                              <CheckCircle2 size={17} aria-hidden="true" />
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {paymentMethod === "bonifico" ? (
                    <div className={styles.bankDetails}>
                      <Building2 size={19} aria-hidden="true" />
                      <div>
                        <strong>Coordinate per il bonifico</strong>
                        <p>
                          {BOOK_CONVENTION_BANK_DETAILS.bank}
                          <br />
                          IBAN: <b>{BOOK_CONVENTION_BANK_DETAILS.iban}</b>
                          <br />
                          Intestatario:{" "}
                          <b>{BOOK_CONVENTION_BANK_DETAILS.accountHolder}</b>
                        </p>
                      </div>
                    </div>
                  ) : null}
                </section>

                {error ? (
                  <div
                    ref={errorRef}
                    tabIndex={-1}
                    role="alert"
                    aria-live="assertive"
                    className={styles.errorAlert}
                  >
                    <strong>Impossibile continuare</strong>
                    <p>{error}</p>
                  </div>
                ) : null}
              </div>

              <aside className={styles.summaryColumn}>
                <section
                  className={styles.summaryCard}
                  aria-labelledby="checkout-order-title"
                >
                  <div className={styles.summaryHeader}>
                    <span className={styles.summaryHeaderIcon}>
                      <ShoppingBag size={17} aria-hidden="true" />
                    </span>
                    <div>
                      <span>Riepilogo ordine</span>
                      <h3 id="checkout-order-title">La tua selezione</h3>
                    </div>
                    <b>{products.length}</b>
                  </div>

                  <div className={styles.productList}>
                    {products.map((product) => {
                      const isBundle = product.product_type === "bundle";
                      const originalPrice = getOriginalPrice(product);

                      return (
                        <article
                          key={`${product.id}:${product.reference_year}`}
                          className={styles.productRow}
                        >
                          <div className={styles.productCopy}>
                            <div className={styles.productTitleRow}>
                              <span
                                className={cx(
                                  styles.productType,
                                  isBundle && styles.bundleType
                                )}
                              >
                                {isBundle ? (
                                  <Package size={12} aria-hidden="true" />
                                ) : (
                                  <BookOpen size={12} aria-hidden="true" />
                                )}
                                {isBundle ? "Bundle" : "Libro"}
                              </span>
                              <span className={styles.productYear}>
                                {BOOK_YEAR_LABELS[product.reference_year]}
                              </span>
                            </div>
                            <h4>{product.title}</h4>
                            {product.isbn ? (
                              <p className={styles.productIsbn}>
                                {isBundle ? "ISBN generale" : "ISBN"}{" "}
                                {product.isbn}
                              </p>
                            ) : null}
                            {isBundle ? (
                              <BundleItemsSummary items={product.bundle_items} />
                            ) : null}
                          </div>
                          <div className={styles.productPrice}>
                            {originalPrice ? (
                              <span>{formatPrice(originalPrice)}</span>
                            ) : null}
                            <strong>{formatPrice(product.price ?? 0)}</strong>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className={styles.totalBlock}>
                    <div className={styles.totalRow}>
                      <div>
                        <span>Totale ordine</span>
                        <small>IVA inclusa, se prevista</small>
                      </div>
                      <strong>{formatPrice(total)}</strong>
                    </div>
                    {totalSaving > 0 ? (
                      <div className={styles.savingRow}>
                        <span>Risparmio convenzione</span>
                        <strong>{formatPrice(totalSaving)}</strong>
                      </div>
                    ) : null}
                  </div>
                </section>

                <label
                  className={cx(
                    styles.confirmation,
                    confirmed && styles.confirmationChecked,
                    submitting && styles.controlDisabled
                  )}
                >
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    disabled={submitting}
                  />
                  <span>
                    Confermo che dati, prodotti e modalità “{deliverySummary}”
                    sono corretti e desidero aderire.
                  </span>
                </label>

                <div className={styles.securityNote}>
                  <LockKeyhole size={14} aria-hidden="true" />
                  <span>
                    Prezzi e disponibilità saranno verificati dal server prima
                    del salvataggio.
                  </span>
                </div>
              </aside>
            </div>
          </div>

          <footer className={styles.footer}>
            <div className={styles.footerTotal}>
              <span>Totale da confermare</span>
              <strong aria-live="polite">{formatPrice(total)}</strong>
            </div>
            <div className={styles.footerActions}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className={styles.secondaryButton}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={styles.primaryButton}
              >
                {submitting ? (
                  <>
                    <LoaderCircle
                      className={styles.spinner}
                      size={17}
                      aria-hidden="true"
                    />
                    Invio in corso…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} aria-hidden="true" />
                    Conferma adesione
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>,
    document.body
  );
}
