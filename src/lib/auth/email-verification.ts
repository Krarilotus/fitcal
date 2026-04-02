import { createRandomToken } from "@/lib/auth/token";
import { prisma } from "@/lib/db";

const EMAIL_VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function createEmailVerificationToken(email: string) {
  const token = createRandomToken();

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: email,
    },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS),
    },
  });

  return token;
}

export async function consumeEmailVerificationToken(token: string) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      token,
    },
  });

  if (!verificationToken || verificationToken.expires <= new Date()) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      email: verificationToken.identifier,
    },
    select: {
      id: true,
      emailVerified: true,
    },
  });

  if (!user) {
    await prisma.verificationToken.delete({
      where: {
        token,
      },
    });
    return null;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerified: user.emailVerified ?? new Date(),
      },
    }),
    prisma.verificationToken.deleteMany({
      where: {
        identifier: verificationToken.identifier,
      },
    }),
  ]);

  return verificationToken.identifier;
}
