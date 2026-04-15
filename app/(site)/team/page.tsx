"use client";
import Image from "next/image";


type TeamMember = {
    firstName: string;
    lastName: string;
    role: string;
    contact: string;
    image?: string;
};

const leadershipMembers: TeamMember[] = [
    {
        firstName: "Flavio",
        lastName: "Errante",
        role: "Presidente",
        contact: "Contatto disponibile su richiesta",
        // image: "/team/flavio-errante.jpg",
    },
    {
        firstName: "Carlotta",
        lastName: "Minzera",
        role: "Vice-presidente",
        contact: "Contatto disponibile su richiesta",
        // image: "/team/carlotta-minzera.jpg",
    },
    {
        firstName: "Enrica",
        lastName: "Piazza",
        role: "Segretaria",
        contact: "Contatto disponibile su richiesta",
        // image: "/team/enrica-piazza.jpg",
    },
];

const managersMembers: TeamMember[] = [
    {
        firstName: "Mirko",
        lastName: "Romito",
        role: "Responsabile Rappresentanza",
        contact: "Contatto disponibile su richiesta",
        // image: "/team/mirko-romito.jpg",
    },
    {
        firstName: "Saverio",
        lastName: "Marino",
        role: "Responsabile Collaborazioni e convenzioni",
        contact: "Contatto disponibile su richiesta",
        // image: "/team/saverio-marino.jpg",
    },
    {
        firstName: "Alberto",
        lastName: "Carluccio",
        role: "Responsabile Regolamenti",
        contact: "Contatto disponibile su richiesta",
        // image: "/team/alberto-carluccio.jpg",
    },
    {
        firstName: "Sabina",
        lastName: "Castronovo",
        role: "Responsabile Network",
        contact: "Contatto disponibile su richiesta",
        // image: "/team/sabina-castronovo.jpg",
    },
    {
        firstName: "Edoardo",
        lastName: "Mongardini",
        role: "Responsabile Comunicazione e Media",
        contact: "Contatto disponibile su richiesta",
        // image: "/team/edoardo-mongardini.jpg",
    },
    {
        firstName: "Eleonora",
        lastName: "Pazzali",
        role: "Responsabile Eventi culturali",
        contact: "Contatto disponibile su richiesta",
        // image: "/team/eleonora-pazzali.jpg",
    },
    {
        firstName: "Cesare",
        lastName: "Morales",
        role: "Responsabile Eventi ludici",
        contact: "Contatto disponibile su richiesta",
        // image: "/team/cesare-morales.jpg",
    },
];

function getInitials(firstName: string, lastName: string) {
    return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function TeamCard({ member }: { member: TeamMember }) {
    const initials = getInitials(member.firstName, member.lastName);

    return (
        <div
            style={{
                background: "var(--white)",
                border: "1px solid rgba(8, 16, 42, 0.08)",
                borderRadius: "1.75rem",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.95rem",
                boxShadow: "0 10px 30px rgba(8, 16, 42, 0.04)",
                fontFamily: "DM Sans",
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1 / 1.08",
                    borderRadius: "1.45rem",
                    overflow: "hidden",
                    background:
                        "linear-gradient(180deg, var(--sky) 0%, var(--sky-deep) 100%)",
                    border: "1px solid rgba(8, 16, 42, 0.05)",
                }}
            >
                {member.image ? (
                    <Image
                        src={member.image}
                        alt={`${member.firstName} ${member.lastName}`}
                        fill
                        sizes="(max-width: 900px) 100vw, 33vw"
                        style={{
                            objectFit: "cover",
                            objectPosition: "center",
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                width: "140px",
                                height: "140px",
                                borderRadius: "999px",
                                background: "rgba(14, 31, 107, 0.08)",
                                top: "-28px",
                                right: "-28px",
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                width: "110px",
                                height: "110px",
                                borderRadius: "999px",
                                background: "rgba(255, 255, 255, 0.32)",
                                bottom: "-22px",
                                left: "-22px",
                            }}
                        />
                        <div
                            style={{
                                width: "88px",
                                height: "88px",
                                borderRadius: "999px",
                                background: "var(--ink)",
                                color: "var(--cream)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "2rem",
                                fontWeight: 700,
                                letterSpacing: "-0.04em",
                                boxShadow: "0 12px 26px rgba(8, 16, 42, 0.16)",
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            {initials}
                        </div>
                    </div>
                )}
            </div>

            <div
                style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                    opacity: 0.9,
                }}
            >
                {member.role}
            </div>

            <h3
                style={{
                    margin: 0,
                    fontSize: "1.55rem",
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                    color: "var(--ink)",
                }}
            >
                {member.firstName}
                <br />
                {member.lastName}
            </h3>

            <div
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    width: "fit-content",
                    minHeight: "40px",
                    padding: "0 0.95rem",
                    borderRadius: "999px",
                    background: "rgba(232, 237, 251, 0.7)",
                    color: "var(--blue)",
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    border: "1px solid rgba(26, 51, 153, 0.08)",
                }}
            >
                {member.contact}
            </div>
        </div>
    );
}

