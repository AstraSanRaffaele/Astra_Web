"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthMessage, AuthShell, FieldLabel } from "@/app/auth-shared";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

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

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Password aggiornata con successo.");

    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1200);
  }

  return (
    <AuthShell
      title={
        <>
          Imposta una nuova
          <br />
          password <em style={{ fontStyle: "italic", color: "#C2CEFF" }}>Astra</em>.
        </>
      }
      description="Scegli una nuova password per tornare ad accedere al tuo account in sicurezza."
      cardTitle={
        <>
          Nuova
          <br />
          password.
        </>
      }
      cardDescription="Inserisci e conferma la nuova password del tuo account."
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <FieldLabel htmlFor="password">Nuova password</FieldLabel>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="Inserisci la nuova password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="confirmPassword">Conferma nuova password</FieldLabel>
          <input
            id="confirmPassword"
            type="password"
            className="input"
            placeholder="Ripeti la nuova password"
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
          {loading ? "Aggiornamento in corso..." : "Aggiorna password"}
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
          Torna al login
        </Link>
      </div>
    </AuthShell>
  );
}