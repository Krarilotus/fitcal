import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { getDictionary } from "@/i18n";
import { getPreferredLocale } from "@/lib/preferences";
import {
  submitSickness,
  type SubmitSicknessError,
} from "@/application/challenge/submit-sickness";

function errorMessage(
  code: SubmitSicknessError,
  details: Record<string, string | number> | undefined,
  messages: ReturnType<typeof getDictionary>["api"]["sickness"],
) {
  if (code === "SICKNESS_NOT_AVAILABLE") return messages.lightDisabled;
  if (code === "INVALID_RANGE") return messages.invalidRange;
  if (code === "RANGE_OUTSIDE_CHALLENGE") return messages.rangeOutsideChallenge;
  if (code === "END_BEFORE_START") return messages.endBeforeStart;
  if (code === "RANGE_TOO_LONG") {
    return messages.rangeTooLong.replace("{days}", String(details?.days ?? 31));
  }
  if (code === "CONSENT_REQUIRED") return messages.consentRequired;
  if (code === "NO_REVIEWERS") return messages.noReviewers;
  if (code === "BLOCKED_SUBMISSION") {
    return messages.blockedSubmission.replace("{date}", String(details?.date ?? ""));
  }
  return messages.saveFailed;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const locale = await getPreferredLocale();
  const messages = getDictionary(locale).api.sickness;
  if (!user) return NextResponse.redirect(getAppUrl("/login", request));

  const formData = await request.formData();
  const fallbackDate = String(formData.get("challengeDate") || "");
  const result = await submitSickness({
    user,
    startDate: String(formData.get("startDate") || fallbackDate),
    endDate: String(formData.get("endDate") || formData.get("startDate") || fallbackDate),
    consent: formData.get("consent") === "on",
    notes: String(formData.get("notes") || "").trim(),
    defaultNotes: messages.defaultNotes,
  });

  if (!result.ok) {
    const message = errorMessage(result.error.code, result.error.details, messages);
    return NextResponse.redirect(
      getAppUrl(`/dashboard?error=${encodeURIComponent(message)}`, request),
    );
  }

  const message = result.value.dateKeys.length === 1
    ? messages.successSingle
    : messages.successMultiple.replace("{days}", String(result.value.dateKeys.length));
  return NextResponse.redirect(
    getAppUrl(`/dashboard?success=${encodeURIComponent(message)}`, request),
  );
}