export default function TeamPage() {
    return (
        <>

            <main
                style={{
                    minHeight: "100vh",
                    background: "var(--cream)",
                    color: "var(--ink)",
                }}
            >
                <section
                    style={{
                        padding: "7.5rem 1.5rem 3.25rem",
                        background: "var(--cream)",
                    }}
                >
                    <div
                        className="team-hero-grid"
                        style={{
                            width: "100%",
                            maxWidth: "1180px",
                            margin: "0 auto",
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) 280px",
                            alignItems: "end",
                            gap: "2rem",
                        }}
                    >
                        <div style={{ maxWidth: "760px" }}>
                            <p
                                style={{
                                    margin: "0 0 0.85rem",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.18em",
                                    textTransform: "uppercase",
                                    color: "var(--ink-soft)",
                                }}
                            >
                                Team
                            </p>

                            <h1
                                style={{
                                    margin: 0,
                                    fontSize: "clamp(2.7rem, 6vw, 4.6rem)",
                                    lineHeight: 0.95,
                                    letterSpacing: "-0.045em",
                                    color: "var(--ink)",
                                    maxWidth: "720px",
                                }}
                            >
                                Il direttivo <span style={{ color: "var(--blue)" }}>ASTRA</span>
                            </h1>

                            <p
                                style={{
                                    margin: "1.2rem 0 0",
                                    fontSize: "0.98rem",
                                    lineHeight: 1.8,
                                    color: "var(--mist)",
                                    maxWidth: "620px",
                                }}
                            >
                                Un gruppo di studenti che lavora ogni giorno per rappresentare,
                                connettere e creare opportunità per la community UniSR.
                            </p>
                        </div>
                    </div>
                </section>

                <section id="presidenza" style={{ padding: "0 1.5rem 4.5rem" }}>
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "1180px",
                            margin: "0 auto",
                        }}
                    >
                        <div style={{ marginBottom: "2.1rem", maxWidth: "760px" }}>
                            <p
                                style={{
                                    margin: "0 0 0.9rem",
                                    fontSize: "0.74rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.18em",
                                    textTransform: "uppercase",
                                    color: "var(--ink-soft)",
                                }}
                            >
                                Presidenza
                            </p>

                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: "clamp(2.3rem, 5vw, 3.7rem)",
                                    lineHeight: 0.98,
                                    letterSpacing: "-0.035em",
                                    color: "var(--ink)",
                                }}
                            >
                                Presidente, vice-presidente e segretaria
                            </h2>
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                                gap: "1.5rem",
                            }}
                        >
                            {leadershipMembers.map((member) => (
                                <TeamCard
                                    key={`${member.firstName}-${member.lastName}`}
                                    member={member}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                <section style={{ padding: "0 1.5rem 5.5rem" }}>
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "1180px",
                            margin: "0 auto",
                        }}
                    >
                        <div style={{ marginBottom: "2.1rem", maxWidth: "760px" }}>
                            <p
                                style={{
                                    margin: "0 0 0.9rem",
                                    fontSize: "0.74rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.18em",
                                    textTransform: "uppercase",
                                    color: "var(--ink-soft)",
                                }}
                            >
                                Responsabili
                            </p>

                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: "clamp(2.3rem, 5vw, 3.7rem)",
                                    lineHeight: 0.98,
                                    letterSpacing: "-0.035em",
                                    color: "var(--ink)",
                                }}
                            >
                                Le aree operative del direttivo
                            </h2>
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                                gap: "1.5rem",
                            }}
                        >
                            {managersMembers.map((member) => (
                                <TeamCard
                                    key={`${member.firstName}-${member.lastName}`}
                                    member={member}
                                />
                            ))}
                        </div>
                    </div>
                </section>
                <style>{`

        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        :root {
          --ink:      #08102A;
          --ink-mid:  #1A2B5C;
          --ink-soft: #2E4080;
          --sky:      #E8EDFB;
          --sky-deep: #C8D4F5;
          --cream:    #F8F7F3;
          --mist:     #6B7280;
          --white:    #FEFEFE;
          --blue:     #0E1F6B;
          --blue-mid: #1A3399;
          --blue-light: #E8EDFB;
        }

          @media (max-width: 900px) {
            .team-hero-grid {
              grid-template-columns: 1fr !important;
              gap: 1.25rem !important;
            }
          }
        `}</style>
            </main>
        </>
    );
}