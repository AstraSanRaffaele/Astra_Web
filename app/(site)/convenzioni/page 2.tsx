"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GeneralConvention = {
  id: number;
  titolo: string | null;
  partner: string | null;
  descrizione: string | null;
  vantaggio: string | null;
  categoria: string | null;
  link: string | null;
  ordine: number | null;
  attiva: boolean | null;
  is_book_convention: boolean | null;
  convenzione_libri: boolean | null;
};

const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  default: { bg: "rgba(8,16,42,.06)", text: "#2E4080", dot: "#2E4080" },
  trasporti: { bg: "rgba(16,107,60,.08)", text: "#0a6638", dot: "#0a6638" },
  sport: { bg: "rgba(107,16,16,.08)", text: "#8b1111", dot: "#c0392b" },
  tech: { bg: "rgba(14,31,107,.08)", text: "#0E1F6B", dot: "#1A3399" },
  bar_e_ristoranti: { bg: "rgba(120,16,107,.08)", text: "#7a0f70", dot: "#9b12a0" },
  altro: { bg: "rgba(8,16,42,.06)", text: "#2E4080", dot: "#2E4080" },
};

function normalizeCategoryKey(category: string | null) {
  return category?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "default";
}

function formatCategoryLabel(category: string | null) {
  return category?.replace(/[_-]+/g, " ") || "Altro";
}

function getCategoryStyle(category: string | null) {
  return categoryColors[normalizeCategoryKey(category)] ?? categoryColors.default;
}

function SkeletonCard() {
  return (
    <div className="min-h-64 animate-pulse rounded-[1.5rem] border border-[rgba(8,16,42,.06)] bg-white p-5">
      <div className="h-6 w-24 rounded-full bg-[#EEF0F4]" />
      <div className="mt-6 h-6 w-3/4 rounded bg-[#EEF0F4]" />
      <div className="mt-3 h-4 w-1/2 rounded bg-[#F2F3F6]" />
      <div className="mt-7 space-y-2">
        <div className="h-3 w-full rounded bg-[#F2F3F6]" />
        <div className="h-3 w-5/6 rounded bg-[#F2F3F6]" />
      </div>
    </div>
  );
}

