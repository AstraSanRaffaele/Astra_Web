"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthMessage, AuthShell, FieldLabel } from "@/app/auth-shared";

export default function SignupPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Registrazione completata. Controlla la tua email per confermare l’account.");
  }

  return (
    <AuthShell
      title={
        <>
          Entra in
          <br />
          <em style={{ fontStyle: "italic", color: "#C2CEFF" }}>Astra</em>.
        </>
      }
      description="Registrati per entrare nella community, partecipare alle iniziative e accedere alla tua area personale."
      cardTitle={
        <>
          Crea il tuo
          <br />
          account.
        </>
      }
      cardDescription="Usa la tua email universitaria o personale per registrarti su Astra."
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="nome@universita.it"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="Crea una password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="confirmPassword">Conferma password</FieldLabel>
          <input
            id="confirmPassword"
            type="password"
            className="input"
            placeholder="Ripeti la password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
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
            cursor: "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? "Registrazione in corso..." : "Registrati"}
        </button>
      </form>

      <div
        style={{
          marginTop: "1.4rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          fontSize: ".92rem",
        }}
      >
        <Link href="/login" style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 700 }}>
          Hai già un account?
        </Link>
      </div>
    </AuthShell>
  );
}