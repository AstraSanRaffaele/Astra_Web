import { NextResponse } from "next/server";
import { createAdminClient, getAdminCaller } from "@/lib/admin-users-server";

function isMissingAuthUser(error: { status?: number; code?: string; message?: string }) {
  return (
    error.status === 404 ||
    error.code === "user_not_found" ||
    /user.*not found/i.test(error.message ?? "")
  );
}

export async function POST(request: Request) {
  try {
    const caller = await getAdminCaller();

    if (!caller) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
    }

    const body = await request.json();
    const userId = String(body?.userId ?? "").trim();

    if (!userId) {
      return NextResponse.json({ error: "Utente non valido." }, { status: 400 });
    }

    if (caller.userId === userId) {
      return NextResponse.json(
        { error: "Non puoi eliminare il tuo stesso account." },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();
    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json({ error: "Verifica del profilo non riuscita." }, { status: 500 });
    }

    if (!target) {
      const { error: orphanAuthError } = await adminClient.auth.admin.deleteUser(userId);
      if (orphanAuthError && !isMissingAuthUser(orphanAuthError)) {
        return NextResponse.json(
          { error: "Eliminazione dell’account senza profilo non riuscita." },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    }

    if (target.role === "admin") {
      const { count, error: countError } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (countError) {
        return NextResponse.json(
          { error: "Impossibile verificare gli amministratori attivi." },
          { status: 500 },
        );
      }

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Non puoi eliminare l’ultimo amministratore." },
          { status: 400 },
        );
      }
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError && !isMissingAuthUser(deleteAuthError)) {
      return NextResponse.json(
        { error: "Eliminazione dell’account non riuscita." },
        { status: 500 },
      );
    }

    const { error: deleteRsvpError } = await adminClient
      .from("rsvp")
      .delete()
      .eq("user_id", userId);

    const { error: deleteProfileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (deleteRsvpError || deleteProfileError) {
      return NextResponse.json(
        { error: "L’account è stato eliminato, ma alcuni dati collegati richiedono una pulizia manuale." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno." },
      { status: 500 },
    );
  }
}
