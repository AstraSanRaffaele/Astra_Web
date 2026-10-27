type GuideCalendar = { id: string; enabled: boolean; last_synced_at: string | null };
type GuideStorage = Pick<Storage, "getItem" | "setItem">;

function storageKey(id: string) { return `astra:calendar-guide:${id}`; }

export function queueSubscriptionGuide(id: string, storage: GuideStorage | null) {
  try { storage?.setItem(storageKey(id), "pending"); } catch { /* The in-memory ID still works when storage is unavailable. */ }
}

export function markSubscriptionGuideSeen(id: string, storage: GuideStorage | null) {
  try { storage?.setItem(storageKey(id), "seen"); } catch { /* A blocked browser store must not block the calendar. */ }
}

export function calendarReadyForGuide(calendars: readonly GuideCalendar[], pendingId: string | null, storage: GuideStorage | null): string | null {
  for (const calendar of calendars) {
    if (!calendar.enabled || !calendar.last_synced_at) continue;
    if (calendar.id === pendingId) return calendar.id;
    try { if (storage?.getItem(storageKey(calendar.id)) === "pending") return calendar.id; } catch { /* The manual help button remains available. */ }
  }
  return null;
}
