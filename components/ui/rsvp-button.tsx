"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RsvpStatus = "loading" | "none" | "confermato" | "cancellato" | "posti_esauriti";

type Props = {
  eventId: string;
  maxPosti?: number | null;
};

export default function RsvpButton({ eventId, maxPosti }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<RsvpStatus>("loading");
  const [postiOccupati, setPostiOccupati] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("none"); return; }

      // Current user's RSVP
      const { data: myRsvp } = await supabase
        .from("rsvp")
        .select("stato")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      // Count confirmed RSVPs
      const { count } = await supabase
        .from("rsvp")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("stato", "confermato");

      setPostiOccupati(count ?? 0);

      if (myRsvp?.stato === "confermato") {
        setStatus("confermato");
      } else if (maxPosti !== null && maxPosti !== undefined && (count ?? 0) >= maxPosti) {
        setStatus("posti_esauriti");
      } else {
        setStatus("none");
      }
    }
    loadStatus();
  }, [eventId, maxPosti, supabase]);

  async function handleConfirm() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error ?? "Errore durante l'iscrizione.");
    } else {
      setStatus("confermato");
      setPostiOccupati(c => c + 1);
      setMsg("Iscrizione confermata!");
    }
    setBusy(false);
  }

  async function handleCancel() {
    if (!window.confirm("Vuoi cancellare la tua iscrizione a questo evento?")) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/rsvp", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error ?? "Errore durante la cancellazione.");
    } else {
      setStatus(maxPosti !== null && maxPosti !== undefined && postiOccupati - 1 >= maxPosti ? "posti_esauriti" : "none");
      setPostiOccupati(c => Math.max(0, c - 1));
      setMsg("Iscrizione cancellata.");
    }
    setBusy(false);
  }

  const postiRimasti = maxPosti != null ? maxPosti - postiOccupati : null;

  if (status === "loading") {
    return (
      <div style={{ height: 56, borderRadius: "999px", background: "rgba(8,16,42,.07)", animation: "sk 1.4s ease infinite" }}>
        <style>{`@keyframes sk{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Posti counter */}
      {maxPosti != null && (
        <div style={{ background: "rgba(255,255,255,.07)", borderRadius: "1.2rem", padding: "1rem 1.2rem", border: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
            <span style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgb(8, 16, 42)" }}>
              Posti disponibili
            </span>
            <span style={{
              fontSize: ".95rem",
              fontWeight: 800,
              color: postiRimasti === 0 ? "#dc2626" : "rgb(8, 16, 42)",
              textShadow: "0 1px 1px rgba(255,255,255,.35)",
            }}>
              {postiRimasti === 0 ? "Esauriti" : `${postiRimasti} / ${maxPosti}`}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, background: "rgba(8,16,42,.12)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(100, (postiOccupati / maxPosti) * 100)}%`,
              background: postiRimasti === 0 ? "#dc2626" : postiRimasti! <= 3 ? "#d97706" : "#16a34a",
              borderRadius: "999px",
              transition: "width .4s",
            }} />
          </div>
        </div>
      )}

      {/* Action button */}
      {status === "confermato" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".6rem", background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.25)", borderRadius: "999px", padding: ".75rem 1.2rem" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#34d399" strokeWidth="1.5"/>
              <path d="M5 8l2 2 4-4" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: ".9rem", fontWeight: 700, color: "#34d399" }}>Sei iscritto</span>
          </div>
          <button
            onClick={handleCancel}
            disabled={busy}
            style={{
              background: busy ? "rgba(127,29,29,.7)" : "#b91c1c",
              border: "1px solid #991b1b",
              color: "#fff",
              borderRadius: "999px",
              padding: ".6rem 1.2rem",
              fontWeight: 600,
              fontSize: ".82rem",
              cursor: busy ? "wait" : "pointer",
              transition: "all .18s",
              boxShadow: "0 4px 14px rgba(185,28,28,.28)",
            }}
          >
            {busy ? "Cancellazione..." : "Cancella iscrizione"}
          </button>
        </div>
      ) : status === "posti_esauriti" ? (
        <div style={{ background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.2)", borderRadius: "999px", padding: ".85rem 1.4rem", textAlign: "center" }}>
          <span style={{ fontSize: ".9rem", fontWeight: 700, color: "#f87171" }}>Posti esauriti</span>
        </div>
      ) : (
        <button
          onClick={handleConfirm}
          disabled={busy}
          style={{
            background: busy ? "rgba(255,255,255,.25)" : "#fff",
            color: busy ? "rgba(8,16,42,.5)" : "#08102A",
            border: "none",
            borderRadius: "999px",
            padding: ".85rem 1.4rem",
            fontWeight: 800,
            fontSize: ".95rem",
            cursor: busy ? "wait" : "pointer",
            transition: "all .2s",
            boxShadow: "0 4px 16px rgba(0,0,0,.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: ".5rem",
          }}
        >
          {busy ? (
            "Iscrizione in corso..."
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Iscriviti all&apos;evento
            </>
          )}
        </button>
      )}

      {/* Feedback message */}
      {msg && (
        <p style={{
          margin: 0, fontSize: ".84rem", fontWeight: 500, lineHeight: 1.5, textAlign: "center",
          color: msg.includes("confermata") ? "#34d399" : msg.includes("cancellata") ? "rgba(255,255,255,.5)" : "#f87171",
        }}>
          {msg}
        </p>
      )}
    </div>
  );
}