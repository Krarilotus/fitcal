import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, "..");
export const e2eDbRelativePath = path.join(projectRoot, "prisma", "e2e.db");
export const e2eDbUrl = `file:${e2eDbRelativePath.replace(/\\/g, "/")}`;
export const e2eUploadDirRelativePath = path.join(projectRoot, "data", "e2e-uploads");
export const e2eBaseUrl = "http://localhost:3101";
export const e2eTodayOverride = "2026-04-20";

export function getE2EEnv(overrides = {}) {
  return {
    ...process.env,
    DATABASE_URL: e2eDbUrl,
    FITCAL_UPLOAD_DIR: e2eUploadDirRelativePath,
    AUTH_URL: e2eBaseUrl,
    AUTH_BCRYPT_ROUNDS: "8",
    FITCAL_TODAY_OVERRIDE: e2eTodayOverride,
    NODE_ENV: "development",
    ...overrides,
  };
}
