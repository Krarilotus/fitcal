export const supportedLocales = ["de", "en"] as const;
export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "de";
export const localeCookieName = "fitcal_locale";
export const themeCookieName = "fitcal_theme";
