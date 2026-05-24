// app/api/replicarank/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";

type SelectedSubject = {
  subject_id?: unknown;
  grade?: unknown;
  has_honors?: unknown;
};

type Preference = {
  group_name?: unknown;
  preference_order?: unknown;
};

const VALID_AREAS = ["Chirurgica", "Clinica", "Ricerca"] as const;
type ValidArea = (typeof VALID_AREAS)[number];

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function getCurrentUserId() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

function normalizeSelectedSubjects(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const subject = (item ?? {}) as SelectedSubject;

    const subjectId = cleanString(subject.subject_id);
    const grade = parseInteger(subject.grade);
    const hasHonors = subject.has_honors === true;

    if (!subjectId) {
      throw new Error("Esame non valido.");
    }

    if (!grade || grade < 18 || grade > 30) {
      throw new Error("Ogni voto deve essere compreso tra 18 e 30.");
    }

    return {
      subject_id: subjectId,
      grade,
      has_honors: hasHonors,
    };
  });
}

function normalizePreferences(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Devi indicare tutte e 3 le aree in ordine di preferenza.");
  }

  const normalized = value
    .map((item, index) => {
      const preference = (item ?? {}) as Preference;
      const groupName = cleanString(preference.group_name);
      const preferenceOrder = parseInteger(preference.preference_order) ?? index + 1;

      return {
        group_name: groupName,
        preference_order: preferenceOrder,
      };
    })
    .sort((a, b) => a.preference_order - b.preference_order);

  if (normalized.length !== 3) {
    throw new Error("Devi indicare esattamente 3 preferenze: Chirurgica, Clinica e Ricerca.");
  }

  const areaNames = normalized.map((preference) => preference.group_name);

  const allValid = areaNames.every((area): area is ValidArea =>
    VALID_AREAS.includes(area as ValidArea)
  );

  if (!allValid) {
    throw new Error("Le preferenze devono essere solo: Chirurgica, Clinica e Ricerca.");
  }

  if (new Set(areaNames).size !== 3) {
    throw new Error("Non puoi indicare due volte la stessa area nelle preferenze.");
  }

  const expectedOrders = [1, 2, 3];
  const hasValidOrders = normalized.every(
    (preference, index) => preference.preference_order === expectedOrders[index]
  );

  if (!hasValidOrders) {
    throw new Error("L’ordine delle preferenze deve essere 1, 2 e 3.");
  }

  return normalized;
}

function calculateWeightedAverage(
  selectedSubjects: { subject_id: string; grade: number; has_honors: boolean }[],
  subjectMap: Map<string, { cfu: number }>
) {
  let totalCfu = 0;
  let weightedSum = 0;

  for (const item of selectedSubjects) {
    const subject = subjectMap.get(item.subject_id);

    if (!subject) {
      throw new Error("Uno o più esami selezionati non sono validi.");
    }

    totalCfu += subject.cfu;
    weightedSum += item.grade * subject.cfu;
  }

  if (totalCfu === 0) {
    return {
      totalCfu: 0,
      weightedAverage: 0,
    };
  }

  return {
    totalCfu,
    weightedAverage: Number((weightedSum / totalCfu).toFixed(2)),
  };
}

function generateFakeMatricola(cohortYear: number) {
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `RR${cohortYear}-${randomPart}`;
}

