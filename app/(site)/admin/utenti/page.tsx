import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminUsersClient, { type Profile } from "./admin-users-client";

export const metadata: Metadata = {
  title: "Gestione utenti | Astra Admin",
  description: "Gestione dei profili e dei ruoli della community Astra.",
};

const PROFILE_FIELDS =
  "id, nome, cognome, email_istituzionale, numero_telefono, facolta, corso_di_laurea, anno_di_laurea, data_di_nascita, role, ruolo_tessera, created_at, updated_at";

async function fetchAllProfiles() {
  const supabase = await createClient();
  const batchSize = 1000;
  let from = 0;
  let total: number | null = null;
  const profiles: Profile[] = [];

  while (true) {
    const { data, error, count } = await supabase
      .from("profiles")
      .select(PROFILE_FIELDS, { count: from === 0 ? "exact" : undefined })
      .order("created_at", { ascending: false })
      .range(from, from + batchSize - 1);

    if (error) throw error;

    const batch = (data ?? []) as Profile[];
    profiles.push(...batch);

    if (from === 0) total = count ?? null;
    if (batch.length < batchSize || (total !== null && profiles.length >= total)) break;

    from += batchSize;
  }

  return profiles;
}

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/utenti");
  }

  const { data: adminProfile, error: adminProfileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (adminProfileError) throw adminProfileError;
  if (adminProfile?.role !== "admin") {
    redirect("/profile");
  }

  let profiles: Profile[] = [];
  let initialError = "";

  try {
    profiles = await fetchAllProfiles();
  } catch {
    initialError = "Impossibile caricare gli utenti. Riprova tra poco.";
  }

  return (
    <AdminUsersClient
      adminId={user.id}
      initialProfiles={profiles}
      initialError={initialError}
    />
  );
}
