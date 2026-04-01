import { Resend } from "resend";

type PasswordResetMailParams = {
  to: string;
  resetLink: string;
};

type RegistrationDecisionMailParams = {
  to: string;
  name?: string | null;
};

type AppInviteMailParams = {
  to: string;
  invitedByName?: string | null;
  inviteLink: string;
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

async function sendMail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const resend = getResendClient();

  if (!resend) {
    console.info(
      `[fitcal-auth] Resend nicht konfiguriert. Mail an ${params.to}: ${params.subject}`,
    );
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: [params.to],
      replyTo: process.env.RESEND_REPLY_TO || undefined,
      subject: params.subject,
      text: params.text,
      html: params.html,
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

export async function sendPasswordResetMail(
  params: PasswordResetMailParams,
): Promise<boolean> {
  return sendMail({
    to: params.to,
    subject: "FitCal Passwort zurücksetzen",
    text: `Du hast ein Passwort-Reset angefordert. Link (24h gültig): ${params.resetLink}`,
    html: `<p>Du hast ein Passwort-Reset angefordert.</p><p><a href="${params.resetLink}">Passwort zurücksetzen</a> (24h gültig)</p>`,
  });
}

export async function sendRegistrationApprovedMail(
  params: RegistrationDecisionMailParams,
): Promise<boolean> {
  const greeting = params.name?.trim() ? `Hallo ${params.name},` : "Hallo,";

  return sendMail({
    to: params.to,
    subject: "FitCal Registrierung bestätigt",
    text: `${greeting}\n\ndein Zugang zu FitCal wurde freigegeben. Du kannst dich jetzt mit deiner E-Mail und deinem Passwort anmelden.`,
    html: `<p>${greeting}</p><p>dein Zugang zu FitCal wurde freigegeben.</p><p>Du kannst dich jetzt mit deiner E-Mail und deinem Passwort anmelden.</p>`,
  });
}

export async function sendRegistrationRejectedMail(
  params: RegistrationDecisionMailParams,
): Promise<boolean> {
  const greeting = params.name?.trim() ? `Hallo ${params.name},` : "Hallo,";

  return sendMail({
    to: params.to,
    subject: "FitCal Registrierung nicht freigegeben",
    text: `${greeting}\n\ndeine Registrierung wurde leider nicht freigegeben. Du hast damit aktuell keinen Zugang zur Plattform.`,
    html: `<p>${greeting}</p><p>deine Registrierung wurde leider nicht freigegeben.</p><p>Du hast damit aktuell keinen Zugang zur Plattform.</p>`,
  });
}

export async function sendAppInviteMail(
  params: AppInviteMailParams,
): Promise<boolean> {
  const inviter = params.invitedByName?.trim() || "Jemand aus FitCal";

  return sendMail({
    to: params.to,
    subject: "Einladung zu FitCal",
    text: `${inviter} hat dich zu FitCal eingeladen.\n\nÜber diesen Link kannst du deinen Account anlegen und wirst dabei direkt freigeschaltet:\n${params.inviteLink}`,
    html: `<p>${inviter} hat dich zu FitCal eingeladen.</p><p><a href="${params.inviteLink}">Account anlegen und direkt freischalten</a></p>`,
  });
}
