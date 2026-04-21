export default function PrivacyPage() {
  return (
    <main
      className="privacy-page"
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
              Privacy
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
              Privacy <span style={{ color: "var(--blue)" }}>Policy</span>
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
              Ultimo aggiornamento: 21 Aprile 2026. Informativa resa ai sensi
              degli artt. 13 e 14 del Regolamento (UE) 2016/679 (“GDPR”) agli
              utenti che interagiscono con il sito
              https://www.astrasanraffaele.it/.
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
                Informativa privacy
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
                La presente informativa descrive le modalità di trattamento dei
                dati personali degli utenti del sito ASTRA San Raffaele.
              </p>
            </div>

            <div className="policy-grid">
              <PolicyCard title="1. Titolare del trattamento">
                <p>
                  Il sito astrasanraffaele.it fa riferimento al progetto ASTRA
                  San Raffaele. Poiché ASTRA San Raffaele non opera come soggetto
                  giuridico autonomo, il trattamento dei dati personali connesso
                  alla gestione del sito, dei servizi digitali e delle richieste
                  ricevute tramite i canali di contatto è effettuato da:
                </p>
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
                <p>Di seguito, il “Titolare”.</p>
              </PolicyCard>

              <PolicyCard title="2. Tipologie di dati trattati">
                <p>
                  <strong>a) Dati di navigazione</strong>
                </p>
                <p>
                  I sistemi informatici e le procedure software preposte al
                  funzionamento del sito acquisiscono, nel corso del loro normale
                  esercizio, alcuni dati la cui trasmissione è implicita
                  nell’uso dei protocolli Internet.
                </p>
                <ul>
                  <li>indirizzo IP;</li>
                  <li>identificativi del dispositivo e del browser;</li>
                  <li>data e ora della richiesta;</li>
                  <li>pagine richieste;</li>
                  <li>
                    parametri relativi al sistema operativo e all’ambiente
                    informatico dell’utente;
                  </li>
                  <li>log tecnici e di sicurezza.</li>
                </ul>

                <p>
                  <strong>b) Dati forniti volontariamente dall’utente</strong>
                </p>
                <p>
                  L’invio facoltativo e volontario di messaggi tramite form,
                  email o altri recapiti indicati sul sito comporta
                  l’acquisizione dei dati di contatto del mittente e dei dati
                  contenuti nella comunicazione.
                </p>
                <ul>
                  <li>nome e cognome;</li>
                  <li>indirizzo email;</li>
                  <li>numero di telefono;</li>
                  <li>contenuto del messaggio;</li>
                  <li>
                    eventuali altri dati inseriti dall’utente nei form o nelle
                    richieste.
                  </li>
                </ul>

                <p>
                  <strong>
                    c) Dati relativi all’utilizzo di aree riservate o
                    funzionalità autenticata
                  </strong>
                </p>
                <p>
                  Qualora il sito preveda funzionalità con autenticazione utente,
                  possono essere trattati dati necessari alla gestione
                  dell’accesso, della sessione e della sicurezza dell’account,
                  inclusi identificativi tecnici e dati collegati
                  all’autenticazione tramite Supabase.
                </p>
              </PolicyCard>

              <PolicyCard title="3. Finalità del trattamento e base giuridica">
                <p>
                  <strong>a) Funzionamento tecnico del sito e sicurezza</strong>
                </p>
                <p>
                  Per consentire il funzionamento del sito, l’erogazione delle
                  pagine e dei servizi richiesti, la gestione
                  dell’infrastruttura tecnica, il monitoraggio della sicurezza,
                  la prevenzione di accessi abusivi e la protezione
                  dell’applicazione.
                </p>
                <p>
                  <strong>Base giuridica:</strong> legittimo interesse del
                  Titolare al corretto funzionamento e alla sicurezza del sito
                  (art. 6, par. 1, lett. f GDPR).
                </p>

                <p>
                  <strong>
                    b) Gestione dei form e delle richieste inviate dagli utenti
                  </strong>
                </p>
                <p>
                  Per ricevere, registrare e gestire richieste di informazioni,
                  candidature, contatti o altre comunicazioni inviate dagli utenti
                  attraverso i form del sito o i recapiti indicati.
                </p>
                <p>
                  <strong>Base giuridica:</strong> esecuzione di misure
                  precontrattuali adottate su richiesta dell’interessato e/o
                  legittimo interesse del Titolare a riscontrare le richieste
                  ricevute (art. 6, par. 1, lett. b e f GDPR).
                </p>

                <p>
                  <strong>c) Gestione di eventuali account o accessi autenticati</strong>
                </p>
                <p>
                  Per consentire l’autenticazione, la gestione della sessione,
                  l’accesso ad aree riservate e la corretta fruizione di
                  funzionalità personalizzate.
                </p>
                <p>
                  <strong>Base giuridica:</strong> esecuzione del servizio
                  richiesto dall’utente e legittimo interesse del Titolare alla
                  sicurezza e continuità del servizio (art. 6, par. 1, lett. b e
                  f GDPR).
                </p>

                <p>
                  <strong>d) Adempimento di obblighi di legge</strong>
                </p>
                <p>
                  Per adempiere a obblighi previsti da normative applicabili,
                  regolamenti o richieste dell’autorità.
                </p>
                <p>
                  <strong>Base giuridica:</strong> obbligo legale (art. 6, par.
                  1, lett. c GDPR).
                </p>

                <p>
                  <strong>e) Accertamento, esercizio o difesa di diritti</strong>
                </p>
                <p>
                  Per gestire eventuali contestazioni o contenziosi e tutelare i
                  diritti del Titolare.
                </p>
                <p>
                  <strong>Base giuridica:</strong> legittimo interesse del
                  Titolare (art. 6, par. 1, lett. f GDPR).
                </p>
              </PolicyCard>

              <PolicyCard title="4. Modalità del trattamento">
                <p>
                  Il trattamento è effettuato con strumenti informatici e
                  telematici, secondo principi di liceità, correttezza,
                  trasparenza, minimizzazione e sicurezza. Il Titolare adotta
                  misure tecniche e organizzative adeguate a proteggere i dati da
                  accessi non autorizzati, perdita, alterazione o divulgazione
                  indebita.
                </p>
              </PolicyCard>

              <PolicyCard title="5. Conferimento dei dati">
                <p>
                  Il conferimento dei dati di navigazione è necessario per il
                  funzionamento del sito.
                </p>
                <p>
                  Il conferimento dei dati richiesti nei form o nelle
                  comunicazioni è facoltativo, ma l’eventuale mancato
                  conferimento può impedire al Titolare di dare seguito alla
                  richiesta o di erogare il servizio richiesto.
                </p>
              </PolicyCard>

              <PolicyCard title="6. Destinatari dei dati">
                <p>
                  I dati personali possono essere trattati da soggetti autorizzati
                  dal Titolare e da fornitori di servizi che supportano la
                  gestione del sito e dei servizi digitali, tra cui:
                </p>
                <ul>
                  <li>fornitori di hosting e infrastruttura cloud;</li>
                  <li>fornitori di servizi database e autenticazione;</li>
                  <li>fornitori di servizi email e SMTP;</li>
                  <li>consulenti tecnici, amministrativi o legali;</li>
                  <li>
                    soggetti cui la comunicazione sia dovuta per obbligo di legge.
                  </li>
                </ul>
                <p>
                  In relazione alla struttura tecnica dichiarata del sito, i dati
                  possono essere trattati tramite servizi erogati da:
                </p>
                <ul>
                  <li>Vercel per hosting e infrastruttura cloud;</li>
                  <li>Supabase per database PostgreSQL e autenticazione;</li>
                  <li>Aruba per l’invio email tramite SMTP.</li>
                </ul>
                <p>
                  Tali soggetti operano, a seconda dei casi, come responsabili del
                  trattamento o autonomi titolari.
                </p>
              </PolicyCard>

              <PolicyCard title="7. Trasferimento dei dati verso Paesi terzi">
                <p>
                  L’utilizzo di fornitori tecnologici può comportare il
                  trasferimento di dati personali verso Paesi situati al di fuori
                  dello Spazio Economico Europeo. In tali casi, il trasferimento
                  avverrà nel rispetto degli artt. 44 e ss. GDPR, mediante
                  decisioni di adeguatezza, clausole contrattuali standard o altre
                  garanzie previste dalla normativa applicabile.
                </p>
              </PolicyCard>

              <PolicyCard title="8. Periodo di conservazione">
                <p>
                  I dati personali sono conservati per il tempo strettamente
                  necessario alle finalità per cui sono raccolti e, comunque:
                </p>
                <ul>
                  <li>
                    i dati tecnici e di log per il tempo necessario alla
                    sicurezza, al funzionamento del sito e alla gestione di
                    eventuali anomalie;
                  </li>
                  <li>
                    i dati inviati tramite form o email per il tempo necessario a
                    gestire la richiesta e per l’ulteriore periodo compatibile
                    con esigenze organizzative e di tutela legale;
                  </li>
                  <li>
                    i dati relativi ad account o autenticazione per la durata del
                    rapporto con l’utente e successivamente per il tempo
                    necessario a obblighi di legge o esigenze di difesa;
                  </li>
                  <li>
                    in generale, i dati conservati nel database fino a richiesta
                    di cancellazione dell’interessato o per il tempo necessario
                    alle finalità del servizio, salvo ulteriori obblighi
                    normativi.
                  </li>
                </ul>
              </PolicyCard>

              <PolicyCard title="9. Diritti dell’interessato">
                <p>
                  L’interessato può esercitare i diritti previsti dagli artt.
                  15-22 GDPR, tra cui:
                </p>
                <ul>
                  <li>accesso ai dati personali;</li>
                  <li>rettifica dei dati inesatti;</li>
                  <li>cancellazione dei dati;</li>
                  <li>limitazione del trattamento;</li>
                  <li>opposizione al trattamento nei casi previsti;</li>
                  <li>portabilità dei dati, ove applicabile;</li>
                  <li>
                    revoca del consenso, ove il trattamento si basi sul consenso.
                  </li>
                </ul>
                <p>
                  L’interessato ha inoltre il diritto di proporre reclamo al
                  Garante per la protezione dei dati personali.
                </p>
              </PolicyCard>

              <PolicyCard title="10. Esercizio dei diritti">
                <p>
                  Per esercitare i propri diritti o richiedere informazioni sul
                  trattamento dei dati personali è possibile contattare:
                </p>
                <div className="policy-box">
                  <p>
                    <strong>Fun and School S.r.l.</strong>
                  </p>
                  <p>Viale Monte Nero 50</p>
                  <p>20135 Milano</p>
                  <p>
                    Email:{" "}
                    <a href="mailto:amministrazione@funandschool.com">
                      amministrazione@funandschool.com
                    </a>
                  </p>
                </div>
              </PolicyCard>

              <PolicyCard title="11. Modifiche alla presente informativa">
                <p>
                  La presente Privacy Policy può essere aggiornata in qualsiasi
                  momento, anche in considerazione di modifiche normative,
                  tecnologiche o organizzative. Gli utenti sono invitati a
                  consultarla periodicamente.
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

        .privacy-page * {
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