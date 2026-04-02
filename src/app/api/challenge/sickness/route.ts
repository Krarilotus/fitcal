import { NextResponse } from "next/server";
import {
  RegistrationApprovalDecision,
  RegistrationStatus,
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { CHALLENGE_START_DATE, canSubmitForDate } from "@/lib/challenge";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(getAppUrl("/login", request));
  }

  if (user.isLightParticipant) {
    return NextResponse.redirect(
      getAppUrl("/dashboard?error=Die%20Light-Variante%20nutzt%20keine%20Krankmeldungen", request),
    );
  }

  try {
    const formData = await request.formData();
    const challengeDate = String(formData.get("challengeDate") || "");
    const consent = String(formData.get("consent") || "");
    const notes = String(formData.get("notes") || "").trim();

    if (!challengeDate || challengeDate < CHALLENGE_START_DATE || !canSubmitForDate(challengeDate)) {
      throw new Error("Die Krankmeldung ist nur für heute oder gestern möglich.");
    }

    if (consent !== "on") {
      throw new Error("Bitte bestätige die Männergrippe-Erklärung.");
    }

    const reviewers = await prisma.user.findMany({
      where: {
        id: {
          not: user.id,
        },
        registrationStatus: RegistrationStatus.APPROVED,
        isLightParticipant: false,
      },
      select: {
        id: true,
      },
    });

    if (reviewers.length === 0) {
      throw new Error("Es gibt aktuell keine anderen Vollteilnehmer für die Bestätigung.");
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
        reviewStatus: "NOT_REQUIRED",
        verifiedPushupTotal: null,
        verifiedSitupTotal: null,
        reviewedAt: null,
        pushupSets: "[0,0]",
        situpSets: "[0,0]",
        notes: notes || "Männer-Grippe gemeldet",
        submittedAt: new Date(),
      },
      create: {
        userId: user.id,
        challengeDate,
        status: "SICK_PENDING",
        reviewStatus: "NOT_REQUIRED",
        pushupSets: "[0,0]",
        situpSets: "[0,0]",
        notes: notes || "Männer-Grippe gemeldet",
        submittedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    await prisma.sicknessVerification.deleteMany({
      where: {
        dailySubmissionId: submission.id,
      },
    });

    await prisma.sicknessVerification.createMany({
      data: reviewers.map((reviewer) => ({
        dailySubmissionId: submission.id,
        reviewerUserId: reviewer.id,
        decision: RegistrationApprovalDecision.PENDING,
        notes: null,
        decidedAt: null,
      })),
    });

    return NextResponse.redirect(
      getAppUrl("/dashboard?success=M%C3%A4nner-Grippe%20zur%20Abstimmung%20eingereicht", request),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Krankmeldung konnte nicht gespeichert werden.";

    return NextResponse.redirect(
      getAppUrl(`/dashboard?error=${encodeURIComponent(message)}`, request),
    );
  }
}
