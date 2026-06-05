"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────
type Role = "user" | "admin";
type RuoloTessera = "socio" | "direttivo";
type SortKey = "nome" | "cognome" | "email_istituzionale" | "numero_telefono" | "facolta" | "corso_di_laurea" | "anno_di_laurea" | "data_di_nascita" | "role" | "ruolo_tessera" | "created_at" | "updated_at";

type Profile = {
  id: string; nome: string; cognome: string; email_istituzionale: string;
  numero_telefono: string; facolta: string; corso_di_laurea: string;
  anno_di_laurea: number; data_di_nascita: string; role: Role;
  ruolo_tessera: RuoloTessera; created_at: string; updated_at: string;
};

type NewUser = {
  email: string; password: string; nome: string; cognome: string;
  numero_telefono: string; facolta: string; corso_di_laurea: string;
  anno_di_laurea: string; data_di_nascita: string;
  role: Role; ruolo_tessera: RuoloTessera;
};

// ── Static data ───────────────────────────────────────────────────
const FACULTY_OPTIONS = [
  { value: "", label: "Tutte le facoltà" },
  { value: "medicina", label: "Medicina" },
  { value: "psicologia", label: "Psicologia" },
  { value: "filosofia", label: "Filosofia" },
];

const DEGREES: Record<string, string[]> = {
  medicina: [
    "Cdl magistrale a ciclo unico in Medicina e Chirurgia",
    "International Medical Doctor Program",
    "Cdl triennale in Ricerca biotecnologica in medicina",
    "Cdl triennale in Fisioterapia",
    "Cdl triennale in Igiene dentale",
    "Cdl magistrale in Odontoiatria e protesi dentaria",
    "Cdl magistrale in Biotechnology for Innovative Therapeutics",
    "Cdl magistrale in Scienze riabilitative delle professioni sanitarie",
    "Cdl triennale in Ostetricia",
    "Cdl magistrale in Health Informatics",
    "Cdl Magistrale in Scienze infermieristiche ed ostetriche",
    "Cdl triennale in Infermieristica",
    "CdL triennale in Osteopatia",
    "CdL triennale in Tecniche di Radiologia Medica per Immagini e Radioterapia",
  ],
  psicologia: [
    "Cdl triennale in Scienze e tecniche psicologiche",
    "Cdl triennale in Scienze politiche e strategie globali",
    "Cdl magistrale in Psicologia",
    "Cdl magistrale in Cognitive psychology in health communication",
    "Cdl magistrale in Geopolitica, economia e strategie globali",
  ],
  filosofia: [
    "Cdl triennale in Filosofia",
    "Cdl magistrale in Filosofia del mondo contemporaneo",
    "Cdl magistrale in Teoria e storia delle arti e dell’immagine",
    "Cdl magistrale in Politics, Philosophy and Public Affairs",
  ],
};

const SORT_COLS: Array<{ label: string; key: SortKey }> = [
  { label: "Nome", key: "nome" }, { label: "Cognome", key: "cognome" },
  { label: "Email istituzionale", key: "email_istituzionale" }, { label: "Telefono", key: "numero_telefono" },
  { label: "Facoltà", key: "facolta" }, { label: "Corso di laurea", key: "corso_di_laurea" },
  { label: "Anno di laurea", key: "anno_di_laurea" }, { label: "Data di nascita", key: "data_di_nascita" },
  { label: "Ruolo", key: "role" }, { label: "Ruolo tessera", key: "ruolo_tessera" },
  { label: "Creato il", key: "created_at" }, { label: "Aggiornato il", key: "updated_at" },
];

const EMPTY_NEW_USER: NewUser = {
  email: "", password: "", nome: "", cognome: "", numero_telefono: "",
  facolta: "medicina", corso_di_laurea: "Medicina e Chirurgia",
  anno_di_laurea: String(new Date().getFullYear()), data_di_nascita: "",
  role: "user", ruolo_tessera: "socio",
};

