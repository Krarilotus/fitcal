import { NextResponse } from "next/server";
import {
  RegistrationApprovalDecision,
  RegistrationStatus,
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { prisma } from "@/lib/db";
import {
  sendRegistrationApprovedMail,
  sendRegistrationRejectedMail,
} from "@/lib/auth/email";
import { dashboardMessageUrl, getApiMessages } from "@/lib/i18n-api";
import { reconcileRegistrationStatus } from "@/lib/registration-approval";

const REVIEW_REWARD_CENTS = 5;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const messages = (await getApiMessages()).dashboardActions;

  if (
    !user ||
    user.registrationStatus !== RegistrationStatus.APPROVED ||
    user.isLightParticipant
  ) {
    return NextResponse.redirect(getAppUrl("/login", request));
  }

  const formData = await request.formData();
  const approvalId = String(formData.get("approvalId") || "");
  const decisionValue = String(formData.get("decision") || "").toLowerCase();
  const decision =
    decisionValue === "approve"
      ? RegistrationApprovalDecision.APPROVED
      : decisionValue === "reject"
        ? RegistrationApprovalDecision.REJECTED
        : null;

  if (!approvalId || !decision) {
    return NextResponse.redirect(
      dashboardMessageUrl(request, "error", messages.approvalInvalid),
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const approval = await tx.registrationApproval.findUnique({
        where: {
          id: approvalId,
        },
        include: {
          applicant: true,
        },
      });

      if (!approval) {
        throw new Error(messages.approvalMissing);
      }

      if (approval.reviewerUserId !== user.id) {
        throw new Error(messages.approvalNotYours);
      }

      if (approval.decision !== RegistrationApprovalDecision.PENDING) {
        throw new Error(messages.approvalAlreadyDone);
      }

      if (approval.applicant.registrationStatus !== RegistrationStatus.PENDING) {
        throw new Error(messages.approvalClosed);
      }

      await tx.registrationApproval.update({
        where: {
          id: approval.id,
        },
        data: {
          decision,
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

      const finalStatus = await reconcileRegistrationStatus(
        tx,
        approval.applicantUserId,
      );

      return {
        finalStatus:
          finalStatus === approval.applicant.registrationStatus ? null : finalStatus,
        applicantEmail: approval.applicant.email,
        applicantName: approval.applicant.name,
      };
    });

    if (result.finalStatus === RegistrationStatus.APPROVED) {
      await sendRegistrationApprovedMail({
        to: result.applicantEmail,
        name: result.applicantName,
      });
    } else if (result.finalStatus === RegistrationStatus.REJECTED) {
      await sendRegistrationRejectedMail({
        to: result.applicantEmail,
        name: result.applicantName,
      });
    }

    return NextResponse.redirect(
      dashboardMessageUrl(request, "success", messages.approvalSaved),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : messages.approvalInvalid;

    return NextResponse.redirect(
      dashboardMessageUrl(request, "error", message),
    );
  }
}
