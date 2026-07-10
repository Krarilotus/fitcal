import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const BASELINE_MIGRATION = "20260710180000_baseline";
const prismaCli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const prisma = new PrismaClient();

async function tableExists(name) {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    name,
  );
  return rows.length > 0;
}

try {
  const hasApplicationSchema = await tableExists("User");
  const hasMigrationHistory = await tableExists("_prisma_migrations");

  if (hasApplicationSchema && !hasMigrationHistory) {
    execFileSync(
      process.execPath,
      [prismaCli, "migrate", "resolve", "--applied", BASELINE_MIGRATION],
      { stdio: "inherit" },
    );
  }
} finally {
  await prisma.$disconnect();
}

execFileSync(
  process.execPath,
  [prismaCli, "migrate", "deploy"],
  { stdio: "inherit" },
);
