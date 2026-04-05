"use client";

import Image from "next/image";

function AstraLogo({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Astra logo"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}

export default function Footer() {
  return (
    <>
      <footer
        className="site-footer"
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

        <ul style={{ display: "flex", gap: "2rem", listStyle: "none", flexWrap: "wrap" }}>
          {[
            ["Instagram", "https://www.instagram.com/astrasanraffaele"],
            ["Chi siamo", "#about"],
            ["Contatti", "#join"],
            ["Privacy", "#"],
          ].map(([l, h]) => (
            <li key={l}>
              <a
                href={h}
                target={h.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                style={{
                  textDecoration: "none",
                  fontSize: ".85rem",
                  color: "var(--muted)",
                  fontWeight: 500,
                }}
              >
                {l}
              </a>
            </li>
          ))}
        </ul>

        <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>
          © 2025 Astra San Raffaele
        </span>
      </footer>

      <style>{`
        @media (max-width: 900px) {
          .site-footer {
            padding: 2.5rem 1.5rem !important;
          }
        }
      `}</style>
    </>
  );
}