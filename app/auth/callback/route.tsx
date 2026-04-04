import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/profile";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  } else {
    return NextResponse.redirect(`${origin}/login?error=missing_token`);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(`${origin}/login?error=user_not_found`);
  }

  const { data: existingProfile, error: profileReadError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileReadError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(profileReadError.message)}`
    );
  }

  if (!existingProfile) {
    const metadata = user.user_metadata ?? {};

    const facoltaMap: Record<string, "Medicina" | "Psicologia" | "Filosofia"> = {
      medicina: "Medicina",
      psicologia: "Psicologia",
      filosofia: "Filosofia",
      Medicina: "Medicina",
      Psicologia: "Psicologia",
      Filosofia: "Filosofia",
    };

    const nome = String(metadata.nome ?? "").trim();
    const cognome = String(metadata.cognome ?? "").trim();
    const emailIstituzionale = String(user.email ?? "").trim();
    const numeroTelefono = String(metadata.numero_telefono ?? "").trim();
    const facolta = facoltaMap[String(metadata.facolta ?? "").trim()] ?? null;
    const corsoDiLaurea = String(metadata.corso_di_laurea ?? "").trim();
    const annoImmatricolazione = Number(metadata.anno_immatricolazione);
    const dataDiNascita = String(metadata.data_di_nascita ?? "").trim();

    if (
      !nome ||
      !cognome ||
      !emailIstituzionale ||
      !numeroTelefono ||
      !facolta ||
      !corsoDiLaurea ||
      Number.isNaN(annoImmatricolazione) ||
      !dataDiNascita
    ) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent("Dati profilo mancanti o non validi nei metadata utente")}`
      );
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      nome,
      cognome,
      email_istituzionale: emailIstituzionale,
      numero_telefono: numeroTelefono,
      facolta,
      corso_di_laurea: corsoDiLaurea,
      anno_immatricolazione: annoImmatricolazione,
      data_di_nascita: dataDiNascita,
      role: "user",
    });

    if (insertError) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(insertError.message)}`
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}