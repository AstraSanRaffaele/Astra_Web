import { getCanonicalDegreeValue } from "@/lib/profile-options";
import { COURSES } from "./types";
import { PUBLIC_CALENDAR_ENABLED } from "./config";

export type CalendarProfile = {
  facolta?: string | null;
  corso_di_laurea?: string | null;
  role?: string | null;
  locked?: boolean | null;
};

export function isMedicineCalendarProfile(profile?: CalendarProfile | null) {
  const degree = getCanonicalDegreeValue(profile?.corso_di_laurea).trim().toLocaleLowerCase("it-IT");
  return profile?.facolta === "medicina" &&
    (degree === "medicina_e_chirurgia" || degree === "cdl magistrale a ciclo unico in medicina e chirurgia" ||
      COURSES.some((course) => course.label.toLocaleLowerCase("it-IT") === degree));
}

export function canUseCalendar(profile?: CalendarProfile | null) {
  return Boolean(profile &&
    (profile.role === "admin" || (PUBLIC_CALENDAR_ENABLED && !profile.locked && isMedicineCalendarProfile(profile))));
}