async function sendConfirmationEmail(params: {
  to: string | null;
  nome: string;
  cognome: string;
  editionName: string;
  fakeMatricola: string;
}) {
  if (!params.to) return;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    console.error("Variabili SMTP mancanti.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to: params.to,
    subject: `Conferma registrazione ${params.editionName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Registrazione ReplicaRANK confermata</h2>

        <p>
          Ciao <strong>${params.nome} ${params.cognome}</strong>,
        </p>

        <p>
          la tua partecipazione a
          <strong>${params.editionName}</strong>
          è stata registrata correttamente.
        </p>

        <div
          style="
            margin: 20px 0;
            padding: 16px;
            border-radius: 10px;
            background: #f3f4f6;
            border: 1px solid #d1d5db;
          "
        >
          <p style="margin: 0; font-size: 14px;">
            Matricola ReplicaRANK
          </p>

          <p
            style="
              margin: 6px 0 0;
              font-size: 24px;
              font-weight: bold;
            "
          >
            ${params.fakeMatricola}
          </p>
        </div>

        <div
          style="
            margin-top: 24px;
            padding: 14px;
            border-radius: 10px;
            background: #fff7ed;
            border: 1px solid #fdba74;
            color: #9a3412;
          "
        >
          <strong>Avviso importante</strong>

          <p style="margin-top: 8px;">
            Questa NON è una graduatoria ufficiale dell’Università.
            È una simulazione/previsione indipendente basata sugli stessi criteri pubblici della graduatoria originale.
          </p>
        </div>
      </div>
    `,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Devi effettuare l'accesso per partecipare a ReplicaRANK." },
      { status: 401 }
    );
  }

  let body: {
    edition_id?: unknown;
    selected_subjects?: unknown;
    preferences?: unknown;
  } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const editionId = cleanString(body.edition_id);

  if (!editionId) {
    return NextResponse.json({ error: "Edizione non valida." }, { status: 400 });
  }

  let selectedSubjects;
  let preferences;

  try {
    selectedSubjects = normalizeSelectedSubjects(body.selected_subjects);
    preferences = normalizePreferences(body.preferences);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Dati partecipazione non validi.",
      },
      { status: 400 }
    );
  }

  if (selectedSubjects.length === 0) {
    return NextResponse.json(
      { error: "Seleziona almeno un esame sostenuto." },
      { status: 400 }
    );
  }

  try {
    const supabase = getAdminClient();

    const { data: edition, error: editionError } = await supabase
      .from("replicarank_editions")
      .select("*")
      .eq("id", editionId)
      .eq("is_page_visible", true)
      .single();

    if (editionError || !edition) {
      return NextResponse.json(
        { error: "ReplicaRANK non disponibile." },
        { status: 404 }
      );
    }

    if (!edition.are_registrations_open) {
      return NextResponse.json(
        { error: "Registrazioni chiuse." },
        { status: 403 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, nome, cognome, email_istituzionale, numero_telefono, data_di_nascita")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profilo utente non trovato." },
        { status: 404 }
      );
    }

    if (!profile.nome || !profile.cognome || !profile.numero_telefono || !profile.data_di_nascita) {
      return NextResponse.json(
        {
          error:
            "Profilo incompleto. Nome, cognome, telefono e data di nascita sono obbligatori.",
        },
        { status: 400 }
      );
    }

    const { data: existingParticipant } = await supabase
      .from("replicarank_participants")
      .select("id")
      .eq("edition_id", editionId)
      .or(`user_id.eq.${userId},numero_telefono.eq.${profile.numero_telefono}`)
      .maybeSingle();

    if (existingParticipant) {
      return NextResponse.json(
        { error: "Risulti già registrato a questa edizione di ReplicaRANK." },
        { status: 409 }
      );
    }

    const subjectIds = selectedSubjects.map((item) => item.subject_id);

    const { data: subjects, error: subjectsError } = await supabase
      .from("replicarank_subjects")
      .select("id, cfu")
      .eq("edition_id", editionId)
      .in("id", subjectIds);

    if (subjectsError) {
      return NextResponse.json({ error: subjectsError.message }, { status: 500 });
    }

    if (!subjects || subjects.length !== subjectIds.length) {
      return NextResponse.json(
        { error: "Uno o più esami selezionati non appartengono a questa edizione." },
        { status: 400 }
      );
    }

    const subjectMap = new Map(
      subjects.map((subject) => [
        String(subject.id),
        { cfu: Number(subject.cfu) },
      ])
    );

    const { totalCfu, weightedAverage } = calculateWeightedAverage(
      selectedSubjects,
      subjectMap
    );

    let fakeMatricola = generateFakeMatricola(Number(edition.cohort_year));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: existingMatricola } = await supabase
        .from("replicarank_participants")
        .select("id")
        .eq("edition_id", editionId)
        .eq("fake_matricola", fakeMatricola)
        .maybeSingle();

      if (!existingMatricola) break;

      fakeMatricola = generateFakeMatricola(Number(edition.cohort_year));
    }

    const orderedPreferences = preferences
      .sort((a, b) => a.preference_order - b.preference_order)
      .map((preference) => preference.group_name);

    const { data: participant, error: participantError } = await supabase
      .from("replicarank_participants")
      .insert({
        edition_id: editionId,
        user_id: userId,
        fake_matricola: fakeMatricola,
        nome: profile.nome,
        cognome: profile.cognome,
        email_istituzionale: profile.email_istituzionale,
        numero_telefono: profile.numero_telefono,
        data_di_nascita: profile.data_di_nascita,
        total_cfu: totalCfu,
        weighted_average: weightedAverage,
        final_score: 0,
        assignment_status: "non_assegnato",
        first_choice: orderedPreferences[0],
        second_choice: orderedPreferences[1],
        third_choice: orderedPreferences[2],
      })
      .select("*")
      .single();

    if (participantError) {
      return NextResponse.json(
        { error: participantError.message },
        { status: 500 }
      );
    }

    const participantSubjectsPayload = selectedSubjects.map((item) => {
      const subject = subjectMap.get(item.subject_id)!;

      return {
        participant_id: participant.id,
        subject_id: item.subject_id,
        grade: item.grade,
        has_honors: item.has_honors,
        cfu: subject.cfu,
      };
    });

    const { error: participantSubjectsError } = await supabase
      .from("replicarank_participant_subjects")
      .insert(participantSubjectsPayload);

    if (participantSubjectsError) {
      await supabase.from("replicarank_participants").delete().eq("id", participant.id);

      return NextResponse.json(
        { error: participantSubjectsError.message },
        { status: 500 }
      );
    }

    const { error: preferencesError } = await supabase
      .from("replicarank_preferences")
      .insert(
        preferences.map((preference) => ({
          participant_id: participant.id,
          group_name: preference.group_name,
          preference_order: preference.preference_order,
        }))
      );

    if (preferencesError) {
      await supabase.from("replicarank_participants").delete().eq("id", participant.id);

      return NextResponse.json(
        { error: preferencesError.message },
        { status: 500 }
      );
    }

    try {
      await sendConfirmationEmail({
        to: profile.email_istituzionale,
        nome: profile.nome,
        cognome: profile.cognome,
        editionName: edition.name,
        fakeMatricola,
      });
    } catch (emailError) {
      console.error("Errore invio email ReplicaRANK:", emailError);
    }

    return NextResponse.json({
      ok: true,
      participant: {
        id: participant.id,
        fake_matricola: fakeMatricola,
        total_cfu: totalCfu,
        weighted_average: weightedAverage,
      },
      message: "Registrazione completata correttamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante la registrazione a ReplicaRANK.",
      },
      { status: 500 }
    );
  }
}