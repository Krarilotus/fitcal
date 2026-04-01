import { Resend } from "resend";

type PasswordResetMailParams = {
  to: string;
  resetLink: string;
};

let cachedClient: Resend | null = null;

function hasResendConfig(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

function getResendClient(): Resend | null {
  if (!hasResendConfig()) {
    return null;
  }
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new Resend(process.env.RESEND_API_KEY);

  return cachedClient;
}

export async function sendPasswordResetMail(
  params: PasswordResetMailParams,
): Promise<boolean> {
  const resend = getResendClient();

  if (!resend) {
    console.info(
      `[fitcal-auth] Resend nicht konfiguriert. Reset-Link für ${params.to}: ${params.resetLink}`,
    );
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: [params.to],
      replyTo: process.env.RESEND_REPLY_TO || undefined,
      subject: "FitCal Passwort zurücksetzen",
      text: `Du hast ein Passwort-Reset angefordert. Link (24h gültig): ${params.resetLink}`,
      html: `<p>Du hast ein Passwort-Reset angefordert.</p><p><a href="${params.resetLink}">Passwort zurücksetzen</a> (24h gültig)</p>`,
    });

    if (error) {
      console.error("[fitcal-auth] Fehler beim Versand über Resend:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[fitcal-auth] Fehler beim Mailversand:", error);
    return false;
  }
}
