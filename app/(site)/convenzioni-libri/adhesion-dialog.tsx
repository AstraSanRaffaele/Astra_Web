"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  ReceiptText,
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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, submitting]);

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
      className="fixed inset-0 z-[200] flex items-end justify-center bg-[rgba(8,16,42,.48)] p-0 backdrop-blur-[4px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="adhesion-dialog-title"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.75rem] bg-[#F8F7F3] shadow-[0_24px_80px_rgba(8,16,42,.25)] sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[1.75rem]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[rgba(14,31,107,.09)] bg-white px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-[.64rem] font-bold uppercase tracking-[.18em] text-[#2E4080]">
              Conferma adesione
            </p>
            <h2
              id="adhesion-dialog-title"
              className="mt-1 text-[1.55rem] leading-tight font-bold text-[#08102A] sm:text-[1.8rem]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Dati di fatturazione e pagamento
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            autoFocus
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[rgba(14,31,107,.12)] bg-white text-[#596174] transition hover:bg-[#EEF1F8] hover:text-[#0E1F6B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3399]/25 disabled:opacity-50"
            aria-label="Chiudi il modulo di adesione"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto">
          <div className="space-y-5 p-5 sm:p-7">
            <div className="grid gap-3 rounded-2xl border border-[rgba(14,31,107,.09)] bg-white p-4 sm:grid-cols-2">
              <div className="flex gap-3">
                <UserRound className="mt-0.5 shrink-0 text-[#2E4080]" size={17} />
                <div className="min-w-0">
                  <p className="text-[.66rem] font-bold uppercase tracking-[.12em] text-[#8A909D]">
                    Utente
                  </p>
                  <p className="mt-0.5 truncate text-[.82rem] font-semibold text-[#08102A]">
                    {fullName || "Utente ASTRA"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <ReceiptText className="mt-0.5 shrink-0 text-[#2E4080]" size={17} />
                <div className="min-w-0">
                  <p className="text-[.66rem] font-bold uppercase tracking-[.12em] text-[#8A909D]">
                    Email
                  </p>
                  <p className="mt-0.5 truncate text-[.82rem] font-semibold text-[#08102A]">
                    {profile?.email || "Email del profilo"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={24}
                  required
                  className="h-11 w-full rounded-xl border border-[rgba(14,31,107,.14)] bg-white px-3.5 text-[.84rem] text-[#08102A] outline-none transition placeholder:text-[#A5AAB5] focus:border-[#1A3399] focus:ring-3 focus:ring-[#1A3399]/10"
                />
              </label>

              <label className="block sm:row-span-2">
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
                  className="min-h-28 w-full resize-y rounded-xl border border-[rgba(14,31,107,.14)] bg-white px-3.5 py-3 text-[.84rem] text-[#08102A] outline-none transition placeholder:text-[#A5AAB5] focus:border-[#1A3399] focus:ring-3 focus:ring-[#1A3399]/10"
                />
              </label>
            </div>

            <fieldset>
              <legend className="mb-2.5 flex items-center gap-2 text-[.76rem] font-bold text-[#24304B]">
                <CreditCard size={15} className="text-[#2E4080]" />
                Metodo di pagamento
              </legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PAYMENT_METHODS.map((method) => {
                  const checked = paymentMethod === method;

                  return (
                    <label
                      key={method}
                      className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[.76rem] font-semibold transition ${
                        checked
                          ? "border-[#1A3399] bg-[#EEF1FF] text-[#0E1F6B]"
                          : "border-[rgba(14,31,107,.1)] bg-white text-[#596174] hover:border-[rgba(14,31,107,.22)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={method}
                        checked={checked}
                        onChange={() => setPaymentMethod(method)}
                        className="size-4 accent-[#0E1F6B]"
                      />
                      <span>{PAYMENT_METHOD_LABELS[method]}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {paymentMethod === "bonifico" ? (
              <div className="rounded-2xl border border-[#CCD7F1] bg-[#EEF3FF] p-4">
                <div className="flex gap-3">
                  <Building2 className="mt-0.5 shrink-0 text-[#0E1F6B]" size={18} />
                  <div className="min-w-0 text-[.76rem] leading-relaxed text-[#344363]">
                    <p className="font-bold text-[#0E1F6B]">Coordinate per il bonifico</p>
                    <p className="mt-1">
                      {BOOK_CONVENTION_BANK_DETAILS.bank}<br />
                      IBAN: <strong className="break-all">{BOOK_CONVENTION_BANK_DETAILS.iban}</strong><br />
                      Intestatario: <strong>{BOOK_CONVENTION_BANK_DETAILS.accountHolder}</strong>
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[rgba(14,31,107,.09)] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[.75rem] font-bold text-[#24304B]">
                  {products.length} {products.length === 1 ? "elemento selezionato" : "elementi selezionati"}
                </p>
                <strong className="text-[1rem] text-[#08102A]">{formatPrice(total)}</strong>
              </div>
              <div className="mt-3 space-y-2 border-t border-[rgba(14,31,107,.07)] pt-3">
                {products.map((product) => (
                  <div key={product.id} className="flex items-start justify-between gap-3 text-[.74rem]">
                    <span className="min-w-0 leading-snug text-[#596174]">{product.title}</span>
                    <span className="shrink-0 font-semibold text-[#24304B]">
                      {formatPrice(product.price ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[rgba(14,31,107,.1)] bg-white p-4">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[#0E1F6B]"
              />
              <span className="text-[.76rem] leading-relaxed text-[#596174]">
                Confermo che i dati inseriti e gli elementi selezionati sono corretti e desidero aderire alla convenzione libri.
              </span>
            </label>

            {error ? (
              <Alert variant="destructive" className="rounded-xl border-[#F0C9C9] bg-[#FFF7F7] p-3">
                <AlertTitle>Impossibile continuare</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex items-start gap-2 text-[.68rem] leading-relaxed text-[#7B8290]">
              <LockKeyhole className="mt-0.5 shrink-0" size={13} />
              Il totale e la disponibilità saranno verificati nuovamente dal server prima del salvataggio.
            </div>
          </div>

          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[rgba(14,31,107,.09)] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="h-11 rounded-full border-[rgba(14,31,107,.14)] bg-white px-5 text-[#24304B] hover:bg-[#F1F3F8]"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={submitting || !confirmed}
              className="h-11 rounded-full bg-[#0E1F6B] px-6 font-bold text-white hover:bg-[#1A3399]"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="animate-spin" size={15} />
                  Invio in corso…
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  Conferma adesione
                </>
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
