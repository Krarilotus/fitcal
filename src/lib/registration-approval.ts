import {
  type Prisma,
  type PrismaClient,
  RegistrationApprovalDecision,
  RegistrationStatus,
} from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;
type ApprovalClient = PrismaClient | TransactionClient;

export function getRequiredRegistrationApprovalCount(applicant: {
  isLightParticipant: boolean;
}) {
  return applicant.isLightParticipant ? 1 : null;
}

export async function reconcileRegistrationStatus(
  client: ApprovalClient,
  userId: string,
) {
  const applicant = await client.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      isLightParticipant: true,
      registrationStatus: true,
    },
  });

  if (!applicant || applicant.registrationStatus !== RegistrationStatus.PENDING) {
    return applicant?.registrationStatus ?? null;
  }

  const approvals = await client.registrationApproval.findMany({
    where: {
      applicantUserId: applicant.id,
      reviewer: {
        registrationStatus: RegistrationStatus.APPROVED,
        isLightParticipant: false,
      },
    },
    select: {
      decision: true,
    },
  });

  if (
    approvals.some(
      (approval) => approval.decision === RegistrationApprovalDecision.REJECTED,
    )
  ) {
    await client.user.update({
      where: {
        id: applicant.id,
      },
      data: {
        registrationStatus: RegistrationStatus.REJECTED,
        registrationRejectedAt: new Date(),
      },
    });

    return RegistrationStatus.REJECTED;
  }

  const approvedCount = approvals.filter(
    (approval) => approval.decision === RegistrationApprovalDecision.APPROVED,
  ).length;
  const requiredCount = getRequiredRegistrationApprovalCount(applicant);
  const hasEnoughApprovals =
    requiredCount == null
      ? approvals.length > 0 && approvedCount === approvals.length
      : approvedCount >= requiredCount;

  if (hasEnoughApprovals) {
    await client.user.update({
      where: {
        id: applicant.id,
      },
      data: {
        registrationStatus: RegistrationStatus.APPROVED,
        registrationApprovedAt: new Date(),
        registrationRejectedAt: null,
      },
    });

    return RegistrationStatus.APPROVED;
  }

  return RegistrationStatus.PENDING;
}
