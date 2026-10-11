import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCalendarOwner } from "@/lib/university-calendar/server";
import UniversityCalendar from "./university-calendar";

export const metadata: Metadata = {
  title: "Calendario universitario | Admin ASTRA",
  robots: { index: false, follow: false },
};

export default async function UniversityCalendarPage() {
  if (!(await getCalendarOwner())) redirect("/admin");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <UniversityCalendar today={today} />;
}
