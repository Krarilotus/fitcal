import crypto from "node:crypto";

const TOKEN_BYTES = 32;

export function createRandomToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
