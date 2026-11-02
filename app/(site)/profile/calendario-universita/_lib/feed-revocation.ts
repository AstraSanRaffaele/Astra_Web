import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/admin-users-server";

export type RevokedCalendarFeed = { calendar_id: string; semester_end: string; revoked_at: string };

export async function readRevokedCalendarFeed(token: string): Promise<RevokedCalendarFeed | null> {
  const hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await createAdminClient().from("university_calendar_revoked_feeds")
    .select("calendar_id,semester_end,revoked_at").eq("feed_hash", hash).maybeSingle();
  if (error && !["PGRST205", "42P01"].includes(error.code)) throw error;
  return data as RevokedCalendarFeed | null;
}