// ── Helpers ───────────────────────────────────────────────────────
const fmt = (v?: string | null) => v ? new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v)) : "—";
const norm = (v: unknown) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const isDirty = (orig: Profile, edit?: Profile) => !edit ? false : (
  edit.nome !== orig.nome || edit.cognome !== orig.cognome ||
  edit.email_istituzionale !== orig.email_istituzionale || edit.numero_telefono !== orig.numero_telefono ||
  edit.facolta !== orig.facolta || edit.corso_di_laurea !== orig.corso_di_laurea ||
  Number(edit.anno_di_laurea) !== Number(orig.anno_di_laurea) ||
  edit.data_di_nascita !== orig.data_di_nascita || edit.role !== orig.role || edit.ruolo_tessera !== orig.ruolo_tessera
);
const getSortVal = (p: Profile, key: SortKey) => {
  const v = p[key];
  if (key === "anno_di_laurea") return Number(v ?? 0);
  if (["created_at", "updated_at", "data_di_nascita"].includes(key)) return new Date(String(v ?? "")).getTime() || 0;
  return norm(v as string);
};

// ── Styles ────────────────────────────────────────────────────────
const s = {
  th: { textAlign: "left", padding: ".95rem 1rem", color: "#123066", fontSize: ".92rem", fontWeight: 800, borderBottom: "1px solid rgba(15,47,110,.08)", borderRight: "1px solid rgba(15,47,110,.06)", position: "sticky", top: 0, background: "#edf3ff", zIndex: 1, whiteSpace: "nowrap" } as CSSProperties,
  td: { padding: ".55rem .75rem", borderBottom: "1px solid rgba(15,47,110,.08)", borderRight: "1px solid rgba(15,47,110,.06)", verticalAlign: "middle" } as CSSProperties,
  tdMuted: { padding: ".55rem .75rem", borderBottom: "1px solid rgba(15,47,110,.08)", borderRight: "1px solid rgba(15,47,110,.06)", verticalAlign: "middle", color: "#5c7095", fontSize: ".9rem", whiteSpace: "nowrap" } as CSSProperties,
  field: { width: "100%", border: "none", background: "transparent", color: "#102a56", padding: ".15rem 0", fontSize: ".92rem", outline: "none", minWidth: 120, appearance: "none", WebkitAppearance: "none" } as CSSProperties,
  filterInput: { border: "1px solid rgba(15,47,110,.10)", background: "white", color: "#102a56", borderRadius: "1rem", padding: ".95rem 1rem", fontSize: "1rem", outline: "none", width: "100%" } as CSSProperties,
  modalInput: { border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#102a56", borderRadius: "12px", padding: ".8rem 1rem", fontSize: ".95rem", outline: "none", width: "100%", transition: "border-color .18s" } as CSSProperties,
  btnSecondary: { border: "1px solid rgba(15,47,110,.12)", background: "white", color: "#0f2f6e", borderRadius: ".8rem", padding: ".9rem 1rem", fontWeight: 700, cursor: "pointer" } as CSSProperties,
  btnPrimary: { border: "none", background: "#1847a3", color: "white", borderRadius: ".8rem", padding: ".9rem 1.4rem", fontWeight: 700, cursor: "pointer", fontSize: ".95rem" } as CSSProperties,
  btnSave: { border: "none", color: "white", borderRadius: ".38rem", padding: ".56rem .5rem", fontWeight: 700, fontSize: ".79rem", lineHeight: 1.1, cursor: "pointer" } as CSSProperties,
  btnDelete: { border: "1px solid rgba(190,39,39,.14)", borderRadius: ".38rem", padding: ".56rem .5rem", fontWeight: 700, fontSize: ".79rem", lineHeight: 1.1 } as CSSProperties,
  badge: (d: boolean): CSSProperties => ({ fontSize: ".71rem", fontWeight: 800, color: d ? "#1847a3" : "#55709a", background: d ? "rgba(24,71,163,.08)" : "rgba(85,112,154,.08)", border: `1px solid ${d ? "rgba(24,71,163,.12)" : "rgba(85,112,154,.12)"}`, borderRadius: 999, padding: ".24rem .48rem", alignSelf: "flex-start" }),
  stickySelH: { left: 0, zIndex: 5, width: 64, minWidth: 64, maxWidth: 64, background: "#edf3ff", boxShadow: "1px 0 0 rgba(15,47,110,.08)" } as CSSProperties,
  stickyFColH: { left: 64, zIndex: 4, background: "#edf3ff", boxShadow: "1px 0 0 rgba(15,47,110,.08)" } as CSSProperties,
  stickyLColH: { right: 0, zIndex: 4, background: "#edf3ff", boxShadow: "-1px 0 0 rgba(15,47,110,.08)" } as CSSProperties,
  stickySelC: { position: "sticky", left: 0, zIndex: 4, width: 64, minWidth: 64, maxWidth: 64, boxShadow: "1px 0 0 rgba(15,47,110,.06)" } as CSSProperties,
  stickyFColC: { position: "sticky", left: 64, zIndex: 3, boxShadow: "1px 0 0 rgba(15,47,110,.06)" } as CSSProperties,
  stickyLColC: { position: "sticky", right: 0, zIndex: 3, boxShadow: "-1px 0 0 rgba(15,47,110,.06)" } as CSSProperties,
  error: { background: "rgba(190,39,39,.08)", color: "#8b1d1d", border: "1px solid rgba(190,39,39,.14)", borderRadius: "1rem", padding: ".95rem 1rem", fontWeight: 600 } as CSSProperties,
  success: { background: "rgba(12,122,77,.08)", color: "#0b6b46", border: "1px solid rgba(12,122,77,.14)", borderRadius: "1rem", padding: ".95rem 1rem", fontWeight: 600 } as CSSProperties,
};

// ── Create User Modal ─────────────────────────────────────────────
function CreateUserModal({ onClose, onCreate }: { onClose: () => void; onCreate: (u: Profile) => void }) {
  const [form, setForm] = useState<NewUser>(EMPTY_NEW_USER);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof NewUser, v: string) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === "facolta") next.corso_di_laurea = DEGREES[v]?.[0] ?? "";
    return next;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password || !form.nome || !form.cognome) { setErr("Compila tutti i campi obbligatori."); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, anno_di_laurea: Number(form.anno_di_laurea) }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "Errore sconosciuto."); setLoading(false); return; }
      onCreate(json.user as Profile);
      onClose();
    } catch {
      setErr("Errore di rete.");
    }
    setLoading(false);
  }

  const degOpts = DEGREES[form.facolta] ?? [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,50,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "2rem", padding: "2.5rem", width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(10,20,50,.22)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#0f2f6e" }}>Nuovo utente</h2>
            <p style={{ margin: ".3rem 0 0", color: "#6b7280", fontSize: ".9rem" }}>Crea un account su Auth e il relativo profilo.</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(15,47,110,.06)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: "1rem", color: "#6b7280" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* Auth fields */}
          <p style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#2E4080", margin: 0 }}>Account</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <ModalField label="Email *" type="email" value={form.email} onChange={v => set("email", v)} />
            <ModalField label="Password *" type="password" value={form.password} onChange={v => set("password", v)} placeholder="Min. 6 caratteri" />
          </div>

          {/* Profile fields */}
          <p style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#2E4080", margin: "0.5rem 0 0" }}>Profilo</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <ModalField label="Nome *" value={form.nome} onChange={v => set("nome", v)} />
            <ModalField label="Cognome *" value={form.cognome} onChange={v => set("cognome", v)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <ModalField label="Telefono" value={form.numero_telefono} onChange={v => set("numero_telefono", v)} />
            <ModalField label="Data di nascita" type="date" value={form.data_di_nascita} onChange={v => set("data_di_nascita", v)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <ModalSelect label="Facoltà" value={form.facolta} onChange={v => set("facolta", v)} options={FACULTY_OPTIONS.filter(o => o.value)} />
            <ModalSelect label="Corso di laurea" value={form.corso_di_laurea} onChange={v => set("corso_di_laurea", v)} options={degOpts.map(d => ({ value: d, label: d }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <ModalField label="Anno di laurea" type="number" value={form.anno_di_laurea} onChange={v => set("anno_di_laurea", v)} />
            <ModalSelect label="Ruolo" value={form.role} onChange={v => set("role", v as Role)} options={[{ value: "user", label: "User" }, { value: "admin", label: "Admin" }]} />
            <ModalSelect label="Ruolo tessera" value={form.ruolo_tessera} onChange={v => set("ruolo_tessera", v as RuoloTessera)} options={[{ value: "socio", label: "Socio" }, { value: "direttivo", label: "Direttivo" }]} />
          </div>

          {err && <div style={s.error}>{err}</div>}

          <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end", marginTop: ".5rem" }}>
            <button type="button" onClick={onClose} style={s.btnSecondary}>Annulla</button>
            <button type="submit" disabled={loading} style={{ ...s.btnPrimary, opacity: loading ? .7 : 1, cursor: loading ? "wait" : "pointer" }}>
              {loading ? "Creazione..." : "Crea utente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
      <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s.modalInput} />
    </div>
  );
}

function ModalSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
      <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...s.modalInput, appearance: "none" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function AdminUtentiPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [edited, setEdited] = useState<Record<string, Profile>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ role: "", ruolo_tessera: "", facolta: "", corso: "", anno: "" });
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "created_at", dir: "desc" });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const PAGE_SIZE = 12;

  async function fetchAllProfiles() {
    const batchSize = 1000;
    let from = 0;
    let rows: Profile[] = [];
    let total: number | null = null;

    while (true) {
      const { data, error, count } = await supabase
        .from("profiles")
        .select("*", { count: from === 0 ? "exact" : undefined })
        .order("created_at", { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) throw error;

      const chunk = (data ?? []) as Profile[];
      rows = [...rows, ...chunk];

      if (from === 0) total = count ?? null;

      if (chunk.length < batchSize) break;
      if (total !== null && rows.length >= total) break;

      from += batchSize;
    }

    return rows;
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: admin } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!admin || admin.role !== "admin") { router.replace("/profilo"); return; }
      let all: Profile[] = [];

      try {
        all = await fetchAllProfiles();
      } catch {
        if (!active) return;
        setError("Impossibile caricare gli utenti.");
        setLoading(false);
        return;
      }

      if (!active) return;

      const safe = all;
      setAdminProfile(admin as Profile);
      setProfiles(safe);
      setEdited(safe.reduce<Record<string, Profile>>((acc, p) => { acc[p.id] = { ...p }; return acc; }, {}));
      setSelected([]); setPage(1); setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router, supabase]);

  const availableYears = useMemo(() => [...new Set(profiles.map(p => p.anno_di_laurea).filter(y => !isNaN(y)))].sort((a, b) => b - a), [profiles]);
  const availableCourses = useMemo(() => {
    const src = filters.facolta ? profiles.filter(p => p.facolta === filters.facolta) : profiles;
    return [...new Set(src.map(p => p.corso_di_laurea).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
  }, [profiles, filters.facolta]);

  const filtered = useMemo(() => {
    const q = norm(search);
    return [...profiles.filter(p => {
      const ms = !q || [p.nome, p.cognome, p.email_istituzionale, p.numero_telefono, p.facolta, p.corso_di_laurea, p.role, p.ruolo_tessera, p.id, p.anno_di_laurea].map(norm).some(v => v.includes(q));
      return ms && (!filters.role || p.role === filters.role) && (!filters.ruolo_tessera || p.ruolo_tessera === filters.ruolo_tessera) && (!filters.facolta || p.facolta === filters.facolta) && (!filters.corso || p.corso_di_laurea === filters.corso) && (!filters.anno || String(p.anno_di_laurea) === filters.anno);
    })].sort((a, b) => {
      const av = getSortVal(a, sort.key), bv = getSortVal(b, sort.key);
      return av < bv ? (sort.dir === "asc" ? -1 : 1) : av > bv ? (sort.dir === "asc" ? 1 : -1) : 0;
    });
  }, [profiles, search, filters, sort]);

  const dirtyIds = useMemo(() => profiles.filter(p => isDirty(p, edited[p.id])).map(p => p.id), [profiles, edited]);
  const totalAdmins = useMemo(() => profiles.filter(p => p.role === "admin").length, [profiles]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered.length]);
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  const pageIds = useMemo(() => paginated.map(p => p.id), [paginated]);
  const allPageSel = pageIds.length > 0 && pageIds.every(id => selected.includes(id));
  const somePageSel = pageIds.some(id => selected.includes(id));

  useEffect(() => { setSelected(c => c.filter(id => filtered.some(p => p.id === id))); }, [filtered]);
  useEffect(() => { setPage(c => Math.min(c, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))); }, [filtered.length]);

  function updateEdited(id: string, field: keyof Profile, value: string) {
    setEdited(cur => {
      const base = cur[id] ?? profiles.find(p => p.id === id);
      if (!base) return cur;
      const next = { ...base, [field]: field === "anno_di_laurea" ? Number(value) : value } as Profile;
      if (field === "facolta") {
        const opts = DEGREES[String(value)] ?? [];
        if (!opts.includes(next.corso_di_laurea)) next.corso_di_laurea = opts[0] ?? "";
        setFilters(f => f.corso && !opts.includes(f.corso) ? { ...f, corso: "" } : f);
      }
      return { ...cur, [id]: next };
    });
    setSuccess("");
  }

  function toggleSort(key: SortKey) { setSort(c => c.key === key ? { key, dir: c.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }); setPage(1); }
  function toggleSelect(id: string) { setSelected(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]); }
  function toggleSelectPage() { setSelected(c => allPageSel ? c.filter(id => !pageIds.includes(id)) : [...new Set([...c, ...pageIds])]); }

  async function handleSave(id: string) {
    const p = edited[id]; if (!p) return;
    setSavingId(id); setError(""); setSuccess("");
    const { error: err, data } = await supabase.from("profiles").update({
      nome: p.nome, cognome: p.cognome, email_istituzionale: p.email_istituzionale,
      numero_telefono: p.numero_telefono, facolta: p.facolta, corso_di_laurea: p.corso_di_laurea,
      anno_di_laurea: Number(p.anno_di_laurea), data_di_nascita: p.data_di_nascita,
      role: p.role, ruolo_tessera: p.ruolo_tessera,
    }).eq("id", id).select("*").single();
    if (err || !data) { setError("Salvataggio non riuscito."); setSavingId(null); return; }
    const u = data as Profile;
    setProfiles(c => c.map(x => x.id === id ? u : x));
    setEdited(c => ({ ...c, [id]: u }));
    setSuccess(`${u.nome} ${u.cognome} aggiornato.`);
    setSavingId(null);
  }

  async function handleDelete(id: string) {
    const target = profiles.find(p => p.id === id); if (!target) return;
    if (!window.confirm(`Eliminare ${target.nome} ${target.cognome}?`)) return;
    setSavingId(id); setError(""); setSuccess("");
    const { error: err } = await supabase.from("profiles").delete().eq("id", id);
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Eliminazione non riuscita.");
      setSavingId(null);
      return;
    }
    setProfiles(c => c.filter(p => p.id !== id));
    setSelected(c => c.filter(x => x !== id));
    setEdited(c => { const n = { ...c }; delete n[id]; return n; });
    setSuccess(`${target.nome} ${target.cognome} eliminato.`);
    setSavingId(null); setPage(1);
  }

  function handleExportCsv() {
    const sel = filtered.filter(p => selected.includes(p.id));
    if (!sel.length) { setError("Seleziona almeno un utente."); return; }
    const cols: Array<{ key: keyof Profile; label: string }> = [
      { key: "id", label: "ID" }, { key: "nome", label: "Nome" }, { key: "cognome", label: "Cognome" },
      { key: "email_istituzionale", label: "Email" }, { key: "numero_telefono", label: "Telefono" },
      { key: "facolta", label: "Facoltà" }, { key: "corso_di_laurea", label: "Corso" },
      { key: "anno_di_laurea", label: "Anno laurea" }, { key: "data_di_nascita", label: "Nascita" },
      { key: "role", label: "Ruolo" }, { key: "ruolo_tessera", label: "Tessera" },
      { key: "created_at", label: "Creato" }, { key: "updated_at", label: "Aggiornato" },
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const maps: Record<string, Record<string, string>> = { facolta: { medicina: "Medicina", psicologia: "Psicologia", filosofia: "Filosofia" }, role: { user: "User", admin: "Admin" }, ruolo_tessera: { socio: "Socio", direttivo: "Direttivo" } };
    const fmtV = (p: Profile, k: keyof Profile) => ["created_at", "updated_at"].includes(k) ? fmt(p[k] as string) : maps[k] ? (maps[k][String(p[k] ?? "")] ?? p[k]) : p[k];
    const csv = [cols.map(c => esc(c.label)).join(";"), ...sel.map(p => cols.map(c => esc(fmtV(p, c.key))).join(";"))].join("\r\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })), download: "utenti-astra.csv" });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setSuccess(`${sel.length} utenti esportati.`); setError("");
  }

  function resetFilters() { setSearch(""); setFilters({ role: "", ruolo_tessera: "", facolta: "", corso: "", anno: "" }); setSort({ key: "created_at", dir: "desc" }); setPage(1); }

  return (
    <>
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={newProfile => {
            setProfiles(c => [newProfile, ...c]);
            setEdited(c => ({ ...c, [newProfile.id]: { ...newProfile } }));
            setSuccess(`Utente ${newProfile.nome} ${newProfile.cognome} creato con successo.`);
          }}
        />
      )}

      <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f7f9fc 0%,#eef3fb 100%)", padding: "8.5rem 1.2rem 3rem" }}>
        <div style={{ maxWidth: 1500, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Hero */}
          <section style={{ background: "linear-gradient(135deg,#0f2f6e 0%,#1847a3 100%)", borderRadius: "2rem", padding: "clamp(1.4rem,3vw,2.2rem)", color: "white", boxShadow: "0 24px 60px rgba(15,47,110,.18)", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                <span style={{ alignSelf: "flex-start", padding: ".45rem .8rem", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: ".9rem", fontWeight: 700 }}>
                  Amministrazione • Gestione utenti
                </span>
                <h1 style={{ margin: 0, fontSize: "clamp(2rem,5vw,3rem)", lineHeight: 1.05 }}>Tutti gli utenti.</h1>
                <p style={{ margin: 0, color: "rgba(255,255,255,.86)", lineHeight: 1.6 }}>Cerca, filtra, ordina, esporta, crea e modifica tutti i profili registrati.</p>
              </div>
              <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                <button onClick={() => setShowCreateModal(true)} style={{ border: "none", background: "#fff", color: "#0f2f6e", padding: ".9rem 1.3rem", borderRadius: "1rem", fontWeight: 800, cursor: "pointer", fontSize: ".9rem", display: "inline-flex", alignItems: "center", gap: ".5rem" }}>
                  <span style={{ fontSize: "1.1rem" }}>＋</span> Nuovo utente
                </button>
                <a href="/admin" style={{ textDecoration: "none", color: "white", padding: ".9rem 1.1rem", borderRadius: "1rem", border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.10)", fontWeight: 700, whiteSpace: "nowrap" }}>
                  Pannello admin
                </a>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginTop: ".4rem" }}>
              {[["Utenti totali", profiles.length], ["User", profiles.length - totalAdmins], ["Admin", totalAdmins]].map(([label, value]) => (
                <div key={String(label)} style={{ background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.14)", borderRadius: "1.3rem", padding: "1rem 1.1rem" }}>
                  <div style={{ fontSize: ".9rem", color: "rgba(255,255,255,.75)" }}>{label}</div>
                  <div style={{ fontSize: "1.9rem", fontWeight: 800, marginTop: ".25rem" }}>{value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Filters */}
          <section style={{ background: "rgba(255,255,255,.78)", border: "1px solid rgba(15,47,110,.08)", boxShadow: "0 16px 40px rgba(15,47,110,.08)", backdropFilter: "blur(12px)", borderRadius: "1.8rem", padding: "1.2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, color: "#0f2f6e", fontSize: "1.35rem" }}>Ricerca e filtri</h2>
                <p style={{ margin: ".35rem 0 0", color: "#4a5a7a", lineHeight: 1.5 }}>Cerca per nome, cognome, email, telefono, corso, facoltà, ruolo o ID.</p>
              </div>
              <div style={{ display: "flex", gap: ".8rem", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ whiteSpace: "nowrap", fontSize: ".86rem", fontWeight: 700, color: "#1847a3", background: "rgba(24,71,163,.08)", border: "1px solid rgba(24,71,163,.12)", borderRadius: 999, padding: ".5rem .8rem" }}>{selected.length} selezionati</span>
                <button onClick={handleExportCsv} type="button" style={s.btnSecondary}>Esporta CSV</button>
                <button onClick={resetFilters} type="button" style={s.btnSecondary}>Azzera filtri</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <label style={{ fontWeight: 700, color: "#17315f" }}>Ricerca generale</label>
                <div style={{ display: "flex", alignItems: "center", gap: ".8rem", background: "white", border: "1px solid rgba(15,47,110,.10)", borderRadius: "1.2rem", padding: ".95rem 1rem" }}>
                  <span>🔎</span>
                  <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Cerca utenti..." style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: "1rem", color: "#102a56" }} />
                  {search && <span style={{ whiteSpace: "nowrap", fontSize: ".86rem", fontWeight: 700, color: "#1847a3", background: "rgba(24,71,163,.08)", border: "1px solid rgba(24,71,163,.12)", borderRadius: 999, padding: ".38rem .7rem" }}>{filtered.length} risultati</span>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <label style={{ fontWeight: 700, color: "#17315f" }}>Ruolo</label>
                <select value={filters.role} onChange={e => { setFilters(f => ({ ...f, role: e.target.value })); setPage(1); }} style={s.filterInput}>
                  {[{ value: "", label: "Tutti i ruoli" }, { value: "user", label: "User" }, { value: "admin", label: "Admin" }].map(o => <option key={o.value || "r"} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <label style={{ fontWeight: 700, color: "#17315f" }}>Facoltà</label>
                <select value={filters.facolta} onChange={e => {
                  const fac = e.target.value;
                  setFilters(f => { const valid = fac ? profiles.filter(p => p.facolta === fac).map(p => p.corso_di_laurea) : profiles.map(p => p.corso_di_laurea); return { ...f, facolta: fac, corso: f.corso && !valid.includes(f.corso) ? "" : f.corso }; });
                  setPage(1);
                }} style={s.filterInput}>
                  {FACULTY_OPTIONS.map(o => <option key={o.value || "f"} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <label style={{ fontWeight: 700, color: "#17315f" }}>Corso di laurea</label>
                <select value={filters.corso} onChange={e => { setFilters(f => ({ ...f, corso: e.target.value })); setPage(1); }} style={s.filterInput}>
                  <option value="">Tutti i corsi</option>
                  {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <label style={{ fontWeight: 700, color: "#17315f" }}>Anno di laurea</label>
                <select value={filters.anno} onChange={e => { setFilters(f => ({ ...f, anno: e.target.value })); setPage(1); }} style={s.filterInput}>
                  <option value="">Tutti gli anni</option>
                  {availableYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
            </div>

            {(error || success) && (
              <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
                {error && <div style={s.error}>{error}</div>}
                {success && <div style={s.success}>{success}</div>}
              </div>
            )}
          </section>

          {/* Table */}
          <section style={{ background: "rgba(255,255,255,.82)", border: "1px solid rgba(15,47,110,.08)", boxShadow: "0 18px 44px rgba(15,47,110,.08)", backdropFilter: "blur(14px)", borderRadius: "1.8rem", overflow: "hidden" }}>
            <div style={{ overflowX: "auto", width: "100%" }}>
              <table style={{ width: "100%", minWidth: 2140, borderCollapse: "collapse", borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: "#edf3ff" }}>
                    <th style={{ ...s.th, ...s.stickySelH }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <input type="checkbox" checked={allPageSel} ref={el => { if (el) el.indeterminate = !allPageSel && somePageSel; }} onChange={toggleSelectPage} style={{ width: 18, height: 18, cursor: "pointer" }} />
                      </div>
                    </th>
                    {SORT_COLS.map(col => (
                      <th key={col.key} style={col.key === "nome" ? { ...s.th, ...s.stickyFColH } : s.th}>
                        <button type="button" onClick={() => toggleSort(col.key)} style={{ border: "none", background: "transparent", padding: 0, color: "inherit", font: "inherit", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: ".45rem" }}>
                          {col.label}
                          <span style={{ fontSize: ".8rem", opacity: sort.key === col.key ? 1 : 0.45 }}>{sort.key === col.key ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}</span>
                        </button>
                      </th>
                    ))}
                    <th style={{ ...s.th, ...s.stickyLColH }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={14} style={{ padding: "1.3rem 1rem", color: "#466089", fontWeight: 600 }}>Caricamento...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={14} style={{ padding: "1.3rem 1rem", color: "#466089", fontWeight: 600 }}>Nessun utente trovato.</td></tr>
                  ) : paginated.map(p => {
                    const cur = edited[p.id] ?? p;
                    const saving = savingId === p.id;
                    const dirty = dirtyIds.includes(p.id);
                    const bg = dirty ? "#f8fbff" : "white";
                    const degOpts = DEGREES[String(cur.facolta ?? "")] ?? [];
                    const canDelete = !saving && adminProfile?.id !== p.id;

                    return (
                      <tr key={p.id} style={{ background: bg }}>
                        <td style={{ ...s.td, ...s.stickySelC, background: bg, textAlign: "center" }}>
                          <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                        </td>
                        <td style={{ ...s.td, ...s.stickyFColC, background: bg }}><input value={cur.nome ?? ""} onChange={e => updateEdited(p.id, "nome", e.target.value)} style={s.field} /></td>
                        <td style={s.td}><input value={cur.cognome ?? ""} onChange={e => updateEdited(p.id, "cognome", e.target.value)} style={s.field} /></td>
                        <td style={s.td}><input value={cur.email_istituzionale ?? ""} onChange={e => updateEdited(p.id, "email_istituzionale", e.target.value)} style={{ ...s.field, minWidth: 240 }} /></td>
                        <td style={s.td}><input value={cur.numero_telefono ?? ""} onChange={e => updateEdited(p.id, "numero_telefono", e.target.value)} style={s.field} /></td>
                        <td style={s.td}>
                          <select value={cur.facolta ?? ""} onChange={e => updateEdited(p.id, "facolta", e.target.value)} style={s.field}>
                            {FACULTY_OPTIONS.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                        <td style={s.td}>
                          <select value={cur.corso_di_laurea ?? ""} onChange={e => updateEdited(p.id, "corso_di_laurea", e.target.value)} style={{ ...s.field, minWidth: 220 }}>
                            {degOpts.length ? degOpts.map(o => <option key={o} value={o}>{o}</option>) : <option value="">Nessun corso</option>}
                          </select>
                        </td>
                        <td style={s.td}><input type="number" value={cur.anno_di_laurea ?? ""} onChange={e => updateEdited(p.id, "anno_di_laurea", e.target.value)} style={{ ...s.field, width: 130 }} /></td>
                        <td style={s.td}><input type="date" value={cur.data_di_nascita ?? ""} onChange={e => updateEdited(p.id, "data_di_nascita", e.target.value)} style={s.field} /></td>
                        <td style={s.td}>
                          <select value={cur.role ?? "user"} onChange={e => updateEdited(p.id, "role", e.target.value)} style={s.field}>
                            <option value="user">User</option><option value="admin">Admin</option>
                          </select>
                        </td>
                        <td style={s.td}>
                          <select value={cur.ruolo_tessera ?? "socio"} onChange={e => updateEdited(p.id, "ruolo_tessera", e.target.value)} style={s.field}>
                            <option value="socio">Socio</option><option value="direttivo">Direttivo</option>
                          </select>
                        </td>
                        <td style={s.tdMuted}>{fmt(p.created_at)}</td>
                        <td style={s.tdMuted}>{fmt(p.updated_at)}</td>
                        <td style={{ ...s.td, ...s.stickyLColC, background: bg }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: ".42rem", minWidth: 132 }}>
                            <div style={s.badge(dirty)}>{dirty ? "Da salvare" : "Salvato"}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".38rem" }}>
                              <button type="button" disabled={saving} onClick={() => handleSave(p.id)} style={{ ...s.btnSave, background: saving ? "#8ca4d7" : "#1847a3", cursor: saving ? "not-allowed" : "pointer" }}>
                                {saving ? "..." : "Salva"}
                              </button>
                              <button type="button" disabled={!canDelete} onClick={() => handleDelete(p.id)} style={{ ...s.btnDelete, background: canDelete ? "white" : "rgba(190,39,39,.06)", color: canDelete ? "#8b1d1d" : "#b57b7b", cursor: canDelete ? "pointer" : "not-allowed" }}>
                                Elimina
                              </button>
                            </div>
                            <div style={{ fontSize: ".73rem", color: "#55709a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={p.id}>
                              ID: {p.id.slice(0, 8)}...
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: "1px solid rgba(15,47,110,.08)", padding: "1rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", background: "rgba(255,255,255,.72)" }}>
              <div style={{ color: "#4f6282", fontWeight: 600 }}>Pagina {page} di {totalPages} • {filtered.length} utenti trovati</div>
              <div style={{ display: "flex", gap: ".7rem" }}>
                {[["Precedente", page === 1, () => setPage(c => Math.max(1, c - 1))], ["Successiva", page === totalPages, () => setPage(c => Math.min(totalPages, c + 1))]].map(([label, dis, fn]) => (
                  <button key={String(label)} type="button" disabled={dis as boolean} onClick={fn as () => void} style={{ ...s.btnSecondary, background: dis ? "#f3f6fb" : "white", color: dis ? "#9aa7bd" : "#0f2f6e", cursor: dis ? "not-allowed" : "pointer" }}>
                    {label as string}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}