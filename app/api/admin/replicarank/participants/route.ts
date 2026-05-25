

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ error: "Accesso riservato agli admin." }, { status: 403 });
    }

    const body = await request.json();
    const participantId = body?.id;

    if (!participantId) {
      return NextResponse.json({ error: "ID partecipante mancante." }, { status: 400 });
    }

    const { error: preferencesError } = await supabase
      .from("replicarank_preferences")
      .delete()
      .eq("participant_id", participantId);

    if (preferencesError) {
      return NextResponse.json({ error: preferencesError.message }, { status: 500 });
    }

    const { error: subjectsError } = await supabase
      .from("replicarank_participant_subjects")
      .delete()
      .eq("participant_id", participantId);

    if (subjectsError) {
      return NextResponse.json({ error: subjectsError.message }, { status: 500 });
    }

    const { error: participantError } = await supabase
      .from("replicarank_participants")
      .delete()
      .eq("id", participantId);

    if (participantError) {
      return NextResponse.json({ error: participantError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Partecipante eliminato correttamente." });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore imprevisto." },
      { status: 500 }
    );
  }
}