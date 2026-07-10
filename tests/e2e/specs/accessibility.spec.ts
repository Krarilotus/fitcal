import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAsReviewer } from "../helpers/auth";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("login page has no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/login");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("dashboard has no automatically detectable accessibility violations", async ({ page }) => {
  await loginAsReviewer(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
