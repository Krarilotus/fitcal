import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createUserSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  const formData = await request.formData();

  try {
    const parsed = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const user = await prisma.user.findUnique({
      where: {
        email: parsed.email,
      },
    });

    if (!user) {
      throw new Error("Login fehlgeschlagen.");
    }

    const passwordMatches = await verifyPassword(parsed.password, user.passwordHash);

    if (!passwordMatches) {
      throw new Error("Login fehlgeschlagen.");
    }

    await createUserSession(user.id);

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login fehlgeschlagen.";

    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