export default function ConvenzioniPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [conventions, setConventions] = useState<GeneralConvention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadConventions() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        router.replace("/login?next=/convenzioni");
        return;
      }

      const { data, error: loadError } = await supabase
        .from("convenzioni")
        .select(
          "id, titolo, partner, descrizione, vantaggio, categoria, link, ordine, attiva, is_book_convention, convenzione_libri"
        )
        .order("ordine", { ascending: true });

      if (!active) return;

      if (loadError) {
        setError("Non è stato possibile caricare le convenzioni. Riprova tra poco.");
        setLoading(false);
        return;
      }

      const generalConventions = ((data ?? []) as GeneralConvention[]).filter(
        (convention) =>
          convention.attiva !== false &&
          convention.is_book_convention !== true &&
          convention.convenzione_libri !== true
      );

      setConventions(generalConventions);
      setLoading(false);
    }

    void loadConventions();
    return () => {
      active = false;
    };
  }, [reloadKey, router, supabase]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          conventions
            .map((convention) => convention.categoria?.trim())
            .filter((category): category is string => Boolean(category))
        )
      ).sort((left, right) => left.localeCompare(right, "it")),
    [conventions]
  );

  const filteredConventions = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("it");

    return conventions.filter((convention) => {
      const matchesSearch =
        !query ||
        [
          convention.titolo,
          convention.partner,
          convention.categoria,
          convention.descrizione,
          convention.vantaggio,
        ].some((value) => value?.toLocaleLowerCase("it").includes(query));
      const matchesCategory =
        !activeCategory || convention.categoria === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, conventions, searchTerm]);

  return (
    <main className="min-h-screen bg-[#F8F7F3] text-[#08102A]">
      <section className="px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-24 lg:pt-32">
        <div className="mx-auto max-w-6xl">
          <header className="max-w-3xl">
            <p className="text-[.66rem] font-bold uppercase tracking-[.22em] text-[#2E4080]">
              Convenzioni ASTRA
            </p>
            <h1
              className="mt-3 text-[clamp(2.8rem,7vw,5rem)] font-bold leading-[.95] tracking-[-.035em] text-[#08102A]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Vantaggi per la community.
            </h1>
            <p className="mt-5 max-w-2xl text-[.92rem] leading-7 text-[#596174] sm:text-base">
              Scopri servizi, opportunità e sconti riservati agli studenti ASTRA. Utilizza la tua ASTRA Card oppure i codici dedicati indicati nelle singole convenzioni.
            </p>
          </header>

          <Link
            href="/convenzioni-libri"
            className="group mt-8 grid gap-4 rounded-2xl border border-[rgba(14,31,107,.12)] bg-white p-4 no-underline shadow-[0_8px_28px_rgba(14,31,107,.05)] transition hover:border-[rgba(14,31,107,.24)] hover:shadow-[0_12px_34px_rgba(14,31,107,.08)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-[#E8EDFB] text-[#0E1F6B]">
              <BookOpen size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[.64rem] font-extrabold uppercase tracking-[.16em] text-[#2E4080]">
                Sezione dedicata
              </span>
              <span className="mt-1 block text-lg font-extrabold text-[#08102A]">
                Convenzioni Libri
              </span>
              <span className="mt-1 block text-[.8rem] leading-5 text-[#6B7280]">
                Consulta libri e bundle disponibili, verifica il periodo attivo e invia la tua adesione.
              </span>
            </span>
            <span className="inline-flex items-center gap-2 text-[.78rem] font-extrabold text-[#0E1F6B]">
              Vai alla sezione
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          {!loading && !error ? (
            <div className="mt-8 flex flex-wrap gap-8 border-t border-[rgba(14,31,107,.09)] pt-6">
              <div>
                <strong className="block text-3xl font-extrabold text-[#08102A]">
                  {conventions.length}
                </strong>
                <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-[#7B8290]">
                  Convenzioni attive
                </span>
              </div>
              <div>
                <strong className="block text-3xl font-extrabold text-[#08102A]">
                  {categories.length}
                </strong>
                <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-[#7B8290]">
                  Categorie
                </span>
              </div>
            </div>
          ) : null}

          <section className="mt-9" aria-label="Ricerca convenzioni">
            <label className="relative block">
              <span className="sr-only">Cerca convenzioni</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#7B8290]" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cerca convenzioni, partner o categorie..."
                className="h-12 w-full rounded-full border border-[rgba(14,31,107,.11)] bg-white pl-11 pr-11 text-[.86rem] text-[#08102A] outline-none transition placeholder:text-[#9AA0AC] focus:border-[#2E4080] focus:ring-3 focus:ring-[#2E4080]/10"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[#6B7280] hover:bg-[#F1F3F7]"
                  aria-label="Cancella ricerca"
                >
                  <X size={14} />
                </button>
              ) : null}
            </label>

            {categories.length > 0 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-[.72rem] font-bold transition ${
                    activeCategory === null
                      ? "border-[#0E1F6B] bg-[#0E1F6B] text-white"
                      : "border-[rgba(14,31,107,.12)] bg-white text-[#596174] hover:text-[#0E1F6B]"
                  }`}
                >
                  Tutte
                </button>
                {categories.map((category) => {
                  const selected = activeCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(selected ? null : category)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-[.72rem] font-bold transition ${
                        selected
                          ? "border-[#0E1F6B] bg-[#0E1F6B] text-white"
                          : "border-[rgba(14,31,107,.12)] bg-white text-[#596174] hover:text-[#0E1F6B]"
                      }`}
                    >
                      {formatCategoryLabel(category)}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>

          {error ? (
            <div className="mt-8 rounded-2xl border border-[#E9CACA] bg-[#FFF8F8] p-5 text-center">
              <p className="text-sm font-bold text-[#8B1D1D]">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((current) => current + 1)}
                className="mt-3 rounded-full border border-[#D9B5B5] bg-white px-4 py-2 text-xs font-extrabold text-[#8B1D1D]"
              >
                Riprova
              </button>
            </div>
          ) : loading ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Caricamento convenzioni">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : filteredConventions.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-[rgba(14,31,107,.17)] bg-white px-5 py-14 text-center">
              <h2 className="font-extrabold text-[#08102A]">Nessuna convenzione trovata</h2>
              <p className="mt-1 text-sm text-[#7B8290]">Modifica la ricerca o seleziona un’altra categoria.</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredConventions.map((convention) => {
                const categoryStyle = getCategoryStyle(convention.categoria);
                const externalLink = convention.link && convention.link !== "#"
                  ? convention.link
                  : null;

                return (
                  <article
                    key={convention.id}
                    className="flex min-h-64 flex-col rounded-[1.5rem] border border-[rgba(8,16,42,.07)] bg-white p-5 shadow-[0_3px_16px_rgba(8,16,42,.04)] transition hover:-translate-y-0.5 hover:border-[rgba(8,16,42,.13)] hover:shadow-[0_12px_32px_rgba(8,16,42,.07)]"
                  >
                    <span
                      className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[.63rem] font-extrabold uppercase tracking-[.1em]"
                      style={{ background: categoryStyle.bg, color: categoryStyle.text }}
                    >
                      <span className="size-1.5 rounded-full" style={{ background: categoryStyle.dot }} />
                      {formatCategoryLabel(convention.categoria)}
                    </span>

                    <h2 className="mt-5 text-lg font-extrabold leading-snug text-[#08102A]">
                      {convention.titolo || "Convenzione ASTRA"}
                    </h2>
                    {convention.partner ? (
                      <p className="mt-1 text-[.76rem] font-bold text-[#2E4080]">
                        {convention.partner}
                      </p>
                    ) : null}
                    {convention.descrizione ? (
                      <p className="mt-4 line-clamp-3 text-[.8rem] leading-6 text-[#6B7280]">
                        {convention.descrizione}
                      </p>
                    ) : null}

                    {convention.vantaggio ? (
                      <div className="mt-5 rounded-xl bg-[#F6F7FA] px-3.5 py-3">
                        <span className="block text-[.58rem] font-extrabold uppercase tracking-[.13em] text-[#7B8290]">
                          Vantaggio
                        </span>
                        <strong className="mt-1 block text-[.8rem] leading-5 text-[#08102A]">
                          {convention.vantaggio}
                        </strong>
                      </div>
                    ) : null}

                    {externalLink ? (
                      <a
                        href={externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto inline-flex w-fit items-center gap-2 pt-5 text-[.76rem] font-extrabold text-[#0E1F6B] no-underline hover:underline"
                      >
                        Scopri di più <ArrowRight size={14} />
                      </a>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
