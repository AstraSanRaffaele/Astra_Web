import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookConventionClient from "./book-convention-client";

export const metadata: Metadata = {
  title: "Convenzioni Libri | ASTRA San Raffaele",
  description:
    "Consulta i libri e i bundle disponibili e invia la tua adesione alla convenzione libri ASTRA.",
};

export default async function BookConventionPage({
  searchParams,
}: {
  searchParams: Promise<{ convention_id?: string | string[] }>;
}) {
  const params = await searchParams;
  const conventionIdValue = Array.isArray(params.convention_id)
    ? params.convention_id[0]
    : params.convention_id;
  const parsedConventionId = conventionIdValue ? Number(conventionIdValue) : null;
  const initialConventionId =
    parsedConventionId && Number.isInteger(parsedConventionId) && parsedConventionId > 0
      ? parsedConventionId
      : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnPath = initialConventionId
      ? `/convenzioni-libri?convention_id=${initialConventionId}`
      : "/convenzioni-libri";
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  return <BookConventionClient initialConventionId={initialConventionId} />;
}
