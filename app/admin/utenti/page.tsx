"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import { createClient } from "@/lib/supabase/client";

type Role = "user" | "admin";
type RuoloTessera = "socio" | "direttivo";
type Facolta = "medicina" | "psicologia" | "filosofia";

type Profile = {
  id: string;
  nome: string;
  cognome: string;
  email_istituzionale: string;
  numero_telefono: string;
  facolta: Facolta | string;
  corso_di_laurea: string;
  anno_di_laurea: number;
  data_di_nascita: string;
  role: Role;
  ruolo_tessera: RuoloTessera;
  created_at: string;
  updated_at: string;
};

type FilterState = {
  role: string;
  ruolo_tessera: string;
  facolta: string;
  corso: string;
  anno: string;
};

type SortKey =
  | "nome"
  | "cognome"
  | "email_istituzionale"
  | "numero_telefono"
  | "facolta"
  | "corso_di_laurea"
  | "anno_di_laurea"
  | "data_di_nascita"
  | "role"
  | "ruolo_tessera"
  | "created_at"
  | "updated_at";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

const facultyOptions = [
  { value: "", label: "Tutte le facoltà" },
  { value: "medicina", label: "Medicina" },
  { value: "psicologia", label: "Psicologia" },
  { value: "filosofia", label: "Filosofia" },
];

