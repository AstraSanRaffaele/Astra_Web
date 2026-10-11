# Calendario universitario UniSR

## Accesso e uso

La sezione `/admin/calendario-universita` è riservata all’account verificato
`scopeledoardo@gmail.com`, con ruolo `admin` già presente in `profiles`.
Lo stesso controllo si applica alle API: nascondere il collegamento non è l’unica protezione.

1. Scegli Medicina e Chirurgia, anno e una settimana con lezioni.
2. Leggi il portale UniSR, scegli la linea rilevata e le attività senza linea da includere.
3. Indica le date effettive dell’intero semestre, fino a 214 giorni, e crea il calendario.
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

## Pagina utenti e lancio

La pagina `/profile/calendario-universita` richiede un account confermato con profilo
esistente, non bloccato e iscritto a Medicina e Chirurgia. Il controllo usa il corso
salvato nel profilo; gli altri corsi della facoltà di Medicina non sono abilitati. Solo il profilo di un iscritto a Medicina e Chirurgia contiene una scheda con il pulsante **Crea il tuo
calendario**, attualmente disabilitato e accompagnato da **Prossimamente**.
Il flag condiviso `PUBLIC_CALENDAR_ENABLED` in `lib/university-calendar/config.ts`
è `false`: impedisce anche letture, anteprime e creazioni tramite le API utenti,
mentre la sezione admin resta disponibile all’account proprietario.

Quando il servizio sarà abilitato, ogni utente vedrà e gestirà soltanto i calendari
associati al proprio account. Il server ricava il proprietario dalla sessione e filtra
ogni lettura e modifica per `owner_id`; nessun identificativo inviato dal browser può
cambiare proprietario. È previsto un solo calendario per account, anche per l’admin, e cinque
minuti tra aggiornamenti manuali. La creazione usa una funzione SQL con limite e
idempotenza nella stessa transazione, anche con richieste simultanee da più schede.
Un indice univoco su `owner_id` applica il limite anche nel database. Il calendario
può essere modificato per cambiare anno, linea e semestre mantenendo il proprio link.

## Attivazione online

Non è necessario cambiare i piani Vercel Hobby e Supabase Pro.
Il progetto usa già `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
e `SUPABASE_SERVICE_ROLE_KEY`: quest’ultima deve essere configurata su Vercel
esclusivamente come variabile server, senza prefisso `NEXT_PUBLIC_`.

1. Nel SQL Editor del progetto Supabase collegato, con ruolo `postgres`, incollare
   il codice SQL completo fornito in chat. Le query non sono salvate nella repo.
   L’account proprietario deve essere confermato, con profilo presente e ruolo `admin`.
   Se esistono più calendari per un account, il codice si interrompe senza cancellarli:
   occorre scegliere quale conservare prima di applicare il limite di uno.
2. Pubblicare il codice su Vercel. Al primo avvio gli aggiornamenti sono disattivati.
3. Dopo aver verificato dominio e pagina pubblicata, eseguire la query di attivazione
   fornita separatamente in chat. Non abilita il lancio pubblico: il pulsante utenti
   resta disabilitato.

4. Accedere con l’account autorizzato, creare una prova breve con lezioni note e
   controllare il link con Calendario Apple. Creare poi il semestre desiderato.
5. Verificare in Supabase Cron che il job `astra-university-calendar` sia attivo,
   che `last_synced_at` avanzi e che `sync_error` resti vuoto. `last_dispatch_at`
   indica l’invio della richiesta, non il suo successo. Gli esiti HTTP si trovano
   in `net._http_response`; non esportare l’header di autorizzazione dai log.

Per sospendere gli aggiornamenti: impostare `enabled = false` nella configurazione.
I link continuano a servire l’ultima versione completa. Per annullare anche il job:
`select cron.unschedule('astra-university-calendar');`.

Le tabelle hanno RLS abilitata e nessuna policy per `anon`/`authenticated`.
Solo il server con `service_role` le consulta dopo l’autorizzazione, oppure mediante
il token casuale del singolo abbonamento. Il dispatcher usa un segreto casuale separato,
conservato in una tabella non accessibile ai client. Non servono nuove chiavi pubbliche.
L’autorizzazione e il limite per utente sono già predisposti. Il lancio pubblico
resta disabilitato; prima di abilitarlo verificare la capacità della sincronizzazione
e la cache condivisa UniSR descritta sotto.

## Lettura e aggiornamenti

Il sito ufficiale espone una pagina HTML ASP pubblica. I filtri devono essere inviati
con POST; includono `lezioni=ok` ed escludono `esami`. I due codici ufficiali per ogni
corso vengono consultati perché UniSR suddivide le coorti in record con nomi uguali.
La risposta è decodificata come Windows-1252, salvo un charset esplicito.
Data, corso, struttura e completezza della risposta sono verificati prima dell’importazione.

Ogni calendario conserva le lezioni di tutte le linee del corso/anno per l’intero
semestre. Il feed applica la linea e le attività senza linea selezionate.
Il primo import e ogni aggiornamento successivo procedono in blocchi di massimo
otto giorni, con due giornate lette contemporaneamente e richieste brevi.
Il job Supabase controlla una volta al minuto se esiste lavoro da completare:
effettua chiamate HTTP solo quando un import è in corso o un calendario è scaduto.
Ogni ciclo completo è programmato tre ore dopo l’inizio del precedente.
La pagina può completare gli import anche prima dell’attivazione del dispatcher.

Una lease e l’aggiornamento condizionato al suo token proteggono da esecuzioni
concorrenti o obsolete. Solo una lettura completa sostituisce il feed precedente.
In caso di errore si conserva il progresso e si riprova dopo dieci minuti; dopo
un’interruzione del processo la lease scade dopo novanta secondi.

Non essendoci identificativi pubblici UniSR, gli UID sono sintetici: stabili quando
una singola lezione cambia ora/aula nello stesso giorno; un cambio di giorno/titolo/docente
viene rappresentato rimuovendo l’evento precedente e aggiungendone uno nuovo.
La sostituzione dell’intera fotografia rimuove anche le lezioni cancellate.
I file ICS includono Europe/Rome e le regole dell’ora legale.

Per la futura versione pubblica, condividere la cache delle giornate UniSR tra
calendari e verificare il volume di chiamate prima del lancio. Il limite personale
di creazione è già applicato nella funzione SQL.

## Verifiche

`npm run test:calendar` verifica i dati reali UniSR salvati come fixture, i filtri,
l’esclusione degli esami, il formato ICS, gli UID e la conservazione del feed durante
import parziali/falliti. Comprende anche il controllo dell’account proprietario, dell’accesso degli studenti,
il blocco del lancio e l’isolamento dei calendari tra utenti.
Controllare inoltre TypeScript, lint della sezione e build di produzione.
Migrazioni, job e abbonamento Apple richiedono una verifica sul servizio effettivo.

Riferimenti: [orari UniSR](https://orario.unisr.it/),
[Supabase Cron](https://supabase.com/docs/guides/cron),
[pg_net](https://supabase.com/docs/guides/database/extensions/pg_net),
[limiti Vercel Cron](https://vercel.com/docs/cron-jobs/usage-and-pricing),
[abbonamenti Apple](https://support.apple.com/it-it/guide/calendar/icl1022/mac),
[abbonamenti Google](https://support.google.com/calendar/answer/37100?hl=it).
