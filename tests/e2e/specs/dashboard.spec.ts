import { expect, test } from "@playwright/test";
import { loginAsReviewer } from "../helpers/auth";
import { disconnectTestDb, prisma } from "../helpers/db";
import { resetE2EState } from "../helpers/reset";

test.beforeEach(() => {
  resetE2EState();
});

test.afterAll(async () => {
  await disconnectTestDb();
});

function getTimelineDateLabel(challengeDate: string) {
  return `${challengeDate.slice(8, 10)}.${challengeDate.slice(5, 7)}.`;
}

test("dashboard buttons for invite and approvals work", async ({ page }) => {
  await loginAsReviewer(page);

  await page.getByLabel("E-Mail der Person").fill("invitee@fitcal.test");
  await page.getByRole("button", { name: "Einladung senden" }).click();
  await expect(page).toHaveURL(/\/dashboard\?success=/);
  await expect(page.getByText(/Einladung verschickt/i)).toBeVisible();
  await expect(page.getByText("invitee@fitcal.test")).toBeVisible();

  await page.getByRole("button", { name: "Annehmen" }).first().click();
  await expect(page.getByText(/Freigabe gespeichert/i)).toBeVisible();

  const approvedUser = await prisma.user.findUnique({
    where: { email: "approve-me@fitcal.test" },
  });
  expect(approvedUser?.registrationStatus).toBe("APPROVED");

  await page.getByRole("button", { name: "Ablehnen" }).first().click();
  await expect(page.getByText(/Freigabe gespeichert/i)).toBeVisible();

  const rejectedUser = await prisma.user.findUnique({
    where: { email: "reject-me@fitcal.test" },
  });
  expect(rejectedUser?.registrationStatus).toBe("REJECTED");
});

test("review area shows participant progress and can approve a workout", async ({ page }) => {
  await loginAsReviewer(page);

  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.locator("#review")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Paul Participant" })).toBeVisible();

  await page.getByRole("button", { name: "Ausstehend" }).click();
  await expect(page.getByText(/Erstreviews/i)).toBeVisible();
  await expect(page.getByText(/Paul Participant . 19.04/i)).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/dashboard\?(success|error)=/),
    page.getByRole("button", { name: /Workout zählt komplett/i }).first().click(),
  ]);

  expect(page.url()).toContain("success=");

  const reviewedSubmission = await prisma.dailySubmission.findFirst({
    where: {
      user: {
        email: "participant@fitcal.test",
      },
      challengeDate: "2026-04-19",
    },
  });
  expect(reviewedSubmission?.reviewStatus).toBe("APPROVED");
  expect(reviewedSubmission?.verifiedPushupTotal).toBe(21);
  expect(reviewedSubmission?.verifiedSitupTotal).toBe(21);

  const workoutReview = await prisma.workoutReview.findFirst({
    where: {
      dailySubmissionId: reviewedSubmission?.id,
    },
  });
  expect(workoutReview?.decision).toBe("APPROVE");
});

test("review area can accept a sickness request", async ({ page }) => {
  await loginAsReviewer(page);

  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Ausstehend" }).click();
  await expect(page.getByText(/Krankmeldungen/i)).toBeVisible();
  await expect(page.getByText(/Paul Participant . 20.04/i)).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/dashboard\?(success|error)=/),
    page.getByRole("button", { name: "Krankmeldung akzeptieren" }).first().click(),
  ]);

  expect(page.url()).toContain("success=");

  const sicknessSubmission = await prisma.dailySubmission.findFirst({
    where: {
      user: {
        email: "participant@fitcal.test",
      },
      challengeDate: "2026-04-20",
    },
  });
  expect(sicknessSubmission?.status).toBe("SICK_VERIFIED");
});

test("dashboard profile and measurement entries can be saved", async ({ page }) => {
  await loginAsReviewer(page);

  const profileSection = page.locator("#metastats");
  const measurementForm = page.locator('form[action="/api/measurements"]');
  await page.getByRole("button", { name: "Metastats" }).click();
  await profileSection.getByLabel("Name").fill("Rita Test");
  await profileSection.getByLabel("Geburtsdatum").fill("19.09.1994");
  await profileSection.getByLabel(/Warum machst du das/i).fill("E2E Profiltest");
  await page.request.post("/api/profile", {
    form: {
      name: "Rita Test",
      birthDate: "19.09.1994",
      motivation: "E2E Profiltest",
      heightCm: "",
    },
  });

  await expect
    .poll(async () => {
      const updatedUser = await prisma.user.findUnique({
        where: { email: "reviewer@fitcal.test" },
      });
      return updatedUser?.name;
    })
    .toBe("Rita Test");

  const updatedUser = await prisma.user.findUnique({
    where: { email: "reviewer@fitcal.test" },
  });
  expect(updatedUser?.name).toBe("Rita Test");
  expect(updatedUser?.motivation).toBe("E2E Profiltest");

  await measurementForm.getByLabel("Gewicht in kg").fill("79.8");
  await measurementForm.getByLabel("Bauchumfang in cm").fill("89");
  await measurementForm.getByLabel("Ruhepuls").fill("58");
  await measurementForm.getByLabel("Notiz").fill("Frischer Messwert");
  await page.request.post("/api/measurements", {
    form: {
      weightKg: "79.8",
      waistCircumferenceCm: "89",
      restingPulseBpm: "58",
      notes: "Frischer Messwert",
    },
  });

  await expect
    .poll(async () => {
      const latestMeasurement = await prisma.measurementEntry.findFirst({
        where: { user: { email: "reviewer@fitcal.test" } },
        orderBy: { createdAt: "desc" },
      });
      return latestMeasurement?.notes;
    })
    .toBe("Frischer Messwert");

  const latestMeasurement = await prisma.measurementEntry.findFirst({
    where: { user: { email: "reviewer@fitcal.test" } },
    orderBy: { createdAt: "desc" },
  });
  expect(latestMeasurement?.notes).toBe("Frischer Messwert");
  expect(latestMeasurement?.weightKg).toBe(79.8);
});

