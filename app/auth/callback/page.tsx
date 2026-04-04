"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function handleCallback() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: existingProfile, error: profileReadError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileReadError) {
        router.replace("/login");
        return;
      }

      if (!existingProfile) {
        const metadata = user.user_metadata ?? {};

        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          nome: metadata.nome ?? "",
          cognome: metadata.cognome ?? "",
          email_istituzionale: user.email ?? "",
          numero_telefono: metadata.numero_telefono ?? "",
          facolta: metadata.facolta ?? null,
          corso_di_laurea: metadata.corso_di_laurea ?? "",
          anno_immatricolazione: metadata.anno_immatricolazione ?? null,
          data_di_nascita: metadata.data_di_nascita ?? null,
          role: "user",
        });

        if (insertError) {
          router.replace("/login?error=profile_creation_failed");
          return;
        }
      }

      router.replace("/profile");
    }

    handleCallback();
  }, [router, supabase]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8faff",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "white",
          borderRadius: "24px",
          padding: "2rem",
          boxShadow: "0 10px 30px rgba(15,23,42,.08)",
          border: "1px solid rgba(14,31,107,.08)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, color: "#0E1F6B", fontWeight: 800 }}>
          Conferma in corso...
        </p>
      </div>
    </main>
  );
}