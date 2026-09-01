import { NextResponse } from "next/server";
import { createAdminClient, getAdminCaller } from "@/lib/admin-users-server";
import { DEGREE_OPTIONS, getCanonicalDegreeValue } from "@/lib/profile-options";

const ALLOWED_ROLES = new Set(["user", "admin"]);
const ALLOWED_MEMBERSHIP_ROLES = new Set(["socio", "direttivo"]);
const ALLOWED_FACULTIES = new Set(["medicina", "psicologia", "filosofia"]);

function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = new Date(`${value}T00:00:00Z`).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

export async function POST(request: Request) {
  try {
    const caller = await getAdminCaller();

    if (!caller) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
    }

    const body = await request.json();
    const userId = String(body?.id ?? "").trim();
    const nome = String(body?.nome ?? "").trim();
    const cognome = String(body?.cognome ?? "").trim();
    const numeroTelefono = String(body?.numero_telefono ?? "").trim();
    const facolta = String(body?.facolta ?? "").trim();
    const corsoDiLaurea = getCanonicalDegreeValue(
      String(body?.corso_di_laurea ?? "").trim(),
    );
    const annoDiLaurea = Number(body?.anno_di_laurea);
    const dataDiNascita = String(body?.data_di_nascita ?? "").trim();
    const role = String(body?.role ?? "").trim();
    const ruoloTessera = String(body?.ruolo_tessera ?? "").trim();

    if (
      !userId ||
      !nome ||
      !cognome ||
      !numeroTelefono ||
      !facolta ||
      !corsoDiLaurea ||
      !dataDiNascita ||
      !Number.isInteger(annoDiLaurea)
    ) {
      return NextResponse.json(
        { error: "Compila tutti i campi obbligatori." },
        { status: 400 },
      );
    }

    if (
      !ALLOWED_FACULTIES.has(facolta) ||
      !ALLOWED_ROLES.has(role) ||
      !ALLOWED_MEMBERSHIP_ROLES.has(ruoloTessera) ||
      !isValidBirthDate(dataDiNascita) ||
      annoDiLaurea < 2020 ||
      annoDiLaurea > 2040
    ) {
      return NextResponse.json({ error: "Uno o più valori non sono validi." }, { status: 400 });
    }

    if (caller.userId === userId && role !== "admin") {
      return NextResponse.json(
        { error: "Non puoi rimuovere il tuo ruolo amministratore." },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();
    const { data: currentProfile, error: currentProfileError } = await adminClient
      .from("profiles")
      .select("id, nome, cognome, facolta, corso_di_laurea")
      .eq("id", userId)
      .maybeSingle();

    if (currentProfileError || !currentProfile) {
      return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
    }

    const hasAllowedDegree = DEGREE_OPTIONS[facolta]?.some(
      (option) => option.value === corsoDiLaurea,
    );
    const keepsUnknownLegacyDegree =
      currentProfile.facolta === facolta &&
      getCanonicalDegreeValue(currentProfile.corso_di_laurea) === corsoDiLaurea;

    if (!hasAllowedDegree && !keepsUnknownLegacyDegree) {
      return NextResponse.json(
        { error: "Il corso selezionato non appartiene alla facoltà indicata." },
        { status: 400 },
      );
    }

    const { data: authData, error: authLookupError } =
      await adminClient.auth.admin.getUserById(userId);

    if (authLookupError || !authData.user) {
      return NextResponse.json(
        { error: "Account di accesso non trovato." },
        { status: 404 },
      );
    }

    const currentMetadata = authData.user?.user_metadata ?? {};
    const { error: metadataError } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...currentMetadata,
        nome,
        cognome,
        numero_telefono: numeroTelefono,
        facolta,
        corso_di_laurea: corsoDiLaurea,
        anno_di_laurea: annoDiLaurea,
        data_di_nascita: dataDiNascita,
      },
    });

    if (metadataError) {
      return NextResponse.json(
        { error: "Aggiornamento dei dati account non riuscito." },
        { status: 500 },
      );
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .update({
        nome,
        cognome,
        numero_telefono: numeroTelefono,
        facolta,
        corso_di_laurea: corsoDiLaurea,
        anno_di_laurea: annoDiLaurea,
        data_di_nascita: dataDiNascita,
        role,
        ruolo_tessera: ruoloTessera,
      })
      .eq("id", userId)
      .select("id, nome, cognome, email_istituzionale, numero_telefono, facolta, corso_di_laurea, anno_di_laurea, data_di_nascita, role, ruolo_tessera, created_at, updated_at")
      .single();

    if (profileError || !profile) {
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: currentMetadata,
      });

      return NextResponse.json(
        { error: "Salvataggio del profilo non riuscito." },
        { status: 500 },
      );
    }

    return NextResponse.json({ user: profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno." },
      { status: 500 },
    );
  }
}
