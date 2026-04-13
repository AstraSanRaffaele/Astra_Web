"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/app/auth-shared";
import Footer from "@/components/ui/footer";
import { createClient } from "@/lib/supabase/client";

const RESEND_DELAY_SECONDS = 60;

export default function SignupCheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <SignupCheckEmailContent />
    </Suspense>
  );
}

function SignupCheckEmailContent() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const email = searchParams.get("email") ?? "";

  const [secondsLeft, setSecondsLeft] = useState(RESEND_DELAY_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  async function handleResendConfirmation() {
    if (!email || isResending || secondsLeft > 0) return;

    setIsResending(true);
    setFeedback(null);

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setFeedback({
        type: "error",
        message: "Non siamo riusciti a inviare una nuova email di conferma. Riprova tra poco.",
      });
      setIsResending(false);
      return;
    }

    setFeedback({
      type: "success",
      message: "Ti abbiamo inviato una nuova email di conferma.",
    });
    setSecondsLeft(RESEND_DELAY_SECONDS);
    setIsResending(false);
  }

  const resendLabel =
    secondsLeft > 0
      ? `Richiedi una nuova email tra ${secondsLeft}s`
      : isResending
        ? "Invio in corso..."
        : "Richiedi una nuova email di conferma";

  return (
    <>
      <AuthShell
        title={
          <>
            Controlla la tua
            <br />
            <em style={{ fontStyle: "italic", color: "#C2CEFF" }}>email</em>.
          </>
        }
        description="Ti abbiamo inviato un link di conferma. Apri la tua casella di posta e completa l’attivazione dell’account."
        cardTitle={
          <>
            Conferma la tua
            <br />
            registrazione.
          </>
        }
        cardDescription="Per attivare il profilo devi confermare la tua email."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              padding: "1rem 1.1rem",
              borderRadius: "1rem",
              background: "rgba(14,31,107,.06)",
              border: "1px solid rgba(14,31,107,.12)",
              color: "var(--blue)",
              fontSize: ".95rem",
              lineHeight: 1.6,
            }}
          >
            Abbiamo inviato un’email di conferma
            {email ? (
              <>
                {" "}
                a <strong>{email}</strong>
              </>
            ) : null}
            .
            <br />
            Clicca sul link ricevuto per verificare il tuo account e completare la registrazione.
          </div>

          <div
            style={{
              padding: "1rem 1.1rem",
              borderRadius: "1rem",
              background: "#F8FAFF",
              border: "1px solid rgba(14,31,107,.08)",
              color: "rgba(15,23,42,.86)",
              fontSize: ".93rem",
              lineHeight: 1.65,
            }}
          >
            Non trovi l’email? Controlla anche in spam o nella cartella promozioni.
          </div>

          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={!email || secondsLeft > 0 || isResending}
            style={{
              marginTop: ".1rem",
              alignSelf: "flex-start",
              background: "transparent",
              color: !email || secondsLeft > 0 || isResending ? "rgba(15,23,42,.42)" : "var(--blue)",
              padding: 0,
              border: "none",
              cursor: !email || secondsLeft > 0 || isResending ? "not-allowed" : "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              fontWeight: 700,
              fontSize: ".93rem",
            }}
          >
            {resendLabel}
          </button>

          {feedback ? (
            <div
              style={{
                padding: ".95rem 1rem",
                borderRadius: ".95rem",
                background:
                  feedback.type === "success" ? "rgba(34,197,94,.10)" : "rgba(239,68,68,.10)",
                border:
                  feedback.type === "success"
                    ? "1px solid rgba(34,197,94,.22)"
                    : "1px solid rgba(239,68,68,.22)",
                color: feedback.type === "success" ? "#166534" : "#991b1b",
                fontSize: ".92rem",
                lineHeight: 1.6,
              }}
            >
              {feedback.message}
            </div>
          ) : null}

          <Link
            href="/login"
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
              cursor: "pointer",
              textDecoration: "none",
              textAlign: "center",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Vai al login
          </Link>

          <div
            style={{
              marginTop: ".6rem",
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              fontSize: ".92rem",
            }}
          >
            <Link
              href="/signup"
              style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 700 }}
            >
              Torna alla registrazione
            </Link>
          </div>
        </div>
      </AuthShell>
    </>
  );
}