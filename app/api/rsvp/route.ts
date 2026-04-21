// app/api/rsvp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
}

// POST /api/rsvp — conferma iscrizione
export async function POST(req: NextRequest) {
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const { event_id } = await req.json();
  if (!event_id) return NextResponse.json({ error: "event_id mancante." }, { status: 400 });

  // Controlla max posti
  const { data: event } = await supabase
    .from("events")
    .select("max_posti")
    .eq("id", event_id)
    .single();

  if (event?.max_posti != null) {
    const { count } = await supabase
      .from("rsvp")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event_id)
      .eq("stato", "confermato");

    if ((count ?? 0) >= event.max_posti) {
      return NextResponse.json({ error: "Posti esauriti per questo evento." }, { status: 409 });
    }
  }

  // Crea iscrizione se non esiste già
  const { data: existingRsvp } = await supabase
    .from("rsvp")
    .select("id")
    .eq("event_id", event_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingRsvp) {
    return NextResponse.json({ ok: true, stato: "confermato" });
  }

  const { error } = await supabase
    .from("rsvp")
    .insert({ event_id, user_id: user.id, stato: "confermato" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, stato: "confermato" });
}

// DELETE /api/rsvp — cancella iscrizione
export async function DELETE(req: NextRequest) {
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const { event_id } = await req.json();
  if (!event_id) return NextResponse.json({ error: "event_id mancante." }, { status: 400 });

  const { error } = await supabase
    .from("rsvp")
    .delete()
    .eq("event_id", event_id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, stato: "none" });
}