"use client";

import Image from "next/image";

function AstraLogo({ size = 36, white = false }: { size?: number; white?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt="Astra logo"
      width={size}
      height={size}
      style={{
        objectFit: "contain",
        filter: white ? "brightness(0) invert(1)" : undefined,
      }}
    />
  );
}

const footerLinks = [
  {
    label: "Esplora",
    links: [
      ["Chi siamo", "/#about"],
      ["Cosa facciamo", "/#pillars"],
      ["Facoltà", "/#facolta"],
      ["Unisciti", "/#join"],
    ],
  },
  {
    label: "Pagine",
    links: [
      ["Eventi", "/eventi"],
      ["Convenzioni", "/convenzioni"],
      ["Profilo", "/profile"],
      ["Team", "/team"],
    ],
  },
  {
    label: "Contatti",
    links: [
      ["Instagram", "https://www.instagram.com/astrasanraffaele"],
      ["WhatsApp", "https://wa.me/393501937413"],
      ["Email", "mailto:info@astrasanraffaele.it"],
    ],
  },
];

export default function Footer() {
  return (
    <>
      <footer className="site-footer" style={{ background: "var(--ink, #08102A)", color: "#fff" }}>

        {/* ── Top section ── */}
        <div
          className="footer-top"
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr repeat(3, 1fr)",
            gap: "3rem",
            padding: "5rem 3rem 4rem",
            borderBottom: "1px solid rgba(255,255,255,.07)",
          }}
        >
          {/* Brand column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
            <AstraLogo size={110} white />
            <p style={{ fontSize: ".9rem", lineHeight: 1.75, color: "rgba(255,255,255,.42)", fontWeight: 400, maxWidth: 260 }}>
              L&apos;associazione studentesca dell&apos;Università Vita-Salute
              San Raffaele di Milano.
            </p>
            <a
              href="https://www.instagram.com/astrasanraffaele"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: "999px",
                padding: ".55rem 1.1rem",
                fontSize: ".8rem",
                fontWeight: 600,
                color: "rgba(255,255,255,.7)",
                textDecoration: "none",
                width: "fit-content",
                transition: "background .18s, color .18s",
              }}
              className="footer-ig-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor"/>
              </svg>
              @astrasanraffaele
            </a>
          </div>

          {/* Nav columns */}
          {footerLinks.map(({ label, links }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <span style={{
                fontSize: ".65rem",
                fontWeight: 700,
                letterSpacing: ".22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,.3)",
                marginBottom: ".4rem",
              }}>
                {label}
              </span>
              {links.map(([name, href]) => (
                <a
                  key={name}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="footer-link"
                  style={{
                    textDecoration: "none",
                    fontSize: ".92rem",
                    fontWeight: 500,
                    color: "rgba(255,255,255,.55)",
                    transition: "color .18s",
                    width: "fit-content",
                  }}
                >
                  {name}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="footer-bottom"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
            padding: "1.6rem 3rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: ".78rem", color: "rgba(255,255,255,.24)", fontWeight: 400 }}>
            © 2025 Astra San Raffaele. Tutti i diritti riservati.
          </span>
          <div style={{ display: "flex", gap: "1.8rem" }}>
            {[["Privacy Policy", "#"], ["Cookie Policy", "#"]].map(([l, h]) => (
              <a
                key={l}
                href={h}
                style={{
                  textDecoration: "none",
                  fontSize: ".78rem",
                  color: "rgba(255,255,255,.24)",
                  fontWeight: 400,
                  transition: "color .18s",
                }}
                className="footer-legal-link"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        .footer-link:hover       { color: #fff !important; }
        .footer-ig-btn:hover     { background: rgba(255,255,255,.12) !important; color: #fff !important; }
        .footer-legal-link:hover { color: rgba(255,255,255,.5) !important; }

        @media (max-width: 900px) {
          .footer-top {
            grid-template-columns: 1fr 1fr !important;
            padding: 3.5rem 1.5rem 3rem !important;
            gap: 2.5rem !important;
          }
          .footer-top > div:first-child {
            grid-column: 1 / -1;
          }
          .footer-bottom {
            padding: 1.4rem 1.5rem !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: .8rem !important;
          }
        }

        @media (max-width: 500px) {
          .footer-top { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}