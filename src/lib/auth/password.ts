import bcrypt from "bcryptjs";

const DEFAULT_SALT_ROUNDS = 12;

function getSaltRounds(): number {
  const value = Number(process.env.AUTH_BCRYPT_ROUNDS ?? DEFAULT_SALT_ROUNDS);
  if (!Number.isInteger(value) || value < 8 || value > 15) {
    return DEFAULT_SALT_ROUNDS;
  }
  return value;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, getSaltRounds());
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
