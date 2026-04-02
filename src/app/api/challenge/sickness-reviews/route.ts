import { NextResponse } from "next/server";
import {
  RegistrationApprovalDecision,
  RegistrationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

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
      throw new Error("Die Krankmeldungs-Entscheidung ist ungültig.");
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
        throw new Error("Die Krankmeldung wurde nicht gefunden.");
      }

      if (verification.reviewerUserId !== user.id) {
        throw new Error("Diese Krankmeldung gehört nicht zu dir.");
      }

      if (verification.decision !== RegistrationApprovalDecision.PENDING) {
        throw new Error("Diese Krankmeldung wurde bereits bewertet.");
      }

      if (verification.dailySubmission.status !== "SICK_PENDING") {
        throw new Error("Diese Krankmeldung ist bereits abgeschlossen.");
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
      new URL("/dashboard?success=Krankmeldung%20bewertet", request.url),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Krankmeldung konnte nicht bewertet werden.";

    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
