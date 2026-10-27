"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, Clock3, ExternalLink, Monitor, Smartphone, X } from "lucide-react";
import { CALENDAR_APP_REFRESH_HOURS } from "../_lib/config";
import styles from "./subscription-guide.module.css";

type Platform = "mac" | "ios" | "google";

export default function SubscriptionGuide({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const [platform, setPlatform] = useState<Platform>("mac");
  const panel = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    heading.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [open]);

  return <section id={id} ref={panel} className={`${styles.guide} ${!open ? styles.mobileCollapsed : ""}`} aria-labelledby={`${id}-title`} onKeyDown={(event) => {
    if (event.key === "Escape" && window.matchMedia("(max-width: 820px)").matches) { event.stopPropagation(); onClose(); }
  }}>
    <div className={styles.heading}>
      <div><span className={styles.eyebrow}><BookOpen size={14} aria-hidden="true" /> Guida all’abbonamento</span><h3 id={`${id}-title`} ref={heading} tabIndex={-1}>Come aggiungere il calendario</h3><p>Scegli dove vuoi vedere le tue lezioni.</p></div>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Chiudi la guida"><X size={18} aria-hidden="true" /></button>
    </div>

    <div className={styles.platforms} role="group" aria-label="App o dispositivo">
      <button type="button" aria-pressed={platform === "mac"} onClick={() => setPlatform("mac")}><Monitor size={16} aria-hidden="true" /> Apple · Mac</button>
      <button type="button" aria-pressed={platform === "ios"} onClick={() => setPlatform("ios")}><Smartphone size={16} aria-hidden="true" /> iPhone / iPad</button>
      <button type="button" aria-pressed={platform === "google"} onClick={() => setPlatform("google")}><CalendarDays size={16} aria-hidden="true" /> Google</button>
    </div>

    {platform === "mac" && <div className={styles.content}>
      <ol className={styles.steps}>
        <li><strong>Apri Calendario Apple</strong><p>Premi <b>Calendario Apple</b> nella scheda del calendario. In alternativa, copia il link e apri Calendario sul Mac: <b>File → Nuovo abbonamento calendario</b>.</p></li>
        <li><strong>Conferma l’abbonamento</strong><p>Controlla il link e premi <b>Iscriviti</b>. Scegli <b>iCloud</b> come posizione per ritrovarlo anche sugli altri dispositivi Apple con lo stesso account.</p></li>
        <li><strong>Scegli quando aggiornarlo</strong><p>Nel menu <b>Aggiornamento automatico</b>, scegli <b>ogni {CALENDAR_APP_REFRESH_HOURS} ore</b> se disponibile. Altrimenti seleziona l’intervallo più vicino sotto le {CALENDAR_APP_REFRESH_HOURS} ore, per esempio <b>ogni ora</b>, e conferma con <b>OK</b>.</p></li>
      </ol>
      <div className={styles.frequency}><Clock3 size={18} aria-hidden="true" /><div><strong>Hai già aggiunto il calendario?</strong><p>Fai clic destro sul suo nome in Calendario e scegli <b>Ottieni informazioni</b>: puoi modificare lì l’aggiornamento automatico.</p></div></div>
      <a className={styles.support} href="https://support.apple.com/it-it/guide/calendar/icl1024/mac" target="_blank" rel="noreferrer">Istruzioni Apple <ExternalLink size={13} aria-hidden="true" /></a>
    </div>}

    {platform === "ios" && <div className={styles.content}>
      <ol className={styles.steps}>
        <li><strong>Copia il link e apri Calendario</strong><p>Nella tua scheda ASTRA, tocca <b>Copia link</b>. Poi apri l’app <b>Calendario</b>.</p></li>
        <li><strong>Apri l’elenco Calendari</strong><p>Tocca il pulsante <b>Calendari</b>. Su iPhone lo trovi in basso: nella vista annuale è l’icona a forma di piccolo calendario, accanto alla casella delle entrate.</p></li>
        <li><strong>Scegli “Aggiungi calendario con iscrizione”</strong><p>Scorri fino in fondo all’elenco e tocca <b>Aggiungi calendario</b>. Nel menu che si apre, scegli <b>Aggiungi calendario con iscrizione</b>.</p></li>
        <li><strong>Incolla il link e scegli iCloud</strong><p>Incolla il link nel campo dell’indirizzo. Puoi personalizzare <b>Nome evento</b>, per esempio con “Lezioni UniSR”. Tocca <b>Account</b> e scegli <b>iCloud</b> per ritrovare il calendario sugli altri dispositivi Apple con lo stesso account.</p></li>
        <li><strong>Salva con la spunta in alto a destra</strong><p>Quando compare l’anteprima delle lezioni, tocca la <b>spunta rossa ✓</b> in alto a destra. Nell’elenco Calendari, verifica che il tuo calendario sia selezionato e riporti <b>Iscrizione effettuata</b>.</p></li>
      </ol>
      <div className={styles.frequency}><Clock3 size={18} aria-hidden="true" /><div><strong>{CALENDAR_APP_REFRESH_HOURS} ore, se il dispositivo lo consente</strong><p>La frequenza si controlla separatamente in <b>Impostazioni → App → Calendario → Account Calendario → Scarica nuovi dati</b>. Se l’account usa <b>Scarica</b>, cerca la frequenza nella sezione Scarica.</p><p>Se c’è un intervallo selezionabile, scegli {CALENDAR_APP_REFRESH_HOURS} ore o quello più vicino sotto le {CALENDAR_APP_REFRESH_HOURS} ore. Se non compare per l’iscrizione, l’aggiornamento è gestito dal sistema.</p><small>La frequenza di scaricamento può riguardare anche altri account del dispositivo. Nelle versioni precedenti, Calendario si trova direttamente in Impostazioni.</small></div></div>
      <div className={styles.sources}><a className={styles.support} href="https://support.apple.com/it-it/102301" target="_blank" rel="noreferrer">Aggiungere il calendario <ExternalLink size={13} aria-hidden="true" /></a><a className={styles.support} href="https://support.apple.com/it-it/guide/iphone/iphc37be2016/ios" target="_blank" rel="noreferrer">Impostazioni Apple <ExternalLink size={13} aria-hidden="true" /></a></div>
    </div>}

    {platform === "google" && <div className={styles.content}>
      <ol className={styles.steps}>
        <li><strong>Usa Google Calendar da un computer</strong><p>Premi <b>Google Calendar</b> nella scheda del calendario: copiamo il link e apriamo la pagina <b>Da URL</b>. Se la copia non riesce, usa <b>Copia link</b>.</p></li>
        <li><strong>Incolla il link in “Da URL”</strong><p>Se devi cercare la voce, apri <b>Altri calendari → + → Da URL</b>. Incolla il link e premi <b>Aggiungi calendario</b>.</p></li>
        <li><strong>Ritrovalo anche sul telefono</strong><p>Nell’app Google Calendar usa lo stesso account e verifica che il nuovo calendario sia selezionato nell’elenco.</p></li>
      </ol>
      <div className={`${styles.frequency} ${styles.googleFrequency}`}><Clock3 size={18} aria-hidden="true" /><div><strong>La frequenza è gestita da Google</strong><p>Per i calendari aggiunti tramite URL non puoi impostare {CALENDAR_APP_REFRESH_HOURS} ore né scegliere un intervallo diverso. Google decide quando rileggere il link: le variazioni possono comparire dopo l’aggiornamento di ASTRA.</p></div></div>
      <a className={styles.support} href="https://support.google.com/calendar/answer/37100?hl=it" target="_blank" rel="noreferrer">Istruzioni Google <ExternalLink size={13} aria-hidden="true" /></a>
    </div>}

  </section>;
}
