import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { dashboardMessageUrl, getApiMessages } from "@/lib/i18n-api";
import { deleteWorkout } from "@/application/workouts/delete-workout";

export const runtime = "nodejs";

function redirectTo(url: string | URL) {
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const messages = (await getApiMessages()).submissions;

  if (!user) {
    return redirectTo(getAppUrl("/login", request));
  }

  const formData = await request.formData();
  const challengeDate = String(formData.get("challengeDate") || "");
  const result = await deleteWorkout({ userId: user.id, challengeDate });

  if (!result.ok) {
    const message = result.error.code === "WORKOUT_DATE_MISSING"
      ? messages.claimMissing
      : result.error.code === "WORKOUT_LOCKED"
        ? messages.claimDeleteLocked
        : messages.claimNotYours;
    return redirectTo(dashboardMessageUrl(request, "error", message));
  }

  return redirectTo(dashboardMessageUrl(request, "success", messages.claimDeleted));
}
