"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthMessage, AuthShell, FieldLabel } from "@/app/auth-shared";

const VOLUNTEER_AREAS = [
  "Eventi",
  "Comunicazione",
  "Social media",
  "Raccolta fondi",
  "Supporto organizzativo",
  "Accoglienza",
] as const;

export default function CallToActionPage() {
  const supabase = useMemo(() => createClient(), []);

  const [area, setArea] = useState("");
  const [availability, setAvailability] = useState("");
  const [motivation, setMotivation] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session) {
        window.location.href = "/login?next=/calltoaction";
        return;
      }

      setCheckingAuth(false);
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (loading || checkingAuth) return;

    setError("");
    setSuccess("");

    if (!area) {
      setError("Seleziona un ambito in cui ti piacerebbe dare una mano.");
      return;
    }

    if (!availability) {
      setError("Indica la tua disponibilità.");
      return;
    }

    if (!consent) {
      setError("Devi confermare di voler inviare la richiesta.");
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      console.log("Volunteer interest submitted", {
        area,
        availability,
        motivation: motivation.trim(),
      });

      setSuccess("Richiesta inviata correttamente. Ti contatteremo presto.");
      setArea("");
      setAvailability("");
      setMotivation("");
      setConsent(false);
    } catch {
      setError("Qualcosa è andato storto. Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return null;
  }

  return (
    <AuthShell
      title={
        <>
          Diventa
          <br />
          <em style={{ fontStyle: "italic", color: "#C2CEFF" }}>volontario</em>.
        </>
      }
      description="Se fai già parte della community Astra, puoi candidarti come volontario scegliendo l’ambito in cui ti senti più utile."
      cardTitle={
        <>
          Invia la tua
          <br />
          candidatura.
        </>
      }
      cardDescription="Scegli un’area, indicaci la tua disponibilità e raccontaci in poche righe come vorresti contribuire."
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          position: "relative",
          zIndex: 20,
        }}
      >
        <div style={{ position: "relative", zIndex: 21 }}>
          <FieldLabel htmlFor="area">Ambito di interesse</FieldLabel>
          <select
            id="area"
            className="input"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
            style={{
              position: "relative",
              zIndex: 22,
              pointerEvents: "auto",
            }}
          >
            <option value="">Seleziona un ambito</option>
            {VOLUNTEER_AREAS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div style={{ position: "relative", zIndex: 21 }}>
          <FieldLabel htmlFor="availability">Disponibilità</FieldLabel>
          <select
            id="availability"
            className="input"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            required
            style={{
              position: "relative",
              zIndex: 22,
              pointerEvents: "auto",
            }}
          >
            <option value="">Seleziona la tua disponibilità</option>
            <option value="occasionale">Occasionale</option>
            <option value="1-2 volte al mese">1-2 volte al mese</option>
            <option value="settimanale">Settimanale</option>
            <option value="flessibile">Flessibile in base alle necessità</option>
          </select>
        </div>

        <div style={{ position: "relative", zIndex: 21 }}>
          <FieldLabel htmlFor="motivation">Perché vuoi partecipare?</FieldLabel>
          <textarea
            id="motivation"
            className="input"
            placeholder="Scrivi un breve messaggio..."
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            rows={5}
            style={{
              position: "relative",
              zIndex: 22,
              pointerEvents: "auto",
              resize: "vertical",
              minHeight: "140px",
            }}
          />
        </div>

        <label
          htmlFor="consent"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: ".75rem",
            fontSize: ".92rem",
            lineHeight: 1.5,
            color: "rgba(8,16,42,.78)",
            position: "relative",
            zIndex: 21,
          }}
        >
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ marginTop: ".2rem" }}
          />
          Confermo di voler inviare la mia candidatura come volontario per l’ambito selezionato.
        </label>

        <AuthMessage error={error} success={success} />

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{
            marginTop: ".4rem",
            background: "var(--blue)",
            color: "#fff",
            padding: ".95rem 1.4rem",
            borderRadius: "100px",
            fontWeight: 800,
            fontSize: ".95rem",
            boxShadow: "0 4px 24px rgba(14,31,107,.18)",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
            WebkitTapHighlightColor: "transparent",
            position: "relative",
            zIndex: 30,
            pointerEvents: "auto",
            touchAction: "manipulation",
          }}
        >
          {loading ? "Invio in corso..." : "Invia candidatura"}
        </button>
      </form>

      <div
        style={{
          marginTop: "1.4rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          fontSize: ".92rem",
          position: "relative",
          zIndex: 20,
        }}
      >
        <Link
          href="/"
          style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 700 }}
        >
          Torna alla home
        </Link>
      </div>
    </AuthShell>
  );
}