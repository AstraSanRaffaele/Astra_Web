# Calendario universitario UniSR

## Accesso e uso

La sezione `/profile/calendario-universita` si apre dal pulsante nella scheda calendario
sotto la panoramica account. Per ora tutti gli account confermati con profilo esistente
e ruolo `admin` possono usarla, indipendentemente dall’indirizzo email o dal
corso salvato nel profilo. Lo stesso controllo si applica alle API.

1. Scegli Medicina e Chirurgia e anno. La lettura parte dal giorno corrente in Italia.
2. Leggi il portale UniSR, scegli una delle linee rilevate per il corso in tutti gli anni e le attività
   senza linea da includere. L’anteprima mostra i prossimi sette giorni.
3. Crea il calendario: il periodo va automaticamente da oggi al 15 giugno successivo
   (incluso), senza chiedere date. Se il 15 giugno è già passato, usa l’anno seguente.
4. Attendi la prima lettura completa. Controlla anche le attività senza linea trovate
   nelle altre settimane e salva la selezione.
5. Per Apple, copia il link in **Calendario → File → Nuovo abbonamento calendario**
   su Mac, oppure usa il pulsante **Calendario Apple**.
6. Per Google, da un computer premi **Google Calendar**: il pulsante copia lo stesso
   link HTTPS e apre **Impostazioni → Aggiungi calendario → Da URL**. Incolla il link
   e premi **Aggiungi calendario**. Se la copia automatica non riesce, usa **Copia link**
   o seleziona manualmente il campo. Non usare l’importazione di un file statico.

È un abbonamento ICS, non un’importazione statica. Il link è personale: chi lo possiede
può leggerlo. Disattivare il calendario sospende il link; rigenerarlo revoca quello
precedente e richiede un nuovo abbonamento su Apple o Google. Entrambi gestiscono il
proprio intervallo di scaricamento; su Mac va scelto nelle impostazioni dell’abbonamento.

## Colori e scadenza

I colori distinguono le materie solo nell’anteprima ASTRA e nelle attività senza linea,
indipendentemente dal docente. Ogni account ha un unico calendario e un unico link
per Apple e Google: il feed non imposta colori e non offre abbonamenti per materia.
I vecchi URL con `?subject=...` restituiscono 404.
Le conferme e gli errori di copia compaiono accanto al pulsante usato.
L’avviso sull’aggiornamento automatico descrive lo stato reale del servizio.

Il 15 giugno è incluso. Dalla mezzanotte del 16 giugno (Europe/Rome), le API
nascondono i calendari scaduti, rifiutano le modifiche e interrompono i feed;
il worker non legge più UniSR per quei calendari. La cancellazione definitiva dal
database è affidata al job Supabase Cron `astra-university-calendar-cleanup`,
da attivare con il SQL fornito in chat, senza migration o query nella repo.

Il job controlla ogni ora e cancella i record con `semester_end` precedente alla
data corrente in Italia, incluse le sorgenti condivise, le sei annate e il progresso dell’importazione.
Il job elimina inoltre la propria cronologia più vecchia di sette giorni.
A mezzanotte del 16 giugno la condizione diventa vera anche se il giorno UTC
è ancora il 15 giugno. Il job è indipendente dall’aggiornamento alle 08:00, 12:00 e 18:00:
funziona anche con sincronizzazioni o calendari disattivati, senza chiamare Vercel.
I calendari con scadenza al 15 giugno dell’anno successivo vengono conservati.
Dal 16 giugno al 31 agosto inclusi il servizio è in pausa estiva. Il job di pulizia
imposta `university_calendar_sync_config.enabled = false` e disattiva il job di
aggiornamento `astra-university-calendar` tramite `cron.alter_job`, anche se non
ci sono record da cancellare. Non resta il controllo al minuto e non vengono più
inviate richieste automatiche a Vercel o a UniSR. Il job di pulizia resta attivo.
Pagina, API e worker bloccano nuove creazioni, anteprime, aggiornamenti e tentativi
nel periodo estivo; il worker verifica il limite prima di ogni blocco e alla fine.
Una richiesta UniSR già inviata può completarsi, ma il risultato non viene salvato
e non vengono avviati altri blocchi. Tutte le date usano Europe/Rome.

Dal 1° settembre la creazione di un calendario valido riattiva `enabled` e il job
`astra-university-calendar` nella stessa transazione, tramite il trigger
`university_calendar_source_after_change` e la funzione
`resume_university_calendar_sync_on_create`, da installare con il SQL fornito in chat.
La riattivazione funziona anche se il browser viene chiuso dopo la creazione.
Non parte al solo cambio di data: senza nuovi calendari il job resta fermo.
Il trigger respinge inserimenti estivi anche se non passano dalle API e richiede
la configurazione e il job già predisposti; un errore annulla l’intera creazione.
Il trigger non cambia l’accesso agli utenti: per ora restano abilitati solo gli admin.

