"use client";

import { useEffect } from "react";
import { defaultTheme, type ThemeName, themes } from "@/config/themes";
import { themeCookieName } from "@/lib/preferences-shared";

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: ThemeName;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const html = document.documentElement;
    const savedTheme = window.localStorage.getItem(themeCookieName) as ThemeName | null;
    const nextTheme = savedTheme && savedTheme in themes ? savedTheme : initialTheme ?? defaultTheme;

    html.dataset.theme = nextTheme;
    window.localStorage.setItem(themeCookieName, nextTheme);
    document.cookie = `${themeCookieName}=${nextTheme}; path=/; max-age=31536000; samesite=lax`;
  }, [initialTheme]);

  return <>{children}</>;
}
