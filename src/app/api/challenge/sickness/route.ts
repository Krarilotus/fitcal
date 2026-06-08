import { NextResponse } from "next/server";
import {
  RegistrationApprovalDecision,
  RegistrationStatus,
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import {
  CHALLENGE_START_DATE,
  addDaysToDateKey,
  differenceInDays,
  isWithinChallenge,
} from "@/lib/challenge";
import { prisma } from "@/lib/db";

const MAX_SICKNESS_RANGE_DAYS = 31;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function buildDateRange(startDate: string, endDate: string) {
  if (!DATE_KEY_PATTERN.test(startDate) || !DATE_KEY_PATTERN.test(endDate)) {
    throw new Error("Bitte wähle einen gültigen Zeitraum.");
  }

  if (!isWithinChallenge(startDate) || !isWithinChallenge(endDate)) {
    throw new Error("Der Zeitraum muss innerhalb der Challenge liegen.");
  }

  const rangeLength = differenceInDays(startDate, endDate) + 1;

  if (rangeLength < 1) {
    throw new Error("Das Enddatum darf nicht vor dem Startdatum liegen.");
  }

  if (rangeLength > MAX_SICKNESS_RANGE_DAYS) {
    throw new Error(`Bitte reiche maximal ${MAX_SICKNESS_RANGE_DAYS} Krankheitstage auf einmal ein.`);
  }

  return Array.from({ length: rangeLength }, (_, index) => addDaysToDateKey(startDate, index));
}

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
    const fallbackDate = String(formData.get("challengeDate") || "");
    const startDate = String(formData.get("startDate") || fallbackDate);
    const endDate = String(formData.get("endDate") || startDate);
    const consent = String(formData.get("consent") || "");
    const notes = String(formData.get("notes") || "").trim();
    const dateKeys = buildDateRange(startDate, endDate);

    if (dateKeys.some((dateKey) => dateKey < CHALLENGE_START_DATE)) {
      throw new Error("Die Krankmeldung ist nur innerhalb der Challenge möglich.");
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

    const existingSubmissions = await prisma.dailySubmission.findMany({
      where: {
        userId: user.id,
        challengeDate: {
          in: dateKeys,
        },
      },
      include: {
        videos: true,
      },
    });

    const blockedSubmission = existingSubmissions.find((submission) =>
      submission.videos.length > 0 ||
      submission.status === "COMPLETED" ||
      submission.status === "JOKER"
    );

    if (blockedSubmission) {
      throw new Error(`Für den ${blockedSubmission.challengeDate} gibt es bereits einen Workout- oder Joker-Eintrag.`);
    }

    await prisma.$transaction(async (tx) => {
      for (const challengeDate of dateKeys) {
        const submission = await tx.dailySubmission.upsert({
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

        await tx.sicknessVerification.deleteMany({
          where: {
            dailySubmissionId: submission.id,
          },
        });

        await tx.sicknessVerification.createMany({
          data: reviewers.map((reviewer) => ({
            dailySubmissionId: submission.id,
            reviewerUserId: reviewer.id,
            decision: RegistrationApprovalDecision.PENDING,
            notes: null,
            decidedAt: null,
          })),
        });
      }
    });

    return NextResponse.redirect(
      getAppUrl(`/dashboard?success=${encodeURIComponent(
        dateKeys.length === 1
          ? "Männer-Grippe zur Abstimmung eingereicht"
          : `${dateKeys.length} Krankheitstage zur Abstimmung eingereicht`,
      )}`, request),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Krankmeldung konnte nicht gespeichert werden.";

    return NextResponse.redirect(
      getAppUrl(`/dashboard?error=${encodeURIComponent(message)}`, request),
    );
  }
}
