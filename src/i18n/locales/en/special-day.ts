import type {
  DailyMessageContext,
  DailyMessageIntlHelpers,
  SpecialDayLocaleDictionary,
} from "@/i18n/special-day";
import { enSpecialDayFacts } from "@/i18n/locales/en/special-day-facts";

function getBodyWeightDirection(context: DailyMessageContext) {
  if (context.latestWeightKg == null || context.heightCm == null || context.heightCm <= 0) {
    return null;
  }

  const heightM = context.heightCm / 100;
  const bmi = context.latestWeightKg / (heightM * heightM);

  if (bmi < 20) {
    return "bulk" as const;
  }

  if (bmi > 25) {
    return "cut" as const;
  }

  return "maintain" as const;
}

function buildEnPersonalLines(
  context: DailyMessageContext,
  helpers: DailyMessageIntlHelpers,
) {
  const candidates: string[] = [];
  const latestWaist = helpers.formatNumber(context.latestWaistCm);
  const latestWeight = helpers.formatNumber(context.latestWeightKg);
  const height = helpers.formatNumber(context.heightCm, 0);
  const weightDirection = getBodyWeightDirection(context);

  if (latestWaist) {
    candidates.push(
      `Latest waist: ${latestWaist} cm. Your core already got the memo.`,
      `${latestWaist} cm is on file for the midsection, so today's sit-ups can answer for it.`,
      `With ${latestWaist} cm around the middle, your abs should not be letting the excuses lead.`,
    );
  }

  if (latestWeight) {
    if (weightDirection === "cut" && height) {
      candidates.push(
        `${latestWeight} kg at ${height} cm points more toward leaning out than defending snacks today.`,
        `At ${latestWeight} kg and ${height} cm, this is a good day for less ballast and more tension.`,
        `${latestWeight} kg on ${height} cm is a strong cue for clean reps instead of calorie negotiation.`,
      );
    } else if (weightDirection === "bulk" && height) {
      candidates.push(
        `${latestWeight} kg at ${height} cm does not scream diet; it leans more toward a clean bulk done properly.`,
        `At ${latestWeight} kg and ${height} cm, today can carry a little bulking energy without losing form.`,
        `${latestWeight} kg on ${height} cm looks more like structure, protein, and a respectable second set.`,
      );
    } else if (height) {
      candidates.push(
        `${latestWeight} kg at ${height} cm looks more like maintaining than panicking.`,
        `Weight at ${latestWeight} kg and height at ${height} cm is a decent zone for steady maintenance work.`,
        `At ${latestWeight} kg on ${height} cm, today looks more like maintain mode than drama.`,
      );
    } else {
      candidates.push(
        `${latestWeight} kg is logged. The mat has expectations now.`,
        `${latestWeight} kg sits in your profile, and push-ups still treat every kilo honestly.`,
        `At ${latestWeight} kg, today is for clean reps, not dramatic speeches.`,
      );
    }
  }

  if (context.documentedDays > 0) {
    candidates.push(
      `${context.documentedDays} documented days later, this is clearly no longer a mood.`,
      `${context.documentedDays} days are already logged. Even the mat knows you mean it.`,
      `${context.documentedDays} documented days suggest your inner couch goblin has been demoted to paperwork.`,
    );
  }

  if (context.outstandingDebtCents > 0) {
    const debt = helpers.formatCurrency(context.outstandingDebtCents);
    candidates.push(
      `${debt} is still open. Debt responds surprisingly well to repetitions.`,
      `${debt} remains on the board. The nicest way down is still more work.`,
      `${debt} is waiting to get smaller, and the reps know how to help.`,
    );
  }

  if (context.motivation) {
    candidates.push(
      `If your brain wants to negotiate today, remember this: ${context.motivation}`,
      `You wrote this down for a reason: ${context.motivation}`,
      `Your own note for days like this still stands: ${context.motivation}`,
    );
  }

  candidates.push(
    `${context.currentTarget} per exercise is today's unromantic truth.`,
    `More than ${context.currentTarget} per exercise is bonus; less is just math.`,
    `${context.currentTarget} per exercise is on the menu today. Not glamorous, still effective.`,
    `Today's number is ${context.currentTarget}. Small enough to do, large enough to expose excuses.`,
    `${context.currentTarget} per exercise is the line today, and charm will not move it.`,
  );

  return candidates;
}

