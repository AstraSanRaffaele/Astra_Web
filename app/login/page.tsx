"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthMessage, AuthShell, FieldLabel } from "@/app/auth-shared";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Accesso effettuato con successo.");
    router.push("/");
    router.refresh();
  }

  return (
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
            placeholder="Inserisci la password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        }}
      >
        <Link href="/signup" style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 700 }}>
          Crea account
        </Link>
        <Link href="/forgot-password" style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 700 }}>
          Password dimenticata?
        </Link>
      </div>
    </AuthShell>
  );
}