L’eliminazione libera il limite di un calendario per account; un nuovo calendario
avrà un nuovo link. Gli abbonamenti e gli eventi eventualmente conservati dalle
app Apple e Google vanno rimossi nell’app: ASTRA non può cancellare l’abbonamento
remoto dell’utente.

## Pagina utenti e lancio

La pagina richiede un account confermato e un profilo esistente. Il valore `locked`
non impedisce l’accesso agli admin, coerentemente con le altre sezioni amministrative.
Il pulsante **Crea il tuo calendario** è attivo per tutti gli admin. Gli utenti ordinari
iscritti a Medicina e Chirurgia vedono la scheda con il pulsante disabilitato e
**Prossimamente**; gli altri utenti ordinari non vedono la scheda.
Il flag condiviso `PUBLIC_CALENDAR_ENABLED` in `lib/university-calendar/config.ts`
è `false`: impedisce anche letture, anteprime e creazioni degli utenti ordinari tramite
richieste dirette. Gli admin usano la stessa pagina e le stesse API personali.
La precedente pagina e le API dedicate sotto `/admin` sono state rimosse.

Quando il servizio sarà abilitato, ogni utente vedrà e gestirà soltanto i calendari
associati al proprio account. Il server ricava il proprietario dalla sessione e filtra
ogni lettura e modifica per `owner_id`; nessun identificativo inviato dal browser può
cambiare proprietario. È previsto un solo calendario per account, anche per l’admin. Le verifiche manuali leggono la copia condivisa e non avviano nuove letture UniSR. La creazione usa una funzione SQL con limite e
idempotenza nella stessa transazione, anche con richieste simultanee da più schede.
Un indice univoco su `owner_id` applica il limite anche nel database. Il calendario
può essere modificato per cambiare corso, anno e linea mantenendo il proprio link.
Ogni creazione o modifica dei filtri ricalcola il periodo automatico sul server;
le date eventualmente inviate dal browser non sono usate.

## Attivazione online

