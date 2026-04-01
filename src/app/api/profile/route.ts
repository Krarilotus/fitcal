import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { profileSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();

  try {
    const parsed = profileSchema.parse({
      name: formData.get("name"),
      birthDate: formData.get("birthDate"),
      heightCm: formData.get("heightCm"),
      motivation: formData.get("motivation"),
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: parsed.name || null,
        birthDate: parsed.birthDate ?? null,
        heightCm: parsed.heightCm ?? null,
        motivation: parsed.motivation || null,
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard?success=Profil%20gespeichert", request.url),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden.";

    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
