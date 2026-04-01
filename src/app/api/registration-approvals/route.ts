import { NextResponse } from "next/server";
import {
  RegistrationApprovalDecision,
  RegistrationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  sendRegistrationApprovedMail,
  sendRegistrationRejectedMail,
} from "@/lib/auth/email";

const REVIEW_REWARD_CENTS = 5;

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
      new URL("/dashboard?error=Freigabe%20konnte%20nicht%20verarbeitet%20werden", request.url),
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
        throw new Error("Die Anfrage existiert nicht mehr.");
      }

      if (approval.reviewerUserId !== user.id) {
        throw new Error("Diese Anfrage gehört nicht zu dir.");
      }

      if (approval.decision !== RegistrationApprovalDecision.PENDING) {
        throw new Error("Diese Anfrage wurde bereits bearbeitet.");
      }

      if (approval.applicant.registrationStatus !== RegistrationStatus.PENDING) {
        throw new Error("Diese Registrierung ist bereits abgeschlossen.");
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

      const allDecisions = await tx.registrationApproval.findMany({
        where: {
          applicantUserId: approval.applicantUserId,
        },
        select: {
          decision: true,
        },
      });

      let finalStatus: RegistrationStatus | null = null;

      if (
        allDecisions.some(
          (entry) => entry.decision === RegistrationApprovalDecision.REJECTED,
        )
      ) {
        finalStatus = RegistrationStatus.REJECTED;
      } else if (
        allDecisions.length > 0 &&
        allDecisions.every(
          (entry) => entry.decision === RegistrationApprovalDecision.APPROVED,
        )
      ) {
        finalStatus = RegistrationStatus.APPROVED;
      }

      let applicant = approval.applicant;

      if (finalStatus === RegistrationStatus.APPROVED) {
        applicant = await tx.user.update({
          where: {
            id: approval.applicantUserId,
          },
          data: {
            registrationStatus: RegistrationStatus.APPROVED,
            registrationApprovedAt: new Date(),
            registrationRejectedAt: null,
          },
        });
      } else if (finalStatus === RegistrationStatus.REJECTED) {
        applicant = await tx.user.update({
          where: {
            id: approval.applicantUserId,
          },
          data: {
            registrationStatus: RegistrationStatus.REJECTED,
            registrationRejectedAt: new Date(),
          },
        });
      }

      return {
        finalStatus,
        applicantEmail: applicant.email,
        applicantName: applicant.name,
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
      new URL("/dashboard?success=Freigabe%20gespeichert", request.url),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Freigabe konnte nicht verarbeitet werden.";

    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
