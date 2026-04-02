import { copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { projectRoot } from "./e2e-env.mjs";

const sourceDb = path.join(projectRoot, "prisma", "dev.db");
const targetDb = path.join(projectRoot, "prisma", "e2e.db");

await rm(targetDb, { force: true });
await rm(`${targetDb}-journal`, { force: true });
await copyFile(sourceDb, targetDb);

const seedModule = await import("./e2e-seed.mjs");
await seedModule.seedE2EData();
