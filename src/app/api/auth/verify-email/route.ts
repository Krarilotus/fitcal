import { NextResponse } from "next/server";
import { consumeEmailVerificationToken } from "@/lib/auth/email-verification";
import { getAppUrl } from "@/lib/auth/url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return NextResponse.redirect(
      getAppUrl(
        "/login?error=Der%20Bestaetigungslink%20ist%20ungueltig.",
        request,
      ),
    );
  }

  const verifiedEmail = await consumeEmailVerificationToken(token);

  if (!verifiedEmail) {
    return NextResponse.redirect(
      getAppUrl(
        "/login?error=Der%20Bestaetigungslink%20ist%20ungueltig%20oder%20abgelaufen.",
        request,
      ),
    );
  }

  return NextResponse.redirect(
    getAppUrl(
      "/login?success=E-Mail-Adresse%20erfolgreich%20bestaetigt.%20Du%20kannst%20dich%20jetzt%20einloggen.",
      request,
    ),
  );
}
