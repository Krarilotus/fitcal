import nodemailer from "nodemailer";

type PasswordResetMailParams = {
  to: string;
  resetLink: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function hasSmtpConfig(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      (process.env.SMTP_FROM || process.env.MAIL_FROM),
  );
}

function getTransporter(): nodemailer.Transporter | null {
  if (!hasSmtpConfig()) {
    return null;
  }
  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedTransporter;
}

export async function sendPasswordResetMail(
  params: PasswordResetMailParams,
): Promise<boolean> {
  const transporter = getTransporter();

  if (!transporter) {
    console.info(
      `[fitcal-auth] SMTP nicht konfiguriert. Reset-Link fuer ${params.to}: ${params.resetLink}`,
    );
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.MAIL_FROM,
      to: params.to,
      subject: "Fitcal Passwort zuruecksetzen",
      text: `Du hast ein Passwort-Reset angefordert. Link (24h gueltig): ${params.resetLink}`,
      html: `<p>Du hast ein Passwort-Reset angefordert.</p><p><a href="${params.resetLink}">Passwort zuruecksetzen</a> (24h gueltig)</p>`,
    });
    return true;
  } catch (error) {
    console.error("[fitcal-auth] Fehler beim Mailversand:", error);
    return false;
  }
}
