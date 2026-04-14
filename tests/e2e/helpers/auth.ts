import { expect, Page } from "@playwright/test";

export async function loginAs(page: Page, email: string, password = "Passwort123") {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Einloggen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
}

export async function loginAsReviewer(page: Page, password = "Passwort123") {
  await loginAs(page, "reviewer@fitcal.test", password);
}

export async function loginAsParticipant(page: Page, password = "Passwort123") {
  await loginAs(page, "participant@fitcal.test", password);
}
