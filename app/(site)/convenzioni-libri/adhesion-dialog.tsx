"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  BOOK_CONVENTION_BANK_DETAILS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type BookConventionCatalogBook,
  type BookConventionSubmitResponse,
  type PaymentMethod,
} from "@/lib/book-convention";

function formatPrice(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
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
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0 && element.getAttribute("aria-hidden") !== "true"
  );
}

export default function AdhesionDialog({
  open,
  conventionId,
  roundId,
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
  conventionId: number;
  roundId: string;
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("contanti");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const submittingRef = useRef(submitting);

  onCloseRef.current = onClose;
  submittingRef.current = submitting;

  useEffect(() => {
    if (!open) return;

    setFiscalCodeOrVat(initialFiscalCodeOrVat ?? "");
    setAddress(initialAddress ?? "");
    setPaymentMethod("contanti");
    setConfirmed(false);
    setError("");
  }, [initialAddress, initialFiscalCodeOrVat, open]);

  useEffect(() => {
    if (!open) return;

    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    const inertedElements: Array<{ element: HTMLElement; inert: boolean }> = [];

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";

    if (overlay) {
      let currentElement: HTMLElement = overlay;

      while (currentElement.parentElement) {
        const parent = currentElement.parentElement;

        Array.from(parent.children).forEach((sibling) => {
          if (sibling === currentElement || !(sibling instanceof HTMLElement)) return;

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

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");

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

    if (address.trim().length < 8) {
      setError("Inserisci un indirizzo di spedizione/fatturazione completo.");
      return;
    }

    if (!confirmed) {
      setError("Conferma i dati e la volontà di aderire prima di continuare.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/book-convention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          convention_id: conventionId,
          round_id: roundId,
          selected_book_ids: products.map((product) => product.id),
          payment_method: paymentMethod,
          fiscal_code_or_vat: normalizedFiscalCode,
          billing_shipping_address: address.trim(),
        }),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as BookConventionSubmitResponse;

      if (!response.ok) {
        setError(payload.error || "Non è stato possibile completare l’adesione.");
        return;
      }

      onCompleted(payload.message || "Adesione registrata correttamente.");
    } catch {
      setError("Errore di connessione. Controlla la rete e riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-[rgba(8,16,42,.55)] p-0 backdrop-blur-[6px] sm:items-center sm:p-5"
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
        className="flex max-h-[calc(100dvh-.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-t-[1.75rem] bg-[#F8F7F3] shadow-[0_28px_90px_rgba(8,16,42,.32)] outline-none sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[1.75rem]"
      >
        <header className="relative flex shrink-0 items-start justify-between gap-4 border-b border-[rgba(14,31,107,.09)] bg-white px-5 pt-7 pb-4 sm:px-7 sm:py-5 lg:px-8">
          <span
            aria-hidden="true"
            className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-[#D8DCE5] sm:hidden"
          />

          <div className="min-w-0">
            <p className="text-[.64rem] font-bold uppercase tracking-[.2em] text-[#2E4080]">
              Checkout · Convenzioni Libri
            </p>
            <h2
              id="adhesion-dialog-title"
              className="mt-1 text-[1.7rem] leading-[1.05] font-bold tracking-[-.02em] text-[#08102A] sm:text-[2rem]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Completa la tua adesione
            </h2>
            <p
              id="adhesion-dialog-description"
              className="mt-1.5 max-w-2xl text-[.74rem] leading-relaxed text-[#6B7280] sm:text-[.78rem]"
            >
              Controlla i dati, scegli il metodo di pagamento e conferma l’ordine.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-[.62rem] font-bold uppercase tracking-[.12em] text-[#8A909D]">
                Totale
              </p>
              <p className="mt-0.5 text-[1.05rem] font-extrabold tracking-[-.02em] text-[#08102A]">
                {formatPrice(total)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[rgba(14,31,107,.12)] bg-white text-[#596174] transition hover:border-[rgba(14,31,107,.2)] hover:bg-[#EEF1F8] hover:text-[#0E1F6B] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1A3399]/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Chiudi il modulo di adesione"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:p-7">
              <div className="min-w-0 space-y-5">
                <section
                  aria-labelledby="checkout-profile-title"
                  className="rounded-[1.35rem] border border-[rgba(14,31,107,.09)] bg-white p-4 shadow-[0_2px_12px_rgba(8,16,42,.035)] sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E8EDFB] text-[#0E1F6B]">
                      <UserRound size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[.62rem] font-bold uppercase tracking-[.16em] text-[#2E4080]">
                        Passaggio 1
                      </p>
                      <h3
                        id="checkout-profile-title"
                        className="mt-0.5 text-[1rem] font-bold text-[#08102A]"
                      >
                        Il tuo profilo
                      </h3>
                      <p className="mt-0.5 text-[.72rem] leading-relaxed text-[#7B8290]">
                        Questi dati provengono dal tuo account ASTRA.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-[#F7F8FB] px-3.5 py-3">
                      <UserRound className="shrink-0 text-[#2E4080]" size={16} aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-[.6rem] font-bold uppercase tracking-[.11em] text-[#8A909D]">
                          Nome e cognome
                        </p>
                        <p className="mt-0.5 truncate text-[.8rem] font-semibold text-[#08102A]">
                          {fullName || "Utente ASTRA"}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-[#F7F8FB] px-3.5 py-3">
                      <ReceiptText className="shrink-0 text-[#2E4080]" size={16} aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-[.6rem] font-bold uppercase tracking-[.11em] text-[#8A909D]">
                          Email
                        </p>
                        <p className="mt-0.5 truncate text-[.8rem] font-semibold text-[#08102A]">
                          {profile?.email || "Email del profilo"}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section
                  aria-labelledby="checkout-billing-title"
                  className="rounded-[1.35rem] border border-[rgba(14,31,107,.09)] bg-white p-4 shadow-[0_2px_12px_rgba(8,16,42,.035)] sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E8EDFB] text-[#0E1F6B]">
                      <MapPin size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[.62rem] font-bold uppercase tracking-[.16em] text-[#2E4080]">
                        Passaggio 2
                      </p>
                      <h3
                        id="checkout-billing-title"
                        className="mt-0.5 text-[1rem] font-bold text-[#08102A]"
                      >
                        Fatturazione e spedizione
                      </h3>
                      <p className="mt-0.5 text-[.72rem] leading-relaxed text-[#7B8290]">
                        Inserisci i dati completi che verranno associati alla richiesta.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
                    <label className="block">
                      <span className="mb-1.5 block text-[.73rem] font-bold text-[#24304B]">
                        Codice fiscale o Partita IVA
                      </span>
                      <input
                        type="text"
                        name="tax-id"
                        value={fiscalCodeOrVat}
                        onChange={(event) => setFiscalCodeOrVat(event.target.value.toUpperCase())}
                        placeholder="RSSMRA00A00F205X"
                        autoComplete="off"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={24}
                        required
                        disabled={submitting}
                        className="h-12 w-full rounded-xl border border-[rgba(14,31,107,.14)] bg-white px-3.5 text-[.84rem] text-[#08102A] outline-none transition placeholder:text-[#A5AAB5] focus:border-[#1A3399] focus:ring-3 focus:ring-[#1A3399]/10 disabled:cursor-not-allowed disabled:bg-[#F3F4F7] disabled:opacity-70"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[.73rem] font-bold text-[#24304B]">
                        Indirizzo di spedizione/fatturazione
                      </span>
                      <textarea
                        name="street-address"
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        placeholder="Via, numero civico, CAP, città e provincia"
                        autoComplete="street-address"
                        rows={4}
                        maxLength={1000}
                        required
                        disabled={submitting}
                        className="min-h-28 w-full resize-y rounded-xl border border-[rgba(14,31,107,.14)] bg-white px-3.5 py-3 text-[.84rem] text-[#08102A] outline-none transition placeholder:text-[#A5AAB5] focus:border-[#1A3399] focus:ring-3 focus:ring-[#1A3399]/10 disabled:cursor-not-allowed disabled:bg-[#F3F4F7] disabled:opacity-70"
                      />
                    </label>
                  </div>
                </section>

                <section
                  aria-labelledby="checkout-payment-title"
                  className="rounded-[1.35rem] border border-[rgba(14,31,107,.09)] bg-white p-4 shadow-[0_2px_12px_rgba(8,16,42,.035)] sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E8EDFB] text-[#0E1F6B]">
                      <CreditCard size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[.62rem] font-bold uppercase tracking-[.16em] text-[#2E4080]">
                        Passaggio 3
                      </p>
                      <h3
                        id="checkout-payment-title"
                        className="mt-0.5 text-[1rem] font-bold text-[#08102A]"
                      >
                        Metodo di pagamento
                      </h3>
                      <p className="mt-0.5 text-[.72rem] leading-relaxed text-[#7B8290]">
                        Seleziona una delle modalità previste dalla convenzione.
                      </p>
                    </div>
                  </div>

                  <fieldset disabled={submitting} className="mt-4">
                    <legend className="sr-only">Metodo di pagamento</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PAYMENT_METHODS.map((method) => {
                        const checked = paymentMethod === method;

                        return (
                          <label
                            key={method}
                            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-[.78rem] font-semibold transition focus-within:ring-3 focus-within:ring-[#1A3399]/12 ${
                              checked
                                ? "border-[#1A3399] bg-[#EEF1FF] text-[#0E1F6B] shadow-[inset_0_0_0_1px_rgba(26,51,153,.08)]"
                                : "border-[rgba(14,31,107,.1)] bg-white text-[#596174] hover:border-[rgba(14,31,107,.22)] hover:bg-[#FAFAFC]"
                            } ${submitting ? "cursor-not-allowed opacity-70" : ""}`}
                          >
                            <input
                              type="radio"
                              name="payment_method"
                              value={method}
                              checked={checked}
                              onChange={() => setPaymentMethod(method)}
                              className="size-[1.1rem] shrink-0 accent-[#0E1F6B]"
                            />
                            <span className="min-w-0">{PAYMENT_METHOD_LABELS[method]}</span>
                            {checked ? (
                              <CheckCircle2
                                size={16}
                                className="ml-auto shrink-0 text-[#1A3399]"
                                aria-hidden="true"
                              />
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {paymentMethod === "bonifico" ? (
                    <div className="mt-3 rounded-2xl border border-[#CCD7F1] bg-[#EEF3FF] p-4">
                      <div className="flex gap-3">
                        <Building2
                          className="mt-0.5 shrink-0 text-[#0E1F6B]"
                          size={18}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 text-[.76rem] leading-relaxed text-[#344363]">
                          <p className="font-bold text-[#0E1F6B]">Coordinate per il bonifico</p>
                          <p className="mt-1">
                            {BOOK_CONVENTION_BANK_DETAILS.bank}
                            <br />
                            IBAN:{" "}
                            <strong className="break-all">
                              {BOOK_CONVENTION_BANK_DETAILS.iban}
                            </strong>
                            <br />
                            Intestatario:{" "}
                            <strong>{BOOK_CONVENTION_BANK_DETAILS.accountHolder}</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>

                {error ? (
                  <Alert
                    ref={errorRef}
                    tabIndex={-1}
                    variant="destructive"
                    className="rounded-xl border-[#F0C9C9] bg-[#FFF7F7] p-3.5 outline-none focus-visible:ring-3 focus-visible:ring-[#9A3B3B]/15"
                  >
                    <AlertTitle>Impossibile continuare</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <aside className="min-w-0 lg:sticky lg:top-0">
                <section
                  aria-labelledby="checkout-order-title"
                  className="overflow-hidden rounded-[1.35rem] border border-[rgba(14,31,107,.1)] bg-white shadow-[0_12px_34px_rgba(8,16,42,.07)]"
                >
                  <div className="flex items-center justify-between gap-3 bg-[#08102A] px-4 py-4 text-white">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                        <ShoppingBag size={17} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[.61rem] font-bold uppercase tracking-[.14em] text-white/55">
                          Riepilogo ordine
                        </p>
                        <h3 id="checkout-order-title" className="mt-0.5 text-[.9rem] font-bold">
                          La tua selezione
                        </h3>
                      </div>
                    </div>
                    <span className="flex min-w-7 items-center justify-center rounded-full bg-white/12 px-2 py-1 text-[.68rem] font-bold text-white">
                      {products.length}
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto px-4">
                    {products.map((product) => {
                      const isBundle = product.product_type === "bundle";

                      return (
                        <div
                          key={product.id}
                          className="flex items-start gap-3 border-b border-[rgba(14,31,107,.07)] py-3.5 last:border-0"
                        >
                          <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                              isBundle
                                ? "bg-[#0E1F6B] text-white"
                                : "bg-[#E8EDFB] text-[#0E1F6B]"
                            }`}
                          >
                            {isBundle ? (
                              <Package size={15} aria-hidden="true" />
                            ) : (
                              <BookOpen size={15} aria-hidden="true" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[.76rem] leading-snug font-semibold text-[#08102A]">
                              {product.title}
                            </p>
                            <p className="mt-1 text-[.6rem] font-bold uppercase tracking-[.1em] text-[#7B8290]">
                              {isBundle ? "Bundle" : "Libro"}
                            </p>
                          </div>
                          <span className="shrink-0 text-[.74rem] font-bold text-[#24304B]">
                            {formatPrice(product.price ?? 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-[rgba(14,31,107,.08)] bg-[#FCFCFD] px-4 py-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[.68rem] font-semibold text-[#6B7280]">Totale ordine</p>
                        <p className="mt-0.5 text-[.61rem] text-[#8A909D]">IVA inclusa, se prevista</p>
                      </div>
                      <strong className="text-[1.3rem] tracking-[-.03em] text-[#08102A]">
                        {formatPrice(total)}
                      </strong>
                    </div>
                  </div>
                </section>

                <label
                  className={`mt-3 flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 transition focus-within:ring-3 focus-within:ring-[#1A3399]/12 ${
                    confirmed
                      ? "border-[#1A3399] shadow-[inset_0_0_0_1px_rgba(26,51,153,.06)]"
                      : "border-[rgba(14,31,107,.1)] hover:border-[rgba(14,31,107,.2)]"
                  } ${submitting ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    disabled={submitting}
                    className="mt-0.5 size-[1.1rem] shrink-0 accent-[#0E1F6B]"
                  />
                  <span className="text-[.74rem] leading-relaxed text-[#596174]">
                    Confermo che i dati inseriti e gli elementi selezionati sono corretti e desidero aderire alla convenzione libri.
                  </span>
                </label>

                <div className="mt-3 flex items-start gap-2 rounded-xl px-1 text-[.67rem] leading-relaxed text-[#7B8290]">
                  <LockKeyhole className="mt-0.5 shrink-0 text-[#2E4080]" size={13} aria-hidden="true" />
                  Il totale e la disponibilità saranno verificati nuovamente dal server prima del salvataggio.
                </div>
              </aside>
            </div>
          </div>

          <footer className="shrink-0 border-t border-[rgba(14,31,107,.09)] bg-white px-4 py-3.5 sm:px-6 lg:px-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-baseline justify-between gap-4 sm:block">
                <p className="text-[.64rem] font-bold uppercase tracking-[.12em] text-[#8A909D]">
                  Totale da confermare
                </p>
                <p className="mt-0.5 text-[1.15rem] font-extrabold tracking-[-.025em] text-[#08102A]" aria-live="polite">
                  {formatPrice(total)}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={submitting}
                  className="h-12 rounded-full border-[rgba(14,31,107,.14)] bg-white px-6 text-[#24304B] hover:bg-[#F1F3F8] focus-visible:ring-[#1A3399]/20"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !confirmed}
                  className="h-12 rounded-full bg-[#0E1F6B] px-7 font-bold text-white shadow-[0_8px_20px_rgba(14,31,107,.16)] hover:bg-[#1A3399] focus-visible:ring-[#1A3399]/25"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
                      Invio in corso…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      Conferma adesione
                    </>
                  )}
                </Button>
              </div>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
