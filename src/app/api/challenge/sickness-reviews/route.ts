import { NextResponse } from "next/server";
import {
  RegistrationApprovalDecision,
  RegistrationStatus,
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { prisma } from "@/lib/db";
import { dashboardMessageUrl, getApiMessages } from "@/lib/i18n-api";
import { canReviewPlatformContent } from "@/lib/participation-policy";

const REVIEW_REWARD_CENTS = 5;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const messages = (await getApiMessages()).challenge;

  if (
    !user ||
    user.registrationStatus !== RegistrationStatus.APPROVED ||
    !canReviewPlatformContent(user)
  ) {
    return NextResponse.redirect(getAppUrl("/login", request));
  }

  try {
    const formData = await request.formData();
    const verificationId = String(formData.get("verificationId") || "");
    const decisionValue = String(formData.get("decision") || "").toLowerCase();
    const notes = String(formData.get("notes") || "").trim();
    const decision =
      decisionValue === "approve"
        ? RegistrationApprovalDecision.APPROVED
        : decisionValue === "reject"
          ? RegistrationApprovalDecision.REJECTED
          : null;

    if (!verificationId || !decision) {
      throw new Error(messages.sicknessReviewInvalid);
    }

    await prisma.$transaction(async (tx) => {
      const verification = await tx.sicknessVerification.findUnique({
        where: {
          id: verificationId,
        },
        include: {
          dailySubmission: true,
        },
      });

      if (!verification) {
        throw new Error(messages.sicknessReviewMissing);
      }

      if (verification.reviewerUserId !== user.id) {
        throw new Error(messages.sicknessReviewNotYours);
      }

      if (verification.decision !== RegistrationApprovalDecision.PENDING) {
        throw new Error(messages.sicknessReviewAlreadyDone);
      }

      if (verification.dailySubmission.status !== "SICK_PENDING") {
        throw new Error(messages.sicknessReviewClosed);
      }

      await tx.sicknessVerification.update({
        where: {
          id: verification.id,
        },
        data: {
          decision,
          notes: notes || null,
          decidedAt: new Date(),
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

      if (decision === RegistrationApprovalDecision.REJECTED) {
        await tx.dailySubmission.update({
          where: {
            id: verification.dailySubmissionId,
          },
          data: {
            status: "SLACK",
            notes: notes || verification.dailySubmission.notes,
          },
        });
        return;
      }

      const remainingPending = await tx.sicknessVerification.count({
        where: {
          dailySubmissionId: verification.dailySubmissionId,
          decision: RegistrationApprovalDecision.PENDING,
        },
      });

      if (remainingPending === 0) {
        await tx.dailySubmission.update({
          where: {
            id: verification.dailySubmissionId,
          },
          data: {
            status: "SICK_VERIFIED",
          },
        });
      }
    });

    return NextResponse.redirect(
      dashboardMessageUrl(request, "success", messages.sicknessReviewSaved),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : messages.sicknessReviewSaveFailed;

    return NextResponse.redirect(dashboardMessageUrl(request, "error", message));
  }
}
