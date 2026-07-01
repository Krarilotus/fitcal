import crypto from "node:crypto";
import { Prisma, RegistrationStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { reconcileRegistrationStatus } from "@/lib/registration-approval";

const SESSION_COOKIE_NAME = "fitcal_session";
const SESSION_DURATION_DAYS = 30;

export const currentUserInclude = Prisma.validator<Prisma.UserInclude>()({
  challengeEnrollment: true,
  dailySubmissions: {
    include: {
      extraEntries: {
        orderBy: {
          categoryName: "asc",
        },
      },
      videos: true,
      workoutReviews: {
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      challengeDate: "asc",
    },
  },
  measurements: {
    orderBy: {
      measuredAt: "asc",
    },
  },
});

export type CurrentUser = Prisma.UserGetPayload<{
  include: typeof currentUserInclude;
}>;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createUserSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const sessionToken = hashSessionToken(token);
  const expires = addDays(new Date(), SESSION_DURATION_DAYS);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        sessionToken: hashSessionToken(token),
      },
    });
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      sessionToken: hashSessionToken(token),
    },
    include: {
      user: {
        include: currentUserInclude,
      },
    },
  });

  if (!session || session.expires <= new Date()) {
    if (session) {
      await prisma.session.delete({
        where: {
          sessionToken: session.sessionToken,
        },
      });
    }

    return null;
  }

  if (session.user.registrationStatus === RegistrationStatus.PENDING) {
    const registrationStatus = await reconcileRegistrationStatus(
      prisma,
      session.user.id,
    );

    if (registrationStatus !== session.user.registrationStatus) {
      const refreshedUser = await prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        include: currentUserInclude,
      });

      return refreshedUser;
    }
  }

  return session.user;
}
