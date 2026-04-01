import { NextResponse } from "next/server";
import {
  RegistrationApprovalDecision,
  RegistrationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CHALLENGE_START_DATE, canSubmitForDate } from "@/lib/challenge";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user.isLightParticipant) {
    return NextResponse.redirect(
      new URL("/dashboard?error=Die%20Light-Variante%20nutzt%20keine%20Krankmeldungen", request.url),
    );
  }

  try {
    const formData = await request.formData();
    const challengeDate = String(formData.get("challengeDate") || "");
    const reviewerUserId = String(formData.get("reviewerUserId") || "");
    const notes = String(formData.get("notes") || "").trim();

    if (!challengeDate || challengeDate < CHALLENGE_START_DATE || !canSubmitForDate(challengeDate)) {
      throw new Error("Die Krankmeldung ist nur für heute oder gestern möglich.");
    }

    if (!reviewerUserId || reviewerUserId === user.id) {
      throw new Error("Bitte wähle einen anderen Nutzer für die Bestätigung.");
    }

    const reviewer = await prisma.user.findFirst({
      where: {
        id: reviewerUserId,
        registrationStatus: RegistrationStatus.APPROVED,
        isLightParticipant: false,
      },
      select: {
        id: true,
      },
    });

    if (!reviewer) {
      throw new Error("Der ausgewählte Nutzer kann die Krankmeldung nicht bestätigen.");
    }

    const existingSubmission = await prisma.dailySubmission.findUnique({
      where: {
        userId_challengeDate: {
          userId: user.id,
          challengeDate,
        },
      },
      include: {
        videos: true,
      },
    });

    if (existingSubmission?.videos.length) {
      throw new Error("Für diesen Tag gibt es bereits Uploads.");
    }

    const submission = await prisma.dailySubmission.upsert({
      where: {
        userId_challengeDate: {
          userId: user.id,
          challengeDate,
        },
      },
      update: {
        status: "SICK_PENDING",
        pushupSets: "[0,0]",
        situpSets: "[0,0]",
        notes: notes || "Männer-Grippe gemeldet",
        submittedAt: new Date(),
      },
      create: {
        userId: user.id,
        challengeDate,
        status: "SICK_PENDING",
        pushupSets: "[0,0]",
        situpSets: "[0,0]",
        notes: notes || "Männer-Grippe gemeldet",
        submittedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    await prisma.sicknessVerification.upsert({
      where: {
        dailySubmissionId: submission.id,
      },
      update: {
        reviewerUserId,
        decision: RegistrationApprovalDecision.PENDING,
        notes: notes || null,
        decidedAt: null,
      },
      create: {
        dailySubmissionId: submission.id,
        reviewerUserId,
        decision: RegistrationApprovalDecision.PENDING,
        notes: notes || null,
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard?success=M%C3%A4nner-Grippe%20zur%20Best%C3%A4tigung%20eingereicht", request.url),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Krankmeldung konnte nicht gespeichert werden.";

    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
