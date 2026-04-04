"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthMessage, AuthShell, FieldLabel } from "@/app/auth-shared";

function AstraLogo({ size = 120 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Astra logo"
      width={size}
      height={size}
      style={{ objectFit: "contain", height: "auto" }}
      priority
    />
  );
}

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

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Inserisci email e password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
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

    setSuccess("Accesso effettuato con successo.");
    setLoading(false);

    router.push("/profile");
    router.refresh();
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
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="nome@studenti.unisr.it"
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

      <footer
        style={{
          borderTop: "1px solid rgba(14,31,107,.08)",
          padding: "3rem 4rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "2rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
          <AstraLogo size={120} />
        </div>
        <ul
          style={{
            display: "flex",
            gap: "2rem",
            listStyle: "none",
            flexWrap: "wrap",
            margin: 0,
            padding: 0,
          }}
        >
          {[
            ["Instagram", "https://www.instagram.com/astrasanraffaele"],
            ["Chi siamo", "/#about"],
            ["Contatti", "/#join"],
            ["Privacy", "#"],
          ].map(([l, h]) => (
            <li key={l}>
              <a
                href={h}
                target={h.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                style={{ textDecoration: "none", fontSize: ".85rem", color: "var(--muted)", fontWeight: 500 }}
              >
                {l}
              </a>
            </li>
          ))}
        </ul>
        <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>© 2025 Astra San Raffaele</span>
      </footer>
    </>
  );
}