import { getCanonicalDegreeValue } from "@/lib/profile-options";
import { COURSES } from "./types";

export type CalendarProfile = {
  facolta?: string | null;
  corso_di_laurea?: string | null;
};

export function isMedicineCalendarProfile(profile?: CalendarProfile | null) {
  const degree = getCanonicalDegreeValue(profile?.corso_di_laurea).trim().toLocaleLowerCase("it-IT");
  return profile?.facolta === "medicina" &&
    (degree === "medicina_e_chirurgia" || degree === "cdl magistrale a ciclo unico in medicina e chirurgia" ||
      COURSES.some((course) => course.label.toLocaleLowerCase("it-IT") === degree));
}
