export type ProfileOption = {
  value: string;
  label: string;
};

export const FACULTY_OPTIONS: ProfileOption[] = [
  { value: "medicina", label: "Medicina" },
  { value: "psicologia", label: "Psicologia" },
  { value: "filosofia", label: "Filosofia" },
];

export const DEGREE_OPTIONS: Record<string, ProfileOption[]> = {
  medicina: [
    {
      value: "medicina_e_chirurgia",
      label: "Cdl magistrale a ciclo unico in Medicina e Chirurgia",
    },
    {
      value: "international_medical_doctor_program",
      label: "International Medical Doctor Program",
    },
    {
      value: "ricerca_biotecnologica_in_medicina",
      label: "Cdl triennale in Ricerca biotecnologica in medicina",
    },
    { value: "fisioterapia", label: "Cdl triennale in Fisioterapia" },
    { value: "igiene_dentale", label: "Cdl triennale in Igiene dentale" },
    {
      value: "odontoiatria_e_protesi_dentaria",
      label: "Cdl magistrale in Odontoiatria e protesi dentaria",
    },
    {
      value: "biotechnology_for_innovative_therapeutics",
      label: "Cdl magistrale in Biotechnology for Innovative Therapeutics",
    },
    {
      value: "scienze_riabilitative_delle_professioni_sanitarie",
      label: "Cdl magistrale in Scienze riabilitative delle professioni sanitarie",
    },
    { value: "ostetricia", label: "Cdl triennale in Ostetricia" },
    { value: "health_informatics", label: "Cdl magistrale in Health Informatics" },
    {
      value: "scienze_infermieristiche_ed_ostetriche",
      label: "Cdl magistrale in Scienze infermieristiche ed ostetriche",
    },
    { value: "infermieristica", label: "Cdl triennale in Infermieristica" },
    { value: "osteopatia", label: "Cdl triennale in Osteopatia" },
    {
      value: "tecniche_di_radiologia_medica_per_immagini_e_radioterapia",
      label: "CdL triennale in Tecniche di Radiologia Medica per Immagini e Radioterapia",
    },
  ],
  psicologia: [
    {
      value: "scienze_e_tecniche_psicologiche",
      label: "Cdl triennale in Scienze e tecniche psicologiche",
    },
    {
      value: "scienze_politiche_e_strategie_globali",
      label: "Cdl triennale in Scienze politiche e strategie globali",
    },
    { value: "psicologia", label: "Cdl magistrale in Psicologia" },
    {
      value: "cognitive_psychology_in_health_communication",
      label: "Cdl magistrale in Cognitive psychology in health communication",
    },
    {
      value: "geopolitica_economia_e_strategie_globali",
      label: "Cdl magistrale in Geopolitica, economia e strategie globali",
    },
  ],
  filosofia: [
    { value: "filosofia", label: "Cdl triennale in Filosofia" },
    {
      value: "filosofia_del_mondo_contemporaneo",
      label: "Cdl magistrale in Filosofia del mondo contemporaneo",
    },
    {
      value: "teoria_e_storia_delle_arti_e_dell_immagine",
      label: "Cdl magistrale in Teoria e storia delle arti e dell’immagine",
    },
    {
      value: "politics_philosophy_and_public_affairs",
      label: "Cdl magistrale in Politics, Philosophy and Public Affairs",
    },
  ],
};

export const GRADUATION_YEAR_OPTIONS: ProfileOption[] = Array.from(
  { length: 2040 - 2020 + 1 },
  (_, index) => {
    const year = 2040 - index;
    return { value: String(year), label: String(year) };
  },
);

const DEGREE_LABELS = new Map(
  Object.values(DEGREE_OPTIONS)
    .flat()
    .flatMap((option) => [
      [option.value, option.label] as const,
      [option.label, option.label] as const,
    ]),
);

const LEGACY_DEGREE_ALIASES: Record<string, string> = {
  filosofia_triennale: "filosofia",
};

export function getCanonicalDegreeValue(value?: string | null) {
  if (!value) return "";
  const legacyValue = LEGACY_DEGREE_ALIASES[value];
  if (legacyValue) return legacyValue;

  const matchingOption = Object.values(DEGREE_OPTIONS)
    .flat()
    .find((option) => option.value === value || option.label === value);

  return matchingOption?.value ?? value;
}

export function getFacultyLabel(value?: string | null) {
  if (!value) return "Non indicata";
  return FACULTY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getDegreeLabel(value?: string | null) {
  if (!value) return "Corso non indicato";
  const canonicalValue = getCanonicalDegreeValue(value);
  return DEGREE_LABELS.get(canonicalValue) ?? DEGREE_LABELS.get(value) ?? value.replaceAll("_", " ");
}

export function getDegreeOptions(faculty?: string | null, currentValue?: string | null) {
  const options = [...(DEGREE_OPTIONS[faculty ?? ""] ?? [])];
  const canonicalCurrentValue = getCanonicalDegreeValue(currentValue);

  if (
    currentValue &&
    currentValue !== canonicalCurrentValue &&
    !options.some((option) => option.value === currentValue)
  ) {
    options.unshift({
      value: currentValue,
      label: `${getDegreeLabel(currentValue)} (valore precedente)`,
    });
  } else if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.unshift({ value: currentValue, label: getDegreeLabel(currentValue) });
  }

  return options;
}