La sincronizzazione condivisa è compatibile con Vercel Hobby e Supabase Pro.
La capacità per il lancio pubblico va misurata sul progetto effettivo.
Il progetto usa già `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
e `SUPABASE_SERVICE_ROLE_KEY`: quest’ultima deve essere configurata su Vercel
esclusivamente come variabile server, senza prefisso `NEXT_PUBLIC_`.

1. Nel SQL Editor del progetto Supabase collegato, con ruolo `postgres`, incollare
   il codice SQL completo fornito in chat. Le query non sono salvate nella repo.
   Gli account admin devono essere confermati, con profilo presente e ruolo `admin`.
   Se esistono più calendari per un account, il codice si interrompe senza cancellarli:
   occorre scegliere quale conservare prima di applicare il limite di uno.
2. Pubblicare il codice su Vercel. Installare anche il trigger per la riattivazione
   alla creazione e il job di pulizia annuale forniti in chat.
3. Verificare il dominio `site_url` della configurazione prima di creare calendari:
   dal 1° settembre la prima creazione abilita il servizio e il job automaticamente. Non abilita il lancio pubblico: il pulsante utenti
   resta disabilitato per gli utenti ordinari; gli admin possono accedere dal profilo.

4. Accedere con un account admin, aprire il calendario dal profilo, leggere gli orari, scegliere anno e linea e
   creare il calendario. Attendere l’importazione completa e controllare il link con
   Calendario Apple o Google Calendar.
5. Verificare in Supabase Cron che il job `astra-university-calendar` sia attivo,
   che `last_synced_at` nella tabella `university_calendar_sources` avanzi e che `sync_error` resti vuoto. `last_dispatch_at`
   indica l’invio della richiesta, non il suo successo. Gli esiti HTTP si trovano
   in `net._http_response`; non esportare l’header di autorizzazione dai log.

Verificare anche il job `astra-university-calendar-cleanup`: la cancellazione dopo
il 15 giugno diventa operativa soltanto dopo aver eseguito il relativo SQL in chat.

Per sospendere subito gli aggiornamenti: impostare `enabled = false` nella configurazione.
Una nuova creazione durante il periodo attivo li riabilita automaticamente.
I link continuano a servire l’ultima versione completa. Per annullare anche il job:
`select cron.unschedule('astra-university-calendar');`.

Le tabelle hanno RLS abilitata e nessuna policy per `anon`/`authenticated`.
Solo il server con `service_role` le consulta dopo l’autorizzazione, oppure mediante
il token casuale del singolo abbonamento. Il dispatcher usa un segreto casuale separato,
conservato in una tabella non accessibile ai client. Non servono nuove chiavi pubbliche.
L’autorizzazione e il limite per utente sono già predisposti. Il lancio pubblico
resta disabilitato; prima di abilitarlo verificare la capacità della sincronizzazione e il carico dei feed pubblici.

## Lettura e aggiornamenti

Il sito ufficiale espone una pagina HTML ASP pubblica. I filtri devono essere inviati
con POST; includono `lezioni=ok` ed escludono `esami`. I due codici ufficiali per ogni
corso vengono consultati perché UniSR suddivide le coorti in record con nomi uguali.
La risposta è decodificata come Windows-1252, salvo un charset esplicito.
Data, corso, struttura e completezza della risposta sono verificati prima dell’importazione.
L’anteprima interroga `ANNO_CORSO=0` (tutti gli anni) per proporre tutte le linee
pubblicate del corso nei prossimi sette giorni, mentre mostra solo le lezioni dell’anno
scelto. La sincronizzazione del calendario continua a leggere soltanto quell’anno.

Gli orari sono condivisi per corso, non importati per ogni persona. Le due voci
ufficiali del corso vengono consultate con `ANNO_CORSO=0`: una lettura comprende
 tutti gli anni e tutte le linee. Esistono al massimo tre importazioni attive.
`university_calendar_sources` conserva periodo, avanzamento, errori e lease;
`university_calendar_source_years` contiene sei copie pubblicate, una per anno.
I record personali conservano filtri e token, senza duplicare le lezioni. API e feed
leggono solo l’anno necessario; l’anteprima legge dalla cache i prossimi sette giorni.
Una prima anteprima può scaldare la cache per quel corso. Le anteprime simultanee
condividono la lease; una risposta 202 indica di attendere il blocco già in corso.

La prima creazione prepara la sorgente e riattiva il servizio. Poi gli aggiornamenti
partono alle **08:00, 12:00 e 18:00 Europe/Rome**, rispettando l’ora legale.
`next_university_calendar_refresh` calcola il prossimo orario italiano. Il job controlla
una volta al minuto e invia al massimo una richiesta per corso disponibile, solo
se ci sono calendari attivi e lavoro dovuto. Un avvio puntuale non equivale a una
pubblicazione istantanea: ogni importazione procede fino al 15 giugno in blocchi
di massimo 24 giornate, quattro lette contemporaneamente, entro il budget della
richiesta. Il dispatcher prosegue i blocchi al minuto fino al completamento.

La pubblicazione delle sei annate è atomica. Durante una lettura o un guasto continua
a funzionare l’ultima copia completa. Il worker salva solo con la lease valida;
un errore conserva il progresso e programma un tentativo dopo dieci minuti.
I vecchi link mantengono i propri dati fino alla prima pubblicazione condivisa;
solo allora vengono rimosse le copie personali precedenti. Un risultato vuoto
confermato elimina correttamente le lezioni cancellate. Le richieste personali di
verifica, le modifiche dei filtri e lo scaricamento ICS non rileggono UniSR.
Il browser controlla il progresso iniziale ogni 15 secondi e non esegue worker.

Il feed ICS conserva gli UID quando cambia l’aula o l’orario della stessa lezione.
Le lezioni includono anno, linea, docente, aula, edificio e link originali. Usa
Europe/Rome e propone alle app un intervallo di consultazione di quattro ore,
coerente con il più breve intervallo tra due avvii; Apple e Google scelgono comunque
quando scaricare il link.

Il periodo automatico può coprire fino a 366 giorni inclusi: il vincolo sulle date
del database deve consentire una differenza massima di 365 giorni, tramite la query
fornita in chat.

Prima del lancio pubblico verificare il carico dei feed e i tempi effettivi delle importazioni condivise. Il limite personale
di creazione è già applicato nella funzione SQL.

## Verifiche

`npm run test:calendar` verifica i dati reali UniSR salvati come fixture, i filtri,
l’esclusione degli esami, il formato ICS, gli UID e la conservazione del feed durante
import parziali/falliti. Comprende anche l’accesso degli admin, il lancio futuro per gli studenti,
il blocco del lancio e l’isolamento dei calendari tra utenti.
Controllare inoltre TypeScript, lint della sezione e build di produzione.
Le query del database, il job e l’abbonamento Apple richiedono una verifica sul servizio effettivo.

Riferimenti: [orari UniSR](https://orario.unisr.it/),
[Supabase Cron](https://supabase.com/docs/guides/cron),
[pg_net](https://supabase.com/docs/guides/database/extensions/pg_net),
[limiti Vercel Cron](https://vercel.com/docs/cron-jobs/usage-and-pricing),
[abbonamenti Apple](https://support.apple.com/it-it/guide/calendar/icl1022/mac),
[abbonamenti Google](https://support.google.com/calendar/answer/37100?hl=it).
