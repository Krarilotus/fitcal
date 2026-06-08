import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { profileSchema } from "@/lib/auth/validation";
import { dashboardMessageUrl, getApiMessages } from "@/lib/i18n-api";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const messages = (await getApiMessages()).dashboardActions;

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
      dashboardMessageUrl(request, "success", messages.profileSaved),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : messages.profileSaveFailed;

    return NextResponse.redirect(
      dashboardMessageUrl(request, "error", message),
    );
  }
}
