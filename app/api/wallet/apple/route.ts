import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PKPass } from "passkit-generator";
import path from "path";

function formatCert(cert: string) {
  return Buffer.from(cert.replace(/\\n/g, "\n"));
}

export async function GET() {
  try {
    const supabase = await createClient();

    // ── AUTH ─────────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── PROFILE ──────────────────
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // ── CREA PASS ────────────────
    const pass = await PKPass.from({
      model: path.join(process.cwd(), "pass-model.pass"),
      certificates: {
        wwdr: formatCert(process.env.APPLE_WWDR!),
        signerCert: formatCert(process.env.APPLE_CERT!),
        signerKey: formatCert(process.env.APPLE_KEY!),
        signerKeyPassphrase: "dummy", // 👈 AGGIUNGI QUESTO
      },
    });

    // ✅ QUESTO è il modo GIUSTO per la tua versione
    pass.primaryFields.push({
      key: "name",
      label: "Nome",
      value: `${profile.nome} ${profile.cognome}`,
    });

    pass.secondaryFields.push({
      key: "faculty",
      label: "Facoltà",
      value: profile.facolta,
    });

    // ── QR ───────────────────────
    pass.setBarcodes({
      message: profile.id,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1",
    });

    // ── OUTPUT ───────────────────
    const buffer = pass.getAsBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": "attachment; filename=astra.pkpass",
      },
    });

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Errore generazione pass" },
      { status: 500 }
    );
  }
}