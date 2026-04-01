import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { measurementSchema } from "@/lib/auth/validation";
import { normalizeMeasurementDate } from "@/lib/measurements";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();

  try {
    const parsed = measurementSchema.parse({
      waistCircumferenceCm: formData.get("waistCircumferenceCm"),
      weightKg: formData.get("weightKg"),
      restingPulseBpm: formData.get("restingPulseBpm"),
      notes: formData.get("notes"),
    });

    await prisma.measurementEntry.create({
      data: {
        userId: user.id,
        measuredAt: normalizeMeasurementDate(),
        waistCircumferenceCm: parsed.waistCircumferenceCm,
        weightKg: parsed.weightKg,
        restingPulseBpm:
          parsed.restingPulseBpm !== undefined
            ? Math.round(parsed.restingPulseBpm)
            : null,
        notes: parsed.notes || null,
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard?success=Messwert%20gespeichert", request.url),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Messwert konnte nicht gespeichert werden.";

    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
