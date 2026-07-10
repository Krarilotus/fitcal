import { NextResponse } from "next/server";
import { clearUserSession } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { PREVIEW_MODE_COOKIE } from "@/lib/preview-mode";

export async function POST(request: Request) {
  await clearUserSession();

  const response = NextResponse.redirect(getAppUrl("/", request));
  response.cookies.delete(PREVIEW_MODE_COOKIE);
  return response;
}
