"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
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

function readNavbarAuthCache(): {
  authReady: boolean;
  isLoggedIn: boolean;
  profileName: string;
  isAdmin: boolean;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("navbar-auth-cache");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      authReady?: boolean;
      isLoggedIn?: boolean;
      profileName?: string;
      isAdmin?: boolean;
    };
    return {
      authReady: parsed.authReady === true,
      isLoggedIn: parsed.isLoggedIn === true,
      profileName: typeof parsed.profileName === "string" ? parsed.profileName : "",
      isAdmin: parsed.isAdmin === true,
    };
  } catch {
    return null;
  }
}

function isLinkActive(pathname: string, href: string): boolean {
  if (!href.includes("#")) {
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }
  return false;
}

export default function Navbar() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const navRef = useRef<HTMLElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const hasAppliedCachedAuthRef = useRef(false);
  const isSigningOutRef = useRef(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuTop, setMobileMenuTop] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showReplicaRank, setShowReplicaRank] = useState(false);
  const [replicaRankLabel, setReplicaRankLabel] = useState("ReplicaRANK");
  const [isReplicaRankPageVisible, setIsReplicaRankPageVisible] = useState(false);
  const [replicaRankCohortYear, setReplicaRankCohortYear] = useState("");
  const [userCohortYear, setUserCohortYear] = useState("");

  const navLinks: [string, string][] = [
    ["Chi siamo", "/#about"],
    ["Cosa facciamo", "/#pillars"],
    ["Eventi", "/eventi"],
    ["Convenzioni", "/convenzioni"],
  ];

  const navLinksWithReplicaRank: [string, string][] = showReplicaRank
    ? [...navLinks, [replicaRankLabel, "/replicarank"]]
    : navLinks;
  useEffect(() => {
    let mounted = true;

    const loadReplicaRankVisibility = async () => {
      try {
        const { data, error } = await supabase
          .from("replicarank_editions")
          .select("is_page_visible, cohort_year, name")
          .eq("is_current", true)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          setIsReplicaRankPageVisible(false);
          setReplicaRankCohortYear("");
          setReplicaRankLabel("ReplicaRANK");
          return;
        }

        const isVisible = data?.is_page_visible === true;
        const yearFromCohort = data?.cohort_year ? String(data.cohort_year) : "";
        const yearFromName = typeof data?.name === "string" ? data.name.match(/\d{4}/)?.[0] ?? "" : "";
        const year = yearFromCohort || yearFromName;

        setIsReplicaRankPageVisible(isVisible);
        setReplicaRankCohortYear(year);
        setReplicaRankLabel(isVisible && year ? `ReplicaRANK ${year}` : "ReplicaRANK");
      } catch {
        if (mounted) {
          setIsReplicaRankPageVisible(false);
          setReplicaRankCohortYear("");
          setReplicaRankLabel("ReplicaRANK");
        }
      }
    };

    loadReplicaRankVisibility();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    const isEligibleCohort = Boolean(
      isLoggedIn &&
      userCohortYear &&
      replicaRankCohortYear &&
      userCohortYear === replicaRankCohortYear
    );

    setShowReplicaRank(isReplicaRankPageVisible && (isAdmin || isEligibleCohort));
  }, [isReplicaRankPageVisible, isAdmin, isLoggedIn, userCohortYear, replicaRankCohortYear]);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = useCallback(async () => {
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;

    try {
      closeMenu();

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setIsLoggedIn(false);
      setProfileName("");
      setIsAdmin(false);
      setUserCohortYear("");
      setAuthReady(true);

      hasAppliedCachedAuthRef.current = true;

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("navbar-auth-cache");
        window.location.replace("/");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      isSigningOutRef.current = false;
    }
  }, [router, supabase]);

  useEffect(() => {
    const update = () => {
      if (navRef.current) setMobileMenuTop(navRef.current.offsetHeight);
      setIsMobileViewport(window.innerWidth <= 900);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (hasAppliedCachedAuthRef.current) return;
    const c = readNavbarAuthCache();
    if (!c) {
      hasAppliedCachedAuthRef.current = true;
      return;
    }
    setAuthReady(c.authReady);
    setIsLoggedIn(c.isLoggedIn);
    setProfileName(c.profileName);
    setIsAdmin(c.isAdmin);
    hasAppliedCachedAuthRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !authReady) return;
    window.sessionStorage.setItem(
      "navbar-auth-cache",
      JSON.stringify({ authReady, isLoggedIn, profileName, isAdmin })
    );
  }, [authReady, isLoggedIn, profileName, isAdmin]);

  useEffect(() => {
    let mounted = true;
    let authSequence = 0;
    let deferredAuthTimer: number | null = null;

    const isCurrent = (sequence: number) => mounted && sequence === authSequence;

    const applySignedOut = (sequence: number, clearCache: boolean) => {
      if (!isCurrent(sequence)) return;
      setIsLoggedIn(false);
      setProfileName("");
      setIsAdmin(false);
      setUserCohortYear("");
      setAuthReady(true);
      if (clearCache) {
        window.sessionStorage.removeItem("navbar-auth-cache");
      }
    };

    const resolveSession = async (
      session: Session | null,
      sequence: number,
      clearCacheWhenSignedOut: boolean,
    ) => {
      try {
        const user = session?.user;
        if (!user) {
          applySignedOut(sequence, clearCacheWhenSignedOut);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        if (!isCurrent(sequence)) return;

        const fullName = [user.user_metadata?.nome, user.user_metadata?.cognome]
          .filter(Boolean)
          .join(" ")
          .trim();
        setIsLoggedIn(true);
        setIsAdmin(profile?.role === "admin");
        setUserCohortYear(
          String(
            profile?.cohort_year ||
            profile?.classe ||
            profile?.class_year ||
            profile?.graduation_year ||
            user.user_metadata?.cohort_year ||
            user.user_metadata?.classe ||
            ""
          ).match(/\d{4}/)?.[0] ?? ""
        );
        setProfileName(fullName || user.email || "Profilo");
        setAuthReady(true);
      } catch {
        applySignedOut(sequence, clearCacheWhenSignedOut);
      }
    };

    const deferSessionResolution = (session: Session | null) => {
      const sequence = ++authSequence;
      if (deferredAuthTimer !== null) {
        window.clearTimeout(deferredAuthTimer);
      }
      deferredAuthTimer = window.setTimeout(() => {
        deferredAuthTimer = null;
        void resolveSession(session, sequence, true);
      }, 0);
    };

    const loadUser = async () => {
      const sequence = ++authSequence;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!isCurrent(sequence)) return;
        await resolveSession(session, sequence, false);
      } catch {
        applySignedOut(sequence, false);
      }
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "INITIAL_SESSION") return;
      deferSessionResolution(session);
    });

    return () => {
      mounted = false;
      authSequence += 1;
      if (deferredAuthTimer !== null) {
        window.clearTimeout(deferredAuthTimer);
      }
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    if (!isMobileViewport) closeMenu();
  }, [isMobileViewport]);

  useEffect(() => {
    closeMenu();
  }, [isLoggedIn, pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) closeMenu();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!menuOpen) return;
      const t = e.target as Node;
      if (!mobileMenuRef.current?.contains(t) && !mobileActionsRef.current?.contains(t)) {
        closeMenu();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
          height: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2.5rem",
          background: scrolled ? "rgba(250,250,250,0.98)" : "rgba(250,250,250,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: scrolled
            ? "1px solid rgba(14,31,107,0.10)"
            : "1px solid rgba(14,31,107,0.06)",
          boxShadow: scrolled ? "0 2px 20px rgba(14,31,107,.07)" : "none",
          transition: "background .3s, border-color .3s, box-shadow .3s",
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}
        >
          <AstraLogo size={96} />
        </Link>

        <ul
          className="navbar-desktop-links"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 2,
            listStyle: "none",
            alignItems: "center",
            margin: 0,
            padding: "4px",
            background: "rgba(14,31,107,.05)",
            borderRadius: "999px",
            border: "1px solid rgba(14,31,107,.08)",
          }}
        >
          {navLinksWithReplicaRank.map(([label, href]) => {
            const active = isLinkActive(pathname, href);
            return (
              <li key={label}>
                <a
                  href={href}
                  className={`nav-pill${active ? " nav-pill-active" : ""}`}
                  style={{
                    textDecoration: "none",
                    color: active || href === "/replicarank" ? "#fff" : "var(--muted)",
                    fontSize: ".84rem",
                    fontWeight: active || href === "/replicarank" ? 800 : 600,
                    padding: href === "/replicarank" ? ".48rem 1.15rem" : ".42rem 1.05rem",
                    borderRadius: "999px",
                    display: "inline-block",
                    background: active
                      ? "var(--blue)"
                      : href === "/replicarank"
                        ? "linear-gradient(135deg, #08102A, #1A3399)"
                        : "transparent",
                    boxShadow: href === "/replicarank" ? "0 6px 18px rgba(14,31,107,.18)" : "none",
                    transition: "background .18s, color .18s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </a>
              </li>
            );
          })}
        </ul>

        <div
          className="navbar-desktop-links"
          style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}
        >
          {!authReady ? (
            <>
              <span className="nb-skeleton" style={{ width: 56, height: 34, borderRadius: "999px" }} />
              <span className="nb-skeleton" style={{ width: 100, height: 38, borderRadius: "999px" }} />
            </>
          ) : !isLoggedIn ? (
            <>
              <a href="/login" className="btn-ghost">
                Login
              </a>
              <a href="#join" className="btn-outline">
                Unisciti
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path
                    d="M2.5 6.5H10.5M7 3.5L10.5 6.5L7 9.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </>
          ) : (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="btn-admin"
                  style={{
                    textDecoration: "none",
                    color: "var(--blue-mid)",
                    fontSize: ".82rem",
                    fontWeight: 700,
                    padding: ".48rem 1rem",
                    borderRadius: "999px",
                    background: "var(--blue-light)",
                    border: "1px solid rgba(14,31,107,.12)",
                    whiteSpace: "nowrap",
                    transition: "background .18s",
                  }}
                >
                  Admin
                </Link>
              )}
              <Link
                href="/profile"
                className="btn-profile"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  padding: "4px 14px 4px 4px",
                  borderRadius: "999px",
                  border: "1px solid rgba(14,31,107,.13)",
                  background: "#fff",
                  boxShadow: "0 1px 4px rgba(14,31,107,.06)",
                  transition: "background .18s, border-color .18s, box-shadow .18s",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "var(--blue)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: ".75rem",
                    flexShrink: 0,
                  }}
                >
                  {getInitials(profileName || "Profilo") || "P"}
                </span>
                <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                  <span
                    style={{
                      fontSize: ".6rem",
                      color: "var(--muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                    }}
                  >
                    Profilo
                  </span>
                  <span
                    style={{
                      fontSize: ".82rem",
                      color: "var(--text)",
                      fontWeight: 700,
                      maxWidth: 120,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {profileName || "Profilo"}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-logout"
                style={{
                  border: "1px solid rgba(14,31,107,.13)",
                  background: "transparent",
                  color: "var(--muted)",
                  padding: "1rem 1.5rem",
                  borderRadius: "999px",
                  fontWeight: 600,
                  fontSize: ".82rem",
                  cursor: "pointer",
                  lineHeight: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "background .18s, color .18s, border-color .18s",
                  whiteSpace: "nowrap",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path
                    d="M5 2H2.5A.5.5 0 0 0 2 2.5v8a.5.5 0 0 0 .5.5H5M8.5 9.5L11 6.5 8.5 3.5M11 6.5H5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Esci
              </button>
            </>
          )}
        </div>

        <div
          ref={mobileActionsRef}
          className="navbar-mobile-actions"
          style={{ display: "none", alignItems: "center", gap: 8, flexShrink: 0 }}
        >
          {!authReady ? (
            <span className="nb-skeleton" style={{ width: 72, height: 36, borderRadius: "999px" }} />
          ) : !isLoggedIn ? (
            <Link
              href="/login"
              style={{
                textDecoration: "none",
                color: "#fff",
                background: "var(--blue)",
                borderRadius: "999px",
                padding: ".52rem 1.1rem",
                fontWeight: 700,
                fontSize: ".84rem",
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 12px rgba(14,31,107,.22)",
              }}
            >
              Login
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              style={{
                color: "var(--muted)",
                background: "transparent",
                border: "1px solid rgba(14,31,107,.14)",
                borderRadius: "999px",
                padding: "1rem 1.5rem",
                fontWeight: 600,
                fontSize: ".82rem",
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path
                  d="M5 2H2.5A.5.5 0 0 0 2 2.5v8a.5.5 0 0 0 .5.5H5M8.5 9.5L11 6.5 8.5 3.5M11 6.5H5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Esci
            </button>
          )}

          <button
            type="button"
            ref={hamburgerRef}
            onClick={toggleMenu}
            onContextMenu={(e) => e.preventDefault()}
            className="hamburger-btn"
            aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            style={{
              width: 42,
              height: 42,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "1px solid rgba(14,31,107,.15)",
              background: menuOpen ? "var(--blue)" : "#fff",
              borderRadius: "999px",
              padding: 0,
              flexShrink: 0,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              transition: "background .2s, border-color .2s",
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 17 17"
              fill="none"
              aria-hidden="true"
              style={{ transition: "transform .2s" }}
            >
              {!menuOpen ? (
                <>
                  <path d="M3 4H14" stroke="#0E1F6B" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M3 8.5H14" stroke="#0E1F6B" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M3 13H14" stroke="#0E1F6B" strokeWidth="1.6" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M4 4L13 13" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M13 4L4 13" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
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
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(10,15,44,.32)",
              zIndex: 118,
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />
          <div
            id="mobile-menu"
            ref={mobileMenuRef}
            style={{
              position: "fixed",
              top: mobileMenuTop + 8,
              left: 12,
              right: 12,
              zIndex: 119,
              background: "#fff",
              borderRadius: "28px",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(10,15,44,.18), 0 0 0 1px rgba(14,31,107,.08)",
            }}
          >
            <div style={{ padding: "10px 10px 6px" }}>
              {navLinksWithReplicaRank.map(([label, href]) => {
                const active = isLinkActive(pathname, href);
                return (
                  <a
                    key={label}
                    href={href}
                    onClick={closeMenu}
                    className="mobile-nav-link"
                    style={{
                      textDecoration: "none",
                      color: active || href === "/replicarank" ? "var(--blue)" : "var(--text)",
                      fontWeight: active || href === "/replicarank" ? 800 : 500,
                      fontSize: "1.05rem",
                      padding: "1rem 1.2rem",
                      borderRadius: "18px",
                      background: active || href === "/replicarank" ? "var(--blue-light)" : "transparent",
                      transition: "background .15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {label}
                    {active ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--blue)",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 12 12"
                        fill="none"
                        style={{ color: "rgba(14,31,107,.2)", flexShrink: 0 }}
                      >
                        <path
                          d="M4 2.5L8 6L4 9.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </a>
                );
              })}
            </div>

            <div style={{ height: 1, background: "rgba(14,31,107,.06)", margin: "0 10px" }} />

            <div style={{ padding: "8px 10px 10px" }}>
              {!authReady ? (
                <span className="nb-skeleton" style={{ display: "block", height: 60, borderRadius: "18px" }} />
              ) : !isLoggedIn ? (
                <Link
                  href="/#join"
                  onClick={closeMenu}
                  style={{
                    textDecoration: "none",
                    color: "#fff",
                    background: "var(--blue)",
                    fontWeight: 700,
                    fontSize: "1rem",
                    padding: "1.1rem 1.3rem",
                    borderRadius: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: "0 4px 16px rgba(14,31,107,.22)",
                  }}
                >
                  <span>Unisciti ad Astra</span>
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,.18)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 13 13" fill="none">
                      <path
                        d="M2.5 6.5H10.5M7 3.5L10.5 6.5L7 9.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={closeMenu}
                      style={{
                        textDecoration: "none",
                        color: "var(--blue-mid)",
                        fontWeight: 700,
                        fontSize: ".95rem",
                        padding: ".9rem 1.2rem",
                        borderRadius: "18px",
                        background: "var(--blue-light)",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM8 4.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 8a5.5 5.5 0 0 1-3.8-1.5C4.4 9.9 6 9.3 8 9.3s3.6.6 3.8 1.7A5.5 5.5 0 0 1 8 12.5Z"
                          fill="currentColor"
                        />
                      </svg>
                      Amministrazione
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    onClick={closeMenu}
                    className="mobile-profile-row"
                    style={{
                      textDecoration: "none",
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: ".9rem 1.2rem",
                      borderRadius: "18px",
                      background: "var(--blue-light)",
                      border: "1px solid rgba(14,31,107,.08)",
                      transition: "background .15s",
                    }}
                  >
                    <span
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        background: "var(--blue)",
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: ".9rem",
                      }}
                    >
                      {getInitials(profileName || "Profilo") || "P"}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        lineHeight: 1.3,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: ".7rem",
                          color: "var(--muted)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: ".07em",
                        }}
                      >
                        Il tuo profilo
                      </span>
                      <span
                        style={{
                          fontSize: ".95rem",
                          color: "var(--text)",
                          fontWeight: 700,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {profileName || "Profilo"}
                      </span>
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 12 12"
                      fill="none"
                      style={{ flexShrink: 0, color: "rgba(14,31,107,.3)" }}
                    >
                      <path
                        d="M4 2.5L8 6L4 9.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        :root {
          --blue: #0E1F6B;
          --blue-mid: #1A3399;
          --blue-light: #E8EDFB;
          --white: #FAFAFA;
          --text: #0A0F2C;
          --muted: #6B7280;
        }

        .site-navbar, .site-navbar * { box-sizing: border-box; }

        @keyframes navFadeDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: none; }
        }
        .site-navbar { animation: navFadeDown .45s .05s cubic-bezier(.4,0,.2,1) both; }

        .nb-skeleton {
          display: inline-flex;
          background: rgba(14,31,107,.07);
          animation: nbShimmer 1.5s ease infinite;
        }
        @keyframes nbShimmer {
          0%, 100% { opacity: .45; }
          50%       { opacity: .9; }
        }

        .nav-pill:hover:not(.nav-pill-active) {
          background: rgba(14,31,107,.07) !important;
          color: var(--blue) !important;
        }
        .nav-pill[href="/replicarank"]:hover {
          background: linear-gradient(135deg, #08102A, #1A3399) !important;
          color: #fff !important;
          transform: translateY(-1px);
        }

        .btn-ghost{
          background: var(--ink);
          color: #fff;
          padding: .9rem 2.4rem;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
          font-size: .95rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background .2s, transform .2s, box-shadow .2s;
          letter-spacing: -.01em;
        }

        .btn-primary:hover { background: var(--ink-mid); transform: translateY(-2px); box-shadow: 0 10px 32px rgba(8,16,42,.26); }

        .btn-outline {
          border: 1.5px solid rgba(8,16,42,.2);
          color: var(--ink);
          padding: .9rem 2.4rem;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 500;
          font-size: .95rem;
          transition: border-color .2s, background .2s;
          display:flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn-outline:hover { border-color: var(--ink); background: rgba(8,16,42,.04); }

        .btn-admin:hover { background: #d5def8 !important; }

        .btn-profile:hover {
          background: var(--blue-light) !important;
          border-color: rgba(14,31,107,.2) !important;
          box-shadow: 0 3px 14px rgba(14,31,107,.1) !important;
        }

        .btn-logout:hover {
          background: rgba(185,28,28,.05) !important;
          color: #b91c1c !important;
          border-color: rgba(185,28,28,.18) !important;
        }

        .hamburger-btn:hover { border-color: rgba(14,31,107,.3) !important; }

        .mobile-nav-link:hover {
          background: var(--blue-light) !important;
          color: var(--blue) !important;
        }

        .mobile-profile-row:hover { background: #dde6fa !important; }

        @media (max-width: 900px) {
          .navbar-desktop-links { display: none !important; }
          .navbar-mobile-actions { display: flex !important; }
          .site-navbar { padding: 0 1rem !important; }
        }
      `}</style>
    </>
  );
}
