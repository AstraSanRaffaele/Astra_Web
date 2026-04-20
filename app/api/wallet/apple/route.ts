import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PKPass } from "passkit-generator";
import path from "path";

export const runtime = "nodejs";

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
      },

      overrides: {
        serialNumber: `${profile.id}-${Date.now()}`,
      },
    });

    pass.setRelevantDate(new Date());
    // ── HEADER ───────────────────
    pass.headerFields.push({
      key: "serial",
      label: "N. SERIALE",
      value: profile.id.slice(0, 6).toUpperCase(),
    });

    // ── NOME GRANDE ─────────────
    pass.primaryFields.push({
      key: "name",
      label: "NOME",
      value: `${profile.nome.toUpperCase()} ${profile.cognome.toUpperCase()}`,
    });

    pass.secondaryFields.push(
      {
        key: "phone",
        label: "TELEFONO",
        value: profile.numero_telefono || "-",
      },
      {
        key: "email",
        label: "EMAIL",
        value: profile.email_istituzionale || "-",
      },
      {
        key: "faculty",
        label: "FACOLTÀ",
        value: profile.facolta?.toUpperCase(),
      },
      {
        key: "role",
        label: "RUOLO",
        value: profile.ruolo_tessera?.toUpperCase(),
      }
    );

    // ── QR ──────────────────────
    pass.setBarcodes({
      message: profile.id,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1",
    });

    // ── OUTPUT ───────────────────
    const buffer = pass.getAsBuffer();

    return new Response(new Uint8Array(buffer), {
      status: 200,
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