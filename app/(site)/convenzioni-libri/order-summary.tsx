"use client";

import { CheckCircle2, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  BookConventionAdhesion,
  BookConventionCatalogBook,
} from "@/lib/book-convention";

function formatPrice(value: number | null | undefined) {
  const price = typeof value === "number" && Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(price);
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
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="overflow-hidden rounded-[1.5rem] border border-[rgba(14,31,107,.1)] bg-white shadow-[0_12px_36px_rgba(14,31,107,.06)]">
        <div className="flex items-center justify-between border-b border-[rgba(14,31,107,.08)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#E8EDFB] text-[#0E1F6B]">
              <ShoppingBag size={15} />
            </span>
            <div>
              <h2 className="text-[.92rem] font-bold text-[#08102A]">Riepilogo</h2>
              <p className="text-[.7rem] text-[#6B7280]">
                {products.length} {products.length === 1 ? "elemento" : "elementi"}
              </p>
            </div>
          </div>
        </div>

        {activeAdhesion ? (
          <div className="p-5">
            <div className="rounded-2xl border border-[#CFE6D6] bg-[#F2FAF4] p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#16713A]" size={18} />
                <div>
                  <p className="text-[.86rem] font-bold text-[#145C31]">
                    Adesione già inviata
                  </p>
                  <p className="mt-1 text-[.76rem] leading-relaxed text-[#477257]">
                    La tua richiesta per il periodo attivo è stata registrata correttamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[rgba(14,31,107,.08)] pt-4">
              <span className="text-[.78rem] font-semibold text-[#6B7280]">Totale adesione</span>
              <strong className="text-[1.15rem] text-[#08102A]">
                {formatPrice(activeAdhesion.total_price)}
              </strong>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <ShoppingBag className="mx-auto text-[#A7ADBA]" size={25} strokeWidth={1.6} />
            <p className="mt-3 text-[.82rem] font-semibold text-[#596174]">
              Nessun elemento selezionato
            </p>
            <p className="mx-auto mt-1 max-w-56 text-[.74rem] leading-relaxed text-[#8A909D]">
              Seleziona uno o più libri o bundle per visualizzare qui il riepilogo.
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto px-5 py-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-start gap-3 border-b border-[rgba(14,31,107,.07)] py-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[.78rem] leading-snug font-semibold text-[#08102A]">
                    {product.title}
                  </p>
                  <p className="mt-1 text-[.7rem] font-bold text-[#2E4080]">
                    {formatPrice(product.price)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(product.id)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#7B8290] transition hover:bg-[#F0F2F8] hover:text-[#0E1F6B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3399]/25"
                  aria-label={`Rimuovi ${product.title}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {!activeAdhesion ? (
          <div className="border-t border-[rgba(14,31,107,.08)] bg-[#FCFCFD] p-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[.8rem] font-semibold text-[#596174]">Totale</span>
              <strong className="text-[1.35rem] tracking-[-.03em] text-[#08102A]">
                {formatPrice(total)}
              </strong>
            </div>
            <p className="mt-1 text-right text-[.66rem] text-[#8A909D]">
              Ricalcolato e verificato alla conferma
            </p>
            <Button
              type="button"
              onClick={onProceed}
              disabled={!canAdhere || products.length === 0}
              className="mt-4 h-11 w-full rounded-full bg-[#0E1F6B] px-5 text-[.82rem] font-bold text-white hover:bg-[#1A3399]"
            >
              Procedi con l’adesione
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

