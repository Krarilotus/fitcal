import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { e2eDbRelativePath, getE2EEnv, projectRoot } from "./e2e-env.mjs";

const e2eEnv = getE2EEnv();

await rm(e2eDbRelativePath, { force: true });
await rm(`${e2eDbRelativePath}-journal`, { force: true });
await rm(`${e2eDbRelativePath}-shm`, { force: true });
await rm(`${e2eDbRelativePath}-wal`, { force: true });

const schemaSql = execFileSync(
  process.execPath,
  [
    path.join(projectRoot, "node_modules", "prisma", "build", "index.js"),
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    path.join(projectRoot, "prisma", "schema.prisma"),
    "--script",
  ],
  {
    cwd: projectRoot,
    env: e2eEnv,
    encoding: "utf8",
  },
);

process.env = e2eEnv;
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

try {
  for (const statement of schemaSql.split(/;\s*(?:\r?\n|$)/)) {
    const trimmed = statement.trim();

    if (trimmed) {
      await prisma.$executeRawUnsafe(trimmed);
    }
  }
} finally {
  await prisma.$disconnect();
}

const seedModule = await import("./e2e-seed.mjs");
await seedModule.seedE2EData();
