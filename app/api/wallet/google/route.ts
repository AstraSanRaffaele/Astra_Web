import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createClient } from "@/lib/supabase/server";

function formatPrivateKey(key: string) {
  return key.replace(/\\n/g, "\n");
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const issuerId = process.env.GOOGLE_CLASS_ID!.split(".")[0];

  const payload = {
  iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  aud: "google",
  typ: "savetowallet",
  payload: {
    genericObjects: [
      {
        id: `${issuerId}.${profile.id}-${Date.now()}`,
        classId: process.env.GOOGLE_CLASS_ID,
        state: "ACTIVE",

        validTimeInterval: {
          end: {
            date: "2099-12-31T23:59:59.000Z",
          },
        },

        // ── HEADER PRINCIPALE ──
        cardTitle: {
          defaultValue: {
            language: "it",
            value: "ASTRA",
          },
        },

        header: {
          defaultValue: {
            language: "it",
            value: `${profile.nome.toUpperCase()} ${profile.cognome.toUpperCase()}`,
          },
        },

        subheader: {
          defaultValue: {
            language: "it",
            value: profile.facolta?.toUpperCase(),
          },
        },

        // ── INFO VISIBILI (tipo secondaryFields Apple) ──
        textModulesData: [
          {
            id: "phone",
            header: "TELEFONO",
            body: profile.numero_telefono || "-",
          },
          {
            id: "email",
            header: "EMAIL",
            body: profile.email_istituzionale || "-",
          },
          {
            id: "role",
            header: "RUOLO",
            body: profile.ruolo_tessera?.toUpperCase() || "SOCIO",
          },
        ],

        // ── BARCODE ──
        barcode: {
          type: "QR_CODE",
          value: profile.id,
          alternateText: "ASTRA ID",
        },

        // ── COLORI (UGUALI AD APPLE) ──
        hexBackgroundColor: "#0a1478",

        // ── HERO IMAGE (fa la differenza visiva) ──
        heroImage: {
          sourceUri: {
            uri: "https://www.astrasanraffaele.it/_next/image?url=%2Flogo.png&w=256&q=75", // metti un gradient blu
          },
        },

        // ── LOGO ──
        logo: {
          sourceUri: {
            uri: "https://www.astrasanraffaele.it/_next/image?url=%2Flogo.png&w=256&q=75",
          },
        },
      },
    ],
  },
};

  const token = jwt.sign(
    payload,
    formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY!),
    { algorithm: "RS256" }
  );

  return NextResponse.redirect(
    `https://pay.google.com/gp/v/save/${token}`
  );
}