import { WorkoutReviewDecision } from "@prisma/client";

export type PrimaryWorkoutReviewAction = "approve" | "adjust";
export type ArbitrationWorkoutReviewAction = "accept" | "reject";

export function parsePrimaryWorkoutReviewAction(
  decisionValue: string,
): PrimaryWorkoutReviewAction | null {
  if (decisionValue === "approve" || decisionValue === "adjust") {
    return decisionValue;
  }

  return null;
}

export function parseArbitrationWorkoutReviewAction(
  decisionValue: string,
): ArbitrationWorkoutReviewAction | null {
  if (decisionValue === "accept" || decisionValue === "reject") {
    return decisionValue;
  }

  return null;
}

export function resolvePrimaryWorkoutReviewDecision(params: {
  action: PrimaryWorkoutReviewAction;
  rawPushups: number;
  rawSitups: number;
  countedPushups: number;
  countedSitups: number;
}) {
  const { action, countedPushups, countedSitups, rawPushups, rawSitups } = params;

  if (action === "approve") {
    return {
      countedPushups: rawPushups,
      countedSitups: rawSitups,
      decision: WorkoutReviewDecision.APPROVE,
    };
  }

  if (countedPushups === 0 && countedSitups === 0) {
    return {
      countedPushups,
      countedSitups,
      decision: WorkoutReviewDecision.REJECT,
    };
  }

  if (countedPushups === rawPushups && countedSitups === rawSitups) {
    return {
      countedPushups,
      countedSitups,
      decision: WorkoutReviewDecision.APPROVE,
    };
  }

  return {
    countedPushups,
    countedSitups,
    decision: WorkoutReviewDecision.REDUCE,
  };
}
