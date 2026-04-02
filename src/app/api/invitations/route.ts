import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { RegistrationStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { sendAppInviteMail } from "@/lib/auth/email";
import { getAppBaseUrl, getAppUrl } from "@/lib/auth/url";
import { inviteSchema } from "@/lib/auth/validation";

const INVITE_DURATION_DAYS = 14;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (
    !user ||
    user.registrationStatus !== RegistrationStatus.APPROVED ||
    user.isLightParticipant
  ) {
    return NextResponse.redirect(getAppUrl("/login", request));
  }

  const formData = await request.formData();

  try {
    const parsed = inviteSchema.parse({
      email: formData.get("email"),
    });

    const existingUser = await prisma.user.findUnique({
      where: {
        email: parsed.email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new Error("Diese E-Mail ist bereits registriert.");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashInviteToken(token);
    const expiresAt = addDays(new Date(), INVITE_DURATION_DAYS);

    await prisma.appInvite.create({
      data: {
        email: parsed.email,
        tokenHash,
        invitedByUserId: user.id,
        expiresAt,
      },
    });

    const inviteLink = `${getAppBaseUrl(request)}/register?invite=${encodeURIComponent(token)}`;

    await sendAppInviteMail({
      to: parsed.email,
      invitedByName: user.name ?? user.email,
      inviteLink,
    });

    return NextResponse.redirect(
      getAppUrl("/dashboard?success=Einladung%20verschickt", request),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Einladung konnte nicht verschickt werden.";

    return NextResponse.redirect(
      getAppUrl(`/dashboard?error=${encodeURIComponent(message)}`, request),
    );
  }
}
