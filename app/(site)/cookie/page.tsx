export default function CookiePage() {
  return (
    <main
      className="cookie-page"
      style={{
        minHeight: "100vh",
        background: "var(--cream)",
        color: "var(--ink)",
      }}
    >
      <section
        style={{
          padding: "7.5rem 1.5rem 6rem",
          background: "var(--cream)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1180px",
            margin: "0 auto",
          }}
        >
          <div style={{ maxWidth: "760px", marginBottom: "2.25rem" }}>
            <p
              style={{
                margin: "0 0 0.85rem",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ink-soft)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Cookie
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(2.8rem, 6vw, 4.8rem)",
                lineHeight: 0.94,
                letterSpacing: "-0.045em",
                color: "var(--ink)",
                fontFamily: "Cormorant Garamond, serif",
                fontWeight: 700,
              }}
            >
              Cookie <span style={{ color: "var(--blue)" }}>Policy</span>
            </h1>

            <p
              style={{
                margin: "1.15rem 0 0",
                fontSize: "0.98rem",
                lineHeight: 1.8,
                color: "var(--mist)",
                maxWidth: "650px",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Ultimo aggiornamento: 21 Aprile 2026. La presente Cookie Policy
              descrive l’uso dei cookie e di strumenti analoghi da parte del
              sito https://www.astrasanraffaele.it/.
            </p>
          </div>

          <div
            style={{
              background: "var(--white)",
              border: "1px solid rgba(8, 16, 42, 0.08)",
              borderRadius: "1.75rem",
              padding: "1.6rem",
              boxShadow: "0 10px 30px rgba(8, 16, 42, 0.04)",
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(180deg, rgba(232, 237, 251, 0.72) 0%, rgba(255,255,255,0.96) 100%)",
                border: "1px solid rgba(8, 16, 42, 0.06)",
                borderRadius: "1.45rem",
                padding: "1.5rem",
                marginBottom: "1.35rem",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--ink-soft)",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Informativa cookie
              </p>
              <p
                style={{
                  margin: "0.9rem 0 0",
                  fontSize: "1rem",
                  lineHeight: 1.85,
                  color: "var(--ink-mid)",
                  fontFamily: "DM Sans, sans-serif",
                  maxWidth: "760px",
                }}
              >
                Questa informativa spiega quali cookie e strumenti tecnici sono
                utilizzati dal sito, con quali finalità e come vengono gestite
                le preferenze dell’utente.
              </p>
            </div>

            <div className="policy-grid">
              <PolicyCard title="1. Cosa sono i cookie">
                <p>
                  I cookie sono piccoli file di testo che i siti visitati
                  dall’utente inviano al suo dispositivo, dove vengono
                  memorizzati per essere poi ritrasmessi agli stessi siti alla
                  visita successiva. Possono essere utilizzati anche altri
                  strumenti di tracciamento con finalità analoghe.
                </p>
              </PolicyCard>

              <PolicyCard title="2. Titolare del trattamento">
                <div className="policy-box">
                  <p>
                    <strong>Fun and School S.r.l.</strong>
                  </p>
                  <p>Viale Monte Nero 50</p>
                  <p>20135 Milano</p>
                  <p>P. IVA / C.F. 10543900962</p>
                  <p>
                    Email:{" "}
                    <a href="mailto:amministrazione@funandschool.com">
                      amministrazione@funandschool.com
                    </a>
                  </p>
                </div>
              </PolicyCard>

              <PolicyCard title="3. Tipologie di cookie e strumenti utilizzati">
                <p>
                  <strong>a) Cookie tecnici e strettamente necessari</strong>
                </p>
                <p>
                  Il sito utilizza cookie o strumenti tecnici necessari al
                  funzionamento dell’applicazione web, alla sicurezza, alla
                  gestione della sessione e all’eventuale autenticazione utente.
                </p>
                <ul>
                  <li>cookie di sessione;</li>
                  <li>cookie di sicurezza;</li>
                  <li>cookie o token tecnici per login e autenticazione;</li>
                  <li>strumenti necessari a mantenere la sessione dell’utente;</li>
                  <li>preferenze tecniche strettamente necessarie.</li>
                </ul>
                <p>
                  Per questa categoria non è richiesto il consenso dell’utente.
                </p>

                <p>
                  <strong>
                    b) Cookie o strumenti legati ad autenticazione e aree riservate
                  </strong>
                </p>
                <p>
                  Nel caso in cui il sito utilizzi funzionalità di autenticazione
                  gestite tramite Supabase, possono essere impiegati cookie o
                  strumenti equivalenti per identificare l’utente autenticato,
                  mantenere attiva la sessione e proteggere l’accesso alle aree
                  riservate. Tali strumenti sono da considerarsi funzionali
                  all’erogazione del servizio richiesto.
                </p>

                <p>
                  <strong>c) Cookie analitici</strong>
                </p>
                <p>
                  Il sito, allo stato, non utilizza cookie analitici non
                  anonimizzati o altri strumenti di statistica che richiedano il
                  consenso dell’utente.
                </p>

                <p>
                  <strong>d) Cookie di profilazione, marketing o remarketing</strong>
                </p>
                <p>
                  Il sito, allo stato, non utilizza cookie di profilazione o
                  marketing. Se in futuro verranno installati pixel, tracker
                  pubblicitari o strumenti di remarketing, essi saranno attivati
                  solo previo consenso dell’utente.
                </p>
              </PolicyCard>

              <PolicyCard title="4. Base giuridica">
                <p>
                  L’uso di cookie tecnici e funzionali si basa sulla necessità di
                  fornire il sito e i servizi richiesti dall’utente, nonché sul
                  legittimo interesse del Titolare al corretto funzionamento e
                  alla sicurezza del sistema.
                </p>
                <p>
                  L’uso di cookie o strumenti di tracciamento non tecnici si basa
                  invece sul consenso dell’utente.
                </p>
              </PolicyCard>

              <PolicyCard title="5. Gestione del consenso">
                <p>
                  Se il sito utilizza esclusivamente cookie tecnici, non è
                  necessario raccogliere il consenso tramite banner per tali
                  strumenti.
                </p>
                <p>
                  Se invece il sito utilizza o utilizzerà cookie analitici non
                  anonimizzati, cookie di profilazione o altri strumenti di
                  tracciamento non tecnici, dovrà essere mostrato un banner che
                  consenta all’utente di:
                </p>
                <ul>
                  <li>accettare;</li>
                  <li>rifiutare;</li>
                  <li>selezionare in modo granulare le preferenze.</li>
                </ul>
              </PolicyCard>

              <PolicyCard title="6. Cookie di terze parti">
                <p>
                  Il sito può utilizzare fornitori tecnici terzi per l’erogazione
                  dei servizi digitali, tra cui hosting, autenticazione,
                  database e invio email. Qualora tali strumenti installino
                  cookie o identificatori lato browser, essi saranno trattati
                  secondo la loro funzione tecnica o, se non tecnici, secondo il
                  relativo regime di consenso.
                </p>
                <p>
                  Il sito può inoltre contenere link verso servizi esterni o
                  social network. L’eventuale interazione con tali piattaforme è
                  disciplinata dalle rispettive informative privacy e cookie.
                </p>
              </PolicyCard>

              <PolicyCard title="7. Come disabilitare i cookie">
                <p>
                  L’utente può gestire le preferenze relative ai cookie
                  direttamente tramite le impostazioni del proprio browser. La
                  disabilitazione dei cookie tecnici può compromettere il corretto
                  funzionamento del sito o di alcune sue funzionalità.
                </p>
              </PolicyCard>

              <PolicyCard title="8. Aggiornamenti">
                <p>
                  La presente Cookie Policy può essere aggiornata nel tempo. Gli
                  utenti sono invitati a consultarla periodicamente.
                </p>
              </PolicyCard>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        :root {
          --ink: #08102A;
          --ink-mid: #1A2B5C;
          --ink-soft: #2E4080;
          --sky: #E8EDFB;
          --sky-deep: #C8D4F5;
          --cream: #F8F7F3;
          --mist: #6B7280;
          --white: #FEFEFE;
          --blue: #0E1F6B;
          --blue-mid: #1A3399;
          --blue-light: #E8EDFB;
        }

        .cookie-page * {
          box-sizing: border-box;
        }

        .policy-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .policy-card {
          background: var(--white);
          border: 1px solid rgba(8, 16, 42, 0.08);
          border-radius: 1.45rem;
          padding: 1.35rem;
          box-shadow: 0 10px 30px rgba(8, 16, 42, 0.04);
        }

        .policy-card h2 {
          margin: 0 0 0.9rem;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.9rem, 3vw, 2.5rem);
          line-height: 0.98;
          letter-spacing: -0.03em;
          color: var(--ink);
          font-weight: 700;
        }

        .policy-card p,
        .policy-card li,
        .policy-card a,
        .policy-card strong {
          font-family: 'DM Sans', sans-serif;
        }

        .policy-card p,
        .policy-card li {
          margin: 0;
          font-size: 0.98rem;
          line-height: 1.8;
          color: var(--ink-mid);
        }

        .policy-card p + p,
        .policy-card p + ul,
        .policy-card ul + p,
        .policy-card .policy-box,
        .policy-card ul + .policy-box,
        .policy-card p + .policy-box {
          margin-top: 0.8rem;
        }

        .policy-card ul {
          margin: 0;
          padding-left: 1.2rem;
          display: grid;
          gap: 0.5rem;
        }

        .policy-card a {
          color: var(--blue);
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .policy-box {
          background: rgba(232, 237, 251, 0.52);
          border: 1px solid rgba(26, 51, 153, 0.08);
          border-radius: 1.1rem;
          padding: 0.95rem 1rem;
        }

        @media (max-width: 900px) {
          .policy-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

function PolicyCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="policy-card">
      <h2>{title}</h2>
      {children}
    </article>
  );
}