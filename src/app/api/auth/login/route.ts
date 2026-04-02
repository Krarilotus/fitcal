import { NextResponse } from "next/server";
import { RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createUserSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { getAppUrl } from "@/lib/auth/url";
import { loginSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  const formData = await request.formData();

  try {
    const parsed = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const user = await prisma.user.findUnique({
      where: {
        email: parsed.email,
      },
    });

    if (!user) {
      throw new Error("Login fehlgeschlagen.");
    }

    const passwordMatches = await verifyPassword(parsed.password, user.passwordHash);

    if (!passwordMatches) {
      throw new Error("Login fehlgeschlagen.");
    }

    if (user.registrationStatus === RegistrationStatus.PENDING) {
      throw new Error("Dein Account wartet noch auf Freigabe.");
    }

    if (user.registrationStatus === RegistrationStatus.REJECTED) {
      throw new Error("Dein Account wurde nicht freigegeben.");
    }

    if (!user.emailVerified) {
      throw new Error(
        "Bitte bestaetige zuerst deine E-Mail-Adresse. Ueber Passwort vergessen kannst du dir notfalls eine neue Bestaetigungs-Mail zusenden.",
      );
    }

    await createUserSession(user.id);

    return NextResponse.redirect(getAppUrl("/dashboard", request));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login fehlgeschlagen.";

    return NextResponse.redirect(
      getAppUrl(`/login?error=${encodeURIComponent(message)}`, request),
    );
  }
}
