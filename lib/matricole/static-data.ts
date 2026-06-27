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

export type FreshersCarouselCta = {
  href: string;
  label: string;
};

export type FreshersCarouselItem = {
  title: string;
  description: string;
  imagePath: string;
  linkUrl?: string;
  ctas?: FreshersCarouselCta[];
  pdfPath?: string;
  pdfLabel?: string;
  displayOrder: number;
  isActive: boolean;
};

export type FreshersCourse = {
  slug: string;
  name: string;
  description: string;
  representatives: FreshersRepresentative[];
};

export type FreshersStandaloneCourse = FreshersCourse & {
  facultySlug: "specializzandi";
  facultyName: "Specializzandi";
};

export type FreshersFaculty = {
  slug: string;
  name: string;
  description: string;
  representatives: FreshersRepresentative[];
  courses: FreshersCourse[];
  color?: string;
};

const DEMO_COURSE_REPRESENTATIVES: FreshersRepresentative[] = [
  {
    firstName: "Nome",
    lastName: "Cognome",
    role: "Rappresentante del corso",
    email: "demo.corso@email.it",
  },
];

export const FRESHERS_PAGE = {
  title: "Matricole 2026 Università “Vita-Salute” San Raffaele",
  subtitle: "La tua nuova community universitaria inizia da qui.",
  welcomeText:
    "Ti accompagneremo passo dopo passo: dalla scelta della facoltà all’ingresso nella community del tuo corso.",
  description:
    "Scopri la nostra guida. Ti mostreremo contenuti, informazioni e strumenti pensati per aiutarti a orientarti e vivere al meglio i primi mesi all’università.",
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
    title: "Come accedo al gruppo WhatsApp ufficiale del mio corso?",
    description:
      "Il gruppo WhatsApp viene sbloccato dopo aver completato il percorso di onboarding. Seleziona la tua facoltà e segui i passaggi indicati: al termine troverai il link per entrare nella community del tuo corso.",
    imagePath: "carousel/whatsapp.webp",
    ctas: [{ href: "#facolta", label: "Scegli la tua facoltà" }],
    displayOrder: 1,
    isActive: true,
  },
  {
    title: "Come faccio a orientarmi nel campus?",
    description:
      "Scopri dove si trovano aule, biblioteche, mense, spazi studio e servizi universitari. Una guida pratica per muovere i primi passi e sentirti subito a casa nel tuo nuovo ambiente.",
    imagePath: "carousel/mail-universitaria.webp",
    pdfPath: "documents/guida-campus.pdf",
    pdfLabel: "Scarica la guida",
    displayOrder: 2,
    isActive: true,
  },
  {
    title: "Dove trovo il calendario delle lezioni?",
    description:
      "L’università pubblica online il calendario aggiornato delle lezioni. Consulta il portale ufficiale dell’Ateneo per verificare orari, aule e eventuali modifiche al programma.",
    imagePath: "carousel/rappresentanti.webp",
    ctas: [{ href: "https://orario.unisr.it/", label: "Apri il portale orari" }],
    displayOrder: 3,
    isActive: true,
  },
  {
    title: "Come posso trovare casa?",
    description:
      "Grazie alla collaborazione con partner immobiliari selezionati e ai consulenti esperti di CLEM, puoi ricevere supporto nella ricerca di un appartamento adatto alle tue esigenze! Entra anche nel gruppo WhatsApp dedicato!",
    imagePath: "carousel/calendario.webp",
    ctas: [
      { href: "https://www.clemilanodue.com/", label: "Sito CLEM" },
      { href: "https://chat.whatsapp.com/LglIs4r6eCuAt0jAjpV5Bd?mode=gi_t", label: "Gruppo WhatsApp SOS Casa" },
    ],
    displayOrder: 4,
    isActive: true,
  },
  {
    title: "Dove trovo gli sconti dedicati agli studenti?",
    description:
      "Esplora le convenzioni ASTRA disponibili per la community e approfitta di offerte esclusive su servizi, attività e prodotti utili durante il tuo percorso universitario",
    imagePath: "carousel/calendario.webp",
    ctas: [{ href: "https://www.astrasanraffaele.it/convenzioni", label: "Vai alle convenzioni" }],
    displayOrder: 5,
    isActive: true,
  },
  {
    title: "Come raggiungo l'università?",
    description:
      "Informazioni utili su trasporti pubblici, parcheggi, abbonamenti e agevolazioni per studenti.",
    imagePath: "carousel/calendario.webp",
    pdfPath: "documents/come-raggiungere-universita.pdf",
    pdfLabel: "Organizza il tuo viaggio",
    displayOrder: 6,
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
    color: "#2154C8",
    description:
      "Una formazione che integra didattica, ricerca e pratica clinica all’interno dell’IRCCS Ospedale San Raffaele. Un percorso innovativo e internazionale che prepara i futuri professionisti della salute attraverso un contatto diretto con l’assistenza e la ricerca fin dai primi anni.",
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
        name: "Cdl magistrale a ciclo unico in Medicina e Chirurgia",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Medicina e Chirurgia.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "international-medical-doctor-program",
        name: "International Medical Doctor Program",
        description:
          "Testo demo: qui verranno inserite le informazioni principali dell'International Medical Doctor Program.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "ricerca-biotecnologica-medicina",
        name: "Cdl triennale in Ricerca biotecnologica in medicina",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Ricerca biotecnologica in medicina.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "fisioterapia",
        name: "Cdl triennale in Fisioterapia",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Fisioterapia.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "igiene-dentale",
        name: "Cdl triennale in Igiene dentale",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Igiene dentale.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "infermieristica",
        name: "Cdl triennale in Infermieristica",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Infermieristica.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "ostetricia",
        name: "Cdl triennale in Ostetricia",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Ostetricia.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "osteopatia",
        name: "Cdl triennale in Osteopatia",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Osteopatia.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "tecniche-radiologia-medica-immagini-radioterapia",
        name: "Cdl triennale in Tecniche di Radiologia Medica per Immagini e Radioterapia",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Tecniche di Radiologia Medica per Immagini e Radioterapia.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "odontoiatria-protesi-dentaria",
        name: "Cdl magistrale in Odontoiatria e protesi dentaria",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Odontoiatria e protesi dentaria.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "biotechnology-innovative-therapeutics",
        name: "Cdl magistrale in Biotechnology for Innovative Therapeutics",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Biotechnology for Innovative Therapeutics.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "scienze-riabilitative-professioni-sanitarie",
        name: "Cdl magistrale in Scienze riabilitative delle professioni sanitarie",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Scienze riabilitative delle professioni sanitarie.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "scienze-infermieristiche-ostetriche",
        name: "Cdl magistrale in Scienze infermieristiche ed ostetriche",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Scienze infermieristiche ed ostetriche.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "health-informatics",
        name: "Cdl magistrale in Health Informatics",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Health Informatics.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
    ],
  },
  {
    slug: "psicologia",
    name: "Psicologia",
    color: "#D4820A",
    description:
      "Un percorso dedicato allo studio della mente, del comportamento e delle relazioni umane. Grazie a un approccio interdisciplinare che integra ricerca, neuroscienze e applicazioni cliniche, gli studenti sviluppano competenze scientifiche e professionali in un contesto innovativo e internazionale.",
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
        slug: "scienze-tecniche-psicologiche",
        name: "Cdl triennale in Scienze e tecniche psicologiche",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Scienze e tecniche psicologiche.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "scienze-politiche-strategie-globali",
        name: "Cdl triennale in Scienze politiche e strategie globali",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Scienze politiche e strategie globali.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "psicologia-magistrale",
        name: "Cdl magistrale in Psicologia",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea magistrale in Psicologia.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "cognitive-psychology-health-communication",
        name: "Cdl magistrale in Cognitive psychology in health communication",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Cognitive psychology in health communication.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "geopolitica-economia-strategie-globali",
        name: "Cdl magistrale in Geopolitica, economia e strategie globali",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Geopolitica, economia e strategie globali.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
    ],
  },
  {
    slug: "filosofia",
    name: "Filosofia",
    color: "#B83220",
    description:
      "Un percorso che sviluppa pensiero critico e capacità di analisi attraverso il dialogo tra filosofia, scienze e società contemporanea. Una formazione interdisciplinare che aiuta a comprendere le sfide del presente e a immaginare il futuro con consapevolezza e responsabilità.",
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
        slug: "filosofia-triennale",
        name: "Cdl triennale in Filosofia",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea triennale in Filosofia.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "filosofia-mondo-contemporaneo",
        name: "Cdl magistrale in Filosofia del mondo contemporaneo",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Filosofia del mondo contemporaneo.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "teoria-storia-arti-immagine",
        name: "Cdl magistrale in Teoria e storia delle arti e dell’immagine",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Teoria e storia delle arti e dell’immagine.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
      {
        slug: "politics-philosophy-public-affairs",
        name: "Cdl magistrale in Politics, Philosophy and Public Affairs",
        description:
          "Testo demo: qui verranno inserite le informazioni principali del corso di laurea in Politics, Philosophy and Public Affairs.",
        representatives: DEMO_COURSE_REPRESENTATIVES,
      },
    ],
  },
];

