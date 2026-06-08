import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { RegistrationApprovalDecision, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { getAppBaseUrl } from "@/lib/auth/url";
import {
  sendEmailVerificationMail,
  sendRegistrationApprovedMail,
} from "@/lib/auth/email";
import { createEmailVerificationToken } from "@/lib/auth/email-verification";
import { registerSchema } from "@/lib/auth/validation";
import { normalizeMeasurementDate } from "@/lib/measurements";
import { getApiMessages, localizedUrl } from "@/lib/i18n-api";

function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const messages = (await getApiMessages()).auth;

  try {
    const parsed = registerSchema.parse({
      email: formData.get("email"),
      invitationToken: formData.get("invitationToken"),
      name: formData.get("name"),
      password: formData.get("password"),
      birthDate: formData.get("birthDate"),
      heightCm: formData.get("heightCm"),
      waistCircumferenceCm: formData.get("waistCircumferenceCm"),
      weightKg: formData.get("weightKg"),
      motivation: formData.get("motivation"),
      isStudentDiscount: formData.get("isStudentDiscount"),
      isLightParticipant: formData.get("isLightParticipant"),
    });

    const existingUser = await prisma.user.findUnique({
      where: {
        email: parsed.email,
      },
    });

    if (existingUser) {
      return NextResponse.redirect(
        localizedUrl(request, "/register", "error", messages.emailExists),
      );
    }

    const passwordHash = await hashPassword(parsed.password);
    const isLightParticipant = parsed.isLightParticipant;
    const isStudentDiscount = isLightParticipant ? false : parsed.isStudentDiscount;
    const shouldCreateMeasurement =
      parsed.waistCircumferenceCm !== undefined || parsed.weightKg !== undefined;
    const inviteToken = parsed.invitationToken?.trim() || "";
    const inviteTokenHash = inviteToken ? hashInviteToken(inviteToken) : null;

    const result = await prisma.$transaction(async (tx) => {
      const invite = inviteTokenHash
        ? await tx.appInvite.findFirst({
            where: {
              tokenHash: inviteTokenHash,
              acceptedAt: null,
              expiresAt: {
                gt: new Date(),
              },
            },
          })
        : null;

      if (invite && invite.email !== parsed.email) {
        throw new Error(messages.inviteWrongEmail);
      }

      if (inviteToken && !invite) {
        throw new Error(messages.inviteInvalid);
      }

      const approvers = await tx.user.findMany({
        where: {
          registrationStatus: RegistrationStatus.APPROVED,
          isLightParticipant: false,
        },
        select: {
          id: true,
        },
      });

      const preApprovedReviewerIds = invite
        ? approvers
            .filter((reviewer) => reviewer.id === invite.invitedByUserId)
            .map((reviewer) => reviewer.id)
        : [];
      const remainingReviewerIds = approvers
        .map((reviewer) => reviewer.id)
        .filter((reviewerId) => !preApprovedReviewerIds.includes(reviewerId));
      const autoApprove = approvers.length === 0 || remainingReviewerIds.length === 0;
      const createdUser = await tx.user.create({
        data: {
          email: parsed.email,
          name: parsed.name || null,
          passwordHash,
          isStudentDiscount,
          isLightParticipant,
          registrationStatus: autoApprove
            ? RegistrationStatus.APPROVED
            : RegistrationStatus.PENDING,
          registrationApprovedAt: autoApprove ? new Date() : null,
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
            notes: messages.startMeasurementNotes,
          },
        });
      }

      if (approvers.length > 0) {
        await tx.registrationApproval.createMany({
          data: approvers.map((reviewer) => ({
            applicantUserId: createdUser.id,
            reviewerUserId: reviewer.id,
            decision: preApprovedReviewerIds.includes(reviewer.id)
              ? RegistrationApprovalDecision.APPROVED
              : RegistrationApprovalDecision.PENDING,
            decidedAt: preApprovedReviewerIds.includes(reviewer.id) ? new Date() : null,
          })),
        });
      }

      if (invite) {
        await tx.appInvite.update({
          where: {
            id: invite.id,
          },
          data: {
            acceptedAt: new Date(),
            acceptedUserId: createdUser.id,
          },
        });
      }

      return {
        autoApprove,
        hadInvite: Boolean(invite),
      };
    });

    const verificationToken = await createEmailVerificationToken(parsed.email);
    const verifyLink = `${getAppBaseUrl(request)}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

    await sendEmailVerificationMail({
      to: parsed.email,
      verifyLink,
    });

    if (result.autoApprove) {
      await sendRegistrationApprovedMail({
        to: parsed.email,
        name: parsed.name || null,
      });

      return NextResponse.redirect(
        localizedUrl(request, "/login", "success", messages.registrationCreated),
      );
    }

    const pendingMessage = result.hadInvite
      ? messages.registrationSentInvited
      : messages.registrationSent;

    return NextResponse.redirect(
      localizedUrl(request, "/login", "success", pendingMessage),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : messages.registrationFailed;

    return NextResponse.redirect(
      localizedUrl(request, "/register", "error", message),
    );
  }
}
