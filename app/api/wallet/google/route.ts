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

      cardTitle: {
        defaultValue: {
          language: "it",
          value: "Astra Card",
        },
      },

      header: {
        defaultValue: {
          language: "it",
          value: `${profile.nome} ${profile.cognome}`,
        },
      },

      subheader: {
        defaultValue: {
          language: "it",
          value: profile.facolta,
        },
      },

      barcode: {
        type: "QR_CODE",
        value: profile.id,
      },
    },
  ],
}
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