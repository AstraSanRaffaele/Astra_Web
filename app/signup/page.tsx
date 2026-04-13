"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthMessage, AuthShell, FieldLabel } from "@/app/auth-shared";
import { useRouter } from "next/navigation";
import Footer from "@/components/ui/footer";

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

function validatePassword(password: string) {
  const checks = {
    minLength: password.length >= 8,
    upperCase: /[A-Z]/.test(password),
    lowerCase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[^A-Za-z0-9]/.test(password),
  };

  return {
    checks,
    isValid: Object.values(checks).every(Boolean),
  };
}

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [facolta, setFacolta] = useState("");
  const [corsoDiLaurea, setCorsoDiLaurea] = useState("");
  const [annoLaurea, setAnnoLaurea] = useState("");
  const [dataDiNascita, setDataDiNascita] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const courseOptions = useMemo(() => {
    return degreeOptionsMap[facolta] ?? [];
  }, [facolta]);

  const passwordValidation = validatePassword(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const normalizedNome = nome.trim();
    const normalizedCognome = cognome.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = telefono.trim();

    if (!normalizedNome || !normalizedCognome) {
      setError("Nome e cognome sono obbligatori.");
      return;
    }

    if (!normalizedPhone) {
      setError("Il numero di telefono è obbligatorio.");
      return;
    }

    if (!facolta || !corsoDiLaurea || !annoLaurea || !dataDiNascita) {
      setError("Compila tutti i campi richiesti.");
      return;
    }

    if (!passwordValidation.isValid) {
      setError("La password non rispetta tutti i criteri richiesti.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?next=/profile`
            : undefined,
        data: {
          nome: normalizedNome,
          cognome: normalizedCognome,
          numero_telefono: normalizedPhone,
          facolta,
          corso_di_laurea: corsoDiLaurea,
          anno_di_laurea: Number(annoLaurea),
          data_di_nascita: dataDiNascita,
          email_istituzionale: normalizedEmail,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/signup/check-email?email=${encodeURIComponent(normalizedEmail)}`);
  }

  return (
    <>
      <AuthShell
        title={
          <>
            Entra in
            <br />
            <em style={{ fontStyle: "italic", color: "#C2CEFF" }}>Astra</em>.
          </>
        }
        description="Registrati per entrare nella community, partecipare alle iniziative e accedere alla tua area personale con qualsiasi email."
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
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="Inserisci la tua email"
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
            <FieldLabel htmlFor="annoLaurea">Anno di laurea</FieldLabel>
            <select
              id="annoLaurea"
              className="input"
              value={annoLaurea}
              onChange={(e) => setAnnoLaurea(e.target.value)}
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

            <div style={{ marginTop: ".5rem", fontSize: ".88rem", color: "var(--text-soft)" }}>
              <div>La password deve contenere:</div>
              <ul style={{ margin: ".5rem 0 0", paddingLeft: "1.2rem", display: "grid", gap: ".25rem" }}>
                <li style={{ color: passwordValidation.checks.minLength ? "green" : "inherit" }}>
                  Almeno 8 caratteri
                </li>
                <li style={{ color: passwordValidation.checks.upperCase ? "green" : "inherit" }}>
                  Almeno una lettera maiuscola
                </li>
                <li style={{ color: passwordValidation.checks.lowerCase ? "green" : "inherit" }}>
                  Almeno una lettera minuscola
                </li>
                <li style={{ color: passwordValidation.checks.number ? "green" : "inherit" }}>
                  Almeno un numero
                </li>
                <li style={{ color: passwordValidation.checks.specialChar ? "green" : "inherit" }}>
                  Almeno un carattere speciale
                </li>
              </ul>
            </div>
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
      <Footer />
    </>
  );
}