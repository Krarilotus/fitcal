import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendEmailVerificationMail,
  sendPasswordResetMail,
} from "@/lib/auth/email";
import { createEmailVerificationToken } from "@/lib/auth/email-verification";
import { createRandomToken, hashToken } from "@/lib/auth/token";
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
    });

    if (user?.emailVerified) {
      const token = createRandomToken();
      const tokenHash = hashToken(token);
      const requestHeaders = await headers();

      await prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          requestedByIp: requestHeaders.get("x-forwarded-for") || null,
          requestedByUa: requestHeaders.get("user-agent") || null,
        },
      });

      const resetLink = `${getAppBaseUrl(request)}/reset-password?token=${token}`;
      const delivered = await sendPasswordResetMail({
        to: user.email,
        resetLink,
      });

      await prisma.passwordResetToken.updateMany({
        where: {
          tokenHash,
        },
        data: {
          emailDelivered: delivered,
        },
      });
    } else if (user) {
      const verificationToken = await createEmailVerificationToken(user.email);
      const verifyLink = `${getAppBaseUrl(request)}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

      await sendEmailVerificationMail({
        to: user.email,
        verifyLink,
      });
    }

    return NextResponse.redirect(
      getAppUrl("/forgot-password?success=Wenn%20die%20Adresse%20existiert,%20wurde%20ein%20Link%20versendet.", request),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reset-Link konnte nicht erstellt werden.";

    return NextResponse.redirect(
      getAppUrl(`/forgot-password?error=${encodeURIComponent(message)}`, request),
    );
  }
}
