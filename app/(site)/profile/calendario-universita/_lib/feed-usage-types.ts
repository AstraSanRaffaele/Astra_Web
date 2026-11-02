export type CalendarClient = "apple" | "google" | "browser" | "other";

export function calendarTrafficLevel(peakDailyRequests: number): "ordinary" | "attention" | "high" {
  return peakDailyRequests >= 200 ? "high" : peakDailyRequests > 9 ? "attention" : "ordinary";
}

export function calendarClient(userAgent: string | null): CalendarClient {
  const value = (userAgent ?? "").slice(0, 1024);
  if (/google[- _]?calendar|calendar[- _]?importer|feedfetcher-google/i.test(value)) return "google";
  if (/calendaragent|calaccessd|dataaccessd|apple[- _]?calendar|calendarstore|ical\//i.test(value)) return "apple";
  if (/mozilla\/|chrome\/|safari\/|firefox\/|edg\//i.test(value)) return "browser";
  return "other";
}

export type CalendarUsageRow = {
  calendarId: string;
  feedHash: string;
  ownerName: string;
  ownerEmail: string;
  name: string;
  course: string;
  year: number;
  line: string;
  currentLink: boolean;
  enabled: boolean;
  revoked: boolean;
  peakDailyRequests: number;
  requests: number;
  downloads: number;
  unchanged: number;
  headRequests: number;
  errors: number;
  lastSeen: string;
  clients: Record<CalendarClient, number>;
};

export type CalendarUsageReport = {
  since: string;
  days: 1 | 7;
  page: number;
  pageSize: number;
  totalLinks: number;
  totalRequests: number;
  attentionLinks: number;
  highTrafficLinks: number;
  rows: CalendarUsageRow[];
};
