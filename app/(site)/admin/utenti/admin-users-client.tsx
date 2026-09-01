"use client";

import Link from "next/link";
import {
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  Filter,
  GraduationCap,
  Mail,
  PencilLine,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  FACULTY_OPTIONS,
  GRADUATION_YEAR_OPTIONS,
  getCanonicalDegreeValue,
  getDegreeLabel,
  getDegreeOptions,
  getFacultyLabel,
  type ProfileOption,
} from "@/lib/profile-options";
import styles from "./page.module.css";

type Role = "user" | "admin";
type MembershipRole = "socio" | "direttivo";
type SortKey = "identity" | "email" | "faculty" | "role" | "created_at";
type SortDirection = "asc" | "desc";

export type Profile = {
  id: string;
  nome: string | null;
  cognome: string | null;
  email_istituzionale: string | null;
  numero_telefono: string | null;
  facolta: string | null;
  corso_di_laurea: string | null;
  anno_di_laurea: number | null;
  data_di_nascita: string | null;
  role: Role;
  ruolo_tessera: MembershipRole;
  created_at: string;
  updated_at: string;
};

type Filters = {
  role: "" | Role;
  membership: "" | MembershipRole;
  faculty: string;
  degree: string;
  graduationYear: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

type EditUserForm = {
  nome: string;
  cognome: string;
  numero_telefono: string;
  facolta: string;
  corso_di_laurea: string;
  anno_di_laurea: string;
  data_di_nascita: string;
  role: Role;
  ruolo_tessera: MembershipRole;
};

type NewUserForm = EditUserForm & {
  email: string;
  password: string;
  confirmPassword: string;
};

const PROFILE_FIELDS =
  "id, nome, cognome, email_istituzionale, numero_telefono, facolta, corso_di_laurea, anno_di_laurea, data_di_nascita, role, ruolo_tessera, created_at, updated_at";
const PAGE_SIZE = 12;
const EMPTY_FILTERS: Filters = {
  role: "",
  membership: "",
  faculty: "",
  degree: "",
  graduationYear: "",
};

const SORT_OPTIONS: Array<{
  value: string;
  label: string;
  key: SortKey;
  direction: SortDirection;
}> = [
  { value: "created_at:desc", label: "Più recenti", key: "created_at", direction: "desc" },
  { value: "created_at:asc", label: "Meno recenti", key: "created_at", direction: "asc" },
  { value: "identity:asc", label: "Nome A–Z", key: "identity", direction: "asc" },
  { value: "identity:desc", label: "Nome Z–A", key: "identity", direction: "desc" },
  { value: "email:asc", label: "Email A–Z", key: "email", direction: "asc" },
  { value: "email:desc", label: "Email Z–A", key: "email", direction: "desc" },
  { value: "faculty:asc", label: "Facoltà A–Z", key: "faculty", direction: "asc" },
  { value: "faculty:desc", label: "Facoltà Z–A", key: "faculty", direction: "desc" },
  { value: "role:asc", label: "Ruolo", key: "role", direction: "asc" },
  { value: "role:desc", label: "Ruolo (inverso)", key: "role", direction: "desc" },
];

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getFullName(profile: Profile) {
  return [profile.nome, profile.cognome].filter(Boolean).join(" ").trim() || "Utente senza nome";
}

function getInitials(profile: Profile) {
  const initials = `${profile.nome?.[0] ?? ""}${profile.cognome?.[0] ?? ""}`.toUpperCase();
  return initials || "A";
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: includeTime ? "2-digit" : "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Rome",
  }).format(date);
}

function roleLabel(role?: Role | null) {
  return role === "admin" ? "Admin" : "Utente";
}

function membershipLabel(role?: MembershipRole | null) {
  return role === "direttivo" ? "Direttivo" : "Socio";
}

function matchesFilters(profile: Profile, search: string, filters: Filters) {
  const query = normalize(search);
  const matchesSearch =
    !query ||
    [
      profile.nome,
      profile.cognome,
      profile.email_istituzionale,
      profile.numero_telefono,
      getFacultyLabel(profile.facolta),
      getDegreeLabel(profile.corso_di_laurea),
      profile.anno_di_laurea,
      roleLabel(profile.role),
      membershipLabel(profile.ruolo_tessera),
      profile.id,
    ].some((value) => normalize(value).includes(query));

  return (
    matchesSearch &&
    (!filters.role || profile.role === filters.role) &&
    (!filters.membership || profile.ruolo_tessera === filters.membership) &&
    (!filters.faculty || profile.facolta === filters.faculty) &&
    (!filters.degree || getCanonicalDegreeValue(profile.corso_di_laurea) === filters.degree) &&
    (!filters.graduationYear || String(profile.anno_di_laurea ?? "") === filters.graduationYear)
  );
}

function getSortValue(profile: Profile, key: SortKey) {
  if (key === "identity") return normalize(`${profile.nome ?? ""} ${profile.cognome ?? ""}`);
  if (key === "email") return normalize(profile.email_istituzionale);
  if (key === "faculty") return normalize(getFacultyLabel(profile.facolta));
  if (key === "role") return `${profile.role === "admin" ? "0" : "1"}-${normalize(profile.cognome)}`;
  return new Date(profile.created_at).getTime() || 0;
}

function toEditForm(profile: Profile): EditUserForm {
  return {
    nome: profile.nome ?? "",
    cognome: profile.cognome ?? "",
    numero_telefono: profile.numero_telefono ?? "",
    facolta: profile.facolta ?? "",
    corso_di_laurea: getCanonicalDegreeValue(profile.corso_di_laurea),
    anno_di_laurea: String(profile.anno_di_laurea ?? ""),
    data_di_nascita: profile.data_di_nascita ?? "",
    role: profile.role ?? "user",
    ruolo_tessera: profile.ruolo_tessera ?? "socio",
  };
}

function isSameProfile(profile: Profile, form: EditUserForm) {
  const original = toEditForm(profile);
  return (Object.keys(original) as Array<keyof EditUserForm>).every(
    (key) => original[key] === form[key],
  );
}

