import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookConventionClient from "./book-convention-client";

export const metadata: Metadata = {
  title: "Convenzioni Libri | ASTRA San Raffaele",
  description:
    "Consulta i libri e i bundle disponibili e invia la tua adesione alla convenzione libri ASTRA.",
};

export default async function BookConventionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/convenzioni-libri");
  }

  return <BookConventionClient />;
}

