import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { getE2EEnv, projectRoot } from "./e2e-env.mjs";

process.env = getE2EEnv();

const REVIEWER_EMAIL = "reviewer@fitcal.test";
const REVIEWER_PASSWORD = "Passwort123";
const RESET_TOKEN = "reset-token-for-e2e-tests-000000000000000000000000000000";

function dateAtUtc(dateKey) {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

function hashSha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function ensureSeedVideoFile(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from("fake video bytes for e2e"));
  return absolutePath;
}

export async function seedE2EData() {
  const { PrismaClient, RegistrationApprovalDecision, RegistrationStatus } = await import("@prisma/client");
  const bcrypt = (await import("bcryptjs")).default;

  const prisma = new PrismaClient();

  try {
    await rm(path.join(projectRoot, "data", "e2e-uploads"), { recursive: true, force: true });

    await prisma.sicknessVerification.deleteMany();
    await prisma.dailyVideo.deleteMany();
    await prisma.dailySubmission.deleteMany();
    await prisma.measurementEntry.deleteMany();
    await prisma.challengeEnrollment.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.registrationApproval.deleteMany();
    await prisma.appInvite.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash(REVIEWER_PASSWORD, 8);

    const reviewer = await prisma.user.create({
      data: {
        email: REVIEWER_EMAIL,
        passwordHash,
        name: "Rita Reviewer",
        registrationStatus: RegistrationStatus.APPROVED,
        registrationApprovedAt: new Date(),
        birthDate: dateAtUtc("1994-09-18"),
        heightCm: 178,
        motivation: "E2E-Seed Nutzerin",
      },
    });

    await prisma.challengeEnrollment.create({
      data: {
        userId: reviewer.id,
        optedInAt: new Date(),
        joinedChallengeDate: "2026-04-01",
      },
    });

    await prisma.measurementEntry.createMany({
      data: [
        {
          userId: reviewer.id,
          measuredAt: dateAtUtc("2026-04-16"),
          weightKg: 81.5,
          waistCircumferenceCm: 92,
          restingPulseBpm: 61,
          notes: "Seed alt",
        },
        {
          userId: reviewer.id,
          measuredAt: dateAtUtc("2026-04-18"),
          weightKg: 80.9,
          waistCircumferenceCm: 91.5,
          restingPulseBpm: 60,
          notes: "Seed aktuell",
        },
      ],
    });

    const dailySubmission = await prisma.dailySubmission.create({
      data: {
        userId: reviewer.id,
        challengeDate: "2026-04-18",
        status: "COMPLETED",
        reviewStatus: "PENDING",
        pushupSets: "[9,8]",
        situpSets: "[9,8]",
        notes: "Seed Submission",
        submittedAt: new Date(),
      },
    });

    const storedPath = await ensureSeedVideoFile(path.join("data", "e2e-uploads", "rita-reviewer", "2026-04-18", "2026-04-18__rita-reviewer__part-01.mp4"));

    await prisma.dailyVideo.create({
      data: {
        dailySubmissionId: dailySubmission.id,
        originalName: "seed-video.mp4",
        storedName: "2026-04-18__rita-reviewer__part-01.mp4",
        storedPath,
        mimeType: "video/mp4",
        sizeBytes: 2048,
        orderIndex: 0,
      },
    });

    const participant = await prisma.user.create({
      data: {
        email: "participant@fitcal.test",
        passwordHash,
        name: "Paul Participant",
        registrationStatus: RegistrationStatus.APPROVED,
        registrationApprovedAt: new Date(),
        motivation: "Bitte reviewen",
      },
    });

    await prisma.challengeEnrollment.create({
      data: {
        userId: participant.id,
        optedInAt: new Date(),
        joinedChallengeDate: "2026-04-01",
      },
    });

    const reviewSubmission = await prisma.dailySubmission.create({
      data: {
        userId: participant.id,
        challengeDate: "2026-04-19",
        status: "COMPLETED",
        reviewStatus: "PENDING",
        pushupSets: "[11,10]",
        situpSets: "[11,10]",
        notes: "Bitte prüfen",
        submittedAt: new Date(),
      },
    });

    const reviewStoredPath = await ensureSeedVideoFile(
      path.join("data", "e2e-uploads", "paul-participant", "2026-04-19", "2026-04-19__paul-participant__part-01.mp4"),
    );

    await prisma.dailyVideo.create({
      data: {
        dailySubmissionId: reviewSubmission.id,
        originalName: "participant-proof.mp4",
        storedName: "2026-04-19__paul-participant__part-01.mp4",
        storedPath: reviewStoredPath,
        mimeType: "video/mp4",
        sizeBytes: 2048,
        orderIndex: 0,
      },
    });

    const sicknessSubmission = await prisma.dailySubmission.create({
      data: {
        userId: participant.id,
        challengeDate: "2026-04-20",
        status: "SICK_PENDING",
        reviewStatus: "NOT_REQUIRED",
        pushupSets: "[0,0]",
        situpSets: "[0,0]",
        notes: "Heute nur Decke und Tee.",
        submittedAt: new Date(),
      },
    });

    await prisma.sicknessVerification.create({
      data: {
        dailySubmissionId: sicknessSubmission.id,
        reviewerUserId: reviewer.id,
        decision: RegistrationApprovalDecision.PENDING,
      },
    });

    const applicants = await Promise.all([
      prisma.user.create({
        data: {
          email: "approve-me@fitcal.test",
          passwordHash,
          name: "Anna Antrag",
          registrationStatus: RegistrationStatus.PENDING,
          motivation: "Ich will rein",
        },
      }),
      prisma.user.create({
        data: {
          email: "reject-me@fitcal.test",
          passwordHash,
          name: "Rolf Rückfrage",
          registrationStatus: RegistrationStatus.PENDING,
          motivation: "Vielleicht",
        },
      }),
    ]);

    await prisma.registrationApproval.createMany({
      data: applicants.map((applicant) => ({
        applicantUserId: applicant.id,
        reviewerUserId: reviewer.id,
        decision: RegistrationApprovalDecision.PENDING,
      })),
    });

    await prisma.passwordResetToken.create({
      data: {
        tokenHash: hashSha256(RESET_TOKEN),
        userId: reviewer.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        emailDelivered: false,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  await seedE2EData();
}
