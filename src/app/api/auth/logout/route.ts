import { NextResponse } from "next/server";
import { clearUserSession } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";

export async function POST(request: Request) {
  await clearUserSession();

  return NextResponse.redirect(getAppUrl("/", request));
}
