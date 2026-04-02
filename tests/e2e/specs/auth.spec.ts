import crypto from "node:crypto";
import { afterAll, beforeEach, expect, test } from "@playwright/test";
import { disconnectTestDb, prisma } from "../helpers/db";
import { resetE2EState } from "../helpers/reset";

beforeEach(() => {
  resetE2EState();
});

afterAll(async () => {
  await disconnectTestDb();
});

test("registration request creates a pending account", async ({ page }) => {
  await page.goto("/register");

  await page.getByLabel("Name").fill("Test Antrag");
  await page.getByLabel("E-Mail").fill("new-user@fitcal.test");
  await page.getByLabel("Passwort").fill("Passwort123");
  await page.getByRole("button", { name: "Registrierungsanfrage senden" }).click();

  await expect(page).toHaveURL(/\/login\?success=/);
  await expect(page.getByText(/Registrierungsanfrage gesendet/i)).toBeVisible();

  const createdUser = await prisma.user.findUnique({
    where: { email: "new-user@fitcal.test" },
    include: { registrationApprovals: true },
  });

  expect(createdUser?.registrationStatus).toBe("PENDING");
  expect((createdUser?.registrationApprovals ?? []).length).toBeGreaterThanOrEqual(1);
});

test("approved user can log in and log out", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill("reviewer@fitcal.test");
  await page.getByLabel("Passwort").fill("Passwort123");
  await page.getByRole("button", { name: "Einloggen" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("forgot password and reset password flows work with test data", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("E-Mail").fill("reviewer@fitcal.test");
  await page.getByRole("button", { name: "Reset-Link senden" }).click();

  await expect(page).toHaveURL(/\/forgot-password\?success=/);
  await expect(page.getByText(/wurde ein link versendet/i)).toBeVisible();

  const rawResetToken = "reset-token-generated-during-test-1234567890abcdef";
  const reviewer = await prisma.user.findUniqueOrThrow({
    where: { email: "reviewer@fitcal.test" },
  });

  await prisma.passwordResetToken.create({
    data: {
      tokenHash: crypto.createHash("sha256").update(rawResetToken).digest("hex"),
      userId: reviewer.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      emailDelivered: false,
    },
  });

  await page.goto(`/reset-password?token=${rawResetToken}`);
  await page.getByLabel("Neues Passwort").fill("NeuesPasswort123");
  await page.getByRole("button", { name: "Passwort speichern" }).click();

  await expect(page).toHaveURL(/\/login\?success=/);

  await page.getByLabel("E-Mail").fill("reviewer@fitcal.test");
  await page.getByLabel("Passwort").fill("NeuesPasswort123");
  await page.getByRole("button", { name: "Einloggen" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
});
