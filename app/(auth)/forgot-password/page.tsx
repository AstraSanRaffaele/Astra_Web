"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Footer from "@/components/ui/footer";
import { AuthMessage, AuthShell, FieldLabel } from "@/app/auth-shared";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/update-password`
          : undefined,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Ti abbiamo inviato un link per il recupero password.");
  }

  return (
    <>
      <AuthShell
        title={
          <>
            Recupera il tuo
            <br />
            accesso <em style={{ fontStyle: "italic", color: "#C2CEFF" }}>Astra</em>.
          </>
        }
        description="Inserisci la tua email e ti invieremo il link per impostare una nuova password."
        cardTitle={
          <>
            Password
            <br />
            dimenticata?
          </>
        }
        cardDescription="Ti basta inserire l’email associata al tuo account."
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="Inserisci la tua email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "Invio in corso..." : "Invia link di recupero"}
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

      <Footer />
    </>
  );
}