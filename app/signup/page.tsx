"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthMessage, AuthShell, FieldLabel } from "@/app/auth-shared";
import { useRouter } from "next/navigation";

const facultyOptions = [
  { value: "medicina", label: "Medicina" },
  { value: "psicologia", label: "Psicologia" },
  { value: "filosofia", label: "Filosofia" },
];

const degreeOptionsMap: Record<string, { value: string; label: string }[]> = {
  medicina: [
    { value: "medicina_e_chirurgia", label: "Medicina e Chirurgia" },
    { value: "international_medical_doctor_program", label: "International Medical Doctor Program" },
    { value: "ricerca_biotecnologica_in_medicina", label: "Ricerca biotecnologica in medicina" },
    { value: "fisioterapia", label: "Fisioterapia" },
    { value: "igiene_dentale", label: "Igiene dentale" },
    { value: "odontoiatria_e_protesi_dentaria", label: "Odontoiatria e protesi dentaria" },
    { value: "biotechnology_for_innovative_therapeutics", label: "Biotechnology for Innovative Therapeutics" },
    { value: "scienze_riabilitative_delle_professioni_sanitarie", label: "Scienze riabilitative delle professioni sanitarie" },
    { value: "ostetricia", label: "Ostetricia" },
    { value: "health_informatics", label: "Health Informatics" },
  ],
  psicologia: [{ value: "psicologia", label: "Psicologia" }],
  filosofia: [
    { value: "filosofia_triennale", label: "Filosofia" },
    { value: "filosofia_del_mondo_contemporaneo", label: "Filosofia del mondo contemporaneo" },
    { value: "teoria_e_storia_delle_arti_e_dell_immagine", label: "Teoria e storia delle arti e dell’immagine" },
    { value: "politics_philosophy_and_public_affairs", label: "Politics, Philosophy and Public Affairs" },
  ],
};

const enrollmentYearOptions = Array.from({ length: 15 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: String(year), label: String(year) };
});

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [facolta, setFacolta] = useState("");
  const [corsoDiLaurea, setCorsoDiLaurea] = useState("");
  const [annoImmatricolazione, setAnnoImmatricolazione] = useState("");
  const [dataDiNascita, setDataDiNascita] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const courseOptions = useMemo(() => {
    return degreeOptionsMap[facolta] ?? [];
  }, [facolta]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/signup/confirmed`
            : undefined,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    if (!userId) {
      setError("Utente creato ma ID non disponibile.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      nome,
      cognome,
      email_istituzionale: email,
      numero_telefono: telefono,
      facolta,
      corso_di_laurea: corsoDiLaurea,
      anno_immatricolazione: annoImmatricolazione,
      data_di_nascita: dataDiNascita,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/signup/check-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <AuthShell
      title={
        <>
          Entra in
          <br />
          <em style={{ fontStyle: "italic", color: "#C2CEFF" }}>Astra</em>.
        </>
      }
      description="Registrati per entrare nella community, partecipare alle iniziative e accedere alla tua area personale."
      cardTitle={
        <>
          Crea il tuo
          <br />
          account.
        </>
      }
      cardDescription="Compila i tuoi dati per registrarti su Astra."
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <FieldLabel htmlFor="nome">Nome</FieldLabel>
          <input
            id="nome"
            type="text"
            className="input"
            placeholder="Inserisci il nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="cognome">Cognome</FieldLabel>
          <input
            id="cognome"
            type="text"
            className="input"
            placeholder="Inserisci il cognome"
            value={cognome}
            onChange={(e) => setCognome(e.target.value)}
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="email">Mail istituzionale</FieldLabel>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="nome@unisr.it"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="telefono">Numero di telefono</FieldLabel>
          <input
            id="telefono"
            type="tel"
            className="input"
            placeholder="Inserisci il numero di telefono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="facolta">Facoltà</FieldLabel>
          <select
            id="facolta"
            className="input"
            value={facolta}
            onChange={(e) => {
              setFacolta(e.target.value);
              setCorsoDiLaurea("");
            }}
            required
          >
            <option value="">Seleziona una facoltà</option>
            {facultyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="corsoDiLaurea">Corso di laurea</FieldLabel>
          <select
            id="corsoDiLaurea"
            className="input"
            value={corsoDiLaurea}
            onChange={(e) => setCorsoDiLaurea(e.target.value)}
            required
            disabled={!facolta}
          >
            <option value="">
              {facolta ? "Seleziona un corso di laurea" : "Seleziona prima la facoltà"}
            </option>
            {courseOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="annoImmatricolazione">Anno di immatricolazione</FieldLabel>
          <select
            id="annoImmatricolazione"
            className="input"
            value={annoImmatricolazione}
            onChange={(e) => setAnnoImmatricolazione(e.target.value)}
            required
          >
            <option value="">Seleziona un anno</option>
            {enrollmentYearOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="dataDiNascita">Data di nascita</FieldLabel>
          <input
            id="dataDiNascita"
            type="date"
            className="input"
            value={dataDiNascita}
            onChange={(e) => setDataDiNascita(e.target.value)}
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="Crea una password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="confirmPassword">Conferma password</FieldLabel>
          <input
            id="confirmPassword"
            type="password"
            className="input"
            placeholder="Ripeti la password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <AuthMessage error={error} success="" />

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{
            marginTop: ".4rem",
            background: "var(--blue)",
            color: "#fff",
            padding: ".95rem 1.4rem",
            borderRadius: "100px",
            fontWeight: 800,
            fontSize: ".95rem",
            boxShadow: "0 4px 24px rgba(14,31,107,.18)",
            border: "none",
            cursor: "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? "Registrazione in corso..." : "Registrati"}
        </button>
      </form>

      <div
        style={{
          marginTop: "1.4rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          fontSize: ".92rem",
        }}
      >
        <Link
          href="/login"
          style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 700 }}
        >
          Hai già un account?
        </Link>
      </div>
    </AuthShell>
  );
}