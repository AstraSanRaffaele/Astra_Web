"use client";

import Link from "next/link";
import { AuthShell } from "@/app/auth-shared";

export default function SignupConfirmedPage() {
  return (
    <AuthShell
      title={
        <>
          Benvenuto in
          <br />
          <em style={{ fontStyle: "italic", color: "#C2CEFF" }}>Astra</em>.
        </>
      }
      description="La tua email è stata confermata con successo. Ora il tuo account è attivo e puoi accedere alla piattaforma."
      cardTitle={
        <>
          Registrazione
          <br />
          confermata.
        </>
      }
      cardDescription="Il tuo account è stato verificato correttamente."
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
          La conferma della tua email è andata a buon fine.
          <br />
          Adesso puoi entrare nella tua area personale ed iniziare a usare Astra.
        </div>

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
            href="/"
            style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 700 }}
          >
            Torna alla home
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}