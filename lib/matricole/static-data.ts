

export type FreshersRepresentative = {
  firstName: string;
  lastName: string;
  role?: string;
  email: string;
};

export type FreshersInfoBox = {
  title: string;
  description: string;
};

export type FreshersCarouselItem = {
  title: string;
  description: string;
  imagePath: string;
  linkUrl?: string;
  displayOrder: number;
  isActive: boolean;
};

export type FreshersCourse = {
  slug: string;
  name: string;
  description: string;
  representatives: FreshersRepresentative[];
};

export type FreshersFaculty = {
  slug: string;
  name: string;
  description: string;
  representatives: FreshersRepresentative[];
  courses: FreshersCourse[];
};

export const FRESHERS_PAGE = {
  title: "Benvenute matricole",
  subtitle: "La tua nuova community universitaria inizia da qui.",
  welcomeText:
    "Testo demo: qui verrà inserito il messaggio di benvenuto per le matricole.",
  description:
    "Testo demo: questa pagina accompagnerà gli studenti nei primi passaggi, dalla scelta della facoltà fino al gruppo WhatsApp del corso.",
  infoBoxes: [
    {
      title: "Scegli la tua facoltà",
      description:
        "Testo demo: qui lo studente verrà guidato verso la facoltà corretta.",
    },
    {
      title: "Trova il tuo corso",
      description:
        "Testo demo: qui verranno mostrati i corsi di laurea disponibili per ogni facoltà.",
    },
    {
      title: "Contatta i rappresentanti",
      description:
        "Testo demo: qui verranno indicati i contatti utili e le prime informazioni per orientarsi.",
    },
    {
      title: "Accedi al gruppo WhatsApp dopo il login",
      description:
        "Testo demo: questa sezione accompagnerà gli studenti verso il gruppo WhatsApp del corso.",
    },
  ] satisfies FreshersInfoBox[],
};

export const FRESHERS_CAROUSEL_ITEMS: FreshersCarouselItem[] = [
  {
    title: "Come accedere al gruppo WhatsApp",
    description:
      "Testo demo: qui verrà spiegato che il gruppo WhatsApp è accessibile solo dopo il login.",
    imagePath: "carousel/whatsapp.webp",
    displayOrder: 1,
    isActive: true,
  },
  {
    title: "Controlla la mail universitaria",
    description:
      "Testo demo: qui verrà ricordato agli studenti di controllare la mail universitaria.",
    imagePath: "carousel/mail-universitaria.webp",
    displayOrder: 2,
    isActive: true,
  },
  {
    title: "Salva i contatti dei rappresentanti",
    description:
      "Testo demo: qui verranno indicati i riferimenti utili dei rappresentanti.",
    imagePath: "carousel/rappresentanti.webp",
    displayOrder: 3,
    isActive: true,
  },
  {
    title: "Consulta il calendario delle lezioni",
    description:
      "Testo demo: qui verrà indicato dove consultare il calendario delle lezioni.",
    imagePath: "carousel/calendario.webp",
    displayOrder: 4,
    isActive: true,
  },
].sort((a, b) => a.displayOrder - b.displayOrder);

export const FRESHERS_ACTIVE_CAROUSEL_ITEMS = FRESHERS_CAROUSEL_ITEMS.filter(
  (item) => item.isActive,
);

export const FRESHERS_FACULTIES: FreshersFaculty[] = [
  {
    slug: "medicina",
    name: "Medicina",
    description:
      "Testo demo: qui verrà spiegata brevemente la Facoltà di Medicina.",
    representatives: [
      {
        firstName: "Nome",
        lastName: "Cognome",
        role: "Rappresentante di facoltà",
        email: "demo.medicina@email.it",
      },
    ],
    courses: [
      {
        slug: "medicina-chirurgia",
        name: "Medicina e Chirurgia",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea.",
        representatives: [
          {
            firstName: "Nome",
            lastName: "Cognome",
            role: "Rappresentante del corso",
            email: "demo.medicina.chirurgia@email.it",
          },
        ],
      },
    ],
  },
  {
    slug: "psicologia",
    name: "Psicologia",
    description:
      "Testo demo: qui verrà spiegata brevemente la Facoltà di Psicologia.",
    representatives: [
      {
        firstName: "Nome",
        lastName: "Cognome",
        role: "Rappresentante di facoltà",
        email: "demo.psicologia@email.it",
      },
    ],
    courses: [
      {
        slug: "psicologia",
        name: "Psicologia",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea.",
        representatives: [
          {
            firstName: "Nome",
            lastName: "Cognome",
            role: "Rappresentante del corso",
            email: "demo.corso.psicologia@email.it",
          },
        ],
      },
    ],
  },
  {
    slug: "filosofia",
    name: "Filosofia",
    description:
      "Testo demo: qui verrà spiegata brevemente la Facoltà di Filosofia.",
    representatives: [
      {
        firstName: "Nome",
        lastName: "Cognome",
        role: "Rappresentante di facoltà",
        email: "demo.filosofia@email.it",
      },
    ],
    courses: [
      {
        slug: "filosofia",
        name: "Filosofia",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea.",
        representatives: [
          {
            firstName: "Nome",
            lastName: "Cognome",
            role: "Rappresentante del corso",
            email: "demo.corso.filosofia@email.it",
          },
        ],
      },
    ],
  },
];

export const FRESHERS_ALL_COURSES = FRESHERS_FACULTIES.flatMap((faculty) =>
  faculty.courses.map((course) => ({
    ...course,
    facultySlug: faculty.slug,
    facultyName: faculty.name,
  })),
);

export function getFreshersFacultyBySlug(slug: string) {
  return FRESHERS_FACULTIES.find((faculty) => faculty.slug === slug) ?? null;
}

export function getFreshersCourseBySlug(facultySlug: string, courseSlug: string) {
  const faculty = getFreshersFacultyBySlug(facultySlug);

  if (!faculty) {
    return null;
  }

  const course =
    faculty.courses.find((facultyCourse) => facultyCourse.slug === courseSlug) ??
    null;

  if (!course) {
    return null;
  }

  return {
    ...course,
    facultySlug: faculty.slug,
    facultyName: faculty.name,
  };
}

export function isFreshersCourseSlugValid(courseSlug: string) {
  return FRESHERS_ALL_COURSES.some((course) => course.slug === courseSlug);
}