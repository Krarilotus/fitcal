import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createUserSession } from "@/lib/auth/session";
import { registerSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  const formData = await request.formData();

  try {
    const parsed = registerSchema.parse({
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
    });

    const existingUser = await prisma.user.findUnique({
      where: {
        email: parsed.email,
      },
    });

    if (existingUser) {
      return NextResponse.redirect(
        new URL("/register?error=E-Mail%20existiert%20bereits", request.url),
      );
    }

    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        name: parsed.name || null,
        passwordHash: await hashPassword(parsed.password),
      },
    });

    await createUserSession(user.id);

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registrierung fehlgeschlagen";

    return NextResponse.redirect(
      new URL(`/register?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
