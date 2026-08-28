"use client";

import { useEffect } from "react";
import {
  BookOpen,
  CalendarDays,
  CreditCard,
  Mail,
  MapPin,
  Package,
  ReceiptText,
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
  formatDateOnly,
  formatPaymentMethod,
  formatPrice,
  getAdhesionTotal,
  getConventionTitle,
  getFullName,
  getProfileCourse,
  getProfileEmail,
  getProfileYear,
  getSelectedProducts,
  shortenId,
} from "./adhesion-utils";
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
  const email = getProfileEmail(adhesion.profiles);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-[#071633]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="adhesion-detail-title"
        aria-modal="true"
        className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#dfe5ef] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">
              Dettaglio adesione
            </p>
            <h2 id="adhesion-detail-title" className="text-xl font-extrabold text-[#102d63]">
              {getFullName(adhesion.profiles)}
            </h2>
            <p className="mt-1 font-mono text-xs text-[#64748b]" title={adhesion.id}>
              ID {shortenId(adhesion.id)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#dfe5ef] text-[#334155] transition hover:bg-[#f1f5f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1847a3]"
            aria-label="Chiudi dettaglio"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-5">
              <DetailSection icon={<UserRound />} title="Utente">
                <DetailRow label="Nome e cognome" value={getFullName(adhesion.profiles)} />
                <DetailRow
                  label="Email"
                  value={
                    email === "—" ? (
                      "—"
                    ) : (
                      <a className="break-all font-semibold text-[#1847a3] hover:underline" href={`mailto:${email}`}>
                        {email}
                      </a>
                    )
                  }
                />
                <DetailRow label="Corso" value={getProfileCourse(adhesion.profiles)} />
                <DetailRow label="Anno" value={String(getProfileYear(adhesion.profiles))} />
                <DetailRow label="ID utente" value={<span className="break-all font-mono text-xs">{adhesion.user_id}</span>} />
              </DetailSection>

              <DetailSection icon={<ReceiptText />} title="Fatturazione e spedizione">
                <DetailRow label="CF / Partita IVA" value={adhesion.fiscal_code_or_vat || "—"} />
                <DetailRow
                  label="Indirizzo"
                  value={<span className="whitespace-pre-line">{adhesion.billing_shipping_address || "—"}</span>}
                />
              </DetailSection>

              <DetailSection icon={<CalendarDays />} title="Registrazione">
                <DetailRow label="Data adesione" value={formatDate(adhesion.created_at)} />
                <DetailRow label="Convenzione" value={getConventionTitle(adhesion.convenzioni)} />
                <DetailRow
                  label="Periodo"
                  value={
                    adhesion.book_convention_rounds
                      ? `${formatDateOnly(adhesion.book_convention_rounds.starts_at)} – ${formatDateOnly(
                          adhesion.book_convention_rounds.ends_at
                        )}`
                      : "Senza periodo"
                  }
                />
              </DetailSection>
            </div>

            <div className="space-y-5">
              <section className="overflow-hidden rounded-xl border border-[#dfe5ef]">
                <div className="flex items-center justify-between gap-3 border-b border-[#dfe5ef] bg-[#f8fafc] px-4 py-3">
                  <div className="flex items-center gap-2 font-extrabold text-[#102d63]">
                    <BookOpen className="size-4" />
                    Prodotti selezionati
                  </div>
                  <span className="text-xs font-bold text-[#64748b]">
                    {products.length} {products.length === 1 ? "proposta" : "proposte"}
                  </span>
                </div>

                {products.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-[#64748b]">Nessun prodotto salvato nello snapshot.</p>
                ) : (
                  <div className="divide-y divide-[#e8edf4]">
                    {products.map((product, index) => (
                      <article key={`${product.id ?? product.title}-${index}`} className="p-4">
                        <div className="flex items-start gap-3">
                          <span
                            className="flex h-[76px] w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#dfe5ef] bg-[#f8fafc] bg-contain bg-center bg-no-repeat text-[#64748b] shadow-sm"
                            style={
                              product.cover_image
                                ? { backgroundImage: `url(${JSON.stringify(product.cover_image)})` }
                                : undefined
                            }
                            role={product.cover_image ? "img" : undefined}
                            aria-label={product.cover_image ? `Copertina di ${product.title}` : undefined}
                          >
                            {!product.cover_image ? (
                              product.product_type === "bundle" ? (
                                <Package className="size-5" strokeWidth={1.7} aria-hidden="true" />
                              ) : (
                                <BookOpen className="size-5" strokeWidth={1.7} aria-hidden="true" />
                              )
                            ) : null}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <span className="rounded-md bg-[#e9effc] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#1847a3]">
                                    {PRODUCT_TYPE_LABELS[product.product_type]}
                                  </span>
                                  {product.reference_year && (
                                    <span className="text-xs font-semibold text-[#64748b]">
                                      {BOOK_YEAR_LABELS[product.reference_year]}
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-sm font-extrabold leading-5 text-[#172554]">{product.title}</h3>
                                {product.study_area && (
                                  <p className="mt-1 text-xs text-[#64748b]">{STUDY_AREA_LABELS[product.study_area]}</p>
                                )}
                              </div>
                              <strong className="shrink-0 text-sm text-[#0f766e]">
                                {formatPrice(product.price)}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {product.product_type === "bundle" && product.bundle_items.length > 0 && (
                          <div className="mt-3 rounded-lg bg-[#f8fafc] px-3 py-2">
                            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#475569]">
                              <Package className="size-3.5" /> Elementi inclusi
                            </p>
                            <ul className="space-y-1 pl-4 text-xs leading-5 text-[#475569]">
                              {product.bundle_items.map((item, itemIndex) => (
                                <li className="list-disc" key={`${item}-${itemIndex}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-[#dfe5ef] bg-[#f8fafc] px-4 py-4">
                  <span className="font-bold text-[#334155]">Totale salvato</span>
                  <strong className="text-lg text-[#102d63]">{formatPrice(total)}</strong>
                </div>
              </section>

              <DetailSection icon={<CreditCard />} title="Pagamento">
                <DetailRow label="Metodo" value={formatPaymentMethod(adhesion.payment_method)} />
                <p className="mt-3 rounded-lg bg-[#fff8e7] px-3 py-2 text-xs leading-5 text-[#7c5b14]">
                  Il metodo indica la scelta effettuata dall’utente. Il database non contiene uno stato di incasso.
                </p>
              </DetailSection>

              <div className="flex flex-wrap gap-2">
                {email !== "—" && (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1847a3] px-4 text-sm font-bold text-white transition hover:bg-[#123b8c]"
                  >
                    <Mail className="size-4" /> Scrivi all’utente
                  </a>
                )}
                {adhesion.billing_shipping_address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      adhesion.billing_shipping_address
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5e1] px-4 text-sm font-bold text-[#334155] transition hover:bg-[#f8fafc]"
                  >
                    <MapPin className="size-4" /> Apri indirizzo
                  </a>
                )}
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
  icon: React.ReactElement;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#dfe5ef] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#102d63] [&_svg]:size-4">
        {icon}
        {title}
      </h3>
      <dl className="space-y-2.5">{children}</dl>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[125px_1fr] sm:gap-3">
      <dt className="text-xs font-semibold text-[#64748b]">{label}</dt>
      <dd className="min-w-0 text-sm font-medium leading-5 text-[#334155]">{value}</dd>
    </div>
  );
}
