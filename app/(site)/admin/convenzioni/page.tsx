"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────
type Convenzione = {
  id: number;
  titolo: string;
  partner: string;
  descrizione: string;
  vantaggio: string;
  categoria: string;
  link: string;
  ordine: number;
  attiva: boolean;
  created_at: string;
  updated_at: string;
};

type ConvForm = {
  titolo: string;
  partner: string;
  descrizione: string;
  vantaggio: string;
  categoria: string;
  link: string;
  ordine: string;
  attiva: boolean;
};

const EMPTY_FORM: ConvForm = {
  titolo: "", partner: "", descrizione: "", vantaggio: "",
  categoria: "", link: "#", ordine: "0", attiva: true,
};

const CATEGORY_OPTIONS = [
  "Trasporti",
  "Sport",
  "Libri_e_Materiale_Didattico",
  "Tech",
  "Bar_e_Ristoranti",
  "Altro",
];

const categoryColors: Record<string, { bg: string; text: string }> = {
  trasporti: { bg: "rgba(16,107,60,.08)", text: "#0a6638" },
  sport: { bg: "rgba(107,16,16,.08)", text: "#8b1111" },
  libri_e_materiale_didattico: { bg: "rgba(107,60,16,.08)", text: "#7a4010" },
  tech: { bg: "rgba(14,31,107,.08)", text: "#0E1F6B" },
  bar_e_ristoranti: { bg: "rgba(120,16,107,.08)", text: "#7a0f70" },
  altro: { bg: "rgba(8,16,42,.06)", text: "#2E4080" },
  default: { bg: "rgba(8,16,42,.06)", text: "#2E4080" },
};

function normalizeCategoryKey(cat: string) {
  return cat?.trim().toLowerCase().replace(/[\s-]+/g, "_") as keyof typeof categoryColors;
}

function formatCategoryLabel(cat: string) {
  return cat?.replace(/[_-]+/g, " ") ?? "";
}

function getCatStyle(cat: string) {
  const key = normalizeCategoryKey(cat);
  return categoryColors[key] ?? categoryColors.default;
}

