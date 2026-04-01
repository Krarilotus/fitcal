import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/token";
import { resetPasswordSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  const formData = await request.formData();

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
      throw new Error("Der Reset-Link ist ungueltig oder abgelaufen.");
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
      new URL("/login?success=Passwort%20erfolgreich%20geaendert", request.url),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Passwort konnte nicht gesetzt werden.";

    return NextResponse.redirect(
      new URL(`/reset-password?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
