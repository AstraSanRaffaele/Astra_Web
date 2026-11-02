import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeedUsageMonitor from "@/app/(site)/profile/calendario-universita/_components/feed-usage-monitor";
import { isCalendarUsageOwner } from "@/app/(site)/profile/calendario-universita/_lib/feed-usage-owner";

export const metadata: Metadata = { title: "Accessi calendario | ASTRA Admin", robots: { index: false, follow: false } };

export default async function CalendarUsagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/accessi-calendario");
  if (!isCalendarUsageOwner(user)) redirect("/profile");
  return <FeedUsageMonitor />;
}
