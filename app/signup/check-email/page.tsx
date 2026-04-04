import Image from "next/image";
import Link from "next/link";
import { AuthShell } from "@/app/auth-shared";

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

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

export default async function SignupCheckEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = params.email ?? "";

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