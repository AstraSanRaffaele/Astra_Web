"use client";

import { BookOpen, Check, Package } from "lucide-react";
import {
  BOOK_YEAR_LABELS,
  PRODUCT_TYPE_LABELS,
  type BookAvailabilityReason,
  type BookConventionCatalogBook,
} from "@/lib/book-convention";

const AVAILABILITY_LABELS: Record<Exclude<BookAvailabilityReason, null>, string> = {
  convention_inactive: "Convenzione chiusa",
  round_inactive: "Periodo non attivo",
  not_in_round: "Non disponibile nel periodo",
  price_unavailable: "Prezzo non disponibile",
};

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function BookProductCard({
  product,
  selected,
  selectionDisabled,
  onToggle,
}: {
  product: BookConventionCatalogBook;
  selected: boolean;
  selectionDisabled: boolean;
  onToggle: (productId: number) => void;
}) {
  const unavailable = !product.is_available;
  const disabled = unavailable || selectionDisabled;
  const isBundle = product.product_type === "bundle";

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onToggle(product.id)}
      className={`group relative flex min-h-44 w-full flex-col rounded-[1.35rem] border p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1A3399]/20 sm:p-5 ${
        selected
          ? "border-[#1A3399] bg-[#F4F6FF] shadow-[0_10px_30px_rgba(14,31,107,.08)]"
          : "border-[rgba(14,31,107,.1)] bg-white hover:-translate-y-0.5 hover:border-[rgba(14,31,107,.24)] hover:shadow-[0_10px_28px_rgba(14,31,107,.06)]"
      } ${disabled ? "cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none" : "cursor-pointer"}`}
    >
      <div className="flex w-full items-start gap-3.5">
        <span
          className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[rgba(14,31,107,.1)] bg-[#F4F6FB] bg-contain bg-center bg-no-repeat text-[#64709A] shadow-[0_4px_14px_rgba(14,31,107,.06)]"
          style={
            product.cover_image
              ? { backgroundImage: `url(${JSON.stringify(product.cover_image)})` }
              : undefined
          }
          role={product.cover_image ? "img" : undefined}
          aria-label={product.cover_image ? `Copertina di ${product.title}` : undefined}
        >
          {!product.cover_image ? (
            isBundle ? (
              <Package size={23} strokeWidth={1.7} aria-hidden="true" />
            ) : (
              <BookOpen size={23} strokeWidth={1.7} aria-hidden="true" />
            )
          ) : null}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex w-full items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-xl ${
                  isBundle
                    ? "bg-[#0E1F6B] text-white"
                    : "bg-[#E8EDFB] text-[#0E1F6B]"
                }`}
                aria-hidden="true"
              >
                {isBundle ? <Package size={15} /> : <BookOpen size={15} />}
              </span>
              <span
                className={`text-[.66rem] font-bold uppercase tracking-[.16em] ${
                  isBundle ? "text-[#0E1F6B]" : "text-[#6B7280]"
                }`}
              >
                {isBundle ? "Bundle" : PRODUCT_TYPE_LABELS[product.product_type]}
              </span>
            </div>

            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition ${
                selected
                  ? "border-[#0E1F6B] bg-[#0E1F6B] text-white"
                  : "border-[rgba(14,31,107,.18)] bg-white text-transparent"
              }`}
              aria-hidden="true"
            >
              <Check size={13} strokeWidth={2.5} />
            </span>
          </div>

          <div className="mt-3 min-w-0">
            <h3 className="text-[1rem] leading-snug font-bold text-[#08102A] sm:text-[1.04rem]">
              {product.title}
            </h3>
            {product.description ? (
              <p className="mt-1.5 line-clamp-2 text-[.82rem] leading-relaxed text-[#6B7280]">
                {product.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {isBundle && product.bundle_items.length > 0 ? (
        <div className="mt-3 rounded-xl bg-[rgba(14,31,107,.045)] px-3 py-2.5">
          <p className="mb-1 text-[.64rem] font-bold uppercase tracking-[.12em] text-[#2E4080]">
            Prodotti inclusi
          </p>
          <ul className="space-y-1 text-[.76rem] leading-snug text-[#44506D]">
            {product.bundle_items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-[.42rem] size-1 shrink-0 rounded-full bg-[#1A3399]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <span className="text-[.72rem] font-semibold text-[#6B7280]">
          {BOOK_YEAR_LABELS[product.reference_year]}
        </span>
        <span className="text-[1.05rem] font-extrabold tracking-[-.02em] text-[#08102A]">
          {formatPrice(product.price)}
        </span>
      </div>

      {unavailable && product.availability_reason ? (
        <div className="absolute inset-x-4 bottom-4 rounded-lg bg-[#F2F3F6] px-3 py-2 text-center text-[.72rem] font-bold text-[#596174] sm:inset-x-5">
          {AVAILABILITY_LABELS[product.availability_reason]}
        </div>
      ) : null}
    </button>
  );
}
