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
  subtitle: "La tua nuova community universitaria inizia da qui",
  welcomeText:
    "Ti accompagneremo passo dopo passo: dalla scelta della facoltà all’ingresso nella community del tuo corso.",
  description:
    "Scopri la nostra guida. Ti mostreremo contenuti, informazioni e strumenti pensati per aiutarti a orientarti e vivere al meglio i primi mesi all’università.",
  infoBoxes: [
    {
      title: "Scegli la tua facoltà",
      description:
        "",
    },
    {
      title: "Trova il tuo corso",
      description:
        "",
    },
    {
      title: "Contatta i rappresentanti",
      description:
        "",
    },
    {
      title: "Accedi al gruppo WhatsApp dopo il login",
      description:
        "",
    },
  ] satisfies FreshersInfoBox[],
};

export const FRESHERS_CAROUSEL_ITEMS: FreshersCarouselItem[] = [
  {
    title: "Come accedo al gruppo WhatsApp ufficiale del mio corso?",
    description:
      "Il gruppo WhatsApp viene sbloccato dopo aver completato il percorso di onboarding. Seleziona la tua facoltà e segui i passaggi indicati: al termine troverai il link per entrare nella community del tuo corso.",
    imagePath: "documents/carosello/whatsapp.webp",
    ctas: [{ href: "#facolta", label: "Scegli la tua facoltà" }],
    displayOrder: 1,
    isActive: true,
  },
  {
    title: "Come faccio a orientarmi nel campus?",
    description:
      "Scopri dove si trovano aule, biblioteche, mense, spazi studio e servizi universitari. Una guida pratica per muovere i primi passi e sentirti subito a casa nel tuo nuovo ambiente.",
    imagePath: "documents/carosello/campus.webp",
    pdfPath: "documents/guida-campus.pdf",
    pdfLabel: "Scarica la guida",
    displayOrder: 6,
    isActive: true,
  },
  {
    title: "Dove trovo il calendario delle lezioni?",
    description:
      "L’università pubblica online il calendario aggiornato delle lezioni. Consulta il portale ufficiale dell’Ateneo per verificare orari, aule e eventuali modifiche al programma.",
    imagePath: "documents/carosello/calendario.webp",
    ctas: [{ href: "https://orario.unisr.it/", label: "Apri il portale orari" }],
    displayOrder: 2,
    isActive: true,
  },
  {
    title: "Come posso trovare casa?",
    description:
      "Grazie alla collaborazione con partner immobiliari selezionati e ai consulenti esperti di CLEM, puoi ricevere supporto nella ricerca di un appartamento adatto alle tue esigenze! Entra anche nel gruppo WhatsApp dedicato!",
    imagePath: "documents/carosello/casa.webp",
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
    imagePath: "documents/carosello/sconti.webp",
    ctas: [{ href: "https://www.astrasanraffaele.it/convenzioni", label: "Vai alle convenzioni" }],
    displayOrder: 3,
    isActive: true,
  },
  {
    title: "Come raggiungo l'università?",
    description:
      "Informazioni utili su trasporti pubblici, parcheggi, abbonamenti e agevolazioni per studenti.",
    imagePath: "documents/carosello/trasporti.webp",
    pdfPath: "documents/come-raggiungere-universita.pdf",
    pdfLabel: "Organizza il tuo viaggio",
    displayOrder: 5,
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
        firstName: "Paolo",
        lastName: "Abete",
        role: "Senato Accademico",
        email: "p.abete@studenti.unisr.it",
      },
      {
        firstName: "Simone",
        lastName: "Manzo",
        role: "Senato Accademico",
        email: "s.manzo@studenti.unisr.it",
      },
      {
        firstName: "Flavio",
        lastName: "Errante",
        role: "Consiglio di Facoltà",
        email: "f.errante@studenti.unisr.it",
      },
      {
        firstName: "Carlotta",
        lastName: "Minzera",
        role: "Consiglio di Facoltà",
        email: "c.minzera@studenti.unisr.it",
      },
    ],
    courses: [
      {
        slug: "medicina-chirurgia",
        name: "Cdl magistrale a ciclo unico in Medicina e Chirurgia",
        description:
          "",
        representatives: [
          {
            firstName: "Alberto",
            lastName: "Carluccio",
            email: "a.carluccio3@studenti.unisr.it",
          },
          {
            firstName: "Sabina",
            lastName: "Castronovo",
            email: "s.castronovo@studenti.unisr.it",
          },
          {
            firstName: "Flavio",
            lastName: "Cammarata",
            email: "f.cammarata@studenti.unisr.it",
          },
          {
            firstName: "Elvira Paola",
            lastName: "Tricarico",
            email: "e.tricarico1@studenti.unisr.it",
          },
          {
            firstName: "Giulia Claudia",
            lastName: "Porcu",
            email: "g.porcu3@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "international-medical-doctor-program",
        name: "International Medical Doctor Program",
        description:
          "",
        representatives: [
          {
            firstName: "Mirko",
            lastName: "Romito",
            email: "m.romito1@studenti.unisr.it",
          },
          {
            firstName: "Carlotta",
            lastName: "Minzera",
            email: "c.minzera@studenti.unisr.it",
          },
          {
            firstName: "Alessandro",
            lastName: "Aresu",
            email: "a.aresu1@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "ricerca-biotecnologica-medicina",
        name: "Cdl triennale in Ricerca biotecnologica in medicina",
        description:
          "",
        representatives: [
          {
            firstName: "Paola",
            lastName: "Lavorato",
            email: "p.lavorato@studenti.unisr.it",
          },
          {
            firstName: "Francesca Caterina",
            lastName: "Inguscio",
            email: "f.inguscio@studenti.unisr.it",
          },
          {
            firstName: "Beatrice",
            lastName: "Straniero",
            email: "b.straniero@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "fisioterapia",
        name: "Cdl triennale in Fisioterapia",
        description:
          "",
        representatives: [
          {
            firstName: "Alessandro",
            lastName: "Guarnieri",
            email: "a.guarnieri1@studenti.unisr.it",
          },
          {
            firstName: "Giacomo",
            lastName: "Lippolis",
            email: "g.lippolis@studenti.unisr.it",
          },
          {
            firstName: "Beatrice",
            lastName: "Rainis",
            email: "b.rainis@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "igiene-dentale",
        name: "Cdl triennale in Igiene dentale",
        description:
          "",
        representatives: [
          {
            firstName: "Martina",
            lastName: "Moscatello",
            email: "m.moscatello@studenti.unisr.it",
          },
          {
            firstName: "Gianmarco",
            lastName: "Baiardi",
            email: "g.baiardi1@studenti.unisr.it",
          },
          {
            firstName: "Riccardo",
            lastName: "Vinci",
            email: "r.vinci2@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "infermieristica",
        name: "Cdl triennale in Infermieristica",
        description:
          "",
        representatives: [
          {
            firstName: "Andrea Aurora",
            lastName: "Cavallari",
            email: "a.cavallari@studenti.unisr.it",
          },
          {
            firstName: "Andrea",
            lastName: "Caccamo",
            email: "a.caccamo@studenti.unisr.it",
          },
          {
            firstName: "Paolo",
            lastName: "Favale",
            email: "p.favale@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "ostetricia",
        name: "Cdl triennale in Ostetricia",
        description:
          "",
        representatives: [],
      },
      {
        slug: "osteopatia",
        name: "Cdl triennale in Osteopatia",
        description:
          "",
        representatives: [],
      },
      {
        slug: "tecniche-radiologia-medica-immagini-radioterapia",
        name: "Cdl triennale in Tecniche di Radiologia Medica per Immagini e Radioterapia",
        description:
          "",
        representatives: [],
      },
      {
        slug: "odontoiatria-protesi-dentaria",
        name: "Cdl magistrale in Odontoiatria e protesi dentaria",
        description:
          "",
        representatives: [
          {
            firstName: "Anna",
            lastName: "Rustichini",
            email: "a.rustichini@studenti.unisr.it",
          },
          {
            firstName: "Mario",
            lastName: "Diana",
            email: "m.diana2@studenti.unisr.it",
          },
          {
            firstName: "Enrico",
            lastName: "Levi",
            email: "e.levi@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "biotechnology-innovative-therapeutics",
        name: "Cdl magistrale in Biotechnology for Innovative Therapeutics",
        description:
          "",
        representatives: [
          {
            firstName: "Michela",
            lastName: "Agostini",
            email: "m.agostini@studenti.unisr.it",
          },
          {
            firstName: "Joelle",
            lastName: "Bassal",
            email: "j.bassal@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "scienze-riabilitative-professioni-sanitarie",
        name: "Cdl magistrale in Scienze riabilitative delle professioni sanitarie",
        description:
          "",
        representatives: [
          {
            firstName: "Pietro",
            lastName: "Medico",
            email: "p.medico@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "scienze-infermieristiche-ostetriche",
        name: "Cdl magistrale in Scienze infermieristiche ed ostetriche",
        description:
          "",
        representatives: [],
      },
      {
        slug: "health-informatics",
        name: "Cdl magistrale in Health Informatics",
        description:
          "",
        representatives: [],
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
        firstName: "Carlotta",
        lastName: "Leoni",
        role: "Senato Accademico",
        email: "c.leoni2@studenti.unisr.it",
      },
      {
        firstName: "Carlotta",
        lastName: "Leoni",
        role: "Consiglio di Facoltà",
        email: "c.leoni2@studenti.unisr.it",
      },
      {
        firstName: "Francesca Maria",
        lastName: "Meroni",
        role: "Consiglio di Facoltà",
        email: "f.meroni1@studenti.unisr.it",
      },
    ],
    courses: [
      {
        slug: "scienze-tecniche-psicologiche",
        name: "Cdl triennale in Scienze e tecniche psicologiche",
        description:
          "",
        representatives: [
          {
            firstName: "Giulia",
            lastName: "Bendinelli",
            email: "g.bendinelli@studenti.unisr.it",
          },
          {
            firstName: "Mattia",
            lastName: "Ascoli",
            email: "m.ascoli2@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "scienze-politiche-strategie-globali",
        name: "Cdl triennale in Scienze politiche e strategie globali",
        description:
          "",
        representatives: [],
      },
      {
        slug: "psicologia-magistrale",
        name: "Cdl magistrale in Psicologia",
        description:
          "",
        representatives: [
          {
            firstName: "Martina",
            lastName: "Barbieri",
            email: "m.barbieri17@studenti.unisr.it",
          },
          {
            firstName: "Benedetta",
            lastName: "Leidi",
            email: "b.leidi@studenti.unisr.it",
          },
          {
            firstName: "Francesca",
            lastName: "Host",
            email: "f.host@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "cognitive-psychology-health-communication",
        name: "Cdl magistrale in Cognitive psychology in health communication",
        description:
          "",
        representatives: [],
      },
      {
        slug: "geopolitica-economia-strategie-globali",
        name: "Cdl magistrale in Geopolitica, economia e strategie globali",
        description:
          "",
        representatives: [],
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
        firstName: "Francesco Pietro",
        lastName: "Berrini",
        role: "Consiglio di Facoltà",
        email: "f.berrini1@studenti.unisr.it",
      },
      {
        firstName: "Michele",
        lastName: "Gomarasca",
        role: "Consiglio di Facoltà",
        email: "m.gomarasca@studenti.unisr.it",
      },
    ],
    courses: [
      {
        slug: "filosofia-triennale",
        name: "Cdl triennale in Filosofia",
        description:
          "",
        representatives: [
          {
            firstName: "Federica Maria",
            lastName: "Taddei",
            email: "f.taddei@studenti.unisr.it",
          },
          {
            firstName: "Alessandro Maria",
            lastName: "Amendola",
            email: "a.amendola@studenti.unisr.it",
          },
          {
            firstName: "Vittoria",
            lastName: "Aquilano",
            email: "v.aquilano@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "filosofia-mondo-contemporaneo",
        name: "Cdl magistrale in Filosofia del mondo contemporaneo",
        description:
          "",
        representatives: [
          {
            firstName: "Giovanni",
            lastName: "Balestra",
            email: "g.balestra1@studenti.unisr.it",
          },
          {
            firstName: "Francesco Pietro",
            lastName: "Berrini",
            email: "f.berrini1@studenti.unisr.it",
          },
          {
            firstName: "Valerio",
            lastName: "D'Innocenzo",
            email: "v.dinnocenzo@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "teoria-storia-arti-immagine",
        name: "Cdl magistrale in Teoria e storia delle arti e dell’immagine",
        description:
          "",
        representatives: [
          {
            firstName: "Nina",
            lastName: "Segre",
            email: "n.segre@studenti.unisr.it",
          },
        ],
      },
      {
        slug: "politics-philosophy-public-affairs",
        name: "Cdl magistrale in Politics, Philosophy and Public Affairs",
        description:
          "",
        representatives: [],
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
      "",
    representatives: [
      {
        firstName: "Fabio",
        lastName: "Biondi",
        role: "Area Clinica – Dermatologia e venereologia",
        email: "biondi.fabio@hsr.it",
      },
      {
        firstName: "Andrea",
        lastName: "Bisoglio",
        role: "Area Chirurgica – Neurochirurgia",
        email: "bisoglio.andrea@hsr.it",
      },
      {
        firstName: "Rita",
        lastName: "Cuciniello",
        role: "Area Servizi – Igiene e medicina preventiva",
        email: "cuciniello.rita@hsr.it",
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