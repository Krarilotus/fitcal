import { NextResponse } from "next/server";
import { RegistrationStatus } from "@prisma/client";
import { z } from "zod";
import { getAppUrl } from "@/lib/auth/url";
import { getCurrentUser } from "@/lib/auth/session";
import { createGitHubFeatureRequestIssue } from "@/lib/github/feature-requests";
import { getDictionary } from "@/i18n";
import { defaultLocale, supportedLocales, type Locale } from "@/lib/preferences";
import { withMessage } from "@/lib/i18n-api";

const featureRequestSchema = z.object({
  title: z.string().trim().max(120).optional().default(""),
  details: z.string().trim().min(10).max(4000),
  locale: z.string().trim().min(2).max(12).optional().default("de"),
});

function getFeatureRequestMessages(locale: string) {
  return getDictionary(normalizeFeatureRequestLocale(locale)).api.dashboardActions;
}

function normalizeFeatureRequestLocale(locale: string): Locale {
  const normalizedLocale = supportedLocales.includes(locale as Locale)
    ? (locale as Locale)
    : defaultLocale;

  return normalizedLocale;
}

function redirectToDashboardMessage(
  request: Request,
  type: "success" | "error",
  message: string,
) {
  return NextResponse.redirect(
    getAppUrl(`/dashboard?${type}=${encodeURIComponent(message)}`, request),
    { status: 303 },
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.registrationStatus !== RegistrationStatus.APPROVED) {
    return NextResponse.redirect(getAppUrl("/login", request), { status: 303 });
  }

  let requestedLocale = "de";

  try {
    const formData = await request.formData();
    requestedLocale =
      typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "de";
    const parsed = featureRequestSchema.parse({
      title: formData.get("title"),
      details: formData.get("details"),
      locale: requestedLocale,
    });
    const locale = normalizeFeatureRequestLocale(parsed.locale);
    const messages = getDictionary(locale).api.dashboardActions;

    const issue = await createGitHubFeatureRequestIssue({
      details: parsed.details,
      issueCopy: getDictionary(locale).dashboard.featureRequest.issueCopy,
      locale,
      requesterName: user.name,
      title: parsed.title,
    });

    return redirectToDashboardMessage(
      request,
      "success",
      withMessage(messages.featureSuccess, { number: issue.number }),
    );
  } catch (error) {
    const messages = getFeatureRequestMessages(requestedLocale);
    const message =
      error instanceof z.ZodError
        ? messages.featureInvalid
        : messages.featureUnexpected;

    return redirectToDashboardMessage(request, "error", message);
  }
}
