import { defaultLocale, type Locale } from "@/lib/preferences";
import {
  getSpecialDayDictionary,
  type DailyMessageContext,
  type SpecialDayFactInput,
  type SpecialDayFactTone,
  type DailyMessageIntlHelpers,
} from "@/i18n/special-day";

function getMonthDayFromDate(date: Date) {
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

function getDayNumber(dateKey: string) {
  return Number(dateKey.slice(8));
}

function formatNumberForLocale(locale: Locale, value: number | null | undefined, digits = 1) {
  if (value == null) {
    return null;
  }

  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatCurrencyForLocale(locale: Locale, cents: number) {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function getWeekdayLabel(dateKey: string, localeCode: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return localeCode.startsWith("de") ? "Heute" : "Today";
  }

  return new Intl.DateTimeFormat(localeCode, {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
}

function stripDateLead(fact: string, patterns: RegExp[]) {
  return patterns.reduce((current, pattern) => current.replace(pattern, ""), fact);
}

function uppercaseFirst(text: string) {
  if (!text) {
    return text;
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function beginsWithVerb(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function isSeriousFact(fact: string, keywords: string[]) {
  return keywords.some((keyword) => fact.includes(keyword));
}

function isSportFact(fact: string, sportPattern: RegExp) {
  return sportPattern.test(fact);
}

function getFactText(entry: SpecialDayFactInput) {
  return typeof entry === "string" ? entry : entry.text;
}

function getFactTone(
  entry: SpecialDayFactInput,
  dictionary: ReturnType<typeof getSpecialDayDictionary>,
) {
  if (typeof entry !== "string" && entry.tone) {
    return entry.tone;
  }

  const fact = getFactText(entry);

  if (isSeriousFact(fact, dictionary.seriousKeywords)) {
    return "serious" as const;
  }

  if (isSportFact(fact, dictionary.sportPattern)) {
    return "sport" as const;
  }

  return "generic" as const;
}

function normalizeFactEntry(
  entry: SpecialDayFactInput,
  dictionary: ReturnType<typeof getSpecialDayDictionary>,
) {
  const rawText = getFactText(entry).trim();
  const strippedText = stripDateLead(rawText, dictionary.dateLeadPatterns).trim();

  if (typeof entry !== "string" && entry.composition) {
    return {
      composition: entry.composition,
      text: entry.composition === "raw" ? rawText : strippedText || rawText,
      tone: getFactTone(entry, dictionary),
    };
  }

  if (!strippedText || strippedText === rawText) {
    return {
      composition: "raw" as const,
      text: rawText,
      tone: getFactTone(entry, dictionary),
    };
  }

  return {
    composition: beginsWithVerb(strippedText, dictionary.beginsWithVerbPattern)
      ? ("leadlessVerb" as const)
      : ("leadlessSentence" as const),
    text: strippedText,
    tone: getFactTone(entry, dictionary),
  };
}

function hasPersonalContext(context: DailyMessageContext) {
  return (
    context.latestWaistCm != null ||
    context.latestWeightKg != null ||
    context.documentedDays > 0 ||
    context.outstandingDebtCents > 0 ||
    Boolean(context.motivation)
  );
}

function getSecondLine(
  context: DailyMessageContext,
  helpers: DailyMessageIntlHelpers,
  dayNumber: number,
  factText: string,
  factTone: SpecialDayFactTone,
  locale: ReturnType<typeof getSpecialDayDictionary>,
) {
  const monthlyPersonalLines =
    context.name?.trim() && hasPersonalContext(context)
      ? locale.buildMonthlyPersonalLines(context, helpers)
      : [];

  if (monthlyPersonalLines.length > 0 && (dayNumber === 5 || dayNumber === 21)) {
    return monthlyPersonalLines[(dayNumber === 5 ? 0 : 1) % monthlyPersonalLines.length]!;
  }

  const variants =
    hasPersonalContext(context) && dayNumber % 3 !== 1
      ? locale.buildPersonalLines(context, helpers)
      : factTone === "serious"
        ? locale.seriousFocusLines(context)
        : factTone === "sport"
          ? locale.sportFocusLines(context)
          : locale.genericFocusLines(context);

  return variants[dayNumber % variants.length];
}

export function getDailyMessage(
  context: DailyMessageContext,
  locale: Locale = defaultLocale,
) {
  const dictionary = getSpecialDayDictionary(locale);
  const dayNumber = getDayNumber(context.currentDate);
  const weekday = uppercaseFirst(getWeekdayLabel(context.currentDate, dictionary.weekdayLocale));
  const helpers: DailyMessageIntlHelpers = {
    formatNumber: (value, digits) => formatNumberForLocale(locale, value, digits),
    formatCurrency: (valueInCents) => formatCurrencyForLocale(locale, valueInCents),
  };

  if (context.birthDate) {
    const birthdayKey = getMonthDayFromDate(context.birthDate);

    if (birthdayKey === context.currentDate.slice(5)) {
      return dictionary.buildBirthdayMessage(context, helpers);
    }
  }

  const factEntry =
    dictionary.facts[context.currentDate.slice(5)] ?? dictionary.fallbackFact;
  const normalizedFact = normalizeFactEntry(factEntry, dictionary);
  const secondLine = getSecondLine(
    context,
    helpers,
    dayNumber,
    normalizedFact.text,
    normalizedFact.tone,
    dictionary,
  );

  let lead: string;

  if (normalizedFact.composition === "raw") {
    lead = uppercaseFirst(normalizedFact.text);
  } else if (normalizedFact.composition === "leadlessVerb") {
    lead = dictionary.buildVerbLead({
      weekday,
      strippedFact: normalizedFact.text,
    });
  } else {
    const leadVariants =
      normalizedFact.tone === "serious"
        ? dictionary.seriousLeadVariants
        : dictionary.sentenceLeadVariants;
    lead = leadVariants[dayNumber % leadVariants.length]({
      weekday,
      strippedFact: uppercaseFirst(normalizedFact.text),
    });
  }

  return `${lead}\n${uppercaseFirst(secondLine)}`.trim();
}
