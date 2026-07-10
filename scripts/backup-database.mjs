import { mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "";

if (!databaseUrl.startsWith("file:")) {
  console.info("Database backup skipped: only SQLite file databases are supported.");
  process.exit(0);
}

const databasePath = databaseUrl.slice("file:".length);
const absoluteDatabasePath = path.resolve(process.cwd(), "prisma", databasePath);
const backupDirectory = path.join(path.dirname(absoluteDatabasePath), "backups");
await mkdir(backupDirectory, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDirectory, `fitcal-${stamp}.db`);
const escapedBackupPath = backupPath.replace(/'/g, "''");
const prisma = new PrismaClient();

try {
  await prisma.$executeRawUnsafe(`VACUUM INTO '${escapedBackupPath}'`);
  console.info(`Database backup created: ${backupPath}`);
} finally {
  await prisma.$disconnect();
}

const backups = (await readdir(backupDirectory))
  .filter((name) => name.endsWith(".db"))
  .sort()
  .reverse();

for (const staleBackup of backups.slice(10)) {
  await unlink(path.join(backupDirectory, staleBackup));
}
