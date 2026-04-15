// app/api/admin/create-user/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// ── Guard: only admins can call this ─────────────────────────────
async function getCallerRole(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role ?? null;
}

export async function POST(req: NextRequest) {
  // 1. Verify caller is admin
  const role = await getCallerRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  // 2. Parse body
  const body = await req.json();
  const {
    email, password, nome, cognome, numero_telefono,
    facolta, corso_di_laurea, anno_di_laurea, data_di_nascita,
    ruolo_tessera = "socio", role: newRole = "user",
  } = body;

  if (!email || !password || !nome || !cognome) {
    return NextResponse.json({ error: "Campi obbligatori mancanti." }, { status: 400 });
  }

  // 3. Use service role to create auth user
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // never expose this client-side
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email confirmation
    user_metadata: { nome, cognome },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Errore creazione utente." }, { status: 400 });
  }

  const userId = authData.user.id;

  // 4. Upsert profile row (trigger may have already created it)
  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    nome,
    cognome,
    email_istituzionale: email,
    numero_telefono: numero_telefono ?? "",
    facolta: facolta ?? "medicina",
    corso_di_laurea: corso_di_laurea ?? "",
    anno_di_laurea: Number(anno_di_laurea) || new Date().getFullYear(),
    data_di_nascita: data_di_nascita ?? "2000-01-01",
    role: newRole,
    ruolo_tessera,
  });

  if (profileError) {
    // Auth user was created but profile failed — clean up
    await adminClient.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Errore creazione profilo: " + profileError.message }, { status: 500 });
  }

  // 5. Return the new profile
  const { data: profile } = await adminClient.from("profiles").select("*").eq("id", userId).single();
  return NextResponse.json({ user: profile }, { status: 201 });
}