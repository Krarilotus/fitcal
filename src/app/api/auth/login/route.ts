import { NextResponse } from "next/server";
import { RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createUserSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { getAppUrl } from "@/lib/auth/url";
import { loginSchema } from "@/lib/auth/validation";
import { getApiMessages, localizedUrl } from "@/lib/i18n-api";
import { reconcileRegistrationStatus } from "@/lib/registration-approval";

export async function POST(request: Request) {
  const formData = await request.formData();
  const messages = (await getApiMessages()).auth;

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
      throw new Error(messages.loginFailed);
    }

    const passwordMatches = await verifyPassword(parsed.password, user.passwordHash);

    if (!passwordMatches) {
      throw new Error(messages.loginFailed);
    }

    const registrationStatus =
      user.registrationStatus === RegistrationStatus.PENDING
        ? await reconcileRegistrationStatus(prisma, user.id)
        : user.registrationStatus;

    if (registrationStatus === RegistrationStatus.PENDING) {
      throw new Error(messages.pendingApproval);
    }

    if (registrationStatus === RegistrationStatus.REJECTED) {
      throw new Error(messages.rejected);
    }

    await createUserSession(user.id);

    return NextResponse.redirect(getAppUrl("/dashboard", request));
  } catch (error) {
    const message = error instanceof Error ? error.message : messages.loginFailed;

    return NextResponse.redirect(
      localizedUrl(request, "/login", "error", message),
    );
  }
}
