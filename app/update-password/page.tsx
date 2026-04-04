"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthMessage, AuthShell, FieldLabel } from "@/app/auth-shared";

function validatePassword(password: string) {
  const checks = {
    minLength: password.length >= 8,
    upperCase: /[A-Z]/.test(password),
    lowerCase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[^A-Za-z0-9]/.test(password),
  };

  const isValid = Object.values(checks).every(Boolean);

  return { isValid, checks };
}

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

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordValidation = validatePassword(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!passwordValidation.isValid) {
      setError("La password non rispetta tutti i criteri richiesti.");
      return;
    }

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

    setSuccess("Password aggiornata correttamente.");

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <>
      <AuthShell
        title={
          <>
            Imposta una
            <br />
            nuova <em style={{ fontStyle: "italic", color: "#C2CEFF" }}>password</em>.
          </>
        }
        description="Scegli una nuova password per il tuo account."
        cardTitle={
          <>
            Aggiorna la
            <br />
            password.
          </>
        }
        cardDescription="Inserisci la nuova password e confermala."
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

            <div style={{ marginTop: ".5rem", fontSize: ".88rem", color: "var(--text-soft)" }}>
              <div>La password deve contenere:</div>
              <ul style={{ margin: ".5rem 0 0", paddingLeft: "1.2rem", display: "grid", gap: ".25rem" }}>
                <li style={{ color: passwordValidation.checks.minLength ? "var(--blue)" : "var(--text-soft)" }}>
                  Almeno 8 caratteri
                </li>
                <li style={{ color: passwordValidation.checks.upperCase ? "var(--blue)" : "var(--text-soft)" }}>
                  Almeno una lettera maiuscola
                </li>
                <li style={{ color: passwordValidation.checks.lowerCase ? "var(--blue)" : "var(--text-soft)" }}>
                  Almeno una lettera minuscola
                </li>
                <li style={{ color: passwordValidation.checks.number ? "var(--blue)" : "var(--text-soft)" }}>
                  Almeno un numero
                </li>
                <li style={{ color: passwordValidation.checks.specialChar ? "var(--blue)" : "var(--text-soft)" }}>
                  Almeno un carattere speciale
                </li>
              </ul>
            </div>
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
            {loading ? "Salvataggio..." : "Salva nuova password"}
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