export const enSpecialDay: SpecialDayLocaleDictionary = {
  weekdayLocale: "en-US",
  facts: enSpecialDayFacts,
  fallbackFact: "Today mostly asks you to close the day cleanly.",
  dateLeadPatterns: [
    /^On [A-Z][a-z]+ \d{1,2}(?:, \d{4})?,?\s+/u,
    /^Last day of [A-Z][a-z]+:\s*/u,
    /^Spring equinox:\s*/u,
    /^Leap day:\s*/u,
    /^Valentine's Day:\s*/u,
    /^Today\s+/u,
  ],
  beginsWithVerbPattern:
    /^(is|are|was|were|feels|feel|fits|fit|shows|show|started|start|began|begin|ends|end|marks|mark|reminds|remind|looks|look|sits|sit|brings|bring|means|mean|carries|carry|proves|prove|became|becomes|launched|launches|opened|opens|explained|explains)\b/i,
  seriousKeywords: [
    "war",
    "Holocaust",
    "attack",
    "murder",
    "disaster",
    "earthquake",
    "Chernobyl",
    "violence",
    "human rights",
    "smallpox",
    "AIDS",
    "diabetes",
    "Pearl Harbor",
    "Utøya",
    "massacre",
    "hostage",
    "terror",
    "crash",
  ],
  sportPattern:
    /sport|Olymp|Dance|Yoga|Skateboarding|Tour de France|Tennis|Bicycle|Cricket|Football|Soccer|Wimbledon/i,
  verbLeadVariants: [
    ({ strippedFact }) => `Today ${strippedFact}`,
    ({ strippedFact }) => `What matters today: ${strippedFact}`,
    ({ strippedFact }) => `The note for today is simple: ${strippedFact}`,
    ({ weekday, strippedFact }) => `${weekday} gives you this: ${strippedFact}`,
  ],
  nounLeadVariants: [
    ({ strippedFact }) => `Today's note is simple: ${strippedFact}`,
    ({ weekday, strippedFact }) => `${weekday} brings this with it: ${strippedFact}`,
    ({ strippedFact }) => `The calendar note for today: ${strippedFact}`,
    ({ strippedFact }) => `What matters today: ${strippedFact}`,
    ({ weekday, strippedFact }) => `${weekday} also carries this: ${strippedFact}`,
    ({ strippedFact }) => `What sticks today: ${strippedFact}`,
    ({ strippedFact }) => `One good thought for today: ${strippedFact}`,
    ({ strippedFact }) => `Worth keeping in mind today: ${strippedFact}`,
  ],
  seriousFocusLines: () => [
    "A calm, properly finished day is enough of an answer.",
    "You do not need to decorate this one. Showing up cleanly is enough.",
    "Staying focused is already the right tone today.",
    "A steady, sober day fits this date best.",
  ],
  sportFocusLines: (context) => [
    `${context.currentTarget} clean reps per exercise would be a pretty solid echo of that.`,
    "The calendar is in a sporty mood today. You only need to catch up.",
    "Today the history books would probably respect two clean sets without drama.",
    "This one pairs well with clean work and very little theatre.",
  ],
  genericFocusLines: (context) => [
    `${context.currentTarget} clean reps per exercise is still the real headline today.`,
    "Today rewards the small, clean version of consistency.",
    "The mat needs less pathos and more follow-through today.",
    "A documented day will look better later than any big announcement now.",
    "Today's work only needs to be the kind that looks almost too simple in hindsight.",
  ],
  buildPersonalLines: buildEnPersonalLines,
  buildBirthdayMessage: (context, helpers) => {
    const name = context.name?.trim() || "You";
    const latestWaist = helpers.formatNumber(context.latestWaistCm);
    const latestWeight = helpers.formatNumber(context.latestWeightKg);
    const metricTail = latestWaist
      ? ` Your latest waist entry is ${latestWaist} cm, so the new year of life gets a small core assignment instead of just cake support.`
      : latestWeight
        ? ` Your latest weight sits at ${latestWeight} kg, and today it gets carried through both sets with decent form.`
        : ` Today's target is ${context.currentTarget} per exercise. No wrapping paper, but at least some muscle-soreness potential.`;

    return `${name}, it's your birthday today. New year of life, same mat, and hopefully a little more style in the second set.${metricTail}`;
  },
};
