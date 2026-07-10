import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/auth/url";
import { getCurrentUser } from "@/lib/auth/session";
import { dashboardMessageUrl, getApiMessages } from "@/lib/i18n-api";
import { applyJoker } from "@/application/challenge/apply-joker";

export const runtime = "nodejs";

function redirectTo(url: string | URL) {
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const messages = (await getApiMessages()).challenge;

  if (!user) {
    return redirectTo(getAppUrl("/login", request));
  }

  const formData = await request.formData();
  const challengeDate = String(formData.get("challengeDate") || "");
  const result = await applyJoker({ user, challengeDate, notes: messages.jokerNotes });

  if (!result.ok) {
    const errorMessage = result.error.code === "JOKER_NOT_AVAILABLE"
      ? messages.jokerLightDisabled
      : result.error.code === "JOKER_NONE_LEFT"
        ? messages.jokerNoneLeft
        : messages.jokerCannotApply;
    return redirectTo(dashboardMessageUrl(request, "error", errorMessage));
  }

  return redirectTo(dashboardMessageUrl(request, "success", messages.jokerSaved));
}
