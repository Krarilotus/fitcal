import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { profileSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(getAppUrl("/login", request));
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
      getAppUrl("/dashboard?success=Profil%20gespeichert", request),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden.";

    return NextResponse.redirect(
      getAppUrl(`/dashboard?error=${encodeURIComponent(message)}`, request),
    );
  }
}
