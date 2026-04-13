"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();

  const navRef = useRef<HTMLElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuTop, setMobileMenuTop] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const navLinks = [
    ["Chi siamo", "/#about"],
    ["Cosa facciamo", "/#pillars"],
    ["Eventi", "/eventi"],
    ["Convenzioni", "/convenzioni"],
  ] as const;

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    closeMenu();

    await supabase.auth.signOut({ scope: "global" });

    setIsLoggedIn(false);
    setProfileName("");
    setIsAdmin(false);

    router.replace("/");
    router.refresh();
  };

  useEffect(() => {
    const updateNavbarLayout = () => {
      if (navRef.current) {
        setMobileMenuTop(navRef.current.offsetHeight);
      }

      setIsMobileViewport(window.innerWidth <= 900);
    };

    updateNavbarLayout();
    window.addEventListener("resize", updateNavbarLayout);

    return () => {
      window.removeEventListener("resize", updateNavbarLayout);
    };
  }, []);

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

      if (!mounted) return;

      setIsAdmin(profile?.role === "admin");

      const fullName = [user.user_metadata?.nome, user.user_metadata?.cognome]
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

      const fullName = [user.user_metadata?.nome, user.user_metadata?.cognome]
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

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    if (!isMobileViewport) {
      closeMenu();
    }
  }, [isMobileViewport]);

  useEffect(() => {
    closeMenu();
  }, [isLoggedIn]);

  useEffect(() => {
    const handleResizeClose = () => {
      if (window.innerWidth > 900) {
        closeMenu();
      }
    };

    window.addEventListener("resize", handleResizeClose);

    return () => {
      window.removeEventListener("resize", handleResizeClose);
    };
  }, []);

  useEffect(() => {
    const handlePointerDownOutside = (event: PointerEvent) => {
      if (!menuOpen) return;

      const target = event.target as Node;

      const clickedInsideMenu = mobileMenuRef.current?.contains(target) ?? false;
      const clickedInsideActions = mobileActionsRef.current?.contains(target) ?? false;

      if (!clickedInsideMenu && !clickedInsideActions) {
        closeMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDownOutside);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <>
      <nav
        ref={navRef}
        className="site-navbar"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.1rem 4rem",
          background: "rgba(250,250,250,0.96)",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          borderBottom: "1px solid rgba(14,31,107,0.07)",
          animation: "fadeDown .8s ease both",
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".7rem",
            textDecoration: "none",
          }}
        >
          <AstraLogo size={104} />
        </a>

        <ul
          style={{
            display: "flex",
            gap: "2.5rem",
            listStyle: "none",
            alignItems: "center",
          }}
          className="hidden-mobile navbar-desktop-links"
        >
          {navLinks.map(([label, href]) => (
            <li key={label}>
              <a
                href={href}
                style={{
                  textDecoration: "none",
                  color: "var(--text)",
                  fontSize: ".88rem",
                  fontWeight: 500,
                }}
              >
                {label}
              </a>
            </li>
          ))}

          {!isLoggedIn ? (
            <>
              <li>
                <a
                  href="/login"
                  style={{
                    textDecoration: "none",
                    color: "var(--text)",
                    fontSize: ".88rem",
                    fontWeight: 500,
                  }}
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
                    style={{
                      textDecoration: "none",
                      color: "var(--text)",
                      fontSize: ".88rem",
                      fontWeight: 500,
                    }}
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
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      lineHeight: 1.1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: ".72rem",
                        color: "var(--muted)",
                        fontWeight: 600,
                      }}
                    >
                      Area personale
                    </span>
                    <span
                      style={{
                        fontSize: ".88rem",
                        color: "var(--text)",
                        fontWeight: 700,
                        maxWidth: 140,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {profileName || "Profilo"}
                    </span>
                  </span>
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="logout-button"
                  style={{
                    border: "1px solid rgba(14,31,107,.14)",
                    background: "#fff",
                    color: "var(--text)",
                    padding: ".72rem 1rem",
                    borderRadius: "999px",
                    fontWeight: 700,
                    fontSize: ".85rem",
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  Logout
                </button>
              </li>
            </>
          )}
        </ul>

        <div
          ref={mobileActionsRef}
          className="navbar-mobile-actions"
          style={{
            display: "none",
            alignItems: "center",
            gap: ".7rem",
            position: "relative",
            zIndex: 121,
          }}
        >
          {!isLoggedIn ? (
            <Link
              href="/login"
              style={{
                textDecoration: "none",
                color: "#fff",
                background: "var(--blue)",
                borderRadius: "999px",
                padding: ".62rem 1rem",
                fontWeight: 700,
                fontSize: ".84rem",
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
                boxShadow: "0 8px 20px rgba(14,31,107,.16)",
              }}
            >
              Login
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              style={{
                color: "#fff",
                background: "var(--blue)",
                border: "none",
                borderRadius: "999px",
                padding: ".62rem 1rem",
                fontWeight: 700,
                fontSize: ".84rem",
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
                boxShadow: "0 8px 20px rgba(14,31,107,.16)",
                cursor: "pointer",
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              Logout
            </button>
          )}

          <button
            type="button"
            ref={hamburgerRef}
            onClick={toggleMenu}
            onContextMenu={(event) => event.preventDefault()}
            style={{
              width: 48,
              height: 48,
              minWidth: 48,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "1px solid rgba(14,31,107,.10)",
              background: "#fff",
              borderRadius: "999px",
              padding: 0,
              position: "relative",
              display: "inline-flex",
              flexShrink: 0,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              WebkitAppearance: "none",
              appearance: "none",
              pointerEvents: "auto",
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
            }}
            className="hamburger navbar-hamburger"
            aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block", pointerEvents: "none" }}
              aria-hidden="true"
            >
              {!menuOpen ? (
                <>
                  <path d="M3 5H17" stroke="#0E1F6B" strokeWidth="2" strokeLinecap="round" />
                  <path d="M3 10H17" stroke="#0E1F6B" strokeWidth="2" strokeLinecap="round" />
                  <path d="M3 15H17" stroke="#0E1F6B" strokeWidth="2" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M5 5L15 15" stroke="#0E1F6B" strokeWidth="2" strokeLinecap="round" />
                  <path d="M15 5L5 15" stroke="#0E1F6B" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && isMobileViewport && (
        <>
          <div
            onClick={closeMenu}
            style={{
              position: "fixed",
              top: mobileMenuTop,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(10,15,44,.18)",
              zIndex: 118,
            }}
          />

          <div
            id="mobile-menu"
            ref={mobileMenuRef}
            style={{
              position: "fixed",
              top: mobileMenuTop,
              left: 0,
              right: 0,
              zIndex: 119,
              background: "#fff",
              borderBottom: "1px solid rgba(14,31,107,.08)",
              padding: "1.5rem 2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
              fontFamily: "'Nunito', sans-serif",
              boxShadow: "0 18px 40px rgba(10,15,44,.10)",
            }}
          >
            {navLinks.map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={closeMenu}
                style={{
                  textDecoration: "none",
                  color: "var(--text)",
                  fontWeight: 500,
                  fontSize: "1rem",
                }}
              >
                {label}
              </a>
            ))}

            {!isLoggedIn ? (
              <a
                href="/#join"
                onClick={closeMenu}
                style={{
                  textDecoration: "none",
                  color: "var(--text)",
                  fontWeight: 500,
                  fontSize: "1rem",
                }}
              >
                Unisciti →
              </a>
            ) : (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    style={{
                      textDecoration: "none",
                      color: "var(--blue)",
                      fontWeight: 700,
                      fontSize: "1rem",
                    }}
                  >
                    Amministrazione
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={closeMenu}
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
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      lineHeight: 1.1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: ".72rem",
                        color: "var(--muted)",
                        fontWeight: 600,
                      }}
                    >
                      Vai al tuo profilo
                    </span>
                    <span
                      style={{
                        fontSize: ".95rem",
                        color: "var(--text)",
                        fontWeight: 700,
                      }}
                    >
                      {profileName || "Profilo"}
                    </span>
                  </span>
                </Link>
              </>
            )}
          </div>
        </>
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

        .navbar-desktop-links a:not(.profile-chip) {
          position: relative;
          transition: color .18s ease, opacity .18s ease;
        }

        .navbar-desktop-links a:not(.profile-chip):hover {
          color: var(--blue);
        }

        .navbar-desktop-links a:not(.profile-chip)::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -6px;
          width: 100%;
          height: 2px;
          background: var(--blue);
          border-radius: 999px;
          transform: scaleX(0);
          transform-origin: center;
          transition: transform .18s ease;
        }

        .navbar-desktop-links a:not(.profile-chip):hover::after {
          transform: scaleX(1);
        }

        .navbar-hamburger {
          transition: opacity .18s ease, transform .18s ease, background .18s ease;
          touch-action: manipulation;
          -webkit-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
        }

        .navbar-hamburger:hover {
          opacity: .92;
          background: rgba(14,31,107,.03);
        }

        .logout-button {
          transition: background .18s ease, transform .18s ease, border-color .18s ease;
        }

        .logout-button:hover {
          background: rgba(14,31,107,.05);
          border-color: rgba(14,31,107,.22);
          transform: translateY(-1px);
        }

        .profile-chip {
          padding: .35rem .45rem .35rem .35rem;
          border-radius: 999px;
          transition: background .18s ease;
        }

        .profile-chip:hover {
          background: rgba(14,31,107,.05);
        }

        .profile-chip-mobile {
          border-radius: 1rem;
          transition: background .18s ease;
        }

        .profile-chip-mobile:hover {
          background: rgba(14,31,107,.05);
        }

        #mobile-menu a:not(.profile-chip-mobile) {
          transition: color .18s ease, transform .18s ease, background .18s ease;
        }

        #mobile-menu a:not(.profile-chip-mobile):hover {
          color: var(--blue);
        }

        .nav-cta {
          box-shadow: 0 8px 24px rgba(14,31,107,.18);
          transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
        }

        .nav-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(14,31,107,.22);
        }

        .navbar-mobile-actions > * {
          pointer-events: auto;
        }

        @media (max-width: 900px) {
          .hidden-mobile {
            display: none !important;
          }

          .navbar-desktop-links {
            display: none !important;
          }

          .hamburger {
            display: inline-flex !important;
          }

          .navbar-mobile-actions {
            display: flex !important;
            pointer-events: auto;
          }

          .site-navbar {
            padding: 1rem 1.5rem !important;
          }

          .site-navbar img {
            width: 88px !important;
            height: auto !important;
          }
        }
      `}</style>
    </>
  );
}