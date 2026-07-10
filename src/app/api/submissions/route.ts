import { rm } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import {
  CHALLENGE_START_DATE,
  MAX_VIDEO_FILES_PER_DAY,
  MAX_VIDEO_SIZE_BYTES,
  canSubmitForDate,
  isWithinChallenge,
} from "@/lib/challenge";
import { prisma } from "@/lib/db";
import { ensureDailyUploadDirectory } from "@/lib/storage";
import {
  canEditSubmissionBeforeReview,
  getVideoDisplayNames,
  getVideoFiles,
  parseSubmissionInput,
  SubmissionValidationError,
} from "@/lib/submission";
import {
  persistReplacementSubmissionVideo,
  persistSubmissionVideos,
  removeReplacedSubmissionVideo,
  type PersistedSubmissionVideo,
} from "@/lib/submission-videos";
import { dashboardMessageUrl, getApiMessages } from "@/lib/i18n-api";
import {
  canReceiveWorkoutReviews,
  canSubmitWorkoutForDate,
  canUploadWorkoutVideos,
} from "@/lib/participation-policy";
import { saveWorkoutRecord } from "@/application/workouts/save-workout-record";

export const runtime = "nodejs";

function wantsJsonResponse(request: Request) {
  return request.headers.get("x-fitcal-response-format") === "json";
}

function redirectTo(url: string | URL) {
  return NextResponse.redirect(url, { status: 303 });
}

function successRedirectUrl(
  user: { isLightParticipant: boolean },
  request: Request,
  messages: Awaited<ReturnType<typeof getApiMessages>>["submissions"],
) {
  return dashboardMessageUrl(
    request,
    "success",
    user.isLightParticipant ? messages.entrySaved : messages.workoutSaved,
  );
}

function errorRedirectUrl(message: string, request: Request) {
  return dashboardMessageUrl(request, "error", message);
}

function getSubmissionReviewStatus(user: { isLightParticipant: boolean }) {
  return canReceiveWorkoutReviews(user) ? "PENDING" : "NOT_REQUIRED";
}

