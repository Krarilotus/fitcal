import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/token";
import { resetPasswordSchema } from "@/lib/auth/validation";
import { getApiMessages, localizedUrl } from "@/lib/i18n-api";

export async function POST(request: Request) {
  const formData = await request.formData();
  const messages = (await getApiMessages()).auth;

  try {
    const parsed = resetPasswordSchema.parse({
      token: formData.get("token"),
      password: formData.get("password"),
    });

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash: hashToken(parsed.token),
      },
      include: {
        user: true,
      },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      throw new Error(messages.resetLinkInvalid);
    }

    const newPasswordHash = await hashPassword(parsed.password);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          passwordHash: newPasswordHash,
        },
      }),
      prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),
      prisma.session.deleteMany({
        where: {
          userId: resetToken.userId,
        },
      }),
    ]);

    return NextResponse.redirect(
      localizedUrl(request, "/login", "success", messages.passwordChanged),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : messages.passwordChangeFailed;

    return NextResponse.redirect(
      localizedUrl(request, "/reset-password", "error", message),
    );
  }
}
