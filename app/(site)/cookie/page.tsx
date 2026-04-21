

export default function CookiePage() {
  return (
    <main className="min-h-screen bg-white text-[#08102A]">
      <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="mb-10 border-b border-slate-200 pb-6">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-[#0F2F6E]">
              Informativa cookie
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Cookie Policy
            </h1>
            <p className="mt-4 text-sm text-slate-600 sm:text-base">
              Ultimo aggiornamento: 21 Aprile 2026
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-base">
              La presente Cookie Policy descrive l’uso dei cookie e di strumenti
              analoghi da parte del sito https://www.astrasanraffaele.it/.
            </p>
          </div>

          <div className="space-y-10 text-sm leading-7 text-slate-700 sm:text-base">
            <section>
              <h2 className="text-xl font-semibold sm:text-2xl">
                1. Cosa sono i cookie
              </h2>
              <p className="mt-4">
                I cookie sono piccoli file di testo che i siti visitati
                dall’utente inviano al suo dispositivo, dove vengono memorizzati
                per essere poi ritrasmessi agli stessi siti alla visita
                successiva. Possono essere utilizzati anche altri strumenti di
                tracciamento con finalità analoghe.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold sm:text-2xl">
                2. Titolare del trattamento
              </h2>
              <div className="mt-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <p className="font-semibold">Fun and School S.r.l.</p>
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
            </section>

            <section>
              <h2 className="text-xl font-semibold sm:text-2xl">
                3. Tipologie di cookie e strumenti utilizzati
              </h2>
              <div className="mt-4 space-y-6">
                <div>
                  <h3 className="font-semibold text-[#0F2F6E]">
                    a) Cookie tecnici e strettamente necessari
                  </h3>
                  <p className="mt-2">
                    Il sito utilizza cookie o strumenti tecnici necessari al
                    funzionamento dell’applicazione web, alla sicurezza, alla
                    gestione della sessione e all’eventuale autenticazione
                    utente.
                  </p>
                  <p className="mt-2">Possono includere:</p>
                  <ul className="mt-3 list-disc pl-6 space-y-2">
                    <li>cookie di sessione;</li>
                    <li>cookie di sicurezza;</li>
                    <li>token tecnici per login e autenticazione;</li>
                    <li>strumenti per mantenere la sessione;</li>
                    <li>preferenze tecniche necessarie.</li>
                  </ul>
                  <p className="mt-2">
                    Per questa categoria non è richiesto il consenso.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-[#0F2F6E]">
                    b) Cookie legati ad autenticazione e aree riservate
                  </h3>
                  <p className="mt-2">
                    Se il sito utilizza autenticazione tramite Supabase, possono
                    essere impiegati cookie o strumenti equivalenti per
                    identificare l’utente autenticato e mantenere attiva la
                    sessione.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-[#0F2F6E]">
                    c) Cookie analitici
                  </h3>
                  <p className="mt-2">
                    Il sito, allo stato, non utilizza cookie analitici non
                    anonimizzati o strumenti di statistica che richiedano il
                    consenso dell’utente.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-[#0F2F6E]">
                    d) Cookie di profilazione o marketing
                  </h3>
                  <p className="mt-2">
                    Il sito non utilizza cookie di profilazione o marketing.
                    Eventuali strumenti futuri saranno attivati solo previo
                    consenso.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold sm:text-2xl">
                4. Base giuridica
              </h2>
              <p className="mt-4">
                I cookie tecnici si basano sulla necessità di fornire il servizio
                richiesto e sul legittimo interesse del Titolare. I cookie non
                tecnici si basano sul consenso dell’utente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold sm:text-2xl">
                5. Gestione del consenso
              </h2>
              <div className="mt-4 space-y-4">
                <p>
                  Se il sito utilizza solo cookie tecnici, non è necessario il
                  banner di consenso.
                </p>
                <p>
                  In caso di utilizzo futuro di cookie non tecnici, sarà
                  implementato un banner che consenta all’utente di accettare,
                  rifiutare o personalizzare le preferenze.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold sm:text-2xl">
                6. Cookie di terze parti
              </h2>
              <p className="mt-4">
                Il sito può utilizzare fornitori tecnici terzi (hosting,
                database, autenticazione, email). Eventuali cookie installati
                saranno trattati secondo la loro funzione tecnica o, se non
                tecnici, previo consenso.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold sm:text-2xl">
                7. Come disabilitare i cookie
              </h2>
              <p className="mt-4">
                L’utente può gestire i cookie tramite le impostazioni del
                browser. La disabilitazione dei cookie tecnici può compromettere
                il funzionamento del sito.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold sm:text-2xl">
                8. Aggiornamenti
              </h2>
              <p className="mt-4">
                La presente Cookie Policy può essere aggiornata nel tempo. Gli
                utenti sono invitati a consultarla periodicamente.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}