"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthMessage, AuthShell, FieldLabel } from "@/app/auth-shared";

function LoginPageContent() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (loading) return;
    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Inserisci email e password.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setError("Devi prima confermare la tua email.");
      } else {
        setError("Email o password non corrette.");
      }
      setLoading(false);
      return;
    }

    const session = data.session ?? (await supabase.auth.getSession()).data.session;

    if (!session) {
      setError("Login effettuato ma sessione non trovata. Riprova.");
      setLoading(false);
      return;
    }

    setSuccess("Accesso effettuato con successo.");
    setLoading(false);

    const nextPath = searchParams.get("next");
    const redirectTo = nextPath && nextPath.startsWith("/") ? nextPath : "/";

    window.location.href = redirectTo;
  }


  return (
    <>
      <AuthShell
        title={
          <>
            Bentornato in
            <br />
            <em style={{ fontStyle: "italic", color: "#C2CEFF" }}>Astra</em>.
          </>
        }
        description="Accedi alla tua area riservata per entrare nella community e gestire il tuo profilo."
        cardTitle={
          <>
            Accedi al
            <br />
            tuo account.
          </>
        }
        cardDescription="Inserisci email e password per entrare nella tua area Astra."
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
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="Inserisci la tua mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              required
              style={{
                position: "relative",
                zIndex: 22,
                pointerEvents: "auto",
              }}
            />
          </div>

          <div style={{ position: "relative", zIndex: 21 }}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="Inserisci la password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              style={{
                position: "relative",
                zIndex: 22,
                pointerEvents: "auto",
              }}
            />
          </div>

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
            {loading ? "Accesso in corso..." : "Accedi"}
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
            href="/signup"
            style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 700 }}
          >
            Crea account
          </Link>

          <Link
            href="/forgot-password"
            style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 700 }}
          >
            Password dimenticata?
          </Link>
        </div>
      </AuthShell>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}