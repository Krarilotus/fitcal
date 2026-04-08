import { NextResponse } from "next/server";
import { RegistrationStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/auth/url";

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
  const inviteId = formData.get("inviteId");

  if (typeof inviteId !== "string" || !inviteId.trim()) {
    return NextResponse.redirect(
      getAppUrl("/dashboard?error=Einladung%20konnte%20nicht%20zurueckgezogen%20werden.", request),
    );
  }

  const deleted = await prisma.appInvite.deleteMany({
    where: {
      id: inviteId,
      invitedByUserId: user.id,
      acceptedAt: null,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.redirect(
      getAppUrl("/dashboard?error=Einladung%20wurde%20nicht%20gefunden%20oder%20ist%20bereits%20verwendet.", request),
    );
  }

  return NextResponse.redirect(
    getAppUrl("/dashboard?success=Einladung%20zurueckgezogen", request),
  );
}
