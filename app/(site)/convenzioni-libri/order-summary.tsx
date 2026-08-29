"use client";

import { useId, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Package,
  ShieldCheck,
  ShoppingBag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/book-convention";
import type {
  BookConventionAdhesion,
  BookConventionCatalogBook,
} from "@/lib/book-convention";

function formatPrice(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(value: string) {
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

function formatPaymentMethod(value: string | null) {
  if (!value) return "Non indicato";

  if (Object.prototype.hasOwnProperty.call(PAYMENT_METHOD_LABELS, value)) {
    return PAYMENT_METHOD_LABELS[value as PaymentMethod];
  }

  return value.replaceAll("_", " ");
}

function SummaryCover({ product }: { product: BookConventionCatalogBook }) {
  const [failed, setFailed] = useState(false);
  const isBundle = product.product_type === "bundle";

  return (
    <span className="relative flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[rgba(14,31,107,.09)] bg-[#F2F4F9] text-[#64709A]">
      {product.cover_image && !failed ? (
        // Le URL sono normalizzate server-side sul solo bucket Supabase dedicato.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.cover_image}
          alt=""
          className="h-full w-full object-contain"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : isBundle ? (
        <Package size={15} aria-hidden="true" />
      ) : (
        <BookOpen size={15} aria-hidden="true" />
      )}
    </span>
  );
}

export default function OrderSummary({
  products,
  total,
  canAdhere,
  activeAdhesion,
  onRemove,
  onProceed,
}: {
  products: BookConventionCatalogBook[];
  total: number;
  canAdhere: boolean;
  activeAdhesion: BookConventionAdhesion | null;
  onRemove: (productId: number) => void;
  onProceed: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileContentId = useId();
  const itemLabel = `${products.length} ${products.length === 1 ? "elemento" : "elementi"}`;
  const adhesionProducts = activeAdhesion?.selected_books ?? [];

  return (
    <div className="min-w-0 lg:contents">
      <div aria-hidden="true" className="h-44 lg:hidden" />

      <aside className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] lg:sticky lg:inset-x-auto lg:top-24 lg:bottom-auto lg:z-auto lg:self-start lg:p-0">
        <div className="mx-auto max-w-lg overflow-hidden rounded-[1.4rem] border border-[rgba(14,31,107,.12)] bg-white shadow-[0_-12px_48px_rgba(8,16,42,.14)] lg:max-w-none lg:rounded-[1.55rem] lg:shadow-[0_16px_48px_rgba(8,16,42,.08)]">
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            aria-expanded={mobileOpen}
            aria-controls={mobileContentId}
            className="flex min-h-14 w-full items-center gap-3 bg-[linear-gradient(135deg,#F5F8FF_0%,#FFFFFF_72%)] px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#1A3399]/20 lg:hidden"
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#0E1F6B] text-white shadow-[0_5px_14px_rgba(14,31,107,.2)]">
              <ShoppingBag size={16} aria-hidden="true" />
              {!activeAdhesion && products.length > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#1A77A8] px-1 text-[.58rem] leading-4 font-bold text-white">
                  {products.length}
                </span>
              ) : null}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[.82rem] leading-tight font-bold text-[#08102A]">
                {activeAdhesion ? "Adesione registrata" : "Il tuo riepilogo"}
              </span>
              <span className="mt-0.5 block text-[.68rem] text-[#6B7280]" aria-live="polite">
                {activeAdhesion ? "Consulta i dettagli" : itemLabel}
              </span>
            </span>

            <span className="shrink-0 text-right">
              <strong className="block text-[.92rem] tracking-[-.02em] text-[#08102A]">
                {formatPrice(activeAdhesion?.total_price ?? total)}
              </strong>
              <ChevronDown
                size={15}
                aria-hidden="true"
                className={`ml-auto mt-0.5 text-[#596174] transition-transform duration-200 ${
                  mobileOpen ? "rotate-180" : ""
                }`}
              />
            </span>
          </button>

          <div className="hidden items-center justify-between border-b border-[rgba(14,31,107,.08)] bg-[linear-gradient(135deg,#F5F8FF_0%,#FFFFFF_72%)] px-5 py-4 lg:flex">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#0E1F6B] text-white shadow-[0_5px_14px_rgba(14,31,107,.18)]">
                <ShoppingBag size={16} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[.94rem] font-bold text-[#08102A]">
                  {activeAdhesion ? "La tua adesione" : "Riepilogo ordine"}
                </h2>
                <p className="text-[.69rem] text-[#6B7280]">
                  {activeAdhesion ? "Richiesta registrata" : itemLabel}
                </p>
              </div>
            </div>
          </div>

          <div
            id={mobileContentId}
            className={`${mobileOpen ? "block" : "hidden"} lg:block`}
          >
            {activeAdhesion ? (
              <div className="p-4 sm:p-5">
                <div className="rounded-2xl border border-[#CFE6D6] bg-[#F2FAF4] p-4">
                  <div className="flex gap-3">
                    <CheckCircle2
                      className="mt-0.5 shrink-0 text-[#16713A]"
                      size={18}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-[.85rem] font-bold text-[#145C31]">
                        Adesione già inviata
                      </p>
                      <p className="mt-1 text-[.74rem] leading-relaxed text-[#477257]">
                        La richiesta per la raccolta attiva è stata registrata correttamente.
                      </p>
                    </div>
                  </div>
                </div>

                {adhesionProducts.length > 0 ? (
                  <div className="mt-4 max-h-48 overflow-y-auto overscroll-contain border-y border-[rgba(14,31,107,.08)]">
                    {adhesionProducts.map((product, index) => (
                      <div
                        key={`${product.id ?? "snapshot"}-${index}`}
                        className="flex items-start justify-between gap-3 border-b border-[rgba(14,31,107,.07)] py-3 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-[.75rem] leading-snug font-semibold text-[#08102A]">
                            {product.title || `Prodotto ${index + 1}`}
                          </p>
                          <p className="mt-1 text-[.6rem] font-bold uppercase tracking-[.1em] text-[#596174]">
                            {product.product_type === "bundle" ? "Bundle" : "Libro"}
                          </p>
                        </div>
                        <strong className="shrink-0 text-[.73rem] text-[#2E4080]">
                          {formatPrice(product.price)}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                <dl className="mt-4 grid gap-3 rounded-xl bg-[#F7F8FB] p-3.5 text-[.7rem]">
                  <div className="flex justify-between gap-4">
                    <dt className="font-semibold text-[#596174]">Inviata il</dt>
                    <dd className="text-right font-semibold text-[#24304B]">
                      {formatDate(activeAdhesion.created_at)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="font-semibold text-[#596174]">Pagamento</dt>
                    <dd className="text-right font-semibold capitalize text-[#24304B]">
                      {formatPaymentMethod(activeAdhesion.payment_method)}
                    </dd>
                  </div>
                  {activeAdhesion.fiscal_code_or_vat ? (
                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-[#596174]">CF / P. IVA</dt>
                      <dd className="break-all text-right font-semibold text-[#24304B]">
                        {activeAdhesion.fiscal_code_or_vat}
                      </dd>
                    </div>
                  ) : null}
                  {activeAdhesion.billing_shipping_address ? (
                    <div>
                      <dt className="font-semibold text-[#596174]">Indirizzo</dt>
                      <dd className="mt-1 whitespace-pre-line leading-relaxed font-semibold text-[#24304B]">
                        {activeAdhesion.billing_shipping_address}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-4 flex items-center justify-between border-t border-[rgba(14,31,107,.08)] pt-4">
                  <span className="text-[.76rem] font-semibold text-[#6B7280]">
                    Totale adesione
                  </span>
                  <strong className="text-[1.15rem] tracking-[-.02em] text-[#08102A]">
                    {formatPrice(activeAdhesion.total_price)}
                  </strong>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="px-5 py-6 text-center lg:py-8">
                <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-[#F1F3F8] text-[#8490AC]">
                  <BookOpen size={20} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <p className="mt-3 text-[.81rem] font-semibold text-[#596174]">
                  Il carrello è vuoto
                </p>
                <p className="mx-auto mt-1 max-w-56 text-[.72rem] leading-relaxed text-[#596174]">
                  Seleziona uno o più libri o bundle dal catalogo.
                </p>
              </div>
            ) : (
              <div className="max-h-[min(42dvh,20rem)] overflow-y-auto overscroll-contain px-4 py-1 sm:px-5 lg:max-h-80">
                {products.map((product) => {
                  const isBundle = product.product_type === "bundle";

                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 border-b border-[rgba(14,31,107,.07)] py-3 last:border-0"
                    >
                      <SummaryCover product={product} />

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[.76rem] leading-snug font-semibold text-[#08102A]">
                          {product.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[.62rem] font-bold uppercase tracking-[.1em] text-[#64709A]">
                            {isBundle ? "Bundle" : "Libro"}
                          </span>
                          <span className="text-[.72rem] font-bold text-[#2E4080]">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemove(product.id)}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-[#596174] transition hover:bg-[#F0F2F8] hover:text-[#0E1F6B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3399]/25"
                        aria-label={`Rimuovi ${product.title}`}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!activeAdhesion ? (
            <div className="border-t border-[rgba(14,31,107,.08)] bg-[#FAFBFD] px-4 py-3.5 sm:px-5 lg:p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="block text-[.68rem] font-semibold text-[#6B7280]">Totale</span>
                  <strong className="mt-0.5 block text-[1.3rem] leading-none tracking-[-.035em] text-[#08102A]">
                    {formatPrice(total)}
                  </strong>
                </div>
                <div className="flex max-w-40 items-start gap-1.5 text-right text-[.64rem] leading-snug text-[#596174] lg:max-w-none">
                  <ShieldCheck
                    className="mt-px shrink-0 text-[#64709A]"
                    size={12}
                    aria-hidden="true"
                  />
                  <span>Prezzi verificati alla conferma</span>
                </div>
              </div>
              <Button
                type="button"
                onClick={onProceed}
                disabled={!canAdhere || products.length === 0}
                className="mt-3 h-11 w-full rounded-xl bg-[#0E1F6B] px-5 text-[.8rem] font-bold text-white shadow-[0_7px_18px_rgba(14,31,107,.16)] hover:bg-[#1A3399]"
              >
                Procedi con l’adesione
              </Button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
