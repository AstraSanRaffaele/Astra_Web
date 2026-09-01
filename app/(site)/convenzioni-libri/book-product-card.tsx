"use client";

import { useState } from "react";
import { BookOpen, Check, Package, Plus } from "lucide-react";
import {
  BOOK_YEAR_LABELS,
  PRODUCT_TYPE_LABELS,
  type BookAvailabilityReason,
  type BookConventionCatalogBook,
  type BookYear,
} from "@/lib/book-convention";

const AVAILABILITY_LABELS: Record<Exclude<BookAvailabilityReason, null>, string> = {
  convention_inactive: "Convenzione chiusa",
  round_inactive: "Raccolta non aperta",
  not_in_round: "Non disponibile in questa raccolta",
  price_unavailable: "Prezzo non disponibile",
  already_adhered: "Adesione già inviata per questo anno",
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
  selectedYear,
  selected,
  selectionDisabled,
  onToggle,
}: {
  product: BookConventionCatalogBook;
  selectedYear: BookYear;
  selected: boolean;
  selectionDisabled: boolean;
  onToggle: (productId: number, selectedYear: BookYear) => void;
}) {
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const alreadyAdhered = product.adhered_years.includes(selectedYear);
  const unavailable = !product.is_available || alreadyAdhered;
  const disabled = unavailable || selectionDisabled;
  const isBundle = product.product_type === "bundle";
  const visibleBundleItems = product.bundle_items.slice(0, 4);
  const remainingBundleItems = Math.max(
    product.bundle_items.length - visibleBundleItems.length,
    0
  );
  const unavailableLabel = alreadyAdhered
    ? AVAILABILITY_LABELS.already_adhered
    : product.availability_reason
    ? AVAILABILITY_LABELS[product.availability_reason]
    : "Selezione non disponibile";
  const conventionPrice =
    typeof product.price === "number" && Number.isFinite(product.price)
      ? product.price
      : null;
  const originalPrice =
    typeof product.original_price === "number" &&
    Number.isFinite(product.original_price)
      ? product.original_price
      : null;
  const hasDiscount =
    originalPrice !== null &&
    conventionPrice !== null &&
    originalPrice > conventionPrice;
  const saving = hasDiscount ? originalPrice - conventionPrice : 0;

  return (
    <article
      className={`conv-card book-product-card${selected ? " selected" : ""}${
        disabled ? " unavailable" : ""
      }`}
      aria-labelledby={`book-product-${product.id}`}
    >
      <div className="book-product-media">
        <span className={`book-product-type${isBundle ? " bundle" : ""}`}>
          {isBundle ? (
            <Package size={12} aria-hidden="true" />
          ) : (
            <BookOpen size={12} aria-hidden="true" />
          )}
          {isBundle
            ? `Bundle · ${product.bundle_items.length} libri`
            : PRODUCT_TYPE_LABELS[product.product_type]}
        </span>

        <span className="book-product-selected-mark" aria-hidden="true">
          <Check size={15} strokeWidth={2.6} />
        </span>

        {product.cover_image && failedCoverUrl !== product.cover_image ? (
          <div className="book-product-cover-stage">
            {/* Le URL sono normalizzate server-side sul solo bucket Supabase dedicato. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.cover_image}
              alt=""
              aria-hidden="true"
              className="book-product-cover-ambient"
              loading="lazy"
              decoding="async"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.cover_image}
              alt=""
              className="book-product-cover"
              loading="lazy"
              decoding="async"
              onError={() => setFailedCoverUrl(product.cover_image)}
            />
          </div>
        ) : (
          <div className="book-cover-placeholder" aria-hidden="true">
            {isBundle ? (
              <Package size={30} strokeWidth={1.45} />
            ) : (
              <BookOpen size={30} strokeWidth={1.45} />
            )}
            <span>{isBundle ? "Bundle ASTRA" : "Edizione ASTRA"}</span>
          </div>
        )}
      </div>

      <div className="book-product-body">
        <h3 id={`book-product-${product.id}`} className="book-product-title">
          {product.title}
        </h3>

        {product.isbn ? (
          <p className="book-product-isbn">
            {isBundle ? "ISBN generale bundle" : "ISBN"} {product.isbn}
          </p>
        ) : null}

        {product.description ? (
          <p className="book-product-description">{product.description}</p>
        ) : null}

        {isBundle && product.bundle_items.length > 0 ? (
          <div className="book-bundle-items">
            <p className="book-bundle-items-label">Inclusi nel bundle</p>
            <ul>
              {visibleBundleItems.map((item, index) => (
                <li key={`${product.id}-${index}-${item.title}-${item.isbn ?? ""}`}>
                  <span className="book-bundle-dot" aria-hidden="true" />
                  <span className="book-bundle-item-copy">
                    <span>{item.title}</span>
                    {item.isbn ? (
                      <span className="book-bundle-item-isbn">
                        ISBN {item.isbn}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
              {remainingBundleItems > 0 ? (
                <li>
                  <span className="book-bundle-dot" aria-hidden="true" />
                  <span>Altri {remainingBundleItems} prodotti inclusi</span>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        <div className="book-product-footer">
          <div>
            <span className="book-product-year">
              {BOOK_YEAR_LABELS[selectedYear]}
            </span>
            {hasDiscount ? (
              <span className="book-product-original-price">
                Prezzo originale {formatPrice(originalPrice)}
              </span>
            ) : null}
            <span className="book-product-convention-label">Prezzo convenzione</span>
            <strong className="book-product-price">{formatPrice(conventionPrice)}</strong>
            {hasDiscount ? (
              <span className="book-product-saving">Risparmi {formatPrice(saving)}</span>
            ) : null}
          </div>

          <button
            type="button"
            aria-pressed={selected}
            aria-label={
              selected
                ? `Rimuovi ${product.title} per ${BOOK_YEAR_LABELS[selectedYear]} dalla selezione`
                : disabled
                  ? `${product.title} per ${BOOK_YEAR_LABELS[selectedYear]}: ${
                    unavailable ? unavailableLabel : "selezione non disponibile"
                  }`
                  : `Aggiungi ${product.title} per ${BOOK_YEAR_LABELS[selectedYear]} alla selezione`
            }
            disabled={disabled}
            onClick={() => onToggle(product.id, selectedYear)}
            className={`book-product-action${selected ? " selected" : ""}`}
          >
            {disabled ? (
              unavailable ? unavailableLabel : "Non selezionabile"
            ) : selected ? (
              <>
                <Check size={14} aria-hidden="true" />
                Selezionato
              </>
            ) : (
              <>
                <Plus size={14} aria-hidden="true" />
                Aggiungi
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
