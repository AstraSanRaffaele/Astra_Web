import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { createAdminClient } from "@/lib/admin-users-server";
import { calendarClient } from "./feed-usage-types";

type FeedAccess = { calendarId: string; token: string; method: string; userAgent: string | null; status: number };

// Aggregate requests after the response. A monitoring outage must never interrupt
// a subscription. Neither the secret URL, raw IPs nor device identifiers are stored.
export function trackCalendarFeedRequest(access: FeedAccess) {
  if (access.method !== "GET" && access.method !== "HEAD") return;
  const args = {
    requested_calendar: access.calendarId,
    requested_feed_hash: createHash("sha256").update(access.token).digest("hex"),
    requested_client: calendarClient(access.userAgent),
    requested_method: access.method,
    requested_status: access.status,
  };
  try {
    after(async () => {
      try {
        await createAdminClient().rpc("record_university_calendar_feed_request", args).abortSignal(AbortSignal.timeout(2000));
      } catch { /* Missing activation or unavailable metrics cannot block the feed. */ }
    });
  } catch { /* Keep the feed available even without a background execution context. */ }
}
