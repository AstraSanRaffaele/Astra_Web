

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const area = String(body?.area ?? "").trim();
    const availability = String(body?.availability ?? "").trim();
    const motivation = String(body?.motivation ?? "").trim();
    const applicantEmail = String(body?.applicantEmail ?? "").trim();
    const applicantName = String(body?.applicantName ?? "").trim();

    if (!area || !availability || !motivation || !applicantEmail || !applicantName) {
      return NextResponse.json(
        { error: "Compila tutti i campi richiesti prima di inviare la candidatura." },
        { status: 400 }
      );
    }

    const smtpHost = process.env.ARUBA_SMTP_HOST;
    const smtpPort = Number(process.env.ARUBA_SMTP_PORT ?? 465);
    const smtpUser = process.env.ARUBA_SMTP_USER;
    const smtpPass = process.env.ARUBA_SMTP_PASS;
    const mailFrom = process.env.ARUBA_MAIL_FROM ?? smtpUser;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !mailFrom) {
      return NextResponse.json(
        { error: "Configurazione SMTP mancante nelle variabili d'ambiente." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `ASTRA Website <${mailFrom}>`,
      to: "erranteflavio@gmail.com",
      replyTo: applicantEmail,
      subject: `Nuova candidatura Call to Action - ${applicantName}`,
      text: [
        "Nuova candidatura ricevuta dal form Call to Action.",
        "",
        `Nome: ${applicantName}`,
        `Email: ${applicantEmail}`,
        `Area di interesse: ${area}`,
        `Disponibilità: ${availability}`,
        "",
        "Motivazione:",
        motivation,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1a1a1a;">
          <h2 style="color: #0f2f6e; margin-bottom: 16px;">Nuova candidatura Call to Action</h2>
          <p>È stata inviata una nuova candidatura dal sito ASTRA.</p>

          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: 700; width: 180px;">Nome</td>
              <td style="padding: 8px 0;">${escapeHtml(applicantName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 700;">Email</td>
              <td style="padding: 8px 0;">${escapeHtml(applicantEmail)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 700;">Area di interesse</td>
              <td style="padding: 8px 0;">${escapeHtml(area)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 700;">Disponibilità</td>
              <td style="padding: 8px 0;">${escapeHtml(availability)}</td>
            </tr>
          </table>

          <div style="margin-top: 20px;">
            <p style="font-weight: 700; margin-bottom: 8px;">Motivazione</p>
            <div style="padding: 14px 16px; background: #f5f7ff; border: 1px solid #dbe4ff; border-radius: 10px; white-space: pre-wrap;">
              ${escapeHtml(motivation)}
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Errore invio candidatura:", error);

    return NextResponse.json(
      { error: "Non sono riuscito a inviare la mail. Riprova tra poco." },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}