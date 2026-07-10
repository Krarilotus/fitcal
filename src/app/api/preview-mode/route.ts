import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { LIGHT_PREVIEW_VALUE, PREVIEW_MODE_COOKIE } from "@/lib/preview-mode";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(getAppUrl("/login", request), { status: 303 });
  }

  const formData = await request.formData();
  const enableLightPreview =
    !user.isLightParticipant && formData.get("mode") === LIGHT_PREVIEW_VALUE;
  const response = NextResponse.redirect(getAppUrl("/dashboard", request), { status: 303 });

  if (enableLightPreview) {
    response.cookies.set(PREVIEW_MODE_COOKIE, LIGHT_PREVIEW_VALUE, {
      httpOnly: true,
      maxAge: 60 * 60 * 8,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    response.cookies.delete(PREVIEW_MODE_COOKIE);
  }

  return response;
}