// ── Modal ─────────────────────────────────────────────────────────
function ConvModal({
  mode, initial, onClose, onSave,
}: {
  mode: "create" | "edit";
  initial?: Convenzione;
  onClose: () => void;
  onSave: (f: ConvForm) => Promise<void>;
}) {
  const [form, setForm] = useState<ConvForm>(() =>
    mode === "edit" && initial
      ? { titolo: initial.titolo, partner: initial.partner, descrizione: initial.descrizione, vantaggio: initial.vantaggio, categoria: initial.categoria, link: initial.link, ordine: String(initial.ordine), attiva: initial.attiva }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof ConvForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titolo.trim()) { setErr("Il titolo è obbligatorio."); return; }
    if (!form.partner.trim()) { setErr("Il partner è obbligatorio."); return; }
    if (!form.categoria) { setErr("Seleziona una categoria."); return; }
    setSaving(true); setErr("");
    await onSave(form);
    setSaving(false);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,20,50,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: "2rem", padding: "2.5rem", width: "100%", maxWidth: 660, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(10,20,50,.22)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#0f2f6e" }}>
              {mode === "create" ? "Nuova convenzione" : "Modifica convenzione"}
            </h2>
            <p style={{ margin: ".3rem 0 0", color: "#6b7280", fontSize: ".9rem" }}>
              {mode === "create" ? "Compila i campi per aggiungere una convenzione." : "Modifica i dettagli della convenzione."}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(15,47,110,.06)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: "1rem", color: "#6b7280" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* Partner info */}
          <SectionLabel>Partner</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <MField label="Titolo *" value={form.titolo} onChange={v => set("titolo", v)} placeholder="es. Visita medica sportiva" />
            <MField label="Partner *" value={form.partner} onChange={v => set("partner", v)} placeholder="es. MedSport Milano" />
          </div>

          {/* Category + order + status */}
          <SectionLabel>Impostazioni</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
              <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Categoria *</label>
              <select
                value={form.categoria}
                onChange={e => set("categoria", e.target.value)}
                style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: form.categoria ? "#102a56" : "#9ca3af", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".95rem", outline: "none", appearance: "none" }}
              >
                <option value="">Seleziona...</option>
                {CATEGORY_OPTIONS.map(c => (
  <option key={c} value={c}>
    {formatCategoryLabel(c)}
  </option>
))}
              </select>
            </div>
            <MField label="Ordine" type="number" value={form.ordine} onChange={v => set("ordine", v)} placeholder="0" />
            <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", justifyContent: "flex-end" }}>
              <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Stato</label>
              <button
                type="button"
                onClick={() => set("attiva", !form.attiva)}
                style={{
                  border: `1px solid ${form.attiva ? "rgba(12,122,77,.25)" : "rgba(15,47,110,.12)"}`,
                  background: form.attiva ? "rgba(12,122,77,.08)" : "rgba(15,47,110,.04)",
                  color: form.attiva ? "#0b6b46" : "#6b7280",
                  borderRadius: "12px", padding: ".8rem 1rem", fontWeight: 700, fontSize: ".9rem",
                  cursor: "pointer", transition: "all .18s", textAlign: "left",
                  display: "flex", alignItems: "center", gap: ".5rem",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: form.attiva ? "#16a34a" : "#9ca3af", flexShrink: 0 }} />
                {form.attiva ? "Attiva" : "Non attiva"}
              </button>
            </div>
          </div>

          {/* Details */}
          <SectionLabel>Dettagli</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
            <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>Descrizione</label>
            <textarea
              value={form.descrizione}
              onChange={e => set("descrizione", e.target.value)}
              placeholder="Descrivi brevemente la convenzione..."
              rows={3}
              style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#102a56", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".95rem", outline: "none", width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
            />
          </div>
          <MField label="Vantaggio" value={form.vantaggio} onChange={v => set("vantaggio", v)} placeholder="es. 30% di sconto sulla tariffa standard" />
          <MField label="Link" value={form.link} onChange={v => set("link", v)} placeholder="https://..." />

          {err && (
            <div style={{ background: "rgba(190,39,39,.08)", color: "#8b1d1d", border: "1px solid rgba(190,39,39,.14)", borderRadius: "12px", padding: ".8rem 1rem", fontWeight: 600, fontSize: ".9rem" }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end", marginTop: ".5rem" }}>
            <button type="button" onClick={onClose} style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#0f2f6e", borderRadius: "999px", padding: ".7rem 1.5rem", fontWeight: 700, cursor: "pointer" }}>
              Annulla
            </button>
            <button type="submit" disabled={saving} style={{ border: "none", background: saving ? "#8ca4d7" : "#1847a3", color: "white", borderRadius: "999px", padding: ".7rem 2rem", fontWeight: 700, cursor: saving ? "wait" : "pointer", fontSize: ".95rem" }}>
              {saving ? "Salvataggio..." : mode === "create" ? "Crea convenzione" : "Salva modifiche"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
      <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#102a56", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".95rem", outline: "none", width: "100%", transition: "border-color .18s" }} />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#2E4080", margin: "0.4rem 0 0" }}>
      {children}
    </p>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function AdminConvenzioni() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [convenzioni, setConvenzioni] = useState<Convenzione[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; conv?: Convenzione } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<"tutte" | "attive" | "disattive">("tutte");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!profile || profile.role !== "admin") { router.replace("/"); return; }
      await fetchConvenzioni();
    }
    load();
  }, [supabase, router]);

  async function fetchConvenzioni() {
    setLoading(true);
    const { data } = await supabase.from("convenzioni").select("*").order("ordine", { ascending: true });
    setConvenzioni((data ?? []) as Convenzione[]);
    setLoading(false);
  }

  async function handleSave(form: ConvForm, editingId?: number) {
    const payload = {
      titolo: form.titolo.trim(),
      partner: form.partner.trim(),
      descrizione: form.descrizione.trim(),
      vantaggio: form.vantaggio.trim(),
      categoria: form.categoria,
      link: form.link.trim() || "#",
      ordine: Number(form.ordine) || 0,
      attiva: form.attiva,
    };

    if (editingId !== undefined) {
      const { error: err } = await supabase.from("convenzioni").update(payload).eq("id", editingId);
      if (err) { setError("Salvataggio non riuscito."); return; }
      setConvenzioni(c => c.map(x => x.id === editingId ? { ...x, ...payload, updated_at: new Date().toISOString() } : x));
      setSuccess("Convenzione aggiornata.");
    } else {
      const { data, error: err } = await supabase.from("convenzioni").insert(payload).select("*").single();
      if (err || !data) { setError("Creazione non riuscita: " + err?.message); return; }
      setConvenzioni(c => [...c, data as Convenzione].sort((a, b) => a.ordine - b.ordine));
      setSuccess("Convenzione creata.");
    }
    setModal(null);
  }

  async function handleDelete(id: number, titolo: string) {
    if (!window.confirm(`Eliminare "${titolo}"?`)) return;
    setDeletingId(id);
    const { error: err } = await supabase.from("convenzioni").delete().eq("id", id);
    if (err) { setError("Eliminazione non riuscita."); setDeletingId(null); return; }
    setConvenzioni(c => c.filter(x => x.id !== id));
    setSuccess("Convenzione eliminata.");
    setDeletingId(null);
  }

  async function toggleAttiva(conv: Convenzione) {
    const { error: err } = await supabase.from("convenzioni").update({ attiva: !conv.attiva }).eq("id", conv.id);
    if (err) { setError("Aggiornamento stato non riuscito."); return; }
    setConvenzioni(c => c.map(x => x.id === conv.id ? { ...x, attiva: !conv.attiva } : x));
  }

  const filtered = useMemo(() => {
    let list = convenzioni;
    if (filter === "attive") list = list.filter(c => c.attiva);
    if (filter === "disattive") list = list.filter(c => !c.attiva);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.titolo.toLowerCase().includes(q) || c.partner.toLowerCase().includes(q) || c.categoria.toLowerCase().includes(q));
    }
    return list;
  }, [convenzioni, filter, search]);

  const attive = convenzioni.filter(c => c.attiva).length;
  const categories = useMemo(() => [...new Set(convenzioni.map(c => c.categoria).filter(Boolean))], [convenzioni]);

  return (
    <>
      {modal && (
        <ConvModal
          mode={modal.mode}
          initial={modal.conv}
          onClose={() => setModal(null)}
          onSave={f => handleSave(f, modal.conv?.id)}
        />
      )}

      <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f7f9fc 0%,#eef3fb 100%)", padding: "8.5rem 1.5rem 4rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* ── Hero ── */}
          <section style={{ background: "linear-gradient(135deg,#0f2f6e 0%,#1847a3 100%)", borderRadius: "2rem", padding: "clamp(1.5rem,3vw,2.5rem)", color: "white", boxShadow: "0 24px 60px rgba(15,47,110,.18)", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                <span style={{ alignSelf: "flex-start", padding: ".4rem .9rem", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: ".85rem", fontWeight: 700 }}>
                  Amministrazione • Gestione convenzioni
                </span>
                <h1 style={{ margin: 0, fontSize: "clamp(2rem,5vw,3rem)", lineHeight: 1.05, fontWeight: 800 }}>
                  Gestione convenzioni.
                </h1>
                <p style={{ margin: 0, color: "rgba(255,255,255,.8)", lineHeight: 1.6, maxWidth: 500 }}>
                  Crea, modifica, attiva e disattiva le convenzioni visibili agli studenti della community.
                </p>
              </div>
              <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => setModal({ mode: "create" })}
                  style={{ border: "none", background: "#fff", color: "#0f2f6e", padding: ".85rem 1.5rem", borderRadius: "999px", fontWeight: 800, cursor: "pointer", fontSize: ".9rem", display: "inline-flex", alignItems: "center", gap: ".5rem", boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}
                >
                  <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>＋</span> Nuova convenzione
                </button>
                <a href="/admin" style={{ textDecoration: "none", color: "white", padding: ".85rem 1.3rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.1)", fontWeight: 700, whiteSpace: "nowrap" }}>
                  Pannello admin
                </a>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem" }}>
              {[["Totale", convenzioni.length], ["Attive", attive], ["Disattive", convenzioni.length - attive], ["Categorie", categories.length]].map(([l, v]) => (
                <div key={String(l)} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.14)", borderRadius: "1.2rem", padding: ".9rem 1.1rem" }}>
                  <div style={{ fontSize: ".85rem", color: "rgba(255,255,255,.7)" }}>{l}</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: ".2rem" }}>{v}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Messages ── */}
          {(error || success) && (
            <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              {error && (
                <div style={{ background: "rgba(190,39,39,.08)", color: "#8b1d1d", border: "1px solid rgba(190,39,39,.14)", borderRadius: "1rem", padding: ".9rem 1.1rem", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {error}
                  <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#8b1d1d", fontSize: "1rem" }}>✕</button>
                </div>
              )}
              {success && (
                <div style={{ background: "rgba(12,122,77,.08)", color: "#0b6b46", border: "1px solid rgba(12,122,77,.14)", borderRadius: "1rem", padding: ".9rem 1.1rem", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {success}
                  <button onClick={() => setSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#0b6b46", fontSize: "1rem" }}>✕</button>
                </div>
              )}
            </div>
          )}

          {/* ── List ── */}
          <section style={{ background: "rgba(255,255,255,.82)", border: "1px solid rgba(15,47,110,.08)", boxShadow: "0 8px 32px rgba(15,47,110,.07)", backdropFilter: "blur(12px)", borderRadius: "2rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f2f6e" }}>
                {loading ? "Caricamento..." : `${filtered.length} convenzion${filtered.length === 1 ? "e" : "i"}`}
              </h2>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                {(["tutte", "attive", "disattive"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ border: filter === f ? "1px solid #0f2f6e" : "1px solid rgba(15,47,110,.12)", background: filter === f ? "#0f2f6e" : "white", color: filter === f ? "#fff" : "#4a5a7a", borderRadius: "999px", padding: ".45rem 1.1rem", fontWeight: 600, fontSize: ".82rem", cursor: "pointer", transition: "all .18s" }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#6b7280" }}>
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca per titolo, partner o categoria..."
                style={{ width: "100%", padding: ".85rem 1rem .85rem 2.6rem", border: "1px solid rgba(15,47,110,.1)", borderRadius: "999px", background: "white", fontSize: ".92rem", color: "#102a56", outline: "none" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", background: "rgba(15,47,110,.07)", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", color: "#6b7280", fontSize: ".7rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              )}
            </div>

            {/* Items */}
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ height: 88, borderRadius: "1.2rem", background: "rgba(15,47,110,.06)", animation: "sk 1.4s ease infinite" }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#6b7280" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🤝</div>
                <p style={{ fontWeight: 700, color: "#0f2f6e", marginBottom: ".5rem" }}>Nessuna convenzione trovata</p>
                <p style={{ fontSize: ".9rem" }}>Prova a cambiare i filtri o crea una nuova convenzione.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                {filtered.map(c => {
                  const catStyle = getCatStyle(c.categoria);
                  const deleting = deletingId === c.id;
                  const initials = c.partner?.slice(0, 2).toUpperCase() ?? "??";

                  return (
                    <div
                      key={c.id}
                      className="conv-admin-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.2rem",
                        padding: "1.2rem 1.4rem",
                        background: c.attiva ? "#fff" : "rgba(15,47,110,.02)",
                        border: `1px solid ${c.attiva ? "rgba(15,47,110,.08)" : "rgba(15,47,110,.05)"}`,
                        borderRadius: "1.4rem",
                        opacity: c.attiva ? 1 : .65,
                        transition: "box-shadow .2s, transform .2s",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Logo initials */}
                      <div style={{ width: 48, height: 48, borderRadius: "12px", background: "linear-gradient(135deg,#e8edfb 0%,#c8d4f5 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: ".82rem", color: "#0E1F6B", flexShrink: 0, letterSpacing: ".02em" }}>
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="conv-admin-info" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap", marginBottom: ".25rem" }}>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "1rem",
                              fontWeight: 700,
                              color: "#08102A",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                            }}
                          >
                            {c.titolo}
                          </h3>
                          <span style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", background: catStyle.bg, color: catStyle.text, padding: ".22rem .65rem", borderRadius: "999px" }}>
                            {formatCategoryLabel(c.categoria)}
                          </span>
                          {!c.attiva && (
                            <span style={{ fontSize: ".62rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", background: "rgba(15,47,110,.06)", color: "#6b7280", padding: ".2rem .6rem", borderRadius: "999px" }}>
                              Disattiva
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: ".84rem", color: "#2E4080", fontWeight: 600 }}>{c.partner}</p>
                        {c.vantaggio && (
                          <p
                            style={{
                              margin: ".25rem 0 0",
                              fontSize: ".82rem",
                              color: "#6b7280",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                            }}
                          >
                            {c.vantaggio}
                          </p>
                        )}
                      </div>

                      {/* Order badge */}
                      <div
                        className="conv-admin-order"
                        style={{
                          flexShrink: 0,
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "rgba(15,47,110,.06)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: ".75rem",
                          fontWeight: 700,
                          color: "#4a5a7a",
                        }}
                        title="Ordine"
                      >
                        {c.ordine}
                      </div>

                      {/* Actions */}
                      <div className="conv-admin-actions" style={{ display: "flex", gap: ".5rem", flexShrink: 0 }}>
                        <button
                          onClick={() => toggleAttiva(c)}
                          style={{
                            border: `1px solid ${c.attiva ? "rgba(12,122,77,.2)" : "rgba(15,47,110,.14)"}`,
                            background: c.attiva ? "rgba(12,122,77,.07)" : "white",
                            color: c.attiva ? "#0b6b46" : "#4a5a7a",
                            borderRadius: "999px", padding: ".5rem .9rem", fontWeight: 700, fontSize: ".8rem", cursor: "pointer", transition: "all .18s", whiteSpace: "nowrap",
                          }}
                        >
                          {c.attiva ? "Disattiva" : "Attiva"}
                        </button>
                        <button
                          onClick={() => setModal({ mode: "edit", conv: c })}
                          style={{ border: "1px solid rgba(15,47,110,.14)", background: "white", color: "#0f2f6e", borderRadius: "999px", padding: ".5rem 1rem", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", transition: "background .18s" }}
                          className="btn-edit-conv"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.titolo)}
                          disabled={deleting}
                          style={{ border: "1px solid rgba(190,39,39,.18)", background: deleting ? "rgba(190,39,39,.05)" : "white", color: deleting ? "#b57b7b" : "#8b1d1d", borderRadius: "999px", padding: ".5rem 1rem", fontWeight: 700, fontSize: ".82rem", cursor: deleting ? "wait" : "pointer", transition: "background .18s" }}
                        >
                          {deleting ? "..." : "Elimina"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <style>{`
        @keyframes sk { 0%,100%{opacity:.4} 50%{opacity:.85} }
        .conv-admin-row:hover { box-shadow: 0 8px 32px rgba(15,47,110,.1) !important; transform: translateY(-2px); }
        .btn-edit-conv:hover { background: rgba(15,47,110,.05) !important; }
        @media (max-width: 720px) {
          .conv-admin-row {
            align-items: flex-start !important;
            gap: .9rem !important;
            padding: 1rem !important;
          }

          .conv-admin-info {
            min-width: 0 !important;
            flex: 1 1 calc(100% - 60px) !important;
          }

          .conv-admin-order {
            order: 3;
            width: 28px !important;
            height: 28px !important;
            font-size: .72rem !important;
          }

          .conv-admin-actions {
            order: 4;
            width: 100%;
            flex-wrap: wrap;
            margin-top: .15rem;
          }

          .conv-admin-actions button {
            flex: 1 1 100%;
            justify-content: center;
            padding: .72rem 1rem !important;
          }
        }

        @media (max-width: 520px) {
          .conv-admin-row {
            display: grid !important;
            grid-template-columns: 44px 1fr;
            align-items: start !important;
            column-gap: .85rem !important;
            row-gap: .8rem !important;
          }

          .conv-admin-info {
            flex: unset !important;
          }

          .conv-admin-order {
            grid-column: 1 / -1;
            order: unset;
          }

          .conv-admin-actions {
            grid-column: 1 / -1;
            order: unset;
            margin-top: 0;
          }
        }
      `}</style>
    </>
  );
}