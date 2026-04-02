import { deApp } from "@/i18n/locales/de/app";
import { enApp } from "@/i18n/locales/en/app";
import { defaultLocale, type Locale } from "@/lib/preferences";

const dictionaries = {
  de: deApp,
  en: enApp,
} as const;

export type AppDictionary = (typeof dictionaries)[typeof defaultLocale];

export function getDictionary(locale: Locale = defaultLocale): AppDictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
