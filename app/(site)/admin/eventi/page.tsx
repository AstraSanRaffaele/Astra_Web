"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────
type Event = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  location: string | null;
  event_date: string;
  created_at: string;
  updated_at: string;
  partnership: string | null;
  max_posti: number | null;
  iscrizioni_aperte: boolean | null;
  iscrizioni_esterne: boolean | null;
  link_iscrizioni_esterne: string | null;
};

type EventForm = {
  title: string;
  description: string;
  location: string;
  event_date: string;
  event_time: string;
  cover_image: string;
  partnership: string;
  max_posti: string;
  iscrizioni_aperte: boolean;
  iscrizioni_esterne: boolean;
  link_iscrizioni_esterne: string;
};

const EMPTY_FORM: EventForm = {
  title: "",
  description: "",
  location: "",
  event_date: "",
  event_time: "18:00",
  cover_image: "",
  partnership: "",
  max_posti: "",
  iscrizioni_aperte: false,
  iscrizioni_esterne: false,
  link_iscrizioni_esterne: "",
};

// ── Helpers ───────────────────────────────────────────────────────
function fmtDate(v: string) {
  return new Date(v).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtTime(v: string) {
  return new Date(v).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function isPast(v: string) {
  return new Date(v) < new Date();
}
function splitDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
}

// ── Modal ─────────────────────────────────────────────────────────
function EventModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initial?: Event;
  onClose: () => void;
  onSave: (f: EventForm) => Promise<void>;
}) {
  const [form, setForm] = useState<EventForm>(() => {
    if (mode === "edit" && initial) {
      const { date, time } = splitDateTime(initial.event_date);
      return {
        title: initial.title,
        description: initial.description ?? "",
        location: initial.location ?? "",
        event_date: date,
        event_time: time,
        cover_image: initial.cover_image ?? "",
        partnership: initial?.partnership ?? "",
        max_posti: initial.max_posti != null ? String(initial.max_posti) : "",
        iscrizioni_aperte: Boolean(initial.iscrizioni_aperte),
        iscrizioni_esterne: Boolean(initial.iscrizioni_esterne),
        link_iscrizioni_esterne: initial.link_iscrizioni_esterne ?? "",
      };
    }
    return EMPTY_FORM;
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof EventForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setErr("Il titolo è obbligatorio.");
      return;
    }
    if (!form.event_date) {
      setErr("La data è obbligatoria.");
      return;
    }
    if (form.iscrizioni_esterne && !form.link_iscrizioni_esterne.trim()) {
      setErr("Inserisci il link per le iscrizioni esterne.");
      return;
    }

    setSaving(true);
    setErr("");

    try {
      await onSave(form);
    } catch (error) {
      console.error("Errore submit modal:", error);
      setErr(
        error instanceof Error
          ? error.message
          : "Errore durante il salvataggio."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,20,50,.45)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "2rem",
          padding: "2.5rem",
          width: "100%",
          maxWidth: 620,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 32px 80px rgba(10,20,50,.22)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#0f2f6e",
              }}
            >
              {mode === "create" ? "Nuovo evento" : "Modifica evento"}
            </h2>
            <p
              style={{
                margin: ".3rem 0 0",
                color: "#6b7280",
                fontSize: ".9rem",
              }}
            >
              {mode === "create"
                ? "Compila i campi per creare un nuovo evento."
                : "Modifica i dettagli dell'evento."}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(15,47,110,.06)",
              border: "none",
              borderRadius: "50%",
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: "1rem",
              color: "#6b7280",
            }}
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}
        >
          <MField
            label="Titolo *"
            value={form.title}
            onChange={(v) => set("title", v)}
            placeholder="es. Aperitivo di benvenuto"
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <MField
              label="Data *"
              type="date"
              value={form.event_date}
              onChange={(v) => set("event_date", v)}
            />
            <MField
              label="Ora"
              type="time"
              value={form.event_time}
              onChange={(v) => set("event_time", v)}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 180px",
              gap: "1rem",
            }}
          >
            <MField
              label="Luogo"
              value={form.location}
              onChange={(v) => set("location", v)}
              placeholder="es. Aula Magna, Campus San Raffaele"
            />
            <MField
              label="Max posti"
              type="number"
              value={form.max_posti}
              onChange={(v) => set("max_posti", v)}
              placeholder="es. 80"
            />
          </div>

          <MField
            label="Partnership"
            value={form.partnership}
            onChange={(v) => set("partnership", v)}
            placeholder="es. Red Bull, Nike"
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: ".8rem",
              padding: "1rem",
              borderRadius: "16px",
              border: "1px solid rgba(15,47,110,.12)",
              background: "white",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
              <span
                style={{
                  fontSize: ".82rem",
                  fontWeight: 800,
                  color: "#17315f",
                  letterSpacing: ".02em",
                  textTransform: "uppercase",
                }}
              >
                Gestione iscrizioni
              </span>
              <p
                style={{
                  margin: 0,
                  fontSize: ".9rem",
                  color: "#6b7280",
                  lineHeight: 1.5,
                }}
              >
                Scegli se non usare iscrizioni, usare l’RSVP interno ASTRA oppure un link esterno.
              </p>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".7rem",
                color: "#102a56",
                fontSize: ".95rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={form.iscrizioni_aperte}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((prev) => ({
                    ...prev,
                    iscrizioni_aperte: checked,
                    iscrizioni_esterne: checked ? false : prev.iscrizioni_esterne,
                    link_iscrizioni_esterne: checked ? "" : prev.link_iscrizioni_esterne,
                  }));
                }}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span>Usa iscrizioni interne ASTRA (RSVP)</span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".7rem",
                color: "#102a56",
                fontSize: ".95rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={form.iscrizioni_esterne}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((prev) => ({
                    ...prev,
                    iscrizioni_esterne: checked,
                    iscrizioni_aperte: checked ? false : prev.iscrizioni_aperte,
                  }));
                }}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span>Usa iscrizioni esterne tramite link</span>
            </label>

            {form.iscrizioni_esterne && (
              <MField
                label="Link piattaforma esterna *"
                value={form.link_iscrizioni_esterne}
                onChange={(v) => set("link_iscrizioni_esterne", v)}
                placeholder="https://..."
              />
            )}

            <div
              style={{
                fontSize: ".82rem",
                color: "#6b7280",
                lineHeight: 1.5,
                padding: ".75rem .9rem",
                borderRadius: "12px",
                background: "rgba(15,47,110,.04)",
              }}
            >
              {!form.iscrizioni_aperte && !form.iscrizioni_esterne
                ? "Nessuna iscrizione attiva: l'evento sarà solo informativo."
                : form.iscrizioni_esterne
                  ? "Le iscrizioni verranno gestite fuori da ASTRA usando il link inserito qui sopra."
                  : "Le iscrizioni verranno gestite internamente su ASTRA con lista RSVP."}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
            <label
              style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}
            >
              Descrizione
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Descrivi l'evento..."
              rows={4}
              style={{
                border: "1px solid rgba(15,47,110,.12)",
                background: "white",
                color: "#102a56",
                borderRadius: "12px",
                padding: ".8rem 1rem",
                fontSize: ".95rem",
                outline: "none",
                width: "100%",
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.6,
              }}
            />
          </div>

          <MField
            label="URL immagine di copertina"
            value={form.cover_image}
            onChange={(v) => set("cover_image", v)}
            placeholder="https://..."
          />

          {form.cover_image && (
            <div
              style={{
                borderRadius: "1rem",
                overflow: "hidden",
                aspectRatio: "16/6",
                background: "#e8edfb",
              }}
            >
              <img
                src={form.cover_image}
                alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          {err && (
            <div
              style={{
                background: "rgba(190,39,39,.08)",
                color: "#8b1d1d",
                border: "1px solid rgba(190,39,39,.14)",
                borderRadius: "12px",
                padding: ".8rem 1rem",
                fontWeight: 600,
                fontSize: ".9rem",
              }}
            >
              {err}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: ".75rem",
              justifyContent: "flex-end",
              marginTop: ".5rem",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid rgba(15,47,110,.12)",
                background: "white",
                color: "#0f2f6e",
                borderRadius: "999px",
                padding: ".7rem 1.5rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                border: "none",
                background: saving ? "#8ca4d7" : "#1847a3",
                color: "white",
                borderRadius: "999px",
                padding: ".7rem 2rem",
                fontWeight: 700,
                cursor: saving ? "wait" : "pointer",
                fontSize: ".95rem",
              }}
            >
              {saving
                ? "Salvataggio..."
                : mode === "create"
                  ? "Crea evento"
                  : "Salva modifiche"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
      <label style={{ fontSize: ".8rem", fontWeight: 700, color: "#17315f" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: "1px solid rgba(15,47,110,.12)",
          background: "white",
          color: "#102a56",
          borderRadius: "12px",
          padding: ".8rem 1rem",
          fontSize: ".95rem",
          outline: "none",
          width: "100%",
          transition: "border-color .18s",
        }}
      />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function AdminEventi() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; event?: Event } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<"tutti" | "prossimi" | "passati">("tutti");

  // ── Auth + load ──
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!profile || profile.role !== "admin") {
        router.replace("/");
        return;
      }
      await fetchEvents();
    }
    load();
  }, [supabase, router]);

  async function fetchEvents() {
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });

    console.log("FETCH EVENTS DATA:", data);
    console.log("FETCH EVENTS ERROR:", err);

    if (err) {
      console.error("Errore fetch eventi:", err);
      setError(err.message ?? "Caricamento eventi non riuscito.");
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents((data ?? []) as Event[]);
    setLoading(false);
  }

  // ── CRUD ──
  async function handleSave(form: EventForm, editingId?: string) {
    setError("");
    setSuccess("");

    const isoDate = `${form.event_date}T${form.event_time}:00`;

    const parsedMaxSeats =
      form.max_posti.trim() === "" ? null : Number(form.max_posti);

    if (
      parsedMaxSeats !== null &&
      (!Number.isFinite(parsedMaxSeats) || parsedMaxSeats < 1)
    ) {
      throw new Error("Il numero massimo di posti deve essere almeno 1.");
    }

    const externalLink = form.link_iscrizioni_esterne.trim();

    if (form.iscrizioni_esterne && !externalLink) {
      throw new Error("Inserisci un link valido per le iscrizioni esterne.");
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      cover_image: form.cover_image.trim() || null,
      partnership: form.partnership.trim() || null,
      max_posti: form.iscrizioni_esterne ? null : parsedMaxSeats,
      iscrizioni_aperte: form.iscrizioni_esterne ? false : form.iscrizioni_aperte,
      iscrizioni_esterne: form.iscrizioni_esterne,
      link_iscrizioni_esterne: form.iscrizioni_esterne ? externalLink : null,
      event_date: isoDate,
    };

    console.log("EVENT SAVE MODE:", editingId ? "edit" : "create");
    console.log("EVENT PAYLOAD:", payload);

    try {
      if (editingId) {
        const { data, error: err } = await supabase
          .from("events")
          .update(payload)
          .eq("id", editingId)
          .select("*")
          .single();

        console.log("UPDATE DATA:", data);
        console.log("UPDATE ERROR:", err);

        if (err) {
          console.error("Errore update evento:", err);
          setError(err.message ?? "Salvataggio non riuscito.");
          throw new Error(err.message ?? "Salvataggio non riuscito.");
        }

        setEvents((c) => c.map((e) => (e.id === editingId ? (data as Event) : e)));
        setSuccess("Evento aggiornato.");
      } else {
        const { data, error: err } = await supabase
          .from("events")
          .insert(payload)
          .select("*")
          .single();

        console.log("INSERT DATA:", data);
        console.log("INSERT ERROR:", err);

        if (err || !data) {
          console.error("Errore creazione evento:", err);
          setError(err?.message ?? "Creazione non riuscita.");
          throw new Error(err?.message ?? "Creazione non riuscita.");
        }

        setEvents((c) => [data as Event, ...c]);
        setSuccess("Evento creato.");
      }

      setModal(null);
    } catch (error) {
      console.error("handleSave exception:", error);
      throw error;
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Eliminare "${title}"?`)) return;

    setDeletingId(id);
    setError("");
    setSuccess("");

    const { error: err } = await supabase.from("events").delete().eq("id", id);

    console.log("DELETE ID:", id);
    console.log("DELETE ERROR:", err);

    if (err) {
      console.error("Errore eliminazione evento:", err);
      setError(err.message ?? "Eliminazione non riuscita.");
      setDeletingId(null);
      return;
    }

    setEvents((c) => c.filter((e) => e.id !== id));
    setSuccess("Evento eliminato.");
    setDeletingId(null);
  }

  const filtered = useMemo(() => {
    if (filter === "prossimi") return events.filter((e) => !isPast(e.event_date));
    if (filter === "passati") return events.filter((e) => isPast(e.event_date));
    return events;
  }, [events, filter]);

  const upcoming = events.filter((e) => !isPast(e.event_date));

  return (
    <>
      {modal && (
        <EventModal
          mode={modal.mode}
          initial={modal.event}
          onClose={() => setModal(null)}
          onSave={(f) => handleSave(f, modal.event?.id)}
        />
      )}

      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg,#f7f9fc 0%,#eef3fb 100%)",
          padding: "8.5rem 1.5rem 4rem",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          {/* ── Hero ── */}
          <section
            style={{
              background: "linear-gradient(135deg,#0f2f6e 0%,#1847a3 100%)",
              borderRadius: "2rem",
              padding: "clamp(1.5rem,3vw,2.5rem)",
              color: "white",
              boxShadow: "0 24px 60px rgba(15,47,110,.18)",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}
              >
                <span
                  style={{
                    alignSelf: "flex-start",
                    padding: ".4rem .9rem",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.12)",
                    border: "1px solid rgba(255,255,255,.18)",
                    fontSize: ".85rem",
                    fontWeight: 700,
                  }}
                >
                  Amministrazione • Gestione eventi
                </span>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(2rem,5vw,3rem)",
                    lineHeight: 1.05,
                    fontWeight: 800,
                  }}
                >
                  Gestione eventi.
                </h1>
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,.8)",
                    lineHeight: 1.6,
                    maxWidth: 500,
                  }}
                >
                  Crea, modifica ed elimina gli eventi visibili agli studenti della
                  community.
                </p>
              </div>
              <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => setModal({ mode: "create" })}
                  style={{
                    border: "none",
                    background: "#fff",
                    color: "#0f2f6e",
                    padding: ".85rem 1.5rem",
                    borderRadius: "999px",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: ".9rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: ".5rem",
                    boxShadow: "0 4px 16px rgba(0,0,0,.12)",
                  }}
                >
                  <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>＋</span>
                  Nuovo evento
                </button>
                <a
                  href="/admin"
                  style={{
                    textDecoration: "none",
                    color: "white",
                    padding: ".85rem 1.3rem",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "rgba(255,255,255,.1)",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  Pannello admin
                </a>
              </div>
            </div>

            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                gap: "1rem",
              }}
            >
              {[
                ["Totale", events.length],
                ["Prossimi", upcoming.length],
                ["Passati", events.length - upcoming.length],
              ].map(([l, v]) => (
                <div
                  key={String(l)}
                  style={{
                    background: "rgba(255,255,255,.1)",
                    border: "1px solid rgba(255,255,255,.14)",
                    borderRadius: "1.2rem",
                    padding: ".9rem 1.1rem",
                  }}
                >
                  <div
                    style={{ fontSize: ".85rem", color: "rgba(255,255,255,.7)" }}
                  >
                    {l}
                  </div>
                  <div
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: 800,
                      marginTop: ".2rem",
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Messages ── */}
          {(error || success) && (
            <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              {error && (
                <div
                  style={{
                    background: "rgba(190,39,39,.08)",
                    color: "#8b1d1d",
                    border: "1px solid rgba(190,39,39,.14)",
                    borderRadius: "1rem",
                    padding: ".9rem 1.1rem",
                    fontWeight: 600,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {error}
                  <button
                    onClick={() => setError("")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#8b1d1d",
                      fontSize: "1rem",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
              {success && (
                <div
                  style={{
                    background: "rgba(12,122,77,.08)",
                    color: "#0b6b46",
                    border: "1px solid rgba(12,122,77,.14)",
                    borderRadius: "1rem",
                    padding: ".9rem 1.1rem",
                    fontWeight: 600,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {success}
                  <button
                    onClick={() => setSuccess("")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#0b6b46",
                      fontSize: "1rem",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Filter pills + list ── */}
          <section
            style={{
              background: "rgba(255,255,255,.82)",
              border: "1px solid rgba(15,47,110,.08)",
              boxShadow: "0 8px 32px rgba(15,47,110,.07)",
              backdropFilter: "blur(12px)",
              borderRadius: "2rem",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "#0f2f6e",
                }}
              >
                {loading
                  ? "Caricamento..."
                  : `${filtered.length} event${filtered.length === 1 ? "o" : "i"}`}
              </h2>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                {(["tutti", "prossimi", "passati"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      border:
                        filter === f
                          ? "1px solid #0f2f6e"
                          : "1px solid rgba(15,47,110,.12)",
                      background: filter === f ? "#0f2f6e" : "white",
                      color: filter === f ? "#fff" : "#4a5a7a",
                      borderRadius: "999px",
                      padding: ".45rem 1.1rem",
                      fontWeight: 600,
                      fontSize: ".82rem",
                      cursor: "pointer",
                      transition: "all .18s",
                    }}
                  >
                    {f === "tutti" ? "Tutti" : f === "prossimi" ? "Prossimi" : "Passati"}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 80,
                      borderRadius: "1.2rem",
                      background: "rgba(15,47,110,.06)",
                      animation: "sk 1.4s ease infinite",
                    }}
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "4rem 2rem",
                  color: "#6b7280",
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📅</div>
                <p
                  style={{
                    fontWeight: 700,
                    color: "#0f2f6e",
                    marginBottom: ".5rem",
                  }}
                >
                  Nessun evento trovato
                </p>
                <p style={{ fontSize: ".9rem" }}>
                  Prova a cambiare il filtro o crea un nuovo evento.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                {filtered.map((e) => {
                  const past = isPast(e.event_date);
                  const deleting = deletingId === e.id;

                  return (
                    <div
                      key={e.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.2rem",
                        padding: "1.2rem 1.4rem",
                        background: past ? "rgba(15,47,110,.02)" : "#fff",
                        border: "1px solid rgba(15,47,110,.08)",
                        borderRadius: "1.4rem",
                        opacity: past ? 0.75 : 1,
                        transition: "box-shadow .2s, transform .2s",
                        flexWrap: "wrap",
                      }}
                      className="ev-admin-row"
                    >
                      {/* Date box */}
                      <div
                        className="ev-admin-date"
                        style={{
                          width: 52,
                          flexShrink: 0,
                          textAlign: "center",
                          background: past ? "rgba(15,47,110,.05)" : "#e8edfb",
                          borderRadius: "1rem",
                          padding: ".6rem .4rem",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Cormorant Garamond', Georgia, serif",
                            fontSize: "1.6rem",
                            fontWeight: 700,
                            lineHeight: 1,
                            color: past ? "#6b7280" : "#0f2f6e",
                            letterSpacing: "-.02em",
                          }}
                        >
                          {new Date(e.event_date).toLocaleDateString("it-IT", {
                            day: "2-digit",
                          })}
                        </div>
                        <div
                          style={{
                            fontSize: ".6rem",
                            fontWeight: 700,
                            letterSpacing: ".1em",
                            textTransform: "uppercase",
                            color: past ? "#9ca3af" : "#2E4080",
                            marginTop: ".15rem",
                          }}
                        >
                          {new Date(e.event_date)
                            .toLocaleDateString("it-IT", { month: "short" })
                            .toUpperCase()}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="ev-admin-info" style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: ".6rem",
                            flexWrap: "wrap",
                            marginBottom: ".25rem",
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "1rem",
                              fontWeight: 700,
                              color: "#08102A",
                              letterSpacing: "-.01em",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                            }}
                          >
                            {e.title}
                          </h3>

                          {past && (
                            <span
                              style={{
                                fontSize: ".62rem",
                                fontWeight: 700,
                                letterSpacing: ".08em",
                                textTransform: "uppercase",
                                background: "rgba(15,47,110,.06)",
                                color: "#6b7280",
                                padding: ".2rem .6rem",
                                borderRadius: "999px",
                              }}
                            >
                              Passato
                            </span>
                          )}

                          {!past && (
                            <span
                              style={{
                                fontSize: ".62rem",
                                fontWeight: 700,
                                letterSpacing: ".08em",
                                textTransform: "uppercase",
                                background: e.iscrizioni_esterne
                                  ? "rgba(24,71,163,.10)"
                                  : e.iscrizioni_aperte
                                    ? "rgba(12,122,77,.10)"
                                    : "rgba(190,39,39,.08)",
                                color: e.iscrizioni_esterne
                                  ? "#1847a3"
                                  : e.iscrizioni_aperte
                                    ? "#0b6b46"
                                    : "#8b1d1d",
                                padding: ".2rem .6rem",
                                borderRadius: "999px",
                              }}
                            >
                              {e.iscrizioni_esterne
                                ? "Iscrizioni esterne"
                                : e.iscrizioni_aperte
                                  ? "Iscrizioni aperte"
                                  : "Iscrizioni chiuse"}
                            </span>
                          )}
                        </div>

                        <p
                          style={{
                            margin: 0,
                            fontSize: ".84rem",
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            gap: ".5rem",
                            flexWrap: "wrap",
                            minWidth: 0,
                          }}
                        >
                          <span>
                            {fmtDate(e.event_date)} • {fmtTime(e.event_date)}
                          </span>
                          {e.location && (
                            <>
                              <span style={{ opacity: 0.4 }}>·</span>
                              <span
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "100%",
                                }}
                              >
                                {e.location}
                              </span>
                            </>
                          )}
                          {!e.iscrizioni_esterne && e.max_posti != null && (
                            <>
                              <span style={{ opacity: 0.4 }}>·</span>
                              <span style={{ fontWeight: 600, color: "#2E4080" }}>
                                Max {e.max_posti} posti
                              </span>
                            </>
                          )}
                        </p>

                        {e.iscrizioni_esterne && e.link_iscrizioni_esterne && (
                          <p
                            style={{
                              margin: ".35rem 0 0",
                              fontSize: ".82rem",
                              color: "#1847a3",
                              fontWeight: 700,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 500,
                            }}
                          >
                            Link esterno: {e.link_iscrizioni_esterne}
                          </p>
                        )}

                        {e.partnership && (
                          <p
                            style={{
                              margin: ".35rem 0 0",
                              fontSize: ".82rem",
                              color: "#2E4080",
                              fontWeight: 600,
                            }}
                          >
                            {e.partnership}
                          </p>
                        )}

                        {e.description && (
                          <p
                            style={{
                              margin: ".35rem 0 0",
                              fontSize: ".82rem",
                              color: "#9ca3af",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 500,
                            }}
                          >
                            {e.description}
                          </p>
                        )}
                      </div>

                      {/* Cover image thumb */}
                      {e.cover_image && (
                        <div
                          className="ev-admin-thumb"
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: ".8rem",
                            overflow: "hidden",
                            flexShrink: 0,
                            background: "#e8edfb",
                          }}
                        >
                          <img
                            src={e.cover_image}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="ev-admin-actions" style={{ display: "flex", gap: ".5rem", flexShrink: 0 }}>
                        <button
                          onClick={() => setModal({ mode: "edit", event: e })}
                          style={{
                            border: "1px solid rgba(15,47,110,.14)",
                            background: "white",
                            color: "#0f2f6e",
                            borderRadius: "999px",
                            padding: ".5rem 1rem",
                            fontWeight: 700,
                            fontSize: ".82rem",
                            cursor: "pointer",
                            transition: "background .18s",
                          }}
                          className="btn-edit-ev"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDelete(e.id, e.title)}
                          disabled={deleting}
                          style={{
                            border: "1px solid rgba(190,39,39,.18)",
                            background: deleting
                              ? "rgba(190,39,39,.05)"
                              : "white",
                            color: deleting ? "#b57b7b" : "#8b1d1d",
                            borderRadius: "999px",
                            padding: ".5rem 1rem",
                            fontWeight: 700,
                            fontSize: ".82rem",
                            cursor: deleting ? "wait" : "pointer",
                            transition: "background .18s",
                          }}
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
        .ev-admin-row:hover { box-shadow: 0 8px 32px rgba(15,47,110,.1) !important; transform: translateY(-2px); }
        .btn-edit-ev:hover { background: rgba(15,47,110,.05) !important; }

        @media (max-width: 820px) {
          .ev-admin-row {
            align-items: flex-start !important;
            gap: .9rem !important;
            padding: 1rem !important;
          }

          .ev-admin-info {
            min-width: 0 !important;
            flex: 1 1 calc(100% - 68px) !important;
          }

          .ev-admin-thumb {
            width: 52px !important;
            height: 52px !important;
          }

          .ev-admin-actions {
            width: 100%;
            flex-wrap: wrap;
            margin-top: .1rem;
          }

          .ev-admin-actions button {
            flex: 1 1 100%;
            justify-content: center;
            padding: .72rem 1rem !important;
          }
        }

        @media (max-width: 560px) {
          .ev-admin-row {
            display: grid !important;
            grid-template-columns: 52px 1fr;
            align-items: start !important;
            column-gap: .85rem !important;
            row-gap: .8rem !important;
          }

          .ev-admin-info {
            flex: unset !important;
          }

          .ev-admin-thumb,
          .ev-admin-actions {
            grid-column: 1 / -1;
          }

          .ev-admin-actions {
            margin-top: 0;
          }
        }
      `}</style>
    </>
  );
}