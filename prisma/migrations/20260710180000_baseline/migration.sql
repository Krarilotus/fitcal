-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "isStudentDiscount" BOOLEAN NOT NULL DEFAULT false,
    "isLightParticipant" BOOLEAN NOT NULL DEFAULT false,
    "reviewCreditCents" INTEGER NOT NULL DEFAULT 0,
    "registrationStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "registrationApprovedAt" DATETIME,
    "registrationRejectedAt" DATETIME,
    "birthDate" DATETIME,
    "heightCm" REAL,
    "motivation" TEXT,
    "image" TEXT,
    "emailVerified" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("provider", "providerAccountId"),
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "requestedByIp" TEXT,
    "requestedByUa" TEXT,
    "emailDelivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChallengeEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "optedInAt" DATETIME NOT NULL,
    "joinedChallengeDate" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChallengeEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailySubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "challengeDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "verifiedPushupTotal" INTEGER,
    "verifiedSitupTotal" INTEGER,
    "reviewedAt" DATETIME,
    "pushupSets" TEXT NOT NULL,
    "situpSets" TEXT NOT NULL,
    "notes" TEXT,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailySubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailySubmissionExtra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailySubmissionId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailySubmissionExtra_dailySubmissionId_fkey" FOREIGN KEY ("dailySubmissionId") REFERENCES "DailySubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailySubmissionId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyVideo_dailySubmissionId_fkey" FOREIGN KEY ("dailySubmissionId") REFERENCES "DailySubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeasurementEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "measuredAt" DATETIME NOT NULL,
    "weightKg" REAL,
    "waistCircumferenceCm" REAL,
    "restingPulseBpm" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeasurementEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "acceptedUserId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppInvite_acceptedUserId_fkey" FOREIGN KEY ("acceptedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistrationApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantUserId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistrationApproval_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegistrationApproval_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SicknessVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailySubmissionId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SicknessVerification_dailySubmissionId_fkey" FOREIGN KEY ("dailySubmissionId") REFERENCES "DailySubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SicknessVerification_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailySubmissionId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "countedPushups" INTEGER NOT NULL,
    "countedSitups" INTEGER NOT NULL,
    "notes" TEXT,
    "basedOnReviewId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutReview_dailySubmissionId_fkey" FOREIGN KEY ("dailySubmissionId") REFERENCES "DailySubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutReview_basedOnReviewId_fkey" FOREIGN KEY ("basedOnReviewId") REFERENCES "WorkoutReview" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeEnrollment_userId_key" ON "ChallengeEnrollment"("userId");

-- CreateIndex
CREATE INDEX "DailySubmission_challengeDate_idx" ON "DailySubmission"("challengeDate");

-- CreateIndex
CREATE INDEX "DailySubmission_reviewStatus_challengeDate_idx" ON "DailySubmission"("reviewStatus", "challengeDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailySubmission_userId_challengeDate_key" ON "DailySubmission"("userId", "challengeDate");

-- CreateIndex
CREATE INDEX "DailySubmissionExtra_dailySubmissionId_idx" ON "DailySubmissionExtra"("dailySubmissionId");

-- CreateIndex
CREATE INDEX "DailySubmissionExtra_categoryName_idx" ON "DailySubmissionExtra"("categoryName");

-- CreateIndex
CREATE INDEX "DailyVideo_dailySubmissionId_idx" ON "DailyVideo"("dailySubmissionId");

-- CreateIndex
CREATE INDEX "MeasurementEntry_userId_measuredAt_idx" ON "MeasurementEntry"("userId", "measuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppInvite_tokenHash_key" ON "AppInvite"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AppInvite_acceptedUserId_key" ON "AppInvite"("acceptedUserId");

-- CreateIndex
CREATE INDEX "AppInvite_email_expiresAt_idx" ON "AppInvite"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "AppInvite_invitedByUserId_createdAt_idx" ON "AppInvite"("invitedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "RegistrationApproval_reviewerUserId_decision_idx" ON "RegistrationApproval"("reviewerUserId", "decision");

-- CreateIndex
CREATE INDEX "RegistrationApproval_applicantUserId_decision_idx" ON "RegistrationApproval"("applicantUserId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationApproval_applicantUserId_reviewerUserId_key" ON "RegistrationApproval"("applicantUserId", "reviewerUserId");

-- CreateIndex
CREATE INDEX "SicknessVerification_dailySubmissionId_decision_idx" ON "SicknessVerification"("dailySubmissionId", "decision");

-- CreateIndex
CREATE INDEX "SicknessVerification_reviewerUserId_decision_idx" ON "SicknessVerification"("reviewerUserId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "SicknessVerification_dailySubmissionId_reviewerUserId_key" ON "SicknessVerification"("dailySubmissionId", "reviewerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutReview_basedOnReviewId_key" ON "WorkoutReview"("basedOnReviewId");

-- CreateIndex
CREATE INDEX "WorkoutReview_dailySubmissionId_stage_createdAt_idx" ON "WorkoutReview"("dailySubmissionId", "stage", "createdAt");

-- CreateIndex
CREATE INDEX "WorkoutReview_reviewerUserId_stage_createdAt_idx" ON "WorkoutReview"("reviewerUserId", "stage", "createdAt");
