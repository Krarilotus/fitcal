import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createUserSession } from "@/lib/auth/session";
import { registerSchema } from "@/lib/auth/validation";
import { normalizeMeasurementDate } from "@/lib/measurements";

export async function POST(request: Request) {
  const formData = await request.formData();

  try {
    const parsed = registerSchema.parse({
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
      birthDate: formData.get("birthDate"),
      heightCm: formData.get("heightCm"),
      waistCircumferenceCm: formData.get("waistCircumferenceCm"),
      weightKg: formData.get("weightKg"),
      motivation: formData.get("motivation"),
      isStudentDiscount: formData.get("isStudentDiscount"),
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

    const passwordHash = await hashPassword(parsed.password);
    const shouldCreateMeasurement =
      parsed.waistCircumferenceCm !== undefined || parsed.weightKg !== undefined;

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: parsed.email,
          name: parsed.name || null,
          passwordHash,
          isStudentDiscount: parsed.isStudentDiscount,
          birthDate: parsed.birthDate ?? null,
          heightCm: parsed.heightCm ?? null,
          motivation: parsed.motivation || null,
        },
      });

      if (shouldCreateMeasurement) {
        await tx.measurementEntry.create({
          data: {
            userId: createdUser.id,
            measuredAt: normalizeMeasurementDate(),
            waistCircumferenceCm: parsed.waistCircumferenceCm,
            weightKg: parsed.weightKg,
            notes: "Startwert bei Registrierung",
          },
        });
      }

      return createdUser;
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
