import path from "node:path";

process.env.DATABASE_URL = `file:${path.join(process.cwd(), "prisma", "e2e.db").replace(/\\/g, "/")}`;

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function disconnectTestDb() {
  await prisma.$disconnect();
}
