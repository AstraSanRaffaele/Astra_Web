"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, ShieldCheck, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  BookBundleItem,
  BookConventionCatalogBook,
} from "@/lib/book-convention";

function formatPrice(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function getOriginalPrice(
  price: number | null | undefined,
  originalPrice: number | null | undefined
) {
  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    typeof originalPrice !== "number" ||
    !Number.isFinite(originalPrice) ||
    originalPrice <= price
  ) {
    return null;
  }

  return originalPrice;
}

function BundleItemsSummary({ items }: { items: BookBundleItem[] | undefined }) {
  if (!items?.length) return null;

  return (
    <p className="mt-2 text-[.68rem] leading-relaxed text-[#697083]">
      <span className="font-semibold text-[#454E65]">Include: </span>
      {items.map((item) => item.title).join(", ")}
    </p>
  );
}

export default function OrderSummary({
  products,
  total,
  canAdhere,
  onRemove,
  onProceed,
}: {
  products: BookConventionCatalogBook[];
  total: number;
  canAdhere: boolean;
  onRemove: (productId: number) => void;
  onProceed: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileContentId = useId();
  const itemLabel = `${products.length} ${products.length === 1 ? "articolo" : "articoli"}`;
  const originalTotal = products.reduce((sum, product) => {
    const originalPrice = getOriginalPrice(product.price, product.original_price);
    return sum + (originalPrice ?? product.price ?? 0);
  }, 0);
  const totalSaving = Math.max(0, originalTotal - total);

  useEffect(() => {
    if (!mobileOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const proceed = () => {
    setMobileOpen(false);
    onProceed();
  };

  return (
    <div className="min-w-0 lg:contents">
      <div aria-hidden="true" className="h-32 lg:hidden" />

      <aside
        aria-label="Carrello"
        className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] lg:sticky lg:inset-x-auto lg:top-24 lg:bottom-auto lg:z-auto lg:self-start lg:p-0"
      >
        <div className="mx-auto flex max-h-[calc(100dvh_-_1rem_-_env(safe-area-inset-bottom))] max-w-lg flex-col overflow-hidden rounded-[1.35rem] border border-[rgba(14,31,107,.13)] bg-white shadow-[0_-12px_44px_rgba(8,16,42,.15)] lg:block lg:max-h-none lg:max-w-none lg:rounded-[1.5rem] lg:shadow-[0_18px_52px_rgba(8,16,42,.09)]">
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            aria-expanded={mobileOpen}
            aria-controls={mobileContentId}
            className="flex min-h-16 w-full shrink-0 items-center gap-3 bg-[#FBFCFE] px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#1A3399]/20 lg:hidden"
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#0E1F6B] text-white">
              <ShoppingBag size={16} aria-hidden="true" />
              {products.length > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#1675A5] px-1 text-[.58rem] leading-4 font-bold text-white">
                  {products.length}
                </span>
              ) : null}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[.82rem] leading-tight font-bold text-[#08102A]">
                Il tuo carrello
              </span>
              <span className="mt-0.5 block text-[.68rem] text-[#697083]" aria-live="polite">
                {itemLabel}
              </span>
            </span>

            <span className="shrink-0 text-right">
              <strong className="block text-[.95rem] tracking-[-.02em] text-[#08102A]">
                {formatPrice(total)}
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

          <div className="hidden items-center justify-between border-b border-[rgba(14,31,107,.08)] bg-[#FBFCFE] px-5 py-4 lg:flex">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#0E1F6B] text-white">
                <ShoppingBag size={16} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[.94rem] font-bold text-[#08102A]">Il tuo carrello</h2>
                <p className="text-[.69rem] text-[#697083]" aria-live="polite">
                  {itemLabel}
                </p>
              </div>
            </div>
          </div>

          <div
            id={mobileContentId}
            className={`${mobileOpen ? "flex min-h-0 flex-1 flex-col" : "hidden"} lg:block`}
          >
            <div className="flex items-center justify-between border-b border-[rgba(14,31,107,.08)] px-4 py-3 lg:hidden">
              <p className="text-[.72rem] font-semibold text-[#596174]">Riepilogo selezione</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Chiudi il carrello"
                className="flex size-9 items-center justify-center rounded-full text-[#596174] hover:bg-[#F0F2F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3399]/25"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {products.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[.82rem] font-semibold text-[#3E475D]">
                  Il carrello è vuoto
                </p>
                <p className="mx-auto mt-1.5 max-w-56 text-[.72rem] leading-relaxed text-[#697083]">
                  Scegli una delle proposte disponibili per aggiungerla al riepilogo.
                </p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 lg:max-h-96 lg:px-5">
                {products.map((product) => {
                  const originalPrice = getOriginalPrice(
                    product.price,
                    product.original_price
                  );
                  const saving = originalPrice ? originalPrice - (product.price ?? 0) : 0;

                  return (
                    <article
                      key={product.id}
                      className="border-b border-[rgba(14,31,107,.08)] py-4 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[.78rem] leading-snug font-semibold text-[#08102A]">
                            {product.title}
                          </h3>
                          <BundleItemsSummary items={product.bundle_items} />
                        </div>

                        <div className="shrink-0 text-right">
                          {originalPrice ? (
                            <span className="block text-[.65rem] text-[#8A909D] line-through">
                              {formatPrice(originalPrice)}
                            </span>
                          ) : null}
                          <strong className="block text-[.82rem] text-[#1E347D]">
                            {formatPrice(product.price)}
                          </strong>
                        </div>
                      </div>

                      <div className="mt-2.5 flex min-h-8 items-center justify-between gap-3">
                        {saving > 0 ? (
                          <span className="rounded-full bg-[#EDF8F0] px-2.5 py-1 text-[.62rem] font-bold text-[#18713A]">
                            Risparmi {formatPrice(saving)}
                          </span>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={() => onRemove(product.id)}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-[.66rem] font-semibold text-[#6D4550] transition hover:bg-[#FFF2F3] hover:text-[#9D243D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D243D]/20"
                          aria-label={`Rimuovi ${product.title} dal carrello`}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          Rimuovi
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[rgba(14,31,107,.08)] bg-[#FAFBFD] px-4 py-3.5 sm:px-5 lg:p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="block text-[.68rem] font-semibold text-[#697083]">Totale</span>
                <strong className="mt-0.5 block text-[1.3rem] leading-none tracking-[-.035em] text-[#08102A]">
                  {formatPrice(total)}
                </strong>
                {totalSaving > 0 ? (
                  <span className="mt-1.5 block text-[.66rem] font-bold text-[#16713A]">
                    Risparmio totale {formatPrice(totalSaving)}
                  </span>
                ) : null}
              </div>
              <div className="flex max-w-40 items-start gap-1.5 text-right text-[.64rem] leading-snug text-[#596174] lg:max-w-none">
                <ShieldCheck
                  className="mt-px shrink-0 text-[#64709A]"
                  size={12}
                  aria-hidden="true"
                />
                <span>Totale verificato alla conferma</span>
              </div>
            </div>
            <Button
              type="button"
              onClick={proceed}
              disabled={!canAdhere || products.length === 0}
              className="mt-3 h-11 w-full rounded-xl bg-[#0E1F6B] px-5 text-[.8rem] font-bold text-white shadow-[0_7px_18px_rgba(14,31,107,.16)] hover:bg-[#1A3399]"
            >
              Conferma la selezione
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
