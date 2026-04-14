"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConvenzioniPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [convenzioni, setConvenzioni] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("convenzioni")
        .select("*")
        .order("ordine", { ascending: true });

      setConvenzioni(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = convenzioni.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.titolo.toLowerCase().includes(q) ||
      c.partner.toLowerCase().includes(q) ||
      c.categoria.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff" }}>
        <div style={{ padding: "8rem 2rem" }}>Caricamento...</div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          background: "#fff",
          color: "#08102A",
          minHeight: "100vh",
          fontFamily: "'DM Sans', sans-serif",
          borderTop: "1px solid rgba(8,16,42,.06)",
        }}
      >

        {/* ══ HERO ══ */}
        <section
          style={{
            padding: "9rem 3rem 3rem",
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          <p
            style={{
              fontSize: ".7rem",
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "rgba(8,16,42,.5)",
              fontWeight: 700,
            }}
          >
            Convenzioni
          </p>

          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(3rem,6vw,5rem)",
              lineHeight: 1.05,
              letterSpacing: "-.02em",
              margin: "1rem 0",
            }}
          >
            Vantaggi per<br />
            <span style={{ color: "#2E4080" }}>la community.</span>
          </h1>

          <p style={{ color: "rgba(8,16,42,.6)", maxWidth: 460 }}>
            Tutte le convenzioni attive per studenti Astra: servizi,
            opportunità e sconti dedicati.
          </p>
        </section>

        {/* SEARCH */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 3rem 2rem" }}>
          <input
            placeholder="Cerca convenzioni..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "1rem 1.2rem",
              borderRadius: "999px",
              border: "1px solid rgba(8,16,42,.08)",
              outline: "none",
              fontSize: ".95rem",
              background: "#fff",
              boxShadow: "0 6px 20px rgba(8,16,42,.04)",
            }}
          />
        </section>

        {/* GRID */}
        <section
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 3rem 6rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: "1.4rem",
            }}
          >
            {filtered.map((c) => (
              <div key={c.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="badge">{c.categoria}</span>
                  <div className="logo">
                    {c.partner.slice(0, 2).toUpperCase()}
                  </div>
                </div>

                <h3>{c.titolo}</h3>
                <p className="partner">{c.partner}</p>

                <p className="desc">{c.descrizione}</p>

                <div className="vantaggio">
                  <span>Vantaggio</span>
                  <strong>{c.vantaggio}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* STYLE */}
      <style>{`
        h3 {
          margin: .6rem 0 .2rem;
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: -.01em;
        }

        .partner {
          margin: 0;
          color: #2E4080;
          font-weight: 600;
          font-size: .9rem;
        }

        .desc {
          margin: .7rem 0;
          color: rgba(8,16,42,.6);
          font-size: .9rem;
          line-height: 1.6;
        }

        .card {
          background: #fff;
          border: 1px solid rgba(8,16,42,.06);
          border-radius: 1.5rem;
          padding: 1.4rem;
          display: flex;
          flex-direction: column;
          gap: .6rem;
          transition: transform .25s ease, box-shadow .25s ease;
          box-shadow: 0 6px 24px rgba(8,16,42,.05);
        }

        .card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(8,16,42,.12);
        }

        .badge {
          font-size: .7rem;
          font-weight: 700;
          letter-spacing: .05em;
          background: rgba(8,16,42,.05);
          padding: .35rem .7rem;
          border-radius: 999px;
        }

        .logo {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #e8edfb, #c8d4f5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #0E1F6B;
        }

        .vantaggio {
          margin-top: auto;
          background: rgba(8,16,42,.04);
          border: 1px solid rgba(8,16,42,.05);
          padding: .8rem;
          border-radius: .9rem;
        }

        .vantaggio span {
          font-size: .7rem;
          text-transform: uppercase;
          color: rgba(8,16,42,.5);
          font-weight: 700;
        }

        .vantaggio strong {
          display: block;
          margin-top: .2rem;
          color: #0E1F6B;
        }

        @media (max-width: 700px) {
          section {
            padding-left: 1.2rem !important;
            padding-right: 1.2rem !important;
          }
        }
      `}</style>
    </>
  );
}