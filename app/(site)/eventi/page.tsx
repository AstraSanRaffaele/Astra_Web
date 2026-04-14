"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function EventiPage() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/events");
      const data = await res.json();
      setEvents(data || []);
    }
    load();
  }, []);

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
          <p className="eyebrow" style={{ color: "rgba(8,16,42,.5)" }}>
            Eventi
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
            I prossimi<br />
            <span style={{ color: "#2E4080" }}>incontri.</span>
          </h1>

          <p
            style={{
              color: "rgba(8,16,42,.6)",
              maxWidth: 460,
              lineHeight: 1.8,
            }}
          >
            Eventi, workshop e momenti di comunità pensati per gli studenti UniSR.
          </p>
        </section>

        {/* ══ LIST ══ */}
        <section
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 3rem 6rem",
          }}
        >
          <div className="event-list">
            {events.map((e) => {
              const date = new Date(e.event_date);

              return (
                <Link
                  key={e.id}
                  href={`/eventi/${e.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div className="event-card">
                    {/* DATE */}
                    <div className="event-date">
                      {date.toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "long",
                      })}
                    </div>

                    {/* CONTENT */}
                    <div className="event-content">
                      <h2>{e.title}</h2>

                      <p>
                        {date.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {e.location && ` • ${e.location}`}
                      </p>
                    </div>

                    {/* ARROW */}
                    <div className="event-arrow">→</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* STYLE */}
        <style>{`
          .event-list {
            display: flex;
            flex-direction: column;
            gap: 1.2rem;
          }

          .event-card {
            display: flex;
            align-items: center;
            gap: 2rem;
            padding: 1.6rem 1.8rem;
            border-radius: 1.4rem;
            border: 1px solid rgba(8,16,42,.06);
            background: #fff;
            transition: all .25s ease;
            box-shadow: 0 4px 20px rgba(8,16,42,.04);
          }

          .event-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 18px 40px rgba(8,16,42,.12);
          }

          .event-date {
            font-size: .75rem;
            font-weight: 700;
            letter-spacing: .08em;
            text-transform: uppercase;
            color: rgba(8,16,42,.45);
            min-width: 110px;
          }

          .event-content h2 {
            margin: 0;
            font-size: 1.2rem;
            font-weight: 700;
            letter-spacing: -.01em;
            color: #08102A;
          }

          .event-content p {
            margin: .35rem 0 0;
            font-size: .85rem;
            color: rgba(8,16,42,.5);
          }

          .event-arrow {
            margin-left: auto;
            font-size: 1.3rem;
            color: rgba(8,16,42,.2);
            transition: transform .2s, color .2s;
          }

          .event-card:hover .event-arrow {
            transform: translateX(6px);
            color: #08102A;
          }

          @media (max-width: 700px) {
            .event-card {
              flex-direction: column;
              align-items: flex-start;
              gap: .6rem;
            }

            .event-arrow {
              display: none;
            }

            .event-date {
              min-width: auto;
            }
          }
        `}</style>
      </div>
    </>
  );
}