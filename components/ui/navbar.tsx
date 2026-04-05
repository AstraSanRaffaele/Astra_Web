"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Navbar() {
  const supabase = useMemo(() => createClient(), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setIsLoggedIn(false);
        setProfileName("");
        setIsAdmin(false);
        return;
      }

      setIsLoggedIn(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setIsAdmin(profile?.role === "admin");

      const fullName = [
        user.user_metadata?.nome,
        user.user_metadata?.cognome,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      setProfileName(fullName || user.email || "Profilo");
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;

      if (!mounted) return;

      if (!user) {
        setIsLoggedIn(false);
        setProfileName("");
        setIsAdmin(false);
        return;
      }

      setIsLoggedIn(true);

      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (!mounted) return;
          setIsAdmin(profile?.role === "admin");
        });

      const fullName = [
        user.user_metadata?.nome,
        user.user_metadata?.cognome,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      setProfileName(fullName || user.email || "Profilo");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <>
      <nav className="site-navbar" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.1rem 4rem",
        background: "rgba(250,250,250,0.75)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(14,31,107,0.07)",
        animation: "fadeDown .8s ease both",
        fontFamily: "'Nunito', sans-serif",
      }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: ".7rem", textDecoration: "none" }}>
          <AstraLogo size={120} />
        </a>

        <ul style={{ display: "flex", gap: "2.5rem", listStyle: "none", alignItems: "center" }} className="hidden-mobile navbar-desktop-links">
          {["Chi siamo", "Cosa facciamo", "Facoltà"].map((l, i) => (
            <li key={l}>
              <a
                href={["/#about", "/#pillars", "/#facolta"][i]}
                style={{ textDecoration: "none", color: "var(--text)", fontSize: ".88rem", fontWeight: 500 }}
              >
                {l}
              </a>
            </li>
          ))}

          {!isLoggedIn ? (
            <>
              <li>
                <a
                  href="/login"
                  style={{ textDecoration: "none", color: "var(--text)", fontSize: ".88rem", fontWeight: 500 }}
                >
                  Login
                </a>
              </li>
              <li>
                <a
                  href="#join"
                  className="nav-cta"
                  style={{
                    background: "var(--blue)",
                    color: "#fff",
                    padding: ".5rem 1.3rem",
                    borderRadius: "100px",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: ".85rem",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  Unisciti →
                </a>
              </li>
            </>
          ) : (
            <>
              {isAdmin && (
                <li>
                  <Link
                    href="/admin"
                    style={{ textDecoration: "none", color: "var(--text)", fontSize: ".88rem", fontWeight: 500 }}
                  >
                    Amministrazione
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href="/profile"
                  className="profile-chip"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: ".75rem",
                    textDecoration: "none",
                    color: "var(--text)",
                  }}
                >
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "999px",
                      background: "var(--blue-light)",
                      border: "1px solid rgba(14,31,107,.10)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--blue)",
                      fontWeight: 800,
                      fontSize: ".9rem",
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(profileName || "Profilo") || "P"}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                    <span style={{ fontSize: ".72rem", color: "var(--muted)", fontWeight: 600 }}>
                      Area personale
                    </span>
                    <span style={{ fontSize: ".88rem", color: "var(--text)", fontWeight: 700, maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {profileName || "Profilo"}
                    </span>
                  </span>
                </Link>
              </li>
            </>
          )}
        </ul>

        <button
          onClick={() => setMenuOpen((o) => !o)}
          style={{ display: "none", flexDirection: "column", gap: "5px", cursor: "pointer", border: "none", background: "none" }}
          className="hamburger navbar-hamburger"
          aria-label="Menu"
        >
          <span style={{ width: 24, height: 2, background: "var(--blue)", borderRadius: 2, display: "block" }} />
          <span style={{ width: 24, height: 2, background: "var(--blue)", borderRadius: 2, display: "block" }} />
          <span style={{ width: 24, height: 2, background: "var(--blue)", borderRadius: 2, display: "block" }} />
        </button>
      </nav>

      {menuOpen && (
        <div style={{
          position: "fixed", top: 64, left: 0, right: 0, zIndex: 99,
          background: "#fff", borderBottom: "1px solid rgba(14,31,107,.08)",
          padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.2rem",
          fontFamily: "'Nunito', sans-serif",
        }}>
          {["Chi siamo", "Cosa facciamo", "Facoltà"].map((l, i) => (
            <a
              key={l}
              href={["#about", "#pillars", "#facolta"][i]}
              onClick={() => setMenuOpen(false)}
              style={{ textDecoration: "none", color: "var(--text)", fontWeight: 500, fontSize: "1rem" }}
            >
              {l}
            </a>
          ))}

          {!isLoggedIn ? (
            <>
              <a
                href="/login"
                onClick={() => setMenuOpen(false)}
                style={{ textDecoration: "none", color: "var(--blue)", fontWeight: 700, fontSize: "1rem" }}
              >
                Login
              </a>
              <a
                href="/#join"
                onClick={() => setMenuOpen(false)}
                style={{ textDecoration: "none", color: "var(--text)", fontWeight: 500, fontSize: "1rem" }}
              >
                Unisciti →
              </a>
            </>
          ) : (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  style={{ textDecoration: "none", color: "var(--blue)", fontWeight: 700, fontSize: "1rem" }}
                >
                  Amministrazione
                </Link>
              )}
              <Link
                href="/e"
                onClick={() => setMenuOpen(false)}
                className="profile-chip-mobile"
                style={{
                  textDecoration: "none",
                  color: "var(--text)",
                  display: "flex",
                  alignItems: "center",
                  gap: ".9rem",
                  padding: ".9rem 1rem",
                  borderRadius: "1rem",
                  background: "var(--blue-light)",
                  border: "1px solid rgba(14,31,107,.08)",
                }}
              >
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "999px",
                    background: "#fff",
                    border: "1px solid rgba(14,31,107,.10)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--blue)",
                    fontWeight: 800,
                    fontSize: ".9rem",
                    flexShrink: 0,
                  }}
                >
                  {getInitials(profileName || "Profilo") || "P"}
                </span>
                <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                  <span style={{ fontSize: ".72rem", color: "var(--muted)", fontWeight: 600 }}>
                    Vai al tuo profilo
                  </span>
                  <span style={{ fontSize: ".95rem", color: "var(--text)", fontWeight: 700 }}>
                    {profileName || "Profilo"}
                  </span>
                </span>
              </Link>
            </>
          )}
        </div>
      )}

      <style>{`
        :root {
          --blue: #0E1F6B;
          --blue-mid: #1A3399;
          --blue-light: #E8EDFB;
          --blue-glow: #C2CEFF;
          --white: #FAFAFA;
          --text: #0A0F2C;
          --muted: #6B7280;
        }

        .site-navbar,
        .site-navbar * {
          box-sizing: border-box;
        }

        .site-navbar a,
        .site-navbar button {
          font-family: 'Nunito', sans-serif;
        }

        .navbar-desktop-links a {
          transition: color .18s ease, opacity .18s ease;
        }

        .navbar-desktop-links a:hover {
          color: var(--blue);
        }

        .navbar-hamburger {
          transition: opacity .18s ease;
        }

        .navbar-hamburger:hover {
          opacity: .82;
        }

        .profile-chip {
          padding: .35rem .45rem .35rem .35rem;
          border-radius: 999px;
          transition: background .18s ease, transform .18s ease;
        }

        .profile-chip:hover,
        .profile-chip-mobile:hover {
          background: rgba(14,31,107,.05);
        }

        .profile-chip:hover {
          transform: translateY(-1px);
        }

        .nav-cta {
          box-shadow: 0 8px 24px rgba(14,31,107,.18);
          transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
        }

        .nav-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(14,31,107,.22);
        }

        @media (max-width: 900px) {
          .hidden-mobile {
            display: none !important;
          }

          .navbar-desktop-links {
            display: none !important;
          }

          .hamburger {
            display: flex !important;
          }

          .site-navbar {
            padding: 1rem 1.5rem !important;
          }
        }
      `}</style>
    </>
  );
}