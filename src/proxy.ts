import { type NextRequest, NextResponse } from "next/server";
import { isLightPreview, PREVIEW_MODE_COOKIE } from "@/lib/preview-mode";

const PREVIEW_ALLOWED_MUTATIONS = new Set([
  "/api/auth/logout",
  "/api/preview-mode",
]);

export function proxy(request: NextRequest) {
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    request.method !== "OPTIONS" &&
    !request.nextUrl.pathname.startsWith("/api/auth/") &&
    !PREVIEW_ALLOWED_MUTATIONS.has(request.nextUrl.pathname) &&
    isLightPreview(request.cookies.get(PREVIEW_MODE_COOKIE)?.value)
  ) {
    return NextResponse.redirect(new URL("/dashboard?error=preview_read_only", request.url), {
      status: 303,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
