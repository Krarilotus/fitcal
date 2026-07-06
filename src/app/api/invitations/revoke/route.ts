import { NextResponse } from "next/server";
import { RegistrationStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/auth/url";
import { dashboardMessageUrl, getApiMessages } from "@/lib/i18n-api";
import { canReviewPlatformContent } from "@/lib/participation-policy";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const messages = (await getApiMessages()).dashboardActions;

  if (
    !user ||
    user.registrationStatus !== RegistrationStatus.APPROVED ||
    !canReviewPlatformContent(user)
  ) {
    return NextResponse.redirect(getAppUrl("/login", request));
  }

  const formData = await request.formData();
  const inviteId = formData.get("inviteId");

  if (typeof inviteId !== "string" || !inviteId.trim()) {
    return NextResponse.redirect(
      dashboardMessageUrl(request, "error", messages.inviteRevokeFailed),
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
      dashboardMessageUrl(request, "error", messages.inviteRevokeMissing),
    );
  }

  return NextResponse.redirect(
    dashboardMessageUrl(request, "success", messages.inviteRevoked),
  );
}
