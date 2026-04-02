import { expect, Page } from "@playwright/test";

export async function loginAsReviewer(page: Page, password = "Passwort123") {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill("reviewer@fitcal.test");
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Einloggen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
}
