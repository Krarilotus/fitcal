import { cookies } from "next/headers";
import { defaultTheme, type ThemeName, themes } from "@/config/themes";
import {
  supportedLocales,
  defaultLocale,
  localeCookieName,
  themeCookieName,
  type Locale,
} from "@/lib/preferences-shared";

export { supportedLocales, defaultLocale, localeCookieName, themeCookieName } from "@/lib/preferences-shared";
export type { Locale } from "@/lib/preferences-shared";

export async function getPreferredLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(localeCookieName)?.value;

  return supportedLocales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
}

export async function getPreferredTheme(): Promise<ThemeName> {
  const cookieStore = await cookies();
  const theme = cookieStore.get(themeCookieName)?.value;

  return theme && theme in themes ? (theme as ThemeName) : defaultTheme;
}
