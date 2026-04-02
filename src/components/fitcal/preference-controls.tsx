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
    <div className="flex items-center gap-1.5 text-xs text-[var(--fc-muted)]">
      <label className="fc-pref-control" title={labels.locale}>
        <svg className="size-3.5 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <select
          className="fc-input fc-input-compact fc-pref-select"
          defaultValue={initialLocale}
          onChange={(event) => updateLocale(event.target.value as Locale)}
        >
          {Object.entries(labels.localeNames).map(([value]) => (
            <option key={value} value={value}>
              {value.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="fc-pref-control" title={labels.theme}>
        <svg className="size-3.5 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        <select
          className="fc-input fc-input-compact fc-pref-select"
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
