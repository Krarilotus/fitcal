import { defaultLocale, type Locale } from "@/lib/preferences";
import {
  getSpecialDayDictionary,
  type DailyMessageContext,
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
  fact: string,
  locale: ReturnType<typeof getSpecialDayDictionary>,
) {
  const variants =
    hasPersonalContext(context) && dayNumber % 3 !== 1
      ? locale.buildPersonalLines(context, helpers)
      : isSeriousFact(fact, locale.seriousKeywords)
        ? locale.seriousFocusLines(context)
        : isSportFact(fact, locale.sportPattern)
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

  const fact = dictionary.facts[context.currentDate.slice(5)] ?? dictionary.fallbackFact;
  const strippedFact = stripDateLead(fact, dictionary.dateLeadPatterns).trim();
  const secondLine = getSecondLine(context, helpers, dayNumber, fact, dictionary);

  if (!strippedFact || strippedFact === fact) {
    return `${uppercaseFirst(fact)}\n${uppercaseFirst(secondLine)}`.trim();
  }

  const leadVariants = beginsWithVerb(strippedFact, dictionary.beginsWithVerbPattern)
    ? dictionary.verbLeadVariants
    : dictionary.nounLeadVariants;
  const lead = leadVariants[dayNumber % leadVariants.length]({
    weekday,
    strippedFact: beginsWithVerb(strippedFact, dictionary.beginsWithVerbPattern)
      ? strippedFact
      : uppercaseFirst(strippedFact),
  });

  return `${lead}\n${uppercaseFirst(secondLine)}`.trim();
}
