import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PrismaClient, RegistrationStatus } from "@prisma/client";

const BASELINE_MIGRATION = "20260710180000_baseline";
const QUALIFICATION_WINDOW_END_EXCLUSIVE = "2026-04-15";
const MIN_QUALIFICATION_UPLOADS = 10;
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

function getBerlinDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function isQualificationPeriodOver(currentDateKey) {
  return currentDateKey >= QUALIFICATION_WINDOW_END_EXCLUSIVE;
}

async function demoteUnqualifiedPaidUsers() {
  const currentDateKey = getBerlinDateKey();

  if (!isQualificationPeriodOver(currentDateKey)) {
    console.info(
      `Qualification demotion skipped before cutoff ${QUALIFICATION_WINDOW_END_EXCLUSIVE}.`,
    );
    return;
  }

  const paidUsers = await prisma.user.findMany({
    where: {
      isLightParticipant: false,
      registrationStatus: RegistrationStatus.APPROVED,
    },
    select: {
      id: true,
      dailySubmissions: {
        where: {
          status: "COMPLETED",
          challengeDate: {
            lt: QUALIFICATION_WINDOW_END_EXCLUSIVE,
          },
        },
        select: {
          id: true,
        },
      },
    },
  });

  const userIdsToDemote = paidUsers
    .filter((user) => user.dailySubmissions.length < MIN_QUALIFICATION_UPLOADS)
    .map((user) => user.id);

  if (userIdsToDemote.length === 0) {
    console.info("Qualification demotion check found no paid users to convert.");
    return;
  }

  const result = await prisma.user.updateMany({
    where: {
      id: {
        in: userIdsToDemote,
      },
      isLightParticipant: false,
      registrationStatus: RegistrationStatus.APPROVED,
    },
    data: {
      isLightParticipant: true,
      isStudentDiscount: false,
    },
  });

  console.info(
    `Qualification demotion converted ${result.count} paid users to light mode.`,
  );
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

  execFileSync(
    process.execPath,
    [prismaCli, "migrate", "deploy"],
    { stdio: "inherit" },
  );

  await demoteUnqualifiedPaidUsers();
} finally {
  await prisma.$disconnect();
}
