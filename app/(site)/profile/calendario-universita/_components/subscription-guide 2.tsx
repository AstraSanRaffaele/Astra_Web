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

  return <section id={id} ref={panel} hidden={!open} className={styles.guide} aria-labelledby={`${id}-title`} onKeyDown={(event) => {
    if (event.key === "Escape") { event.stopPropagation(); onClose(); }
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
        <li><strong>Apri il link con Calendario Apple</strong><p>Premi <b>Calendario Apple</b> nella tua scheda. Se non si apre, copia il link e vai in <b>Calendario → Calendari → Aggiungi calendario → Aggiungi calendario con iscrizione</b>.</p></li>
        <li><strong>Aggiungi l’iscrizione</strong><p>Incolla il link e prosegui con <b>Trova</b> o <b>Iscriviti</b>, in base alla versione del sistema. Scegli <b>iCloud</b> come account, se disponibile, e conferma con <b>Fine</b> o <b>Aggiungi</b>.</p></li>
        <li><strong>Controlla la frequenza disponibile</strong><p>Apri <b>Impostazioni → App → Calendario → Account Calendario → Scarica nuovi dati</b>. Se l’account usa <b>Scarica</b>, cerca la frequenza nella sezione Scarica della stessa schermata. Nelle versioni precedenti, Calendario si trova direttamente in Impostazioni.</p></li>
      </ol>
      <div className={styles.frequency}><Clock3 size={18} aria-hidden="true" /><div><strong>{CALENDAR_APP_REFRESH_HOURS} ore, se il dispositivo lo consente</strong><p>Se c’è un intervallo selezionabile, scegli {CALENDAR_APP_REFRESH_HOURS} ore o quello più vicino sotto le {CALENDAR_APP_REFRESH_HOURS} ore. Se non compare per l’iscrizione, l’aggiornamento è gestito dal sistema.</p><small>La frequenza di scaricamento può riguardare anche altri account del dispositivo.</small></div></div>
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

    <p className={styles.footer}>ASTRA legge UniSR dal lunedì al venerdì alle <b>08:00, 12:00 e 18:00</b>, in orario italiano. La ricezione nelle app segue i loro tempi. Usa l’abbonamento al link: l’importazione di un file salva solo una copia degli eventi.</p>
  </section>;
}
