import { NextResponse } from "next/server";
import { createAdminClient, getAdminCaller } from "@/lib/admin-users-server";
import { DEGREE_OPTIONS, getCanonicalDegreeValue } from "@/lib/profile-options";

const ALLOWED_ROLES = new Set(["user", "admin"]);
const ALLOWED_MEMBERSHIP_ROLES = new Set(["socio", "direttivo"]);
const ALLOWED_FACULTIES = new Set(["medicina", "psicologia", "filosofia"]);

function isStrongPassword(value: string) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

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
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const nome = String(body?.nome ?? "").trim();
    const cognome = String(body?.cognome ?? "").trim();
    const numeroTelefono = String(body?.numero_telefono ?? "").trim();
    const facolta = String(body?.facolta ?? "").trim();
    const corsoDiLaurea = getCanonicalDegreeValue(
      String(body?.corso_di_laurea ?? "").trim(),
    );
    const annoDiLaurea = Number(body?.anno_di_laurea);
    const dataDiNascita = String(body?.data_di_nascita ?? "").trim();
    const role = String(body?.role ?? "user").trim();
    const ruoloTessera = String(body?.ruolo_tessera ?? "socio").trim();

    if (
      !email ||
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

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Inserisci un indirizzo email valido." }, { status: 400 });
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        { error: "La password non rispetta i criteri di sicurezza richiesti." },
        { status: 400 },
      );
    }

    if (
      !ALLOWED_FACULTIES.has(facolta) ||
      !DEGREE_OPTIONS[facolta]?.some((option) => option.value === corsoDiLaurea) ||
      !ALLOWED_ROLES.has(role) ||
      !ALLOWED_MEMBERSHIP_ROLES.has(ruoloTessera) ||
      !isValidBirthDate(dataDiNascita) ||
      annoDiLaurea < 2020 ||
      annoDiLaurea > 2040
    ) {
      return NextResponse.json({ error: "Uno o più valori non sono validi." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const userMetadata = {
      nome,
      cognome,
      numero_telefono: numeroTelefono,
      facolta,
      corso_di_laurea: corsoDiLaurea,
      anno_di_laurea: annoDiLaurea,
      data_di_nascita: dataDiNascita,
      email_istituzionale: email,
    };

    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Creazione dell’account non riuscita." },
        { status: 400 },
      );
    }

    const userId = authData.user.id;
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        nome,
        cognome,
        email_istituzionale: email,
        numero_telefono: numeroTelefono,
        facolta,
        corso_di_laurea: corsoDiLaurea,
        anno_di_laurea: annoDiLaurea,
        data_di_nascita: dataDiNascita,
        role,
        ruolo_tessera: ruoloTessera,
      })
      .select("id, nome, cognome, email_istituzionale, numero_telefono, facolta, corso_di_laurea, anno_di_laurea, data_di_nascita, role, ruolo_tessera, created_at, updated_at")
      .single();

    if (profileError || !profile) {
      const { error: rollbackError } = await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json(
        {
          error: rollbackError
            ? "Il profilo non è stato creato e l’account richiede una verifica manuale."
            : `Creazione del profilo non riuscita${profileError?.message ? `: ${profileError.message}` : "."}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ user: profile }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno." },
      { status: 500 },
    );
  }
}