export const FRESHERS_STANDALONE_COURSES: FreshersStandaloneCourse[] = [
  {
    slug: "specializzandi",
    name: "Specializzandi",
    facultySlug: "specializzandi",
    facultyName: "Specializzandi",
    description:
      "Testo demo: qui verranno inserite le informazioni principali per gli specializzandi.",
    representatives: [
      {
        firstName: "Nome",
        lastName: "Cognome",
        role: "Rappresentante specializzandi",
        email: "demo.specializzandi@email.it",
      },
    ],
  },
];

export const FRESHERS_FACULTY_COURSES = FRESHERS_FACULTIES.flatMap((faculty) =>
  faculty.courses.map((course) => ({
    ...course,
    facultySlug: faculty.slug,
    facultyName: faculty.name,
  })),
);

export const FRESHERS_ALL_COURSES = [
  ...FRESHERS_FACULTY_COURSES,
  ...FRESHERS_STANDALONE_COURSES,
];

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

export function getFreshersStandaloneCourseBySlug(courseSlug: string) {
  return (
    FRESHERS_STANDALONE_COURSES.find((course) => course.slug === courseSlug) ??
    null
  );
}

export function isFreshersCourseSlugValid(courseSlug: string) {
  return FRESHERS_ALL_COURSES.some((course) => course.slug === courseSlug);
}