function isStrongPassword(value: string) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

async function readApiResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    user?: T;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Operazione non riuscita.");
  }

  return payload;
}

async function fetchAllClientProfiles() {
  const supabase = createClient();
  const batchSize = 1000;
  let from = 0;
  let total: number | null = null;
  const profiles: Profile[] = [];

  while (true) {
    const { data, error, count } = await supabase
      .from("profiles")
      .select(PROFILE_FIELDS, { count: from === 0 ? "exact" : undefined })
      .order("created_at", { ascending: false })
      .range(from, from + batchSize - 1);

    if (error) throw error;

    const batch = (data ?? []) as Profile[];
    profiles.push(...batch);
    if (from === 0) total = count ?? null;
    if (batch.length < batchSize || (total !== null && profiles.length >= total)) break;
    from += batchSize;
  }

  return profiles;
}

function ModalShell({
  children,
  labelledBy,
  describedBy,
  onClose,
  compact = false,
}: {
  children: ReactNode;
  labelledBy: string;
  describedBy?: string;
  onClose: () => void;
  compact?: boolean;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const backdrop = backdropRef.current;
    const parent = backdrop?.parentElement;
    const siblingStates = parent
      ? Array.from(parent.children)
          .filter((element) => element !== backdrop)
          .map((element) => ({
            element: element as HTMLElement,
            inert: (element as HTMLElement).inert,
          }))
      : [];

    siblingStates.forEach(({ element }) => {
      element.inert = true;
    });

    const getFocusableElements = () =>
      Array.from(
        backdrop?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusableElements = getFocusableElements();
      if (!focusableElements.length) {
        event.preventDefault();
        backdrop?.querySelector<HTMLElement>('[role="dialog"]')?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLElement && backdrop?.contains(document.activeElement)) {
        return;
      }
      const focusableElements = getFocusableElements();
      (focusableElements[0] ?? backdrop?.querySelector<HTMLElement>('[role="dialog"]'))?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      siblingStates.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className={styles.modalBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`${styles.modal} ${compact ? styles.modalCompact : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
        {props.required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        {...props}
        id={id}
        aria-describedby={hintId}
        className={`${styles.input} ${className ?? ""}`}
      />
      {hint ? (
        <p id={hintId} className={styles.fieldHint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  options,
  hint,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  options: ProfileOption[];
  hint?: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
        {props.required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <select {...props} id={id} aria-describedby={hintId} className={styles.select}>
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p id={hintId} className={styles.fieldHint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function DialogHeader({
  eyebrow,
  title,
  description,
  titleId,
  onClose,
}: {
  eyebrow: string;
  title: string;
  description: string;
  titleId: string;
  onClose: () => void;
}) {
  return (
    <header className={styles.modalHeader}>
      <div>
        <span className={styles.modalEyebrow}>{eyebrow}</span>
        <h2 id={titleId} className={styles.modalTitle}>
          {title}
        </h2>
        <p id={`${titleId}-description`} className={styles.modalDescription}>
          {description}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Chiudi finestra"
      >
        <X />
      </Button>
    </header>
  );
}

function CreateUserDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (profile: Profile) => void;
}) {
  const initialFaculty = FACULTY_OPTIONS[0]?.value ?? "";
  const initialDegree = getDegreeOptions(initialFaculty)[0]?.value ?? "";
  const [form, setForm] = useState<NewUserForm>({
    email: "",
    password: "",
    confirmPassword: "",
    nome: "",
    cognome: "",
    numero_telefono: "",
    facolta: initialFaculty,
    corso_di_laurea: initialDegree,
    anno_di_laurea: String(new Date().getFullYear()),
    data_di_nascita: "",
    role: "user",
    ruolo_tessera: "socio",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const degreeOptions = getDegreeOptions(form.facolta, form.corso_di_laurea);
  const requestClose = useCallback(() => {
    if (!submitting) onClose();
  }, [onClose, submitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!isStrongPassword(form.password)) {
      setFormError("La password deve rispettare tutti i criteri indicati.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setFormError("Le password non coincidono.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          nome: form.nome.trim(),
          cognome: form.cognome.trim(),
          numero_telefono: form.numero_telefono.trim(),
          facolta: form.facolta,
          corso_di_laurea: form.corso_di_laurea,
          anno_di_laurea: Number(form.anno_di_laurea),
          data_di_nascita: form.data_di_nascita,
          role: form.role,
          ruolo_tessera: form.ruolo_tessera,
        }),
      });
      const payload = await readApiResponse<Profile>(response);

      if (!payload.user) throw new Error("Il profilo creato non è stato restituito.");
      onCreated(payload.user);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Creazione non riuscita.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      labelledBy="create-user-title"
      describedBy="create-user-title-description"
      onClose={requestClose}
    >
      <DialogHeader
        eyebrow="Nuovo account"
        title="Aggiungi un utente"
        description="Crea l’account e completa subito il profilo Astra."
        titleId="create-user-title"
        onClose={requestClose}
      />

      <form className={styles.modalForm} onSubmit={handleSubmit}>
        <fieldset className={styles.formSection}>
          <legend>
            <ShieldCheck /> Accesso
          </legend>
          <div className={styles.formGridTwo}>
            <Field
              id="create-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              autoFocus
              required
            />
            <SelectField
              id="create-role"
              label="Ruolo piattaforma"
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({ ...current, role: event.target.value as Role }))
              }
              options={[
                { value: "user", label: "Utente" },
                { value: "admin", label: "Amministratore" },
              ]}
              required
            />
          </div>
          <div className={styles.formGridTwo}>
            <Field
              id="create-password"
              label="Password iniziale"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              hint="Almeno 8 caratteri, con maiuscola, minuscola, numero e simbolo. L’utente potrà cambiarla dal proprio profilo."
              required
            />
            <Field
              id="create-password-confirm"
              label="Conferma password"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((current) => ({ ...current, confirmPassword: event.target.value }))
              }
              required
            />
          </div>
        </fieldset>

        <fieldset className={styles.formSection}>
          <legend>
            <UserRound /> Profilo
          </legend>
          <div className={styles.formGridTwo}>
            <Field
              id="create-name"
              label="Nome"
              value={form.nome}
              onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
              required
            />
            <Field
              id="create-surname"
              label="Cognome"
              value={form.cognome}
              onChange={(event) => setForm((current) => ({ ...current, cognome: event.target.value }))}
              required
            />
          </div>
          <div className={styles.formGridTwo}>
            <Field
              id="create-phone"
              label="Telefono"
              type="tel"
              autoComplete="tel"
              value={form.numero_telefono}
              onChange={(event) =>
                setForm((current) => ({ ...current, numero_telefono: event.target.value }))
              }
              required
            />
            <Field
              id="create-birth-date"
              label="Data di nascita"
              type="date"
              value={form.data_di_nascita}
              onChange={(event) =>
                setForm((current) => ({ ...current, data_di_nascita: event.target.value }))
              }
              required
            />
          </div>
        </fieldset>

        <fieldset className={styles.formSection}>
          <legend>
            <GraduationCap /> Percorso e tessera
          </legend>
          <div className={styles.formGridTwo}>
            <SelectField
              id="create-faculty"
              label="Facoltà"
              value={form.facolta}
              onChange={(event) => {
                const faculty = event.target.value;
                setForm((current) => ({
                  ...current,
                  facolta: faculty,
                  corso_di_laurea: getDegreeOptions(faculty)[0]?.value ?? "",
                }));
              }}
              options={[{ value: "", label: "Seleziona facoltà" }, ...FACULTY_OPTIONS]}
              required
            />
            <SelectField
              id="create-graduation-year"
              label="Anno di laurea"
              value={form.anno_di_laurea}
              onChange={(event) =>
                setForm((current) => ({ ...current, anno_di_laurea: event.target.value }))
              }
              options={[{ value: "", label: "Seleziona anno" }, ...GRADUATION_YEAR_OPTIONS]}
              required
            />
          </div>
          <SelectField
            id="create-degree"
            label="Corso di laurea"
            value={form.corso_di_laurea}
            onChange={(event) =>
              setForm((current) => ({ ...current, corso_di_laurea: event.target.value }))
            }
            options={[
              {
                value: "",
                label: form.facolta ? "Seleziona corso" : "Seleziona prima la facoltà",
              },
              ...degreeOptions,
            ]}
            required
          />
          <SelectField
            id="create-membership"
            label="Ruolo tessera"
            value={form.ruolo_tessera}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                ruolo_tessera: event.target.value as MembershipRole,
              }))
            }
            options={[
              { value: "socio", label: "Socio" },
              { value: "direttivo", label: "Direttivo" },
            ]}
            required
          />
        </fieldset>

        {formError ? (
          <Alert variant="destructive" className={styles.formAlert}>
            <CircleAlert />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className={styles.modalFooter}>
          <Button
            type="button"
            variant="outline"
            className={styles.secondaryButton}
            onClick={requestClose}
            disabled={submitting}
          >
            Annulla
          </Button>
          <Button type="submit" className={styles.primaryButton} disabled={submitting}>
            {submitting ? <RefreshCw className={styles.spin} /> : <Plus />}
            {submitting ? "Creazione…" : "Crea utente"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditUserDialog({
  profile,
  isCurrentAdmin,
  saving,
  onClose,
  onSave,
  onRequestDelete,
}: {
  profile: Profile;
  isCurrentAdmin: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (profile: Profile) => Promise<void>;
  onRequestDelete: (profile: Profile) => void;
}) {
  const [form, setForm] = useState<EditUserForm>(() => toEditForm(profile));
  const [formError, setFormError] = useState("");
  const hasChanges = !isSameProfile(profile, form);
  const degreeOptions = getDegreeOptions(form.facolta, form.corso_di_laurea);
  const requestClose = useCallback(() => {
    if (!saving) onClose();
  }, [onClose, saving]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (
      !form.nome.trim() ||
      !form.cognome.trim() ||
      !form.numero_telefono.trim() ||
      !form.facolta ||
      !form.corso_di_laurea ||
      !form.anno_di_laurea ||
      !form.data_di_nascita
    ) {
      setFormError("Compila tutti i campi obbligatori.");
      return;
    }

    try {
      await onSave({
        ...profile,
        nome: form.nome.trim(),
        cognome: form.cognome.trim(),
        numero_telefono: form.numero_telefono.trim(),
        facolta: form.facolta,
        corso_di_laurea: form.corso_di_laurea,
        anno_di_laurea: Number(form.anno_di_laurea),
        data_di_nascita: form.data_di_nascita,
        role: form.role,
        ruolo_tessera: form.ruolo_tessera,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Salvataggio non riuscito.");
    }
  }

  return (
    <ModalShell
      labelledBy="edit-user-title"
      describedBy="edit-user-title-description"
      onClose={requestClose}
    >
      <DialogHeader
        eyebrow={`ID ${profile.id.slice(0, 8)}`}
        title={getFullName(profile)}
        description="Aggiorna i dati del profilo e i permessi dell’account."
        titleId="edit-user-title"
        onClose={requestClose}
      />

      <form className={styles.modalForm} onSubmit={handleSubmit}>
        <fieldset className={styles.formSection}>
          <legend>
            <UserRound /> Dati personali
          </legend>
          <div className={styles.formGridTwo}>
            <Field
              id="edit-name"
              label="Nome"
              value={form.nome}
              onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
              autoFocus
              required
            />
            <Field
              id="edit-surname"
              label="Cognome"
              value={form.cognome}
              onChange={(event) => setForm((current) => ({ ...current, cognome: event.target.value }))}
              required
            />
          </div>
          <Field
            id="edit-email"
            label="Email account"
            type="email"
            value={profile.email_istituzionale ?? ""}
            hint="L’email resta sincronizzata con l’account di accesso e non si modifica da questa schermata."
            disabled
          />
          <div className={styles.formGridTwo}>
            <Field
              id="edit-phone"
              label="Telefono"
              type="tel"
              value={form.numero_telefono}
              onChange={(event) =>
                setForm((current) => ({ ...current, numero_telefono: event.target.value }))
              }
              required
            />
            <Field
              id="edit-birth-date"
              label="Data di nascita"
              type="date"
              value={form.data_di_nascita}
              onChange={(event) =>
                setForm((current) => ({ ...current, data_di_nascita: event.target.value }))
              }
              required
            />
          </div>
        </fieldset>

        <fieldset className={styles.formSection}>
          <legend>
            <GraduationCap /> Percorso universitario
          </legend>
          <div className={styles.formGridTwo}>
            <SelectField
              id="edit-faculty"
              label="Facoltà"
              value={form.facolta}
              onChange={(event) => {
                const faculty = event.target.value;
                setForm((current) => ({
                  ...current,
                  facolta: faculty,
                  corso_di_laurea: getDegreeOptions(faculty)[0]?.value ?? "",
                }));
              }}
              options={[{ value: "", label: "Seleziona facoltà" }, ...FACULTY_OPTIONS]}
              required
            />
            <SelectField
              id="edit-graduation-year"
              label="Anno di laurea"
              value={form.anno_di_laurea}
              onChange={(event) =>
                setForm((current) => ({ ...current, anno_di_laurea: event.target.value }))
              }
              options={[{ value: "", label: "Seleziona anno" }, ...GRADUATION_YEAR_OPTIONS]}
              required
            />
          </div>
          <SelectField
            id="edit-degree"
            label="Corso di laurea"
            value={form.corso_di_laurea}
            onChange={(event) =>
              setForm((current) => ({ ...current, corso_di_laurea: event.target.value }))
            }
            options={[
              {
                value: "",
                label: form.facolta ? "Seleziona corso" : "Seleziona prima la facoltà",
              },
              ...degreeOptions,
            ]}
            required
          />
        </fieldset>

        <fieldset className={styles.formSection}>
          <legend>
            <ShieldCheck /> Ruoli e permessi
          </legend>
          <div className={styles.formGridTwo}>
            <SelectField
              id="edit-role"
              label="Ruolo piattaforma"
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({ ...current, role: event.target.value as Role }))
              }
              options={[
                { value: "user", label: "Utente" },
                { value: "admin", label: "Amministratore" },
              ]}
              hint={isCurrentAdmin ? "Non puoi rimuovere il tuo ruolo amministratore." : undefined}
              disabled={isCurrentAdmin}
              required
            />
            <SelectField
              id="edit-membership"
              label="Ruolo tessera"
              value={form.ruolo_tessera}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  ruolo_tessera: event.target.value as MembershipRole,
                }))
              }
              options={[
                { value: "socio", label: "Socio" },
                { value: "direttivo", label: "Direttivo" },
              ]}
              required
            />
          </div>
        </fieldset>

        <div className={styles.profileMeta}>
          <span>Creato {formatDate(profile.created_at, true)}</span>
          <span>Aggiornato {formatDate(profile.updated_at, true)}</span>
        </div>

        {isCurrentAdmin ? (
          <p className={styles.selfGuard}>
            Il tuo account amministratore non può essere declassato o eliminato da questa pagina.
          </p>
        ) : null}

        {formError ? (
          <Alert variant="destructive" className={styles.formAlert}>
            <CircleAlert />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className={`${styles.modalFooter} ${styles.modalFooterSplit}`}>
          <Button
            type="button"
            variant="destructive"
            className={styles.deleteButton}
            onClick={() => onRequestDelete(profile)}
            disabled={isCurrentAdmin || saving}
            title={isCurrentAdmin ? "Non puoi eliminare il tuo account" : undefined}
          >
            <Trash2 /> Elimina
          </Button>
          <div className={styles.footerActions}>
            <Button
              type="button"
              variant="outline"
              className={styles.secondaryButton}
              onClick={requestClose}
              disabled={saving}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              className={styles.primaryButton}
              disabled={!hasChanges || saving}
            >
              {saving ? <RefreshCw className={styles.spin} /> : <CheckCircle2 />}
              {saving ? "Salvataggio…" : "Salva modifiche"}
            </Button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteUserDialog({
  profile,
  deleting,
  onClose,
  onConfirm,
}: {
  profile: Profile;
  deleting: boolean;
  onClose: () => void;
  onConfirm: (profile: Profile) => Promise<void>;
}) {
  const [formError, setFormError] = useState("");
  const requestClose = useCallback(() => {
    if (!deleting) onClose();
  }, [deleting, onClose]);

  async function handleConfirm() {
    setFormError("");
    try {
      await onConfirm(profile);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Eliminazione non riuscita.");
    }
  }

  return (
    <ModalShell
      labelledBy="delete-user-title"
      describedBy="delete-user-description"
      onClose={requestClose}
      compact
    >
      <div className={styles.deleteIcon} aria-hidden="true">
        <Trash2 />
      </div>
      <h2 id="delete-user-title" className={styles.confirmTitle}>
        Eliminare {getFullName(profile)}?
      </h2>
      <p id="delete-user-description" className={styles.confirmDescription}>
        Verranno rimossi l’account di accesso e il profilo. Anche i dati collegati possono essere
        eliminati secondo le regole del database. Questa azione non può essere annullata.
      </p>
      <div className={styles.confirmIdentity}>
        <strong>{profile.email_istituzionale || "Email non disponibile"}</strong>
        <span>ID {profile.id}</span>
      </div>

      {formError ? (
        <Alert variant="destructive" className={styles.formAlert}>
          <CircleAlert />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className={styles.confirmActions}>
        <Button
          type="button"
          variant="outline"
          className={styles.secondaryButton}
          onClick={requestClose}
          disabled={deleting}
        >
          Annulla
        </Button>
        <Button
          type="button"
          variant="destructive"
          className={styles.confirmDeleteButton}
          onClick={handleConfirm}
          disabled={deleting}
        >
          {deleting ? <RefreshCw className={styles.spin} /> : <Trash2 />}
          {deleting ? "Eliminazione…" : "Elimina definitivamente"}
        </Button>
      </div>
    </ModalShell>
  );
}

function SortButton({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button type="button" className={styles.sortButton} onClick={() => onSort(sortKey)}>
      {label}
      <Icon aria-hidden="true" />
    </button>
  );
}

function UserBadges({ profile }: { profile: Profile }) {
  return (
    <div className={styles.badgeRow}>
      <span
        className={`${styles.badge} ${
          profile.role === "admin" ? styles.badgeAdmin : styles.badgeUser
        }`}
      >
        {profile.role === "admin" ? <ShieldCheck /> : <UserRound />}
        {roleLabel(profile.role)}
      </span>
      <span
        className={`${styles.badge} ${
          profile.ruolo_tessera === "direttivo" ? styles.badgeBoard : styles.badgeMember
        }`}
      >
        {membershipLabel(profile.ruolo_tessera)}
      </span>
    </div>
  );
}

function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <UsersRound />
      </div>
      <h3>{hasFilters ? "Nessun utente corrisponde ai filtri" : "Nessun utente presente"}</h3>
      <p>
        {hasFilters
          ? "Prova a modificare la ricerca o a rimuovere uno dei filtri attivi."
          : "Quando verrà creato il primo profilo, comparirà qui."}
      </p>
      {hasFilters ? (
        <Button type="button" variant="outline" className={styles.secondaryButton} onClick={onReset}>
          <RotateCcw /> Azzera filtri
        </Button>
      ) : null}
    </div>
  );
}

export default function AdminUsersClient({
  adminId,
  initialProfiles,
  initialError = "",
}: {
  adminId: string;
  initialProfiles: Profile[];
  initialError?: string;
}) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "created_at",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(
    initialError ? { type: "error", message: initialError } : null,
  );
  const selectAllRef = useRef<HTMLInputElement>(null);
  const mobileSelectAllRef = useRef<HTMLInputElement>(null);

  const availableYears = useMemo(
    () =>
      [...new Set(profiles.map((profile) => profile.anno_di_laurea).filter((year): year is number => Number.isFinite(year)))]
        .sort((a, b) => b - a)
        .map((year) => ({ value: String(year), label: String(year) })),
    [profiles],
  );

  const availableDegrees = useMemo(() => {
    const source = filters.faculty
      ? profiles.filter((profile) => profile.facolta === filters.faculty)
      : profiles;
    const values = [
      ...new Set(
        source
          .map((profile) => getCanonicalDegreeValue(profile.corso_di_laurea))
          .filter(Boolean),
      ),
    ];
    return values
      .map((value) => ({ value, label: getDegreeLabel(value) }))
      .sort((a, b) => a.label.localeCompare(b.label, "it"));
  }, [filters.faculty, profiles]);

  const filteredProfiles = useMemo(
    () => profiles.filter((profile) => matchesFilters(profile, search, filters)),
    [filters, profiles, search],
  );

  const sortedProfiles = useMemo(() => {
    return [...filteredProfiles].sort((a, b) => {
      const aValue = getSortValue(a, sort.key);
      const bValue = getSortValue(b, sort.key);
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredProfiles, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedProfiles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedProfiles = useMemo(
    () => sortedProfiles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, sortedProfiles],
  );
  const resultIds = useMemo(() => new Set(sortedProfiles.map((profile) => profile.id)), [sortedProfiles]);
  const selectedInResults = useMemo(
    () => selected.filter((id) => resultIds.has(id)),
    [resultIds, selected],
  );
  const pageIds = useMemo(() => paginatedProfiles.map((profile) => profile.id), [paginatedProfiles]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedInResults.includes(id));
  const somePageSelected = pageIds.some((id) => selectedInResults.includes(id));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const hasActiveFilters = Boolean(search.trim()) || activeFilterCount > 0;
  const totalAdmins = profiles.filter((profile) => profile.role === "admin").length;
  const totalBoardMembers = profiles.filter(
    (profile) => profile.ruolo_tessera === "direttivo",
  ).length;
  const firstVisible = sortedProfiles.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastVisible = Math.min(currentPage * PAGE_SIZE, sortedProfiles.length);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allPageSelected && somePageSelected;
    }
    if (mobileSelectAllRef.current) {
      mobileSelectAllRef.current.indeterminate = !allPageSelected && somePageSelected;
    }
  }, [allPageSelected, somePageSelected]);

  const refreshProfiles = useCallback(async () => {
    setRefreshing(true);
    setNotice(null);

    try {
      const freshProfiles = await fetchAllClientProfiles();
      const freshIds = new Set(freshProfiles.map((profile) => profile.id));
      setProfiles(freshProfiles);
      setSelected((current) => current.filter((id) => freshIds.has(id)));
      setNotice({ type: "success", message: "Elenco utenti aggiornato." });
    } catch {
      setNotice({ type: "error", message: "Aggiornamento non riuscito. Riprova tra poco." });
    } finally {
      setRefreshing(false);
    }
  }, []);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
    setSelected([]);
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelected([]);
  }

  function updateFacultyFilter(value: string) {
    setFilters((current) => ({
      ...current,
      faculty: value,
      degree:
        current.degree &&
        profiles.some(
          (profile) =>
            (!value || profile.facolta === value) &&
            getCanonicalDegreeValue(profile.corso_di_laurea) === current.degree,
        )
          ? current.degree
          : "",
    }));
    setPage(1);
    setSelected([]);
  }

  function resetFilters() {
    setSearch("");
    setFilters(EMPTY_FILTERS);
    setSort({ key: "created_at", direction: "desc" });
    setPage(1);
    setSelected([]);
  }

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  function toggleSelected(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }

  function togglePageSelection() {
    setSelected((current) => {
      if (allPageSelected) return current.filter((id) => !pageIds.includes(id));
      return [...new Set([...current, ...pageIds])];
    });
  }

  function handleExport() {
    const selectedSet = new Set(selectedInResults);
    const rows = selectedSet.size
      ? sortedProfiles.filter((profile) => selectedSet.has(profile.id))
      : sortedProfiles;

    if (!rows.length) {
      setNotice({ type: "error", message: "Non ci sono utenti da esportare." });
      return;
    }

    const headers = [
      "ID",
      "Nome",
      "Cognome",
      "Email",
      "Telefono",
      "Facoltà",
      "Corso",
      "Anno di laurea",
      "Data di nascita",
      "Ruolo",
      "Ruolo tessera",
      "Creato il",
      "Aggiornato il",
    ];
    const lines = rows.map((profile) =>
      [
        profile.id,
        profile.nome,
        profile.cognome,
        profile.email_istituzionale,
        profile.numero_telefono,
        getFacultyLabel(profile.facolta),
        getDegreeLabel(profile.corso_di_laurea),
        profile.anno_di_laurea,
        profile.data_di_nascita,
        roleLabel(profile.role),
        membershipLabel(profile.ruolo_tessera),
        formatDate(profile.created_at, true),
        formatDate(profile.updated_at, true),
      ]
        .map(csvCell)
        .join(";"),
    );
    const csv = `\uFEFF${headers.map(csvCell).join(";")}\r\n${lines.join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `utenti-astra-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);

    setNotice({
      type: "success",
      message: `${rows.length} ${rows.length === 1 ? "utente esportato" : "utenti esportati"}.`,
    });
  }

  function handleCreated(profile: Profile) {
    setProfiles((current) => [profile, ...current]);
    setCreating(false);
    setPage(1);
    setNotice({ type: "success", message: `${getFullName(profile)} è stato creato.` });
  }

  async function handleSave(profile: Profile) {
    setSavingId(profile.id);

    try {
      const response = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const payload = await readApiResponse<Profile>(response);
      if (!payload.user) throw new Error("Il profilo aggiornato non è stato restituito.");

      setProfiles((current) =>
        current.map((item) => (item.id === payload.user?.id ? payload.user : item)),
      );
      setEditingProfile(null);
      setNotice({ type: "success", message: `${getFullName(payload.user)} è stato aggiornato.` });
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(profile: Profile) {
    setDeletingId(profile.id);

    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });
      await readApiResponse(response);

      setProfiles((current) => current.filter((item) => item.id !== profile.id));
      setSelected((current) => current.filter((id) => id !== profile.id));
      setDeletingProfile(null);
      setNotice({ type: "success", message: `${getFullName(profile)} è stato eliminato.` });
    } finally {
      setDeletingId(null);
    }
  }

  const paginationPages = useMemo(() => {
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  return (
    <main className={styles.page}>
      <div className={styles.backgroundGlowOne} aria-hidden="true" />
      <div className={styles.backgroundGlowTwo} aria-hidden="true" />

      {creating ? <CreateUserDialog onClose={() => setCreating(false)} onCreated={handleCreated} /> : null}
      {editingProfile ? (
        <EditUserDialog
          profile={editingProfile}
          isCurrentAdmin={editingProfile.id === adminId}
          saving={savingId === editingProfile.id}
          onClose={() => setEditingProfile(null)}
          onSave={handleSave}
          onRequestDelete={(profile) => {
            setEditingProfile(null);
            setDeletingProfile(profile);
          }}
        />
      ) : null}
      {deletingProfile ? (
        <DeleteUserDialog
          profile={deletingProfile}
          deleting={deletingId === deletingProfile.id}
          onClose={() => setDeletingProfile(null)}
          onConfirm={handleDelete}
        />
      ) : null}

      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroTopline}>
            <Link href="/admin" className={styles.backLink}>
              <ChevronLeft /> Pannello admin
            </Link>
            <span className={styles.heroLabel}>Gestione community</span>
          </div>
          <div className={styles.heroMain}>
            <div className={styles.heroCopy}>
              <h1>Utenti</h1>
              <p>Cerca i profili, controlla ruoli e percorsi, intervieni solo quando serve.</p>
            </div>
            <div className={styles.heroActions}>
              <Button
                type="button"
                variant="outline"
                className={styles.heroSecondaryButton}
                onClick={refreshProfiles}
                disabled={refreshing}
              >
                <RefreshCw className={refreshing ? styles.spin : ""} />
                {refreshing ? "Aggiorno…" : "Aggiorna"}
              </Button>
              <Button type="button" className={styles.heroPrimaryButton} onClick={() => setCreating(true)}>
                <Plus /> Nuovo utente
              </Button>
            </div>
          </div>
        </header>

        <section className={styles.statsGrid} aria-label="Riepilogo utenti">
          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
              <UsersRound />
            </div>
            <div>
              <span>Utenti totali</span>
              <strong>{profiles.length}</strong>
            </div>
          </article>
          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconViolet}`}>
              <ShieldCheck />
            </div>
            <div>
              <span>Amministratori</span>
              <strong>{totalAdmins}</strong>
            </div>
          </article>
          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconGold}`}>
              <UserRound />
            </div>
            <div>
              <span>Direttivo</span>
              <strong>{totalBoardMembers}</strong>
            </div>
          </article>
          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
              <Search />
            </div>
            <div>
              <span>Risultati visibili</span>
              <strong>{sortedProfiles.length}</strong>
            </div>
          </article>
        </section>

        {notice ? (
          <Alert
            variant={notice.type === "error" ? "destructive" : "default"}
            className={`${styles.notice} ${
              notice.type === "success" ? styles.noticeSuccess : styles.noticeError
            }`}
          >
            {notice.type === "success" ? <CheckCircle2 /> : <CircleAlert />}
            <AlertDescription>{notice.message}</AlertDescription>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={styles.noticeClose}
              onClick={() => setNotice(null)}
              aria-label="Chiudi messaggio"
            >
              <X />
            </Button>
          </Alert>
        ) : null}

        <section className={styles.toolbarCard} aria-label="Ricerca e filtri utenti">
          <div className={styles.toolbarRow}>
            <div className={styles.searchBox}>
              <label htmlFor="users-search" className={styles.srOnly}>
                Cerca utenti
              </label>
              <Search aria-hidden="true" />
              <input
                id="users-search"
                type="search"
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Cerca nome, email, corso o ID…"
              />
              {search ? (
                <button type="button" onClick={() => updateSearch("")} aria-label="Cancella ricerca">
                  <X />
                </button>
              ) : null}
            </div>

            <div className={styles.toolbarActions}>
              <Button
                type="button"
                variant="outline"
                className={`${styles.secondaryButton} ${filtersOpen ? styles.activeFilterButton : ""}`}
                aria-expanded={filtersOpen}
                aria-controls="users-filter-panel"
                onClick={() => setFiltersOpen((current) => !current)}
              >
                <Filter /> Filtri
                {activeFilterCount ? <span className={styles.filterCount}>{activeFilterCount}</span> : null}
              </Button>

              <label className={styles.sortSelectLabel}>
                <span className={styles.srOnly}>Ordina utenti</span>
                <select
                  value={`${sort.key}:${sort.direction}`}
                  onChange={(event) => {
                    const option = SORT_OPTIONS.find((item) => item.value === event.target.value);
                    if (option) {
                      setSort({ key: option.key, direction: option.direction });
                      setPage(1);
                    }
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <Button
                type="button"
                variant="outline"
                className={styles.secondaryButton}
                onClick={handleExport}
                disabled={!sortedProfiles.length}
              >
                <Download />
                {selectedInResults.length
                  ? `Esporta ${selectedInResults.length}`
                  : `Esporta ${sortedProfiles.length}`}
              </Button>
            </div>
          </div>

          {filtersOpen ? (
            <div id="users-filter-panel" className={styles.filterPanel}>
              <div className={styles.filterGrid}>
                <SelectField
                  id="filter-role"
                  label="Ruolo piattaforma"
                  value={filters.role}
                  onChange={(event) => updateFilter("role", event.target.value as Filters["role"])}
                  options={[
                    { value: "", label: "Tutti i ruoli" },
                    { value: "user", label: "Utenti" },
                    { value: "admin", label: "Amministratori" },
                  ]}
                />
                <SelectField
                  id="filter-membership"
                  label="Ruolo tessera"
                  value={filters.membership}
                  onChange={(event) =>
                    updateFilter("membership", event.target.value as Filters["membership"])
                  }
                  options={[
                    { value: "", label: "Tutti" },
                    { value: "socio", label: "Soci" },
                    { value: "direttivo", label: "Direttivo" },
                  ]}
                />
                <SelectField
                  id="filter-faculty"
                  label="Facoltà"
                  value={filters.faculty}
                  onChange={(event) => updateFacultyFilter(event.target.value)}
                  options={[{ value: "", label: "Tutte le facoltà" }, ...FACULTY_OPTIONS]}
                />
                <SelectField
                  id="filter-degree"
                  label="Corso di laurea"
                  value={filters.degree}
                  onChange={(event) => updateFilter("degree", event.target.value)}
                  options={[{ value: "", label: "Tutti i corsi" }, ...availableDegrees]}
                />
                <SelectField
                  id="filter-year"
                  label="Anno di laurea"
                  value={filters.graduationYear}
                  onChange={(event) => updateFilter("graduationYear", event.target.value)}
                  options={[{ value: "", label: "Tutti gli anni" }, ...availableYears]}
                />
              </div>
              <div className={styles.filterFooter}>
                <span>
                  {activeFilterCount
                    ? `${activeFilterCount} ${activeFilterCount === 1 ? "filtro attivo" : "filtri attivi"}`
                    : "Nessun filtro attivo"}
                </span>
                {hasActiveFilters ? (
                  <Button type="button" variant="ghost" className={styles.resetButton} onClick={resetFilters}>
                    <RotateCcw /> Azzera filtri
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {selectedInResults.length ? (
            <div className={styles.selectionBar}>
              <div>
                <CheckCircle2 />
                <span role="status" aria-live="polite">
                  <strong>{selectedInResults.length}</strong>{" "}
                  {selectedInResults.length === 1 ? "utente selezionato" : "utenti selezionati"}
                </span>
              </div>
              <div>
                <Button type="button" variant="ghost" onClick={() => setSelected([])}>
                  Deseleziona
                </Button>
                <Button type="button" className={styles.selectionExportButton} onClick={handleExport}>
                  <Download /> Esporta selezione
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <section
          className={`${styles.resultsCard} ${refreshing ? styles.resultsRefreshing : ""}`}
          aria-busy={refreshing}
        >
          {refreshing ? <div className={styles.refreshProgress} aria-hidden="true" /> : null}
          <header className={styles.resultsHeader}>
            <div>
              <h2>Elenco utenti</h2>
              <p aria-live="polite">
                {firstVisible}–{lastVisible} di {sortedProfiles.length}
                {hasActiveFilters ? ` risultati su ${profiles.length}` : " profili"}
              </p>
            </div>
            <span className={styles.resultsHint}>Apri “Gestisci” per modificare un profilo</span>
          </header>

          {sortedProfiles.length ? (
            <>
              <div className={styles.desktopTableWrap}>
                <table className={styles.usersTable}>
                  <thead>
                    <tr>
                      <th className={styles.checkboxColumn}>
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={togglePageSelection}
                          aria-label="Seleziona tutti gli utenti della pagina"
                        />
                      </th>
                      <th
                        aria-sort={
                          sort.key === "identity"
                            ? sort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <SortButton
                          label="Utente"
                          sortKey="identity"
                          currentKey={sort.key}
                          direction={sort.direction}
                          onSort={toggleSort}
                        />
                      </th>
                      <th
                        aria-sort={
                          sort.key === "email"
                            ? sort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <SortButton
                          label="Contatti"
                          sortKey="email"
                          currentKey={sort.key}
                          direction={sort.direction}
                          onSort={toggleSort}
                        />
                      </th>
                      <th
                        aria-sort={
                          sort.key === "faculty"
                            ? sort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <SortButton
                          label="Percorso"
                          sortKey="faculty"
                          currentKey={sort.key}
                          direction={sort.direction}
                          onSort={toggleSort}
                        />
                      </th>
                      <th
                        aria-sort={
                          sort.key === "role"
                            ? sort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <SortButton
                          label="Ruoli"
                          sortKey="role"
                          currentKey={sort.key}
                          direction={sort.direction}
                          onSort={toggleSort}
                        />
                      </th>
                      <th
                        aria-sort={
                          sort.key === "created_at"
                            ? sort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <SortButton
                          label="Iscritto"
                          sortKey="created_at"
                          currentKey={sort.key}
                          direction={sort.direction}
                          onSort={toggleSort}
                        />
                      </th>
                      <th className={styles.actionColumn}>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProfiles.map((profile) => {
                      const isSelected = selectedInResults.includes(profile.id);
                      return (
                        <tr key={profile.id} className={isSelected ? styles.selectedRow : undefined}>
                          <td className={styles.checkboxColumn}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelected(profile.id)}
                              aria-label={`Seleziona ${getFullName(profile)}`}
                            />
                          </td>
                          <td>
                            <div className={styles.userIdentity}>
                              <div className={styles.avatar}>{getInitials(profile)}</div>
                              <div>
                                <strong>{getFullName(profile)}</strong>
                                <span title={profile.id}>ID {profile.id.slice(0, 8)}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.contactCell}>
                              {profile.email_istituzionale ? (
                                <a href={`mailto:${profile.email_istituzionale}`}>
                                  <Mail /> {profile.email_istituzionale}
                                </a>
                              ) : (
                                <span>
                                  <Mail /> Email non disponibile
                                </span>
                              )}
                              {profile.numero_telefono ? (
                                <a href={`tel:${profile.numero_telefono}`}>
                                  <Phone /> {profile.numero_telefono}
                                </a>
                              ) : (
                                <span>
                                  <Phone /> Telefono non disponibile
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className={styles.degreeCell}>
                              <span>{getFacultyLabel(profile.facolta)}</span>
                              <strong title={getDegreeLabel(profile.corso_di_laurea)}>
                                {getDegreeLabel(profile.corso_di_laurea)}
                              </strong>
                              <small>Laurea {profile.anno_di_laurea ?? "—"}</small>
                            </div>
                          </td>
                          <td>
                            <UserBadges profile={profile} />
                          </td>
                          <td>
                            <div className={styles.dateCell}>
                              <CalendarDays />
                              <span>{formatDate(profile.created_at)}</span>
                            </div>
                          </td>
                          <td className={styles.actionColumn}>
                            <Button
                              type="button"
                              variant="outline"
                              className={styles.manageButton}
                              onClick={() => setEditingProfile(profile)}
                            >
                              <PencilLine /> Gestisci
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={styles.mobileList}>
                <div className={styles.mobileSelectionHeader}>
                  <label>
                    <input
                      ref={mobileSelectAllRef}
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePageSelection}
                    />
                    Seleziona questa pagina
                  </label>
                  <span>{paginatedProfiles.length} profili</span>
                </div>
                {paginatedProfiles.map((profile) => {
                  const isSelected = selectedInResults.includes(profile.id);
                  return (
                    <article
                      key={profile.id}
                      className={`${styles.mobileUserCard} ${isSelected ? styles.mobileUserCardSelected : ""}`}
                    >
                      <div className={styles.mobileCardHeader}>
                        <label className={styles.mobileCheckbox}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(profile.id)}
                          />
                          <span className={styles.srOnly}>Seleziona {getFullName(profile)}</span>
                        </label>
                        <div className={styles.avatar}>{getInitials(profile)}</div>
                        <div className={styles.mobileCardIdentity}>
                          <strong>{getFullName(profile)}</strong>
                          <span>{profile.email_istituzionale || "Email non disponibile"}</span>
                        </div>
                      </div>
                      <UserBadges profile={profile} />
                      <dl className={styles.mobileDetails}>
                        <div>
                          <dt>Facoltà</dt>
                          <dd>{getFacultyLabel(profile.facolta)}</dd>
                        </div>
                        <div>
                          <dt>Laurea</dt>
                          <dd>{profile.anno_di_laurea ?? "—"}</dd>
                        </div>
                        <div className={styles.mobileDetailWide}>
                          <dt>Corso</dt>
                          <dd>{getDegreeLabel(profile.corso_di_laurea)}</dd>
                        </div>
                        <div>
                          <dt>Telefono</dt>
                          <dd>{profile.numero_telefono || "—"}</dd>
                        </div>
                        <div>
                          <dt>Iscritto</dt>
                          <dd>{formatDate(profile.created_at)}</dd>
                        </div>
                      </dl>
                      <Button
                        type="button"
                        variant="outline"
                        className={styles.mobileFullManageButton}
                        onClick={() => setEditingProfile(profile)}
                      >
                        <PencilLine /> Gestisci profilo
                      </Button>
                    </article>
                  );
                })}
              </div>

              <footer className={styles.pagination}>
                <p>
                  Pagina <strong>{currentPage}</strong> di <strong>{totalPages}</strong>
                </p>
                <nav aria-label="Paginazione utenti">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={styles.pageButton}
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    aria-label="Pagina precedente"
                  >
                    <ChevronLeft />
                  </Button>
                  <div className={styles.pageNumbers}>
                    {paginationPages.map((pageNumber) => (
                      <Button
                        key={pageNumber}
                        type="button"
                        variant={pageNumber === currentPage ? "default" : "outline"}
                        size="icon"
                        className={`${styles.pageButton} ${
                          pageNumber === currentPage ? styles.currentPageButton : ""
                        }`}
                        onClick={() => setPage(pageNumber)}
                        aria-current={pageNumber === currentPage ? "page" : undefined}
                        aria-label={`Pagina ${pageNumber}`}
                      >
                        {pageNumber}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={styles.pageButton}
                    onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Pagina successiva"
                  >
                    <ChevronRight />
                  </Button>
                </nav>
              </footer>
            </>
          ) : (
            <EmptyState hasFilters={hasActiveFilters} onReset={resetFilters} />
          )}
        </section>
      </div>
    </main>
  );
}
