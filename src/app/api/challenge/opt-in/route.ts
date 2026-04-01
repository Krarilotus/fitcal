import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.redirect(
    new URL(
      "/dashboard?success=Die%20Challenge%20startet%20direkt%20mit%20deinen%20Uploads",
      request.url,
    ),
  );
}
