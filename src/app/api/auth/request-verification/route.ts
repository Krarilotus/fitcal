import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmailVerificationMail } from "@/lib/auth/email";
import { createEmailVerificationToken } from "@/lib/auth/email-verification";
import { forgotPasswordSchema } from "@/lib/auth/validation";
import { getAppBaseUrl, getAppUrl } from "@/lib/auth/url";

export async function POST(request: Request) {
  const formData = await request.formData();

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
        "/verify-email?success=Wenn%20die%20Adresse%20existiert,%20wurde%20ein%20Bestaetigungslink%20versendet.",
        request,
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bestaetigungslink konnte nicht erstellt werden.";

    return NextResponse.redirect(
      getAppUrl(`/verify-email?error=${encodeURIComponent(message)}`, request),
    );
  }
}
