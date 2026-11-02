import "server-only";
import { createClient } from "@/lib/supabase/server";

type Account = { email?: string | null; email_confirmed_at?: string | null };

export function isCalendarUsageOwner(user: Account | null | undefined) {
  return Boolean(user?.email_confirmed_at && user.email?.trim().toLowerCase() === "scopeledoardo@gmail.com");
}

export async function getCalendarUsageOwner() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  return !error && user && isCalendarUsageOwner(user) ? { userId: user.id } : null;
}