function getSubmissionErrorCode(error: unknown) {
  return error instanceof SubmissionValidationError && error.code === "VIDEO_TOO_LARGE"
    ? "too_large"
    : "submission_failed";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const messages = (await getApiMessages()).submissions;

  if (!user) {
    if (wantsJsonResponse(request)) {
      return NextResponse.json(
        {
          ok: false,
          error: messages.unauthorized,
          errorCode: "unauthorized",
          redirectUrl: getAppUrl("/login", request),
        },
        { status: 401 },
      );
    }

    return redirectTo(getAppUrl("/login", request));
  }

  try {
    const formData = await request.formData();
    const parsed = parseSubmissionInput(formData, user);
    const replaceVideoIdValue = formData.get("replaceVideoId");
    const replaceVideoId =
      typeof replaceVideoIdValue === "string" ? replaceVideoIdValue.trim() : "";

    if (parsed.challengeDate < CHALLENGE_START_DATE) {
      throw new Error(messages.afterChallengeStart);
    }

    const existing = await prisma.dailySubmission.findUnique({
      where: {
        userId_challengeDate: {
          challengeDate: parsed.challengeDate,
          userId: user.id,
        },
      },
      include: {
        videos: {
          orderBy: {
            orderIndex: "asc",
          },
        },
        workoutReviews: {
          select: {
            id: true,
          },
        },
      },
    });

    const canEditExistingSubmission =
      existing != null &&
      canEditSubmissionBeforeReview({
        challengeDate: existing.challengeDate,
        reviewCount: existing.workoutReviews.length,
      });

    if (existing && !canEditExistingSubmission) {
      throw new Error(messages.claimLocked);
    }

    if (
      !existing &&
      !canSubmitWorkoutForDate(
        user,
        isWithinChallenge(parsed.challengeDate),
        canSubmitForDate(parsed.challengeDate),
      )
    ) {
      throw new Error(messages.newUploadsWindow);
    }

    const appendedVideos: PersistedSubmissionVideo[] = [];
    let replacementVideo:
      | (PersistedSubmissionVideo & {
          targetId: string;
          previousStoredPath: string;
        })
      | null = null;

    if (canUploadWorkoutVideos(user)) {
      const rawFiles = formData
        .getAll("videos")
        .filter((value): value is File => value instanceof File && value.size > 0);
      const displayNames = getVideoDisplayNames(formData, rawFiles);

      if (existing && canEditExistingSubmission) {
        const replacementTarget = replaceVideoId
          ? existing.videos.find((video) => video.id === replaceVideoId) ?? null
          : null;

        if (replaceVideoId && !replacementTarget) {
          throw new Error(messages.videoNotYours);
        }

        if (replaceVideoId) {
          if (rawFiles.length !== 1) {
            throw new Error(messages.replaceSingleVideo);
          }
        } else if (rawFiles.length > MAX_VIDEO_FILES_PER_DAY) {
          throw new Error(messages.videoCount);
        }

        for (const file of rawFiles) {
          if (file.size > MAX_VIDEO_SIZE_BYTES) {
            throw new SubmissionValidationError("VIDEO_TOO_LARGE", messages.videoTooLarge);
          }
        }

        if (
          !replaceVideoId &&
          existing.videos.length + rawFiles.length > MAX_VIDEO_FILES_PER_DAY
        ) {
          throw new Error(messages.videoCount);
        }

        if (!replaceVideoId && existing.videos.length + rawFiles.length < 1) {
          throw new Error(messages.videoCount);
        }

        if (replaceVideoId && replacementTarget) {
          const persistedReplacement = await persistReplacementSubmissionVideo({
            challengeDate: parsed.challengeDate,
            displayName: displayNames[0] ?? rawFiles[0].name,
            file: rawFiles[0],
            target: {
              orderIndex: replacementTarget.orderIndex,
              storedPath: replacementTarget.storedPath,
            },
            userLabel: user.name || user.email,
          });

          replacementVideo = {
            ...persistedReplacement,
            previousStoredPath: replacementTarget.storedPath,
            targetId: replacementTarget.id,
          };
        } else if (rawFiles.length > 0) {
          appendedVideos.push(
            ...(await persistSubmissionVideos({
              challengeDate: parsed.challengeDate,
              displayNames,
              files: rawFiles,
              startIndex: existing.videos.length,
              userLabel: user.name || user.email,
            })),
          );
        }
      } else {
        const files = getVideoFiles(formData, messages);
        const displayNames = getVideoDisplayNames(formData, files);
        const { folderPath } = await ensureDailyUploadDirectory(
          user.name || user.email,
          parsed.challengeDate,
        );

        await rm(folderPath, { recursive: true, force: true });

        appendedVideos.push(
          ...(await persistSubmissionVideos({
            challengeDate: parsed.challengeDate,
            displayNames,
            files,
            userLabel: user.name || user.email,
          })),
        );
      }
    }

    await saveWorkoutRecord({
      userId: user.id,
      existingSubmissionId:
        existing && canEditExistingSubmission ? existing.id : undefined,
      parsed,
      reviewStatus: getSubmissionReviewStatus(user),
      appendedVideos,
      replacementVideo,
    });

    if (replacementVideo) {
      await removeReplacedSubmissionVideo(
        replacementVideo.previousStoredPath,
        replacementVideo.storedPath,
      );
    }

    const redirectUrl = successRedirectUrl(user, request, messages);

    if (wantsJsonResponse(request)) {
      return NextResponse.json({
        ok: true,
        redirectUrl,
      });
    }

    return redirectTo(redirectUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : messages.saveFailed;
    const redirectUrl = errorRedirectUrl(message, request);
    const errorCode = getSubmissionErrorCode(error);

    if (wantsJsonResponse(request)) {
      return NextResponse.json(
        {
          ok: false,
          error: message,
          errorCode,
          redirectUrl,
        },
        {
          status: errorCode === "too_large" ? 413 : 400,
        },
      );
    }

    return redirectTo(redirectUrl);
  }
}
