"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import { createClient } from "@/lib/supabase/client";

type Role = "user" | "admin";

type Profile = {
  id: string;
  nome: string;
  cognome: string;
  email_istituzionale: string;
  numero_telefono: string;
  facolta: string;
  corso_di_laurea: string;
  anno_di_laurea: number;
  data_di_nascita: string;
  role: Role;
  created_at: string;
  updated_at: string;
};

type DashboardStats = {
  totalUsers: number;
  totalAdmins: number;
  medicinaUsers: number;
  psicologiaUsers: number;
  filosofiaUsers: number;
};

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAdmins: 0,
    medicinaUsers: 0,
    psicologiaUsers: 0,
    filosofiaUsers: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAdminPage() {
      setLoading(true);
      setError("");

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

     if (!user) {
  router.replace("/login");
  return;
}

      const { data: myProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !myProfile) {
        router.replace("/login");
        return;
      }

      const typedProfile = myProfile as Profile;

      if (typedProfile.role !== "admin") {
        router.replace("/profile");
        return;
      }

      setAdminProfile(typedProfile);

      const { data: allProfiles, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError || !allProfiles) {
        setError("Impossibile caricare i dati amministrativi.");
        setLoading(false);
        return;
      }

      const profiles = allProfiles as Profile[];

      setRecentUsers(profiles.slice(0, 6));

      setStats({
        totalUsers: profiles.length,
        totalAdmins: profiles.filter((p) => p.role === "admin").length,
        medicinaUsers: profiles.filter((p) => p.facolta === "medicina").length,
        psicologiaUsers: profiles.filter((p) => p.facolta === "psicologia").length,
        filosofiaUsers: profiles.filter((p) => p.facolta === "filosofia").length,
      });

      setLoading(false);
    }

    loadAdminPage();
  }, [router, supabase]);

  if (loading) {
    return (
      <main className="admin-page">
        <Navbar />
        <div className="admin-shell">
          <div className="loading-card">
            <span className="section-tag">Admin</span>
            <h1 className="admin-title">Caricamento dashboard...</h1>
            <p className="admin-subtitle">Sto recuperando i dati amministrativi.</p>
          </div>
        </div>
        <Footer />
        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <Navbar />
      <div className="admin-shell">
        <section className="hero">
          <div className="heroText">
            <span className="section-tag">Pannello amministratore</span>
            <h1 className="admin-title">
              Dashboard <em>Admin</em>
            </h1>
            <p className="admin-subtitle">
              Gestisci utenti, ruoli e contenuti riservati della piattaforma Astra da un’unica area centrale.
            </p>
          </div>
        </section>

        {error ? <div className="message error">{error}</div> : null}

        <section className="statsGrid mobile-hide">
          <div className="statCard">
            <span className="statLabel">Utenti totali</span>
            <strong className="statValue">{stats.totalUsers}</strong>
          </div>

          <div className="statCard">
            <span className="statLabel">Admin</span>
            <strong className="statValue">{stats.totalAdmins}</strong>
          </div>

          <div className="statCard">
            <span className="statLabel">Medicina</span>
            <strong className="statValue">{stats.medicinaUsers}</strong>
          </div>

          <div className="statCard">
            <span className="statLabel">Psicologia</span>
            <strong className="statValue">{stats.psicologiaUsers}</strong>
          </div>

          <div className="statCard">
            <span className="statLabel">Filosofia</span>
            <strong className="statValue">{stats.filosofiaUsers}</strong>
          </div>
        </section>

        <section className="contentGrid">
          <div className="mainColumn">
            <div className="card">
              <div className="sectionHead">
                <span className="section-tag">Accesso rapido</span>
                <h2 className="sectionTitle">Strumenti admin</h2>
              </div>

              <div className="quickGrid">
                <div className="quickCard">
                  <h3>Gestione convenzioni</h3>
                  <p>Apri l’area dedicata per creare, modificare o eliminare le convenzioni visibili agli utenti registrati.</p>
                  <a href="/admin/convenzioni" className="ctaButton primary">
                    Vai alla gestione convenzioni
                  </a>
                </div>
                <div className="quickCard">
                  <h3>Gestione eventi</h3>
                  <p>Apri l’area dedicata per creare, modificare o eliminare le convenzioni visibili agli utenti registrati.</p>
                  <a href="/admin/eventi" className="ctaButton primary">
                    Vai alla gestione eventi
                  </a>
                </div>    
                <div className="quickCard">
                  <h3>Gestione utenti</h3>
                  <p>Accedi all’area dedicata per visualizzare, cercare e gestire gli utenti registrati della piattaforma Astra.</p>
                  <a href="/admin/utenti" className="ctaButton primary">
                    Vai alla gestione utenti
                  </a>
                </div>
              </div>
            </div>

            <div className="card mobile-hide">
              <div className="sectionHead">
                <span className="section-tag">Nuovi iscritti</span>
                <h2 className="sectionTitle">Utenti recenti</h2>
              </div>

              <div className="tableWrap">
                <table className="usersTable">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Mail</th>
                      <th>Facoltà</th>
                      <th>Ruolo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          {user.nome} {user.cognome}
                        </td>
                        <td>{user.email_istituzionale}</td>
                        <td>{user.facolta}</td>
                        <td>
                          <span className={`tableBadge ${user.role === "admin" ? "admin" : "user"}`}>
                            {user.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
      <style>{styles}</style>
    </main>
  );
}

const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        body {
          font-family: 'DM Sans', sans-serif;
        }

.ctaButton {
  border-radius: 999px;
  font-weight: 800;
  text-decoration: none;
  padding: .85rem 1.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all .25s ease;
  font-size: .9rem;
}

/* PRIMARY (azione principale) */
.ctaButton.primary {
  background: linear-gradient(135deg, #0E1F6B, #2743b4);
  color: white;
  box-shadow: 0 10px 25px rgba(14,31,107,.25);
}

.ctaButton.primary:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 14px 30px rgba(14,31,107,.35);
}

/* SECONDARY (azione meno importante) */
.ctaButton.secondary {
  background: rgba(14,31,107,.06);
  color: #0E1F6B;
  border: 1px solid rgba(14,31,107,.12);
}

.ctaButton.secondary:hover {
  background: rgba(14,31,107,.12);
  transform: translateY(-1px);
}
  
  .admin-page {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at top right, rgba(14,31,107,.10), transparent 22%),
      radial-gradient(circle at left center, rgba(14,31,107,.08), transparent 18%),
      linear-gradient(180deg, #f8faff 0%, #ffffff 38%, #f7f9ff 100%);
    color: #0f172a;
  }

  .bg-orb {
    position: absolute;
    border-radius: 999px;
    filter: blur(70px);
    pointer-events: none;
  }

  .bg-orb-1 {
    width: 320px;
    height: 320px;
    background: rgba(14,31,107,.14);
    top: -40px;
    right: -60px;
  }

  .bg-orb-2 {
    width: 260px;
    height: 260px;
    background: rgba(94,129,244,.12);
    bottom: 40px;
    left: -80px;
  }

  .admin-shell {
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
    padding: 7rem 1.25rem 3rem;
    position: relative;
    z-index: 1;
  }

  .hero {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
    align-items: end;
    margin-bottom: 1.5rem;
  }

  .heroText {
    min-width: 0;
  }

  .section-tag {
    display: inline-block;
    font-size: .78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .12em;
    color: #0E1F6B;
    margin-bottom: .85rem;
  }

  .admin-title {
    margin: 0;
    font-size: clamp(2rem, 4vw, 4rem);
    line-height: .98;
    font-weight: 900;
    letter-spacing: -.03em;
    word-break: break-word;
  }

  .admin-title em {
    font-style: italic;
    font-weight: 700;
    color: #2743b4;
  }

  .admin-subtitle {
    margin-top: 1rem;
    max-width: 640px;
    color: #475569;
    font-size: 1rem;
    line-height: 1.7;
  }

  .card,
  .loading-card,
  .statCard {
    border-radius: 28px;
    border: 1px solid rgba(14,31,107,.08);
    box-shadow: 0 10px 30px rgba(15,23,42,.06);
  }

  .statsGrid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .statCard {
    background: rgba(255,255,255,.82);
    backdrop-filter: blur(14px);
    padding: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: .45rem;
  }

  .statLabel {
    font-size: .9rem;
    color: #64748b;
    font-weight: 700;
  }

  .statValue {
    font-size: 2rem;
    line-height: 1;
    font-weight: 900;
    color: #0E1F6B;
  }

  .contentGrid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
    align-items: start;
  }

  .mainColumn {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    min-width: 0;
  }

  .card,
  .loading-card {
    background: rgba(255,255,255,.78);
    backdrop-filter: blur(14px);
    padding: 1.4rem;
    min-width: 0;
  }

  .sectionHead {
    margin-bottom: 1rem;
  }

  .sectionTitle {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.1;
    font-weight: 900;
    letter-spacing: -.02em;
    word-break: break-word;
  }

  .quickGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .quickCard {
    border: 1px solid rgba(14,31,107,.08);
    background: rgba(248,250,255,.95);
    border-radius: 22px;
    padding: 1.1rem;
  }

  .quickCard h3 {
    margin: 0 0 .55rem;
    font-size: 1.05rem;
    font-weight: 800;
    color: #0f172a;
  }

  .quickCard p {
    margin: 0 0 1rem;
    color: #475569;
    line-height: 1.65;
    font-size: .95rem;
  }

  .tableWrap {
    width: 100%;
    overflow-x: auto;
  }

  .usersTable {
    width: 100%;
    border-collapse: collapse;
    min-width: 640px;
  }

  .usersTable th,
  .usersTable td {
    text-align: left;
    padding: 1rem .75rem;
    border-bottom: 1px solid rgba(14,31,107,.08);
    font-size: .95rem;
    vertical-align: middle;
  }

  .usersTable th {
    color: #64748b;
    font-size: .85rem;
    text-transform: uppercase;
    letter-spacing: .06em;
    font-weight: 800;
  }

  .tableBadge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: .42rem .7rem;
    border-radius: 999px;
    font-size: .76rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .tableBadge.admin {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .tableBadge.user {
    background: #eef2ff;
    color: #4338ca;
  }

  .infoList {
    display: flex;
    flex-direction: column;
    gap: .2rem;
  }

  .infoRow {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: .95rem 0;
    border-bottom: 1px solid rgba(14,31,107,.08);
  }

  .infoRow:last-child {
    border-bottom: none;
  }

  .infoRow span {
    color: #64748b;
    font-size: .94rem;
    flex-shrink: 0;
  }

  .infoRow strong {
    color: #0f172a;
    text-align: right;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .adminCard {
    background: linear-gradient(180deg, rgba(232,237,251,.95) 0%, rgba(255,255,255,.9) 100%);
  }

  .adminText {
    margin: 0 0 1rem;
    color: #475569;
    line-height: 1.7;
  }

  .pillWrap {
    display: flex;
    flex-wrap: wrap;
    gap: .7rem;
  }

  .pill {
    padding: .65rem .95rem;
    border-radius: 999px;
    background: white;
    border: 1px solid rgba(14,31,107,.1);
    color: #0E1F6B;
    font-size: .88rem;
    font-weight: 800;
  }

  .message {
    border-radius: 16px;
    padding: .95rem 1rem;
    font-size: .92rem;
    font-weight: 700;
    word-break: break-word;
    margin-bottom: 1rem;
  }

  .message.error {
    background: #fff1f2;
    color: #be123c;
    border: 1px solid #fecdd3;
  }

  .primaryButton,
  .ghostButton {
    border-radius: 999px;
    font-weight: 800;
    text-decoration: none;
    transition: .2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .primaryButton {
    border: none;
    background: #0E1F6B;
    color: white;
    padding: .95rem 1.4rem;
    box-shadow: 0 8px 24px rgba(14,31,107,.18);
    cursor: pointer;
  }

  .primaryButton.small {
    padding: .72rem 1rem;
  }

  .ghostButton {
    padding: .72rem 1rem;
    color: #0E1F6B;
    background: rgba(14,31,107,.06);
    border: none;
    cursor: pointer;
  }

  .fullButton {
    width: 100%;
  }

  .loading-card {
    max-width: 560px;
    margin: 0 auto;
  }

  @media (max-width: 1100px) {
    .statsGrid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 980px) {
    .hero,
    .contentGrid,
    .quickGrid {
      grid-template-columns: 1fr;
    }

    .hero {
      align-items: stretch;
    }

    .statsGrid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .admin-shell {
      padding: 6.25rem 1rem 2rem;
    }

    .hero {
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .card,
    .loading-card,
    .statCard {
      border-radius: 22px;
      padding: 1.1rem;
    }

    .admin-subtitle {
      font-size: .96rem;
      line-height: 1.6;
    }

    .sectionTitle {
      font-size: 1.28rem;
    }

    .statsGrid {
      grid-template-columns: 1fr;
    }

    .infoRow {
      flex-direction: column;
      align-items: flex-start;
      gap: .35rem;
    }

    .infoRow strong {
      text-align: left;
    }

    .pillWrap {
      gap: .55rem;
    }

    .pill {
      font-size: .82rem;
      padding: .58rem .82rem;
    }

    .mobile-hide {
      display: none;
    }
  }

  @media (max-width: 420px) {
    .admin-shell {
      padding: 5.9rem .85rem 1.6rem;
    }

    .admin-title {
      font-size: clamp(1.75rem, 8vw, 2.3rem);
      line-height: 1.02;
    }

    .section-tag {
      font-size: .72rem;
    }

    .card,
    .loading-card,
    .statCard {
      padding: 1rem;
      border-radius: 20px;
    }
  }
`;