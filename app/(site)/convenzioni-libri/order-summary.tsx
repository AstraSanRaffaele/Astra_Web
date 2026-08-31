"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, ShieldCheck, ShoppingBag, Trash2, X } from "lucide-react";
import type {
  BookBundleItem,
  BookConventionCatalogBook,
} from "@/lib/book-convention";
import styles from "./order-summary.module.css";

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

  const visibleItems = items.slice(0, 2);
  const remainingItems = items.length - visibleItems.length;

  return (
    <p className={styles.bundleSummary}>
      <strong>Include:</strong> {visibleItems.map((item) => item.title).join(", ")}
      {remainingItems > 0 ? ` e altri ${remainingItems}` : ""}
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

  function proceed() {
    setMobileOpen(false);
    onProceed();
  }

  return (
    <div className={styles.layout}>
      <div aria-hidden="true" className={styles.mobileSpacer} />

      <aside
        aria-label="Carrello"
        className={`${styles.cart} ${mobileOpen ? styles.cartOpen : ""}`}
      >
        <div className={styles.panel}>
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            aria-expanded={mobileOpen}
            aria-controls={mobileContentId}
            className={styles.mobileToggle}
          >
            <span className={styles.mobileIcon}>
              <ShoppingBag size={17} aria-hidden="true" />
              {products.length > 0 ? (
                <span className={styles.counter}>{products.length}</span>
              ) : null}
            </span>

            <span className={styles.mobileCopy}>
              <strong>Il tuo carrello</strong>
              <span aria-live="polite">{itemLabel}</span>
            </span>

            <span className={styles.mobileTotal}>
              <strong>{formatPrice(total)}</strong>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={styles.chevron}
              />
            </span>
          </button>

          <div id={mobileContentId} className={styles.content}>
            <header className={styles.desktopHeader}>
              <span className={styles.headerIcon}>
                <ShoppingBag size={17} aria-hidden="true" />
              </span>
              <span>
                <strong>Il tuo carrello</strong>
                <small aria-live="polite">{itemLabel}</small>
              </span>
            </header>

            <div className={styles.mobileHead}>
              <p>Riepilogo selezione</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Chiudi il carrello"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            {products.length === 0 ? (
              <div className={styles.empty}>
                <ShoppingBag size={22} aria-hidden="true" />
                <strong>Il carrello è vuoto</strong>
                <p>Scegli una proposta disponibile per aggiungerla al riepilogo.</p>
              </div>
            ) : (
              <div className={styles.list}>
                {products.map((product) => {
                  const originalPrice = getOriginalPrice(
                    product.price,
                    product.original_price
                  );
                  const saving = originalPrice
                    ? originalPrice - (product.price ?? 0)
                    : 0;

                  return (
                    <article key={product.id} className={styles.item}>
                      <div className={styles.itemTop}>
                        <div className={styles.itemCopy}>
                          <h3>{product.title}</h3>
                          <BundleItemsSummary items={product.bundle_items} />
                        </div>

                        <div className={styles.itemPrice}>
                          {originalPrice ? (
                            <span>{formatPrice(originalPrice)}</span>
                          ) : null}
                          <strong>{formatPrice(product.price)}</strong>
                        </div>
                      </div>

                      <div className={styles.itemActions}>
                        {saving > 0 ? (
                          <span className={styles.saving}>
                            Risparmi {formatPrice(saving)}
                          </span>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={() => onRemove(product.id)}
                          className={styles.remove}
                          aria-label={`Rimuovi ${product.title} dal carrello`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          Rimuovi
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <footer className={styles.footer}>
              <div className={styles.totalRow}>
                <div className={styles.totalCopy}>
                  <span>Totale</span>
                  <strong>{formatPrice(total)}</strong>
                  {totalSaving > 0 ? (
                    <small>Risparmio totale {formatPrice(totalSaving)}</small>
                  ) : null}
                </div>
                <p className={styles.serverNote}>
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>Prezzi verificati alla conferma</span>
                </p>
              </div>

              <button
                type="button"
                onClick={proceed}
                disabled={!canAdhere || products.length === 0}
                className={styles.proceed}
              >
                Conferma la selezione
              </button>
            </footer>
          </div>
        </div>
      </aside>
    </div>
  );
}