test("dashboard upload and video delete buttons work", async ({ page }) => {
  await loginAsReviewer(page);

  const uploadForm = page.locator('#uploads form[enctype="multipart/form-data"]').first();
  const uploadDate = await uploadForm.locator('input[name="challengeDate"]').inputValue();
  await uploadForm.locator('input[name="pushupSet1"]').fill("16");
  await uploadForm.locator('input[name="pushupSet2"]').fill("15");
  await uploadForm.locator('input[name="situpSet1"]').fill("16");
  await uploadForm.locator('input[name="situpSet2"]').fill("15");
  await uploadForm.locator('input[name="videos"]').setInputFiles({
    name: "proof.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("tiny fake mp4"),
  });
  await uploadForm.locator('textarea[name="notes"]').fill("E2E Upload");

  await Promise.all([
    page.waitForURL(/\/dashboard\?(success|error)=/),
    uploadForm.getByRole("button", { name: "Workout speichern" }).click(),
  ]);
  expect(page.url()).not.toContain("error=");

  const todaySubmission = await prisma.dailySubmission.findUnique({
    where: {
      userId_challengeDate: {
        userId: (
          await prisma.user.findUniqueOrThrow({
            where: { email: "reviewer@fitcal.test" },
          })
        ).id,
        challengeDate: uploadDate,
      },
    },
    include: { videos: true },
  });
  expect(todaySubmission?.status).toBe("COMPLETED");
  expect(todaySubmission?.videos).toHaveLength(1);

  await page
    .locator("#timeline")
    .getByRole("button")
    .filter({ hasText: getTimelineDateLabel(uploadDate) })
    .first()
    .click();
  await expect(page.locator("#timeline").getByText("proof.mp4")).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/dashboard\?(success|error)=/),
    page
      .locator("#timeline .fc-video-row")
      .filter({ hasText: "proof.mp4" })
      .locator('form[action="/api/videos/delete"] button')
      .click(),
  ]);
  expect(page.url()).toContain("success=");

  const remainingUploadedVideo = await prisma.dailyVideo.findFirst({
    where: {
      originalName: "proof.mp4",
      dailySubmission: {
        challengeDate: uploadDate,
      },
    },
  });
  expect(remainingUploadedVideo).toBeNull();
});

test("editable claim buttons focus the upload editor and open the replacement file chooser", async ({
  page,
}) => {
  await loginAsReviewer(page);

  const uploadForm = page.locator('#uploads form[enctype="multipart/form-data"]').first();
  const uploadDate = await uploadForm.locator('input[name="challengeDate"]').inputValue();
  await uploadForm.locator('input[name="pushupSet1"]').fill("12");
  await uploadForm.locator('input[name="pushupSet2"]').fill("12");
  await uploadForm.locator('input[name="situpSet1"]').fill("12");
  await uploadForm.locator('input[name="situpSet2"]').fill("12");
  await uploadForm.locator('input[name="videos"]').setInputFiles({
    name: "editable-proof.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("editable fake mp4"),
  });

  await Promise.all([
    page.waitForURL(/\/dashboard\?(success|error)=/),
    uploadForm.getByRole("button", { name: "Workout speichern" }).click(),
  ]);

  const historyCard = page
    .locator("#timeline")
    .locator(".fc-video-row")
    .filter({ hasText: "editable-proof.mp4" })
    .first();
  await page
    .locator("#timeline")
    .getByRole("button")
    .filter({ hasText: getTimelineDateLabel(uploadDate) })
    .first()
    .click();
  await expect(historyCard).toBeVisible();

  const addVideoChooserPromise = page.waitForEvent("filechooser");
  await page.locator("#timeline").getByRole("button", { name: "Video hinzufügen" }).first().click();
  const addVideoChooser = await addVideoChooserPromise;
  expect(addVideoChooser.isMultiple()).toBe(true);

  await page.locator("#timeline").getByRole("button", { name: "Claim ändern" }).first().click();

  const uploadCard = page.locator(`#upload-${uploadDate}`);
  await expect(uploadCard).toHaveClass(/is-focused-claim/);
  await expect(uploadCard.locator('input[name="pushupSet1"]')).toBeFocused();

  const fileChooserPromise = page.waitForEvent("filechooser");
  await historyCard.getByRole("button", { name: "Video ersetzen" }).click();
  const fileChooser = await fileChooserPromise;
  expect(fileChooser.isMultiple()).toBe(false);
});

test.fixme("dashboard joker button works", async ({ page }) => {
  await loginAsReviewer(page);

  const jokerForm = page.locator('form[action="/api/challenge/joker"]').last();
  const jokerDate = await jokerForm.locator('input[name="challengeDate"]').inputValue();
  await Promise.all([
    page.waitForURL(/\/dashboard\?(success|error)=/),
    jokerForm.getByRole("button", { name: "Joker setzen" }).click(),
  ]);
  expect(page.url()).toContain("success=");

  const reviewer = await prisma.user.findUniqueOrThrow({
    where: { email: "reviewer@fitcal.test" },
  });
  const jokerSubmission = await prisma.dailySubmission.findUnique({
    where: {
      userId_challengeDate: {
        userId: reviewer.id,
        challengeDate: jokerDate,
      },
    },
  });
  expect(jokerSubmission?.status).toBe("JOKER");
});
