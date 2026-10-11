import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalendarUser } from "@/lib/university-calendar/server";
import { PUBLIC_CALENDAR_PATH } from "@/lib/university-calendar/config";
import CalendarBuilder from "@/components/university-calendar/calendar-builder";

export const metadata: Metadata = {
  title: "Il tuo calendario universitario | ASTRA",
  robots: { index: false, follow: false },
};

export default async function PersonalUniversityCalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(PUBLIC_CALENDAR_PATH)}`);
  const actor = await getCalendarUser();
  if (!actor) redirect("/profile");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <CalendarBuilder today={today} isAdmin={actor.isAdmin} />;
}
