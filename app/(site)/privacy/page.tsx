export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-[#08102A]">
      <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="mb-10 border-b border-slate-200 pb-6">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-[#0F2F6E]">
              Informativa privacy
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-sm text-slate-600 sm:text-base">
              Ultimo aggiornamento: 21 Aprile 2026
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-base">
              La presente informativa è resa ai sensi degli artt. 13 e 14 del
              Regolamento (UE) 2016/679 (“GDPR”) agli utenti che interagiscono
              con il sito https://www.astrasanraffaele.it/.
            </p>
          </div>

          <div className="space-y-10 text-sm leading-7 text-slate-700 sm:text-base">
            <section>
              <h2 className="text-xl font-semibold text-[#08102A] sm:text-2xl">
                1. Titolare del trattamento
              </h2>
              <div className="mt-4 space-y-4">
                <p>
                  Il sito astrasanraffaele.it fa riferimento al progetto ASTRA
                  San Raffaele. Poiché ASTRA San Raffaele non opera come soggetto
                  giuridico autonomo, il trattamento dei dati personali connesso
                  alla gestione del sito, dei servizi digitali e delle richieste
                  ricevute tramite i canali di contatto è effettuato da:
                </p>
                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="font-semibold text-[#08102A]">
                    Fun and School S.r.l.
                  </p>
                  <p>Viale Monte Nero 50</p>
                  <p>20135 Milano</p>
                  <p>P. IVA / C.F. 10543900962</p>
                  <p>
                    Email:{" "}
                    <a
                      href="mailto:amministrazione@funandschool.com"
                      className="font-medium text-[#0F2F6E] underline underline-offset-4"
                    >
                      amministrazione@funandschool.com
                    </a>
                  </p>
                </div>
                <p>Di seguito, il “Titolare”.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#08102A] sm:text-2xl">
                2. Tipologie di dati trattati
              </h2>
              <div className="mt-4 space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F2F6E] sm:text-lg">
                    a) Dati di navigazione
                  </h3>
                  <p className="mt-2">
                    I sistemi informatici e le procedure software preposte al
                    funzionamento del sito acquisiscono, nel corso del loro
                    normale esercizio, alcuni dati la cui trasmissione è
                    implicita nell’uso dei protocolli Internet.
                  </p>
                  <p className="mt-2">Tra questi possono rientrare:</p>
                  <ul className="mt-3 list-disc space-y-2 pl-6 marker:text-[#0F2F6E]">
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
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[#0F2F6E] sm:text-lg">
                    b) Dati forniti volontariamente dall’utente
                  </h3>
                  <p className="mt-2">
                    L’invio facoltativo e volontario di messaggi tramite form,
                    email o altri recapiti indicati sul sito comporta
                    l’acquisizione dei dati di contatto del mittente e dei dati
                    contenuti nella comunicazione.
                  </p>
                  <p className="mt-2">A titolo esemplificativo:</p>
                  <ul className="mt-3 list-disc space-y-2 pl-6 marker:text-[#0F2F6E]">
                    <li>nome e cognome;</li>
                    <li>indirizzo email;</li>
                    <li>numero di telefono;</li>
                    <li>contenuto del messaggio;</li>
                    <li>
                      eventuali altri dati inseriti dall’utente nei form o nelle
                      richieste.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[#0F2F6E] sm:text-lg">
                    c) Dati relativi all’utilizzo di aree riservate o
                    funzionalità autenticata
                  </h3>
                  <p className="mt-2">
                    Qualora il sito preveda funzionalità con autenticazione
                    utente, possono essere trattati dati necessari alla gestione
                    dell’accesso, della sessione e della sicurezza dell’account,
                    inclusi identificativi tecnici e dati collegati
                    all’autenticazione tramite Supabase.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#08102A] sm:text-2xl">
                3. Finalità del trattamento e base giuridica
              </h2>
              <div className="mt-4 space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F2F6E] sm:text-lg">
                    a) Funzionamento tecnico del sito e sicurezza
                  </h3>
                  <p className="mt-2">
                    Per consentire il funzionamento del sito, l’erogazione delle
                    pagine e dei servizi richiesti, la gestione
                    dell’infrastruttura tecnica, il monitoraggio della
                    sicurezza, la prevenzione di accessi abusivi e la protezione
                    dell’applicazione.
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-[#08102A]">
                      Base giuridica:
                    </span>{" "}
                    legittimo interesse del Titolare al corretto funzionamento e
                    alla sicurezza del sito (art. 6, par. 1, lett. f GDPR).
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[#0F2F6E] sm:text-lg">
                    b) Gestione dei form e delle richieste inviate dagli utenti
                  </h3>
                  <p className="mt-2">
                    Per ricevere, registrare e gestire richieste di informazioni,
                    candidature, contatti o altre comunicazioni inviate dagli
                    utenti attraverso i form del sito o i recapiti indicati.
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-[#08102A]">
                      Base giuridica:
                    </span>{" "}
                    esecuzione di misure precontrattuali adottate su richiesta
                    dell’interessato e/o legittimo interesse del Titolare a
                    riscontrare le richieste ricevute (art. 6, par. 1, lett. b e
                    f GDPR).
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[#0F2F6E] sm:text-lg">
                    c) Gestione di eventuali account o accessi autenticati
                  </h3>
                  <p className="mt-2">
                    Per consentire l’autenticazione, la gestione della sessione,
                    l’accesso ad aree riservate e la corretta fruizione di
                    funzionalità personalizzate.
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-[#08102A]">
                      Base giuridica:
                    </span>{" "}
                    esecuzione del servizio richiesto dall’utente e legittimo
                    interesse del Titolare alla sicurezza e continuità del
                    servizio (art. 6, par. 1, lett. b e f GDPR).
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[#0F2F6E] sm:text-lg">
                    d) Adempimento di obblighi di legge
                  </h3>
                  <p className="mt-2">
                    Per adempiere a obblighi previsti da normative applicabili,
                    regolamenti o richieste dell’autorità.
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-[#08102A]">
                      Base giuridica:
                    </span>{" "}
                    obbligo legale (art. 6, par. 1, lett. c GDPR).
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[#0F2F6E] sm:text-lg">
                    e) Accertamento, esercizio o difesa di diritti
                  </h3>
                  <p className="mt-2">
                    Per gestire eventuali contestazioni o contenziosi e tutelare
                    i diritti del Titolare.
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-[#08102A]">
                      Base giuridica:
                    </span>{" "}
                    legittimo interesse del Titolare (art. 6, par. 1, lett. f
                    GDPR).
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#08102A] sm:text-2xl">
                4. Modalità del trattamento
              </h2>
              <p className="mt-4">
                Il trattamento è effettuato con strumenti informatici e
                telematici, secondo principi di liceità, correttezza,
                trasparenza, minimizzazione e sicurezza. Il Titolare adotta
                misure tecniche e organizzative adeguate a proteggere i dati da
                accessi non autorizzati, perdita, alterazione o divulgazione
                indebita.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#08102A] sm:text-2xl">
                5. Conferimento dei dati
              </h2>
              <div className="mt-4 space-y-4">
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
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#08102A] sm:text-2xl">
                6. Destinatari dei dati
              </h2>
              <div className="mt-4 space-y-4">
                <p>
                  I dati personali possono essere trattati da soggetti
                  autorizzati dal Titolare e da fornitori di servizi che
                  supportano la gestione del sito e dei servizi digitali, tra
                  cui:
                </p>
                <ul className="list-disc space-y-2 pl-6 marker:text-[#0F2F6E]">
                  <li>fornitori di hosting e infrastruttura cloud;</li>
                  <li>fornitori di servizi database e autenticazione;</li>
                  <li>fornitori di servizi email e SMTP;</li>
                  <li>consulenti tecnici, amministrativi o legali;</li>
                  <li>
                    soggetti cui la comunicazione sia dovuta per obbligo di
                    legge.
                  </li>
                </ul>
                <p>
                  In relazione alla struttura tecnica dichiarata del sito, i dati
                  possono essere trattati tramite servizi erogati da:
                </p>
                <ul className="list-disc space-y-2 pl-6 marker:text-[#0F2F6E]">
                  <li>Vercel per hosting e infrastruttura cloud;</li>
                  <li>Supabase per database PostgreSQL e autenticazione;</li>
                  <li>Aruba per l’invio email tramite SMTP.</li>
                </ul>
                <p>
                  Tali soggetti operano, a seconda dei casi, come responsabili
                  del trattamento o autonomi titolari.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#08102A] sm:text-2xl">
                7. Trasferimento dei dati verso Paesi terzi
              </h2>
              <p className="mt-4">
                L’utilizzo di fornitori tecnologici può comportare il
                trasferimento di dati personali verso Paesi situati al di fuori
                dello Spazio Economico Europeo. In tali casi, il trasferimento
                avverrà nel rispetto degli artt. 44 e ss. GDPR, mediante
                decisioni di adeguatezza, clausole contrattuali standard o altre
                garanzie previste dalla normativa applicabile.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#08102A] sm:text-2xl">
                8. Periodo di conservazione
              </h2>
              <div className="mt-4 space-y-4">
                <p>
                  I dati personali sono conservati per il tempo strettamente
                  necessario alle finalità per cui sono raccolti e, comunque:
                </p>
                <ul className="list-disc space-y-2 pl-6 marker:text-[#0F2F6E]">
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
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#08102A] sm:text-2xl">
                9. Diritti dell’interessato
              </h2>
              <div className="mt-4 space-y-4">
                <p>
                  L’interessato può esercitare i diritti previsti dagli artt.
                  15-22 GDPR, tra cui:
                </p>
                <ul className="list-disc space-y-2 pl-6 marker:text-[#0F2F6E]">
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
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#08102A] sm:text-2xl">
                10. Esercizio dei diritti
              </h2>
              <div className="mt-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <p>
                  Per esercitare i propri diritti o richiedere informazioni sul
                  trattamento dei dati personali è possibile contattare:
                </p>
                <div className="mt-4 space-y-1">
                  <p className="font-semibold text-[#08102A]">
                    Fun and School S.r.l.
                  </p>
                  <p>Viale Monte Nero 50</p>
                  <p>20135 Milano</p>
                  <p>
                    Email:{" "}
                    <a
                      href="mailto:amministrazione@funandschool.com"
                      className="font-medium text-[#0F2F6E] underline underline-offset-4"
                    >
                      amministrazione@funandschool.com
                    </a>
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#08102A] sm:text-2xl">
                11. Modifiche alla presente informativa
              </h2>
              <p className="mt-4">
                La presente Privacy Policy può essere aggiornata in qualsiasi
                momento, anche in considerazione di modifiche normative,
                tecnologiche o organizzative. Gli utenti sono invitati a
                consultarla periodicamente.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
