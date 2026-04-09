import { NextResponse } from "next/server";
import { RegistrationStatus } from "@prisma/client";
import { z } from "zod";
import { getAppUrl } from "@/lib/auth/url";
import { getCurrentUser } from "@/lib/auth/session";
import { createGitHubFeatureRequestIssue } from "@/lib/github/feature-requests";

const featureRequestSchema = z.object({
  title: z.string().trim().max(120).optional().default(""),
  details: z.string().trim().min(10).max(4000),
  locale: z.string().trim().min(2).max(12).optional().default("de"),
});

function getFeatureRequestMessages(locale: string) {
  if (locale === "en") {
    return {
      invalid: "Please describe your feature request briefly and clearly.",
      success: (issueNumber: number) => `Feature request sent (#${issueNumber})`,
      unexpected: "Feature request could not be created.",
    };
  }

  return {
    invalid: "Bitte beschreibe dein Feature kurz und klar.",
    success: (issueNumber: number) => `Feature-Request gesendet (#${issueNumber})`,
    unexpected: "Feature-Request konnte nicht erstellt werden.",
  };
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
    const messages = getFeatureRequestMessages(parsed.locale);

    const issue = await createGitHubFeatureRequestIssue({
      details: parsed.details,
      locale: parsed.locale,
      requesterEmail: user.email,
      requesterId: user.id,
      requesterName: user.name,
      title: parsed.title,
    });

    return redirectToDashboardMessage(
      request,
      "success",
      messages.success(issue.number),
    );
  } catch (error) {
    const messages = getFeatureRequestMessages(requestedLocale);
    const message =
      error instanceof z.ZodError
        ? messages.invalid
        : messages.unexpected;

    return redirectToDashboardMessage(request, "error", message);
  }
}
