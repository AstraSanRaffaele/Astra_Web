import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminConventionManager from "../_components/admin-convention-manager";
import AdminBookAdhesionsClient from "./admin-book-adhesions-client";

export const metadata: Metadata = {
  title: "Convenzioni Libri | Admin ASTRA",
  description: "Gestione di catalogo, raccolte ordini e adesioni alle convenzioni libri.",
};

export default async function AdminBookConventionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string | string[];
    convention_id?: string | string[];
    round_id?: string | string[];
    download?: string | string[];
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/convenzione-libri");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const params = await searchParams;
  const requestedView = params.view;
  const view = Array.isArray(requestedView) ? requestedView[0] : requestedView;
  const conventionIdValue = Array.isArray(params.convention_id)
    ? params.convention_id[0]
    : params.convention_id;
  const parsedConventionId = conventionIdValue ? Number(conventionIdValue) : null;
  const initialConventionId =
    parsedConventionId && Number.isInteger(parsedConventionId) && parsedConventionId > 0
      ? parsedConventionId
      : undefined;
  const roundIdValue = Array.isArray(params.round_id)
    ? params.round_id[0]
    : params.round_id;
  const initialRoundId = roundIdValue?.trim() || undefined;
  const downloadValue = Array.isArray(params.download)
    ? params.download[0]
    : params.download;

  return view === "adesioni"
    ? (
      <AdminBookAdhesionsClient
        initialConventionId={initialConventionId}
        initialRoundId={initialRoundId}
        autoExport={downloadValue === "csv" && Boolean(initialRoundId)}
      />
    )
    : <AdminConventionManager scope="books" />;
}
