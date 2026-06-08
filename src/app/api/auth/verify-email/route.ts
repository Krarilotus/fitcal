import { NextResponse } from "next/server";
import { consumeEmailVerificationToken } from "@/lib/auth/email-verification";
import { getApiMessages, localizedUrl } from "@/lib/i18n-api";

export async function GET(request: Request) {
  const messages = (await getApiMessages()).auth;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return NextResponse.redirect(
      localizedUrl(request, "/login", "error", messages.verificationLinkInvalid),
    );
  }

  const verifiedEmail = await consumeEmailVerificationToken(token);

  if (!verifiedEmail) {
    return NextResponse.redirect(
      localizedUrl(request, "/login", "error", messages.verificationLinkExpired),
    );
  }

  return NextResponse.redirect(
    localizedUrl(request, "/login", "success", messages.emailVerified),
  );
}