const roleOptions = [
  { value: "", label: "Tutti i ruoli" },
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

const ruoloTesseraOptions = [
  { value: "", label: "Tutti i ruoli tessera" },
  { value: "socio", label: "Socio" },
  { value: "direttivo", label: "Direttivo" },
];

const degreeOptionsByFaculty: Record<string, string[]> = {
  medicina: [
    "Medicina e Chirurgia",
    "Infermieristica",
    "Infermieristica pediatrica",
    "Ostetricia",
    "Fisioterapia",
    "Igiene dentale",
    "Tecniche di radiologia medica, per immagini e radioterapia",
  ],
  psicologia: ["Psicologia"],
  filosofia: ["Filosofia"],
};

const sortableColumns: Array<{ label: string; key: SortKey }> = [
  { label: "Nome", key: "nome" },
  { label: "Cognome", key: "cognome" },
  { label: "Email istituzionale", key: "email_istituzionale" },
  { label: "Telefono", key: "numero_telefono" },
  { label: "Facoltà", key: "facolta" },
  { label: "Corso di laurea", key: "corso_di_laurea" },
  { label: "Anno immatricolazione", key: "anno_di_laurea" },
  { label: "Data di nascita", key: "data_di_nascita" },
  { label: "Ruolo", key: "role" },
  { label: "Ruolo tessera", key: "ruolo_tessera" },
  { label: "Creato il", key: "created_at" },
  { label: "Aggiornato il", key: "updated_at" },
];

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalize(value: string | number | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function profilesAreDifferent(original: Profile, edited: Profile | undefined) {
  if (!edited) return false;

  return (
    edited.nome !== original.nome ||
    edited.cognome !== original.cognome ||
    edited.email_istituzionale !== original.email_istituzionale ||
    edited.numero_telefono !== original.numero_telefono ||
    edited.facolta !== original.facolta ||
    edited.corso_di_laurea !== original.corso_di_laurea ||
    Number(edited.anno_di_laurea) !== Number(original.anno_di_laurea) ||
    edited.data_di_nascita !== original.data_di_nascita ||
    edited.role !== original.role ||
    edited.ruolo_tessera !== original.ruolo_tessera
  );
}

export default function AdminUtentiPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editedProfiles, setEditedProfiles] = useState<Record<string, Profile>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    role: "",
    ruolo_tessera: "",
    facolta: "",
    corso: "",
    anno: "",
  });
  const [sortState, setSortState] = useState<SortState>({
    key: "created_at",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pageSize = 12;

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (adminError || !adminData) {
        router.replace("/profilo");
        return;
      }

      if (adminData.role !== "admin") {
        router.replace("/profilo");
        return;
      }

      const { data: allProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!active) return;

      if (profilesError) {
        setError("Non è stato possibile caricare gli utenti.");
        setLoading(false);
        return;
      }

      const safeProfiles = (allProfiles ?? []) as Profile[];
      const mappedEdits = safeProfiles.reduce<Record<string, Profile>>((acc, profile) => {
        acc[profile.id] = { ...profile };
        return acc;
      }, {});

      setAdminProfile(adminData as Profile);
      setProfiles(safeProfiles);
      setEditedProfiles(mappedEdits);
      setSelectedIds([]);
      setCurrentPage(1);
      setLoading(false);
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  const availableYears = useMemo(() => {
    return Array.from(
      new Set(
        profiles
          .map((profile) => profile.anno_di_laurea)
          .filter((year) => typeof year === "number" && !Number.isNaN(year))
      )
    ).sort((a, b) => b - a);
  }, [profiles]);

  const availableCourses = useMemo(() => {
    const sourceProfiles = filters.facolta
      ? profiles.filter((profile) => profile.facolta === filters.facolta)
      : profiles;

    return Array.from(
      new Set(
        sourceProfiles
          .map((profile) => profile.corso_di_laurea)
          .filter((course) => typeof course === "string" && course.trim().length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "it"));
  }, [profiles, filters.facolta]);

  function getComparableValue(profile: Profile, key: SortKey) {
    const value = profile[key];

    if (key === "anno_di_laurea") {
      return Number(value ?? 0);
    }

    if (key === "created_at" || key === "updated_at" || key === "data_di_nascita") {
      return new Date(String(value ?? "")).getTime() || 0;
    }

    return normalize(value as string | number | null | undefined);
  }

  function getDegreeOptions(facolta: string) {
    return degreeOptionsByFaculty[facolta] ?? [];
  }

  const filteredProfiles = useMemo(() => {
    const query = normalize(searchTerm);

    const filtered = profiles.filter((profile) => {
      const matchesSearch =
        query.length === 0 ||
        [
          profile.nome,
          profile.cognome,
          profile.email_istituzionale,
          profile.numero_telefono,
          profile.facolta,
          profile.corso_di_laurea,
          profile.role,
          profile.ruolo_tessera,
          profile.id,
          profile.anno_di_laurea,
        ]
          .map((value) => normalize(value))
          .some((value) => value.includes(query));

      const matchesRole = !filters.role || profile.role === filters.role;
      const matchesRuoloTessera =
        !filters.ruolo_tessera || profile.ruolo_tessera === filters.ruolo_tessera;
      const matchesFaculty = !filters.facolta || profile.facolta === filters.facolta;
      const matchesCourse = !filters.corso || profile.corso_di_laurea === filters.corso;
      const matchesYear = !filters.anno || String(profile.anno_di_laurea) === filters.anno;

      return (
        matchesSearch &&
        matchesRole &&
        matchesRuoloTessera &&
        matchesFaculty &&
        matchesCourse &&
        matchesYear
      );
    });

    return [...filtered].sort((a, b) => {
      const aValue = getComparableValue(a, sortState.key);
      const bValue = getComparableValue(b, sortState.key);

      if (aValue < bValue) return sortState.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortState.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [profiles, searchTerm, filters, sortState]);

  const dirtyIds = useMemo(() => {
    return profiles
      .filter((profile) => profilesAreDifferent(profile, editedProfiles[profile.id]))
      .map((profile) => profile.id);
  }, [profiles, editedProfiles]);

  const totalAdmins = useMemo(
    () => profiles.filter((profile) => profile.role === "admin").length,
    [profiles]
  );

  const totalUsers = useMemo(
    () => profiles.filter((profile) => profile.role === "user").length,
    [profiles]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredProfiles.length / pageSize)),
    [filteredProfiles.length]
  );

  const paginatedProfiles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProfiles.slice(start, start + pageSize);
  }, [filteredProfiles, currentPage]);

  const currentPageIds = useMemo(
    () => paginatedProfiles.map((profile) => profile.id),
    [paginatedProfiles]
  );

  const allCurrentPageSelected = useMemo(
    () => currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id)),
    [currentPageIds, selectedIds]
  );

  const someCurrentPageSelected = useMemo(
    () => currentPageIds.some((id) => selectedIds.includes(id)),
    [currentPageIds, selectedIds]
  );

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => filteredProfiles.some((profile) => profile.id === id))
    );
  }, [filteredProfiles]);

  useEffect(() => {
    setCurrentPage((current) =>
      Math.min(current, Math.max(1, Math.ceil(filteredProfiles.length / pageSize)))
    );
  }, [filteredProfiles.length, pageSize]);

  function updateEditedProfile(id: string, field: keyof Profile, value: string) {
    setEditedProfiles((current) => {
      const baseProfile = current[id] ?? profiles.find((profile) => profile.id === id);
      if (!baseProfile) return current;

      const nextProfile: Profile = {
        ...baseProfile,
        [field]: field === "anno_di_laurea" ? Number(value) : value,
      } as Profile;

      if (field === "facolta") {
        const nextDegreeOptions = getDegreeOptions(String(value));
        if (!nextDegreeOptions.includes(nextProfile.corso_di_laurea)) {
          nextProfile.corso_di_laurea = nextDegreeOptions[0] ?? "";
        }

        setFilters((currentFilters) => {
          if (!currentFilters.corso) return currentFilters;
          return nextDegreeOptions.includes(currentFilters.corso)
            ? currentFilters
            : { ...currentFilters, corso: "" };
        });
      }

      return {
        ...current,
        [id]: nextProfile,
      };
    });

    setSuccess("");
  }

  function toggleSort(key: SortKey) {
    setSortState((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: "asc",
      };
    });

    setCurrentPage(1);
  }

  function toggleSelectedUser(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleSelectAllCurrentPage() {
    setSelectedIds((current) => {
      if (allCurrentPageSelected) {
        return current.filter((id) => !currentPageIds.includes(id));
      }

      const next = [...current];
      currentPageIds.forEach((id) => {
        if (!next.includes(id)) {
          next.push(id);
        }
      });
      return next;
    });
  }

  async function handleSave(id: string) {
    const profile = editedProfiles[id];
    if (!profile) return;

    setSavingId(id);
    setError("");
    setSuccess("");

    const payload = {
      nome: profile.nome,
      cognome: profile.cognome,
      email_istituzionale: profile.email_istituzionale,
      numero_telefono: profile.numero_telefono,
      facolta: profile.facolta,
      corso_di_laurea: profile.corso_di_laurea,
      anno_di_laurea: Number(profile.anno_di_laurea),
      data_di_nascita: profile.data_di_nascita,
      role: profile.role,
      ruolo_tessera: profile.ruolo_tessera,
    };

    const { error: updateError, data } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !data) {
      setError("Salvataggio non riuscito. Controlla i dati inseriti e riprova.");
      setSavingId(null);
      return;
    }

    const updated = data as Profile;

    setProfiles((current) => current.map((item) => (item.id === id ? updated : item)));
    setEditedProfiles((current) => ({
      ...current,
      [id]: updated,
    }));
    setSuccess(`Utente ${updated.nome} ${updated.cognome} aggiornato correttamente.`);
    setSavingId(null);
    setCurrentPage((current) => Math.min(current, totalPages));
  }

  async function handleDeleteUser(id: string) {
    const target = profiles.find((profile) => profile.id === id);
    if (!target) return;

    const confirmed = window.confirm(
      `Vuoi davvero eliminare ${target.nome} ${target.cognome}? Questa azione rimuoverà il profilo dalla tabella.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setSavingId(id);

    const { error: deleteError } = await supabase.from("profiles").delete().eq("id", id);

    if (deleteError) {
      setError("Eliminazione non riuscita. Controlla policy e permessi admin su Supabase.");
      setSavingId(null);
      return;
    }

    setProfiles((current) => current.filter((profile) => profile.id !== id));
    setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
    setEditedProfiles((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSuccess(`Utente ${target.nome} ${target.cognome} eliminato correttamente.`);
    setSavingId(null);
    setCurrentPage(1);
  }

  function handleExportCsv() {
    const columns: Array<{ key: keyof Profile; label: string }> = [
      { key: "id", label: "ID" },
      { key: "nome", label: "Nome" },
      { key: "cognome", label: "Cognome" },
      { key: "email_istituzionale", label: "Email istituzionale" },
      { key: "numero_telefono", label: "Numero di telefono" },
      { key: "facolta", label: "Facoltà" },
      { key: "corso_di_laurea", label: "Corso di laurea" },
      { key: "anno_di_laurea", label: "Anno di immatricolazione" },
      { key: "data_di_nascita", label: "Data di nascita" },
      { key: "role", label: "Ruolo" },
      { key: "ruolo_tessera", label: "Ruolo tessera" },
      { key: "created_at", label: "Creato il" },
      { key: "updated_at", label: "Aggiornato il" },
    ];

    const selectedProfiles = filteredProfiles.filter((profile) => selectedIds.includes(profile.id));

    if (selectedProfiles.length === 0) {
      setError("Seleziona almeno un utente da esportare.");
      setSuccess("");
      return;
    }

    const separator = ";";

    const escapeCsvValue = (value: unknown) => {
      const text = String(value ?? "").replace(/"/g, '""');
      return `"${text}"`;
    };

    const formatCsvValue = (profile: Profile, key: keyof Profile) => {
      if (key === "created_at" || key === "updated_at") {
        return formatDateTime(profile[key] as string);
      }

      if (key === "facolta") {
        const facultyMap: Record<string, string> = {
          medicina: "Medicina",
          psicologia: "Psicologia",
          filosofia: "Filosofia",
        };

        return facultyMap[String(profile[key] ?? "")] ?? String(profile[key] ?? "");
      }

      if (key === "role") {
        const roleMap: Record<string, string> = {
          user: "User",
          admin: "Admin",
        };

        return roleMap[String(profile[key] ?? "")] ?? String(profile[key] ?? "");
      }

      if (key === "ruolo_tessera") {
        const ruoloTesseraMap: Record<string, string> = {
          socio: "Socio",
          direttivo: "Direttivo",
        };

        return ruoloTesseraMap[String(profile[key] ?? "")] ?? String(profile[key] ?? "");
      }

      return profile[key];
    };

    const headerRow = columns.map((column) => escapeCsvValue(column.label)).join(separator);

    const rows = selectedProfiles.map((profile) =>
      columns
        .map((column) => escapeCsvValue(formatCsvValue(profile, column.key)))
        .join(separator)
    );

    setError("");
    setSuccess(`${selectedProfiles.length} utenti esportati correttamente.`);

    const csvContent = [headerRow, ...rows].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "utenti-astra.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function resetFilters() {
    setSearchTerm("");
    setFilters({ role: "", ruolo_tessera: "", facolta: "", corso: "", anno: "" });
    setSortState({ key: "created_at", direction: "desc" });
    setCurrentPage(1);
  }

  return (
    <>
      <Navbar />

      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #f7f9fc 0%, #eef3fb 100%)",
          padding: "8.5rem 1.2rem 3rem",
        }}
      >
        <div
          style={{
            maxWidth: 1500,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <section
            style={{
              background: "linear-gradient(135deg, #0f2f6e 0%, #1847a3 100%)",
              borderRadius: "2rem",
              padding: "clamp(1.4rem, 3vw, 2.2rem)",
              color: "white",
              boxShadow: "0 24px 60px rgba(15, 47, 110, 0.18)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                <span
                  style={{
                    alignSelf: "flex-start",
                    padding: ".45rem .8rem",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.12)",
                    border: "1px solid rgba(255,255,255,.18)",
                    fontSize: ".9rem",
                    fontWeight: 700,
                    letterSpacing: ".02em",
                  }}
                >
                  Amministrazione • Gestione utenti
                </span>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(2rem, 5vw, 3rem)",
                    lineHeight: 1.05,
                  }}
                >
                  Tutti gli utenti.
                </h1>
                <p
                  style={{
                    margin: 0,
                    maxWidth: 900,
                    color: "rgba(255,255,255,.86)",
                    fontSize: "1rem",
                    lineHeight: 1.6,
                  }}
                >
                  Qui puoi cercare, filtrare, ordinare, esportare e modificare rapidamente tutti i
                  profili registrati.
                </p>
              </div>

              <a
                href="/admin"
                style={{
                  textDecoration: "none",
                  color: "white",
                  padding: ".9rem 1.1rem",
                  borderRadius: "1rem",
                  border: "1px solid rgba(255,255,255,.18)",
                  background: "rgba(255,255,255,.10)",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Torna al pannello admin
              </a>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
                marginTop: ".4rem",
              }}
            >
              {[
                ["Utenti totali", String(profiles.length)],
                ["User", String(totalUsers)],
                ["Admin", String(totalAdmins)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(255,255,255,.10)",
                    border: "1px solid rgba(255,255,255,.14)",
                    borderRadius: "1.3rem",
                    padding: "1rem 1.1rem",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div style={{ fontSize: ".9rem", color: "rgba(255,255,255,.75)" }}>{label}</div>
                  <div style={{ fontSize: "1.9rem", fontWeight: 800, marginTop: ".25rem" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              background: "rgba(255,255,255,.78)",
              border: "1px solid rgba(15, 47, 110, 0.08)",
              boxShadow: "0 16px 40px rgba(15, 47, 110, 0.08)",
              backdropFilter: "blur(12px)",
              borderRadius: "1.8rem",
              padding: "1.2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ margin: 0, color: "#0f2f6e", fontSize: "1.35rem" }}>
                  Ricerca e filtri
                </h2>
                <p style={{ margin: ".35rem 0 0", color: "#4a5a7a", lineHeight: 1.5 }}>
                  Cerca per nome, cognome, email, telefono, corso, facoltà, ruolo o ID.
                </p>
              </div>

              <div
                style={{ display: "flex", gap: ".8rem", flexWrap: "wrap", alignItems: "center" }}
              >
                <div
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: ".86rem",
                    fontWeight: 700,
                    color: "#1847a3",
                    background: "rgba(24,71,163,.08)",
                    border: "1px solid rgba(24,71,163,.12)",
                    borderRadius: 999,
                    padding: ".5rem .8rem",
                  }}
                >
                  {selectedIds.length} selezionati
                </div>

                <button onClick={handleExportCsv} type="button" style={secondaryButtonStyle}>
                  Esporta selezionati CSV
                </button>
                <button onClick={resetFilters} type="button" style={secondaryButtonStyle}>
                  Azzera filtri
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: ".5rem",
                }}
              >
                <label style={{ fontWeight: 700, color: "#17315f" }}>Ricerca generale</label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".8rem",
                    background: "white",
                    border: "1px solid rgba(15, 47, 110, 0.10)",
                    borderRadius: "1.2rem",
                    padding: ".95rem 1rem",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)",
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>🔎</span>
                  <input
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cerca utenti..."
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: "1rem",
                      color: "#102a56",
                    }}
                  />
                  {searchTerm ? (
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        fontSize: ".86rem",
                        fontWeight: 700,
                        color: "#1847a3",
                        background: "rgba(24,71,163,.08)",
                        border: "1px solid rgba(24,71,163,.12)",
                        borderRadius: 999,
                        padding: ".38rem .7rem",
                      }}
                    >
                      {filteredProfiles.length} risultati
                    </span>
                  ) : null}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <label style={{ fontWeight: 700, color: "#17315f" }}>Filtro ruolo</label>
                <select
                  value={filters.role}
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, role: event.target.value }));
                    setCurrentPage(1);
                  }}
                  style={filterInputStyle}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value || "all-roles"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <label style={{ fontWeight: 700, color: "#17315f" }}>Filtro facoltà</label>
                <select
                  value={filters.facolta}
                  onChange={(event) => {
                    const nextFaculty = event.target.value;

                    setFilters((current) => {
                      const validCourses = nextFaculty
                        ? Array.from(
                          new Set(
                            profiles
                              .filter((profile) => profile.facolta === nextFaculty)
                              .map((profile) => profile.corso_di_laurea)
                              .filter(
                                (course) => typeof course === "string" && course.trim().length > 0
                              )
                          )
                        )
                        : Array.from(
                          new Set(
                            profiles
                              .map((profile) => profile.corso_di_laurea)
                              .filter(
                                (course) => typeof course === "string" && course.trim().length > 0
                              )
                          )
                        );

                      return {
                        ...current,
                        facolta: nextFaculty,
                        corso:
                          current.corso && !validCourses.includes(current.corso)
                            ? ""
                            : current.corso,
                      };
                    });

                    setCurrentPage(1);
                  }}
                  style={filterInputStyle}
                >
                  {facultyOptions.map((option) => (
                    <option key={option.value || "all-facolta"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <label style={{ fontWeight: 700, color: "#17315f" }}>
                  Filtro corso di laurea
                </label>
                <select
                  value={filters.corso}
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, corso: event.target.value }));
                    setCurrentPage(1);
                  }}
                  style={filterInputStyle}
                >
                  <option value="">Tutti i corsi</option>
                  {availableCourses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <label style={{ fontWeight: 700, color: "#17315f" }}>Filtro anno</label>
                <select
                  value={filters.anno}
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, anno: event.target.value }));
                    setCurrentPage(1);
                  }}
                  style={filterInputStyle}
                >
                  <option value="">Tutti gli anni</option>
                  {availableYears.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(error || success) && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: ".65rem",
                }}
              >
                {error ? <div style={errorBoxStyle}>{error}</div> : null}
                {success ? <div style={successBoxStyle}>{success}</div> : null}
              </div>
            )}
          </section>

          <section
            style={{
              background: "rgba(255,255,255,.82)",
              border: "1px solid rgba(15, 47, 110, 0.08)",
              boxShadow: "0 18px 44px rgba(15, 47, 110, 0.08)",
              backdropFilter: "blur(14px)",
              borderRadius: "1.8rem",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                overflowX: "auto",
                width: "100%",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 2140,
                  borderCollapse: "collapse",
                  borderSpacing: 0,
                }}
              >
                <thead>
                  <tr style={{ background: "#edf3ff" }}>
                    <th style={{ ...tableHeadStyle, ...stickySelectionHeadStyle }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allCurrentPageSelected}
                          ref={(input) => {
                            if (input) {
                              input.indeterminate =
                                !allCurrentPageSelected && someCurrentPageSelected;
                            }
                          }}
                          onChange={toggleSelectAllCurrentPage}
                          aria-label="Seleziona tutti gli utenti visibili"
                          style={{ width: 18, height: 18, cursor: "pointer" }}
                        />
                      </div>
                    </th>

                    {sortableColumns.map((column) => (
                      <th
                        key={column.key}
                        style={
                          column.key === "nome"
                            ? { ...tableHeadStyle, ...stickyFirstColumnHeadStyle }
                            : tableHeadStyle
                        }
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            margin: 0,
                            color: "inherit",
                            font: "inherit",
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: ".45rem",
                          }}
                        >
                          <span>{column.label}</span>
                          <span
                            style={{
                              fontSize: ".8rem",
                              opacity: sortState.key === column.key ? 1 : 0.45,
                            }}
                          >
                            {sortState.key === column.key
                              ? sortState.direction === "asc"
                                ? "↑"
                                : "↓"
                              : "↕"}
                          </span>
                        </button>
                      </th>
                    ))}
                    <th style={{ ...tableHeadStyle, ...stickyLastColumnHeadStyle }}>Azioni</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={14} style={tableMessageCellStyle}>
                        Caricamento utenti in corso...
                      </td>
                    </tr>
                  ) : paginatedProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={tableMessageCellStyle}>
                        Nessun utente trovato con i filtri attuali.
                      </td>
                    </tr>
                  ) : (
                    paginatedProfiles.map((profile) => {
                      const current = editedProfiles[profile.id] ?? profile;
                      const isSaving = savingId === profile.id;
                      const isDirty = dirtyIds.includes(profile.id);
                      const deleteDisabled = isSaving || adminProfile?.id === profile.id;
                      const currentDegreeOptions = getDegreeOptions(String(current.facolta ?? ""));

                      return (
                        <tr
                          key={profile.id}
                          style={{
                            background: isDirty ? "#f8fbff" : "white",
                          }}
                        >
                          <td
                            style={{
                              ...cellStyle,
                              ...stickySelectionCellStyle,
                              background: isDirty ? "#f8fbff" : "white",
                              textAlign: "center",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(profile.id)}
                              onChange={() => toggleSelectedUser(profile.id)}
                              aria-label={`Seleziona ${profile.nome} ${profile.cognome}`}
                              style={{ width: 18, height: 18, cursor: "pointer" }}
                            />
                          </td>

                          <td
                            style={{
                              ...cellStyle,
                              ...stickyFirstColumnCellStyle,
                              background: isDirty ? "#f8fbff" : "white",
                            }}
                          >
                            <input
                              value={current.nome ?? ""}
                              onChange={(event) =>
                                updateEditedProfile(profile.id, "nome", event.target.value)
                              }
                              style={tableFieldStyle}
                            />
                          </td>

                          <td style={cellStyle}>
                            <input
                              value={current.cognome ?? ""}
                              onChange={(event) =>
                                updateEditedProfile(profile.id, "cognome", event.target.value)
                              }
                              style={tableFieldStyle}
                            />
                          </td>

                          <td style={cellStyle}>
                            <input
                              value={current.email_istituzionale ?? ""}
                              onChange={(event) =>
                                updateEditedProfile(
                                  profile.id,
                                  "email_istituzionale",
                                  event.target.value
                                )
                              }
                              style={{ ...tableFieldStyle, minWidth: 240 }}
                            />
                          </td>

                          <td style={cellStyle}>
                            <input
                              value={current.numero_telefono ?? ""}
                              onChange={(event) =>
                                updateEditedProfile(profile.id, "numero_telefono", event.target.value)
                              }
                              style={tableFieldStyle}
                            />
                          </td>

                          <td style={cellStyle}>
                            <select
                              value={current.facolta ?? ""}
                              onChange={(event) =>
                                updateEditedProfile(profile.id, "facolta", event.target.value)
                              }
                              style={tableFieldStyle}
                            >
                              {facultyOptions
                                .filter((option) => option.value)
                                .map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                            </select>
                          </td>

                          <td style={cellStyle}>
                            <select
                              value={current.corso_di_laurea ?? ""}
                              onChange={(event) =>
                                updateEditedProfile(
                                  profile.id,
                                  "corso_di_laurea",
                                  event.target.value
                                )
                              }
                              style={{ ...tableFieldStyle, minWidth: 220 }}
                            >
                              {currentDegreeOptions.length > 0 ? (
                                currentDegreeOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))
                              ) : (
                                <option value="">Nessun corso disponibile</option>
                              )}
                            </select>
                          </td>

                          <td style={cellStyle}>
                            <input
                              type="number"
                              value={current.anno_di_laurea ?? ""}
                              onChange={(event) =>
                                updateEditedProfile(
                                  profile.id,
                                  "anno_di_laurea",
                                  event.target.value
                                )
                              }
                              style={{ ...tableFieldStyle, width: 130 }}
                            />
                          </td>

                          <td style={cellStyle}>
                            <input
                              type="date"
                              value={current.data_di_nascita ?? ""}
                              onChange={(event) =>
                                updateEditedProfile(profile.id, "data_di_nascita", event.target.value)
                              }
                              style={tableFieldStyle}
                            />
                          </td>

                          <td style={cellStyle}>
                            <select
                              value={current.role ?? "user"}
                              onChange={(event) =>
                                updateEditedProfile(profile.id, "role", event.target.value)
                              }
                              style={tableFieldStyle}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>

                          <td style={cellStyle}>
                            <select
                              value={current.ruolo_tessera ?? "socio"}
                              onChange={(event) =>
                                updateEditedProfile(profile.id, "ruolo_tessera", event.target.value)
                              }
                              style={tableFieldStyle}
                            >
                              <option value="socio">Socio</option>
                              <option value="direttivo">Direttivo</option>
                            </select>
                          </td>

                          <td style={cellStyleMuted}>{formatDateTime(profile.created_at)}</td>
                          <td style={cellStyleMuted}>{formatDateTime(profile.updated_at)}</td>

                          <td
                            style={{
                              ...cellStyle,
                              ...stickyLastColumnCellStyle,
                              background: isDirty ? "#f8fbff" : "white",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: ".42rem",
                                minWidth: 132,
                              }}
                            >
                              <div style={isDirty ? compactDirtyBadgeStyle : compactCleanBadgeStyle}>
                                {isDirty ? "Da salvare" : "Salvato"}
                              </div>

                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: ".38rem",
                                }}
                              >
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => handleSave(profile.id)}
                                  style={{
                                    ...compactPrimaryButtonStyle,
                                    background: isSaving ? "#8ca4d7" : "#1847a3",
                                    cursor: isSaving ? "not-allowed" : "pointer",
                                  }}
                                >
                                  {isSaving ? "..." : "Salva"}
                                </button>

                                <button
                                  type="button"
                                  disabled={deleteDisabled}
                                  onClick={() => handleDeleteUser(profile.id)}
                                  style={{
                                    ...compactDangerButtonStyle,
                                    background: deleteDisabled ? "rgba(190,39,39,.06)" : "white",
                                    color: deleteDisabled ? "#b57b7b" : "#8b1d1d",
                                    cursor: deleteDisabled ? "not-allowed" : "pointer",
                                  }}
                                  title={
                                    adminProfile?.id === profile.id
                                      ? "Non puoi eliminarti"
                                      : "Elimina utente"
                                  }
                                >
                                  Elimina
                                </button>
                              </div>

                              <div
                                style={{
                                  fontSize: ".73rem",
                                  lineHeight: 1.2,
                                  color: "#55709a",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={profile.id}
                              >
                                ID: {profile.id.slice(0, 8)}...
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(15, 47, 110, 0.08)",
                padding: "1rem 1.2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
                background: "rgba(255,255,255,.72)",
              }}
            >
              <div style={{ color: "#4f6282", fontWeight: 600 }}>
                Pagina {currentPage} di {totalPages} • {filteredProfiles.length} utenti trovati
              </div>

              <div style={{ display: "flex", gap: ".7rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                  style={{
                    ...secondaryButtonStyle,
                    background: currentPage === 1 ? "#f3f6fb" : "white",
                    color: currentPage === 1 ? "#9aa7bd" : "#0f2f6e",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  Precedente
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                  style={{
                    ...secondaryButtonStyle,
                    background: currentPage === totalPages ? "#f3f6fb" : "white",
                    color: currentPage === totalPages ? "#9aa7bd" : "#0f2f6e",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Successiva
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

const tableHeadStyle: CSSProperties = {
  textAlign: "left",
  padding: "0.95rem 1rem",
  color: "#123066",
  fontSize: ".92rem",
  fontWeight: 800,
  borderBottom: "1px solid rgba(15, 47, 110, 0.08)",
  borderRight: "1px solid rgba(15, 47, 110, 0.06)",
  position: "sticky",
  top: 0,
  background: "#edf3ff",
  zIndex: 1,
  whiteSpace: "nowrap",
};

const stickySelectionHeadStyle: CSSProperties = {
  left: 0,
  zIndex: 5,
  width: 64,
  minWidth: 64,
  maxWidth: 64,
  background: "#edf3ff",
  boxShadow: "1px 0 0 rgba(15, 47, 110, 0.08)",
};

const stickyFirstColumnHeadStyle: CSSProperties = {
  left: 64,
  zIndex: 4,
  background: "#edf3ff",
  boxShadow: "1px 0 0 rgba(15, 47, 110, 0.08)",
};

const stickySelectionCellStyle: CSSProperties = {
  position: "sticky",
  left: 0,
  zIndex: 4,
  width: 64,
  minWidth: 64,
  maxWidth: 64,
  boxShadow: "1px 0 0 rgba(15, 47, 110, 0.06)",
};

const stickyFirstColumnCellStyle: CSSProperties = {
  position: "sticky",
  left: 64,
  zIndex: 3,
  boxShadow: "1px 0 0 rgba(15, 47, 110, 0.06)",
};

const stickyLastColumnHeadStyle: CSSProperties = {
  right: 0,
  zIndex: 4,
  background: "#edf3ff",
  boxShadow: "-1px 0 0 rgba(15, 47, 110, 0.08)",
};

const stickyLastColumnCellStyle: CSSProperties = {
  position: "sticky",
  right: 0,
  zIndex: 3,
  boxShadow: "-1px 0 0 rgba(15, 47, 110, 0.06)",
};

const tableMessageCellStyle: CSSProperties = {
  padding: "1.3rem 1rem",
  color: "#466089",
  fontWeight: 600,
};

const cellStyle: CSSProperties = {
  padding: ".55rem .75rem",
  borderBottom: "1px solid rgba(15, 47, 110, 0.08)",
  borderRight: "1px solid rgba(15, 47, 110, 0.06)",
  verticalAlign: "middle",
};

const cellStyleMuted: CSSProperties = {
  ...cellStyle,
  color: "#5c7095",
  fontSize: ".9rem",
  whiteSpace: "nowrap",
};

const tableFieldStyle: CSSProperties = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#102a56",
  borderRadius: 0,
  padding: ".15rem 0",
  fontSize: ".92rem",
  outline: "none",
  minWidth: 120,
  boxShadow: "none",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const filterInputStyle: CSSProperties = {
  border: "1px solid rgba(15, 47, 110, 0.10)",
  background: "white",
  color: "#102a56",
  borderRadius: "1rem",
  padding: ".95rem 1rem",
  fontSize: "1rem",
  outline: "none",
};

const primaryButtonStyle: CSSProperties = {
  border: "none",
  color: "white",
  borderRadius: ".45rem",
  padding: ".75rem .9rem",
  fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid rgba(15, 47, 110, 0.12)",
  background: "white",
  color: "#0f2f6e",
  borderRadius: ".8rem",
  padding: ".9rem 1rem",
  fontWeight: 700,
};

const dirtyBadgeStyle: CSSProperties = {
  fontSize: ".78rem",
  fontWeight: 800,
  color: "#1847a3",
  background: "rgba(24,71,163,.08)",
  border: "1px solid rgba(24,71,163,.12)",
  borderRadius: 999,
  padding: ".35rem .65rem",
  alignSelf: "flex-start",
};

const cleanBadgeStyle: CSSProperties = {
  fontSize: ".78rem",
  fontWeight: 800,
  color: "#55709a",
  background: "rgba(85,112,154,.08)",
  border: "1px solid rgba(85,112,154,.12)",
  borderRadius: 999,
  padding: ".35rem .65rem",
  alignSelf: "flex-start",
};

const compactPrimaryButtonStyle: CSSProperties = {
  border: "none",
  color: "white",
  borderRadius: ".38rem",
  padding: ".56rem .5rem",
  fontWeight: 700,
  fontSize: ".79rem",
  lineHeight: 1.1,
};

const compactDangerButtonStyle: CSSProperties = {
  border: "1px solid rgba(190, 39, 39, 0.14)",
  borderRadius: ".38rem",
  padding: ".56rem .5rem",
  fontWeight: 700,
  fontSize: ".79rem",
  lineHeight: 1.1,
};

const compactDirtyBadgeStyle: CSSProperties = {
  fontSize: ".71rem",
  fontWeight: 800,
  color: "#1847a3",
  background: "rgba(24,71,163,.08)",
  border: "1px solid rgba(24,71,163,.12)",
  borderRadius: 999,
  padding: ".24rem .48rem",
  alignSelf: "flex-start",
};

const compactCleanBadgeStyle: CSSProperties = {
  fontSize: ".71rem",
  fontWeight: 800,
  color: "#55709a",
  background: "rgba(85,112,154,.08)",
  border: "1px solid rgba(85,112,154,.12)",
  borderRadius: 999,
  padding: ".24rem .48rem",
  alignSelf: "flex-start",
};

const errorBoxStyle: CSSProperties = {
  background: "rgba(190, 39, 39, 0.08)",
  color: "#8b1d1d",
  border: "1px solid rgba(190, 39, 39, 0.14)",
  borderRadius: "1rem",
  padding: ".95rem 1rem",
  fontWeight: 600,
};

const successBoxStyle: CSSProperties = {
  background: "rgba(12, 122, 77, 0.08)",
  color: "#0b6b46",
  border: "1px solid rgba(12, 122, 77, 0.14)",
  borderRadius: "1rem",
  padding: ".95rem 1rem",
  fontWeight: 600,
};
