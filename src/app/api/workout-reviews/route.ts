import { NextResponse } from "next/server";
import {
  RegistrationStatus,
  WorkoutReviewDecision,
  WorkoutReviewStage,
  WorkoutReviewStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getSetsTotal } from "@/lib/submission";

const REVIEW_REWARD_CENTS = 5;

function clampCount(value: FormDataEntryValue | null, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(max, Math.floor(parsed)));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (
    !user ||
    user.registrationStatus !== RegistrationStatus.APPROVED ||
    user.isLightParticipant
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const submissionId = String(formData.get("submissionId") || "");
  const mode = String(formData.get("mode") || "").toLowerCase();
  const decisionValue = String(formData.get("decision") || "").toLowerCase();
  const notes = String(formData.get("notes") || "").trim();

  if (!submissionId || (mode !== "primary" && mode !== "arbitration")) {
    return NextResponse.redirect(
      new URL("/dashboard?error=Review%20konnte%20nicht%20gespeichert%20werden", request.url),
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const submission = await tx.dailySubmission.findUnique({
        where: {
          id: submissionId,
        },
        include: {
          user: {
            select: {
              id: true,
              isLightParticipant: true,
              registrationStatus: true,
            },
          },
          workoutReviews: {
            orderBy: {
              createdAt: "asc",
            },
          },
          videos: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!submission) {
        throw new Error("Der Eintrag existiert nicht mehr.");
      }

      if (submission.userId === user.id) {
        throw new Error("Eigene Uploads kannst du nicht reviewen.");
      }

      if (
        submission.user.registrationStatus !== RegistrationStatus.APPROVED ||
        submission.user.isLightParticipant
      ) {
        throw new Error("Dieser Eintrag ist nicht reviewbar.");
      }

      if (submission.status !== "COMPLETED" || submission.videos.length === 0) {
        throw new Error("Nur dokumentierte Uploads können reviewt werden.");
      }

      const rawPushups = getSetsTotal(submission.pushupSets);
      const rawSitups = getSetsTotal(submission.situpSets);

      if (mode === "primary") {
        if (
          submission.reviewStatus !== WorkoutReviewStatus.PENDING &&
          submission.reviewStatus !== WorkoutReviewStatus.REVISION_REQUESTED
        ) {
          throw new Error("Dieser Eintrag wartet gerade nicht auf ein Erstreview.");
        }

        if (
          submission.workoutReviews.some(
            (review) =>
              review.stage === WorkoutReviewStage.PRIMARY &&
              review.reviewerUserId === user.id,
          )
        ) {
          throw new Error("Du hast diesen Eintrag bereits primär geprüft.");
        }

        let countedPushups = rawPushups;
        let countedSitups = rawSitups;
        let decision: WorkoutReviewDecision = WorkoutReviewDecision.APPROVE;

        if (decisionValue !== "approve") {
          countedPushups = clampCount(formData.get("countedPushups"), rawPushups);
          countedSitups = clampCount(formData.get("countedSitups"), rawSitups);
          decision =
            countedPushups === 0 && countedSitups === 0
              ? WorkoutReviewDecision.REJECT
              : countedPushups === rawPushups && countedSitups === rawSitups
                ? WorkoutReviewDecision.APPROVE
                : WorkoutReviewDecision.REDUCE;
        }

        await tx.workoutReview.create({
          data: {
            dailySubmissionId: submission.id,
            reviewerUserId: user.id,
            stage: WorkoutReviewStage.PRIMARY,
            decision,
            countedPushups,
            countedSitups,
            notes: notes || null,
          },
        });

        await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            reviewCreditCents: {
              increment: REVIEW_REWARD_CENTS,
            },
          },
        });

        await tx.dailySubmission.update({
          where: {
            id: submission.id,
          },
          data:
            decision === WorkoutReviewDecision.APPROVE
              ? {
                  reviewStatus: WorkoutReviewStatus.APPROVED,
                  verifiedPushupTotal: countedPushups,
                  verifiedSitupTotal: countedSitups,
                  reviewedAt: new Date(),
                }
              : {
                  reviewStatus: WorkoutReviewStatus.ESCALATED,
                  verifiedPushupTotal: null,
                  verifiedSitupTotal: null,
                  reviewedAt: null,
                },
        });

        return;
      }

      if (submission.reviewStatus !== WorkoutReviewStatus.ESCALATED) {
        throw new Error("Dieser Eintrag wartet gerade nicht auf eine Prüfentscheidung.");
      }

      const primaryReview = [...submission.workoutReviews]
        .reverse()
        .find((review) => review.stage === WorkoutReviewStage.PRIMARY);

      if (!primaryReview) {
        throw new Error("Das Erstreview wurde nicht gefunden.");
      }

      if (primaryReview.reviewerUserId === user.id) {
        throw new Error("Das Prüf-Review muss von einer anderen Person kommen.");
      }

      const existingArbitration = submission.workoutReviews.find(
        (review) =>
          review.stage === WorkoutReviewStage.ARBITRATION &&
          review.basedOnReviewId === primaryReview.id,
      );

      if (existingArbitration) {
        throw new Error("Die Prüfentscheidung wurde bereits abgegeben.");
      }

      const arbitrationDecision =
        decisionValue === "accept"
          ? WorkoutReviewDecision.ACCEPT_REVIEW
          : decisionValue === "reject"
            ? WorkoutReviewDecision.REJECT_REVIEW
            : null;

      if (!arbitrationDecision) {
        throw new Error("Bitte wähle eine gültige Prüfentscheidung.");
      }

      await tx.workoutReview.create({
        data: {
          dailySubmissionId: submission.id,
          reviewerUserId: user.id,
          stage: WorkoutReviewStage.ARBITRATION,
          decision: arbitrationDecision,
          countedPushups: primaryReview.countedPushups,
          countedSitups: primaryReview.countedSitups,
          notes: notes || null,
          basedOnReviewId: primaryReview.id,
        },
      });

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          reviewCreditCents: {
            increment: REVIEW_REWARD_CENTS,
          },
        },
      });

      await tx.dailySubmission.update({
        where: {
          id: submission.id,
        },
        data:
          arbitrationDecision === WorkoutReviewDecision.ACCEPT_REVIEW
            ? {
                reviewStatus: WorkoutReviewStatus.APPROVED,
                verifiedPushupTotal: primaryReview.countedPushups,
                verifiedSitupTotal: primaryReview.countedSitups,
                reviewedAt: new Date(),
              }
            : {
                reviewStatus: WorkoutReviewStatus.REVISION_REQUESTED,
                verifiedPushupTotal: null,
                verifiedSitupTotal: null,
                reviewedAt: null,
              },
      });
    });

    return NextResponse.redirect(
      new URL("/dashboard?success=Review%20gespeichert", request.url),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Review konnte nicht gespeichert werden.";

    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
