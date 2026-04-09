import { deSpecialDay } from "@/i18n/locales/de/special-day";
import { enSpecialDay } from "@/i18n/locales/en/special-day";
import { defaultLocale, type Locale } from "@/lib/preferences";

export type DailyMessageContext = {
  currentDate: string;
  currentTarget: number;
  name: string | null;
  birthDate: Date | null;
  heightCm: number | null;
  latestWeightKg: number | null;
  latestWaistCm: number | null;
  outstandingDebtCents: number;
  documentedDays: number;
  motivation: string | null;
};

export type DailyMessageIntlHelpers = {
  formatNumber: (value: number | null | undefined, digits?: number) => string | null;
  formatCurrency: (valueInCents: number) => string;
};

export type SpecialDayFactTone = "generic" | "serious" | "sport";

export type SpecialDayFactEntry = {
  text: string;
  composition?: "raw" | "leadlessSentence" | "leadlessVerb";
  tone?: SpecialDayFactTone;
};

export type SpecialDayFactInput = string | SpecialDayFactEntry;

export type FactLeadArgs = {
  weekday: string;
  strippedFact: string;
};

export type SpecialDayLocaleDictionary = {
  weekdayLocale: string;
  facts: Record<string, SpecialDayFactInput>;
  fallbackFact: SpecialDayFactInput;
  dateLeadPatterns: RegExp[];
  beginsWithVerbPattern: RegExp;
  seriousKeywords: string[];
  sportPattern: RegExp;
  sentenceLeadVariants: Array<(args: FactLeadArgs) => string>;
  seriousLeadVariants: Array<(args: FactLeadArgs) => string>;
  buildVerbLead: (args: FactLeadArgs) => string;
  seriousFocusLines: (context: DailyMessageContext) => string[];
  sportFocusLines: (context: DailyMessageContext) => string[];
  genericFocusLines: (context: DailyMessageContext) => string[];
  buildPersonalLines: (
    context: DailyMessageContext,
    helpers: DailyMessageIntlHelpers,
  ) => string[];
  buildMonthlyPersonalLines: (
    context: DailyMessageContext,
    helpers: DailyMessageIntlHelpers,
  ) => string[];
  buildBirthdayMessage: (
    context: DailyMessageContext,
    helpers: DailyMessageIntlHelpers,
  ) => string;
};

const specialDayDictionaries = {
  de: deSpecialDay,
  en: enSpecialDay,
} as const satisfies Record<Locale, SpecialDayLocaleDictionary>;

export function getSpecialDayDictionary(
  locale: Locale = defaultLocale,
): SpecialDayLocaleDictionary {
  return specialDayDictionaries[locale] ?? specialDayDictionaries[defaultLocale];
}
