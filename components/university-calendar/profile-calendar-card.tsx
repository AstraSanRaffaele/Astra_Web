import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";
import { PUBLIC_CALENDAR_PATH } from "@/lib/university-calendar/config";
import { canUseCalendar, isMedicineCalendarProfile, type CalendarProfile } from "@/lib/university-calendar/eligibility";
import styles from "./profile-calendar-card.module.css";

export default function ProfileCalendarCard({ profile }: { profile: CalendarProfile | null }) {
  if (profile?.role !== "admin" && !isMedicineCalendarProfile(profile)) return null;
  const enabled = canUseCalendar(profile);
  return <section className={styles.card} aria-labelledby="profile-calendar-title">
    <div className={styles.heading}><CalendarDays size={22} aria-hidden="true" /><span>{enabled ? profile?.role === "admin" ? "Anteprima admin" : "Per i tuoi studi" : "Prossimamente"}</span></div>
    <h2 id="profile-calendar-title">Le lezioni nel tuo calendario</h2>
    <p>Scegli corso, anno e linea di Medicina. Ritrova gli orari UniSR in Calendario Apple o Google Calendar.</p>
    {enabled
      ? <Link className={styles.button} href={PUBLIC_CALENDAR_PATH}>Crea il tuo calendario <ArrowRight size={16} aria-hidden="true" /></Link>
      : <button className={styles.button} type="button" disabled aria-describedby="profile-calendar-coming-soon">Crea il tuo calendario <ArrowRight size={16} aria-hidden="true" /></button>}
    {!enabled && <small id="profile-calendar-coming-soon">Il servizio sarà disponibile qui appena sarà pronto.</small>}
  </section>;
}
