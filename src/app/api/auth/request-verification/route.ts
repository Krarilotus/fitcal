import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmailVerificationMail } from "@/lib/auth/email";
import { createEmailVerificationToken } from "@/lib/auth/email-verification";
import { forgotPasswordSchema } from "@/lib/auth/validation";
import { getAppBaseUrl, getAppUrl } from "@/lib/auth/url";

function getMessages(locale: string) {
  if (locale === "en") {
    return {
      success: "If the address exists, a verification link has been sent.",
      fallbackError: "Verification link could not be created.",
    };
  }

  return {
    success: "Wenn die Adresse existiert, wurde ein Bestaetigungslink versendet.",
    fallbackError: "Bestaetigungslink konnte nicht erstellt werden.",
  };
}

function getSafeRedirectPath(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== "string") {
    return "/verify-email";
  }

  const trimmed = rawValue.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/verify-email";
  }

  return trimmed;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "de";
  const redirectPath = getSafeRedirectPath(formData.get("redirectTo"));
  const messages = getMessages(locale);

  try {
    const parsed = forgotPasswordSchema.parse({
      email: formData.get("email"),
    });

    const user = await prisma.user.findUnique({
      where: {
        email: parsed.email,
      },
      select: {
        email: true,
        emailVerified: true,
      },
    });

    if (user && !user.emailVerified) {
      const verificationToken = await createEmailVerificationToken(user.email);
      const verifyLink = `${getAppBaseUrl(request)}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

      await sendEmailVerificationMail({
        to: user.email,
        verifyLink,
      });
    }

    return NextResponse.redirect(
      getAppUrl(
        `${redirectPath}?success=${encodeURIComponent(messages.success)}`,
        request,
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : messages.fallbackError;

    return NextResponse.redirect(
      getAppUrl(`${redirectPath}?error=${encodeURIComponent(message)}`, request),
    );
  }
}
