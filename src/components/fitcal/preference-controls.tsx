"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { defaultTheme, themes, type ThemeName } from "@/config/themes";
import { themeCookieName, type Locale } from "@/lib/preferences-shared";

type Labels = {
  locale: string;
  theme: string;
  localeNames: Record<Locale, string>;
  themeNames: Record<ThemeName, string>;
};

export function PreferenceControls({
  initialLocale,
  initialTheme,
  labels,
}: {
  initialLocale: Locale;
  initialTheme: ThemeName;
  labels: Labels;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function updateLocale(nextLocale: Locale) {
    document.cookie = `fitcal_locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  function updateTheme(nextTheme: ThemeName) {
    const safeTheme = nextTheme in themes ? nextTheme : defaultTheme;
    document.documentElement.dataset.theme = safeTheme;
    window.localStorage.setItem(themeCookieName, safeTheme);
    document.cookie = `${themeCookieName}=${safeTheme}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--fc-muted)]">
      <label className="flex items-center gap-2">
        <span>{labels.locale}</span>
        <select
          className="fc-input h-9 min-w-[7rem] py-1 text-xs"
          defaultValue={initialLocale}
          onChange={(event) => updateLocale(event.target.value as Locale)}
        >
          {Object.entries(labels.localeNames).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span>{labels.theme}</span>
        <select
          className="fc-input h-9 min-w-[8rem] py-1 text-xs"
          defaultValue={initialTheme}
          onChange={(event) => updateTheme(event.target.value as ThemeName)}
        >
          {Object.entries(labels.themeNames).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
