import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.DATABASE_URL = `file:${path.join(__dirname, "prisma", "e2e.db").replace(/\\/g, "/")}`;
process.env.FITCAL_UPLOAD_DIR = path.join(__dirname, "data", "e2e-uploads");
process.env.AUTH_URL = "http://localhost:3101";
process.env.FITCAL_TODAY_OVERRIDE = "2026-04-20";
process.env.AUTH_BCRYPT_ROUNDS = "8";

export default defineConfig({
  testDir: path.join(__dirname, "tests", "e2e", "specs"),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: path.join(__dirname, "tests", "e2e", "global-setup.ts"),
  use: {
    baseURL: "http://localhost:3101",
    trace: "on-first-retry",
  },
  webServer: {
    command: "node scripts/run-e2e-server.mjs",
    url: "http://localhost:3101",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
