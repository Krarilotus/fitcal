export const themes = {
  midnight: {
    label: "Midnight",
    colors: {
      fcColorScheme: "dark",
      background: "#0f0f11",
      foreground: "#fafafa",
      fcBg: "#0f0f11",
      fcBgRaised: "#18181b",
      fcBgSurface: "#1c1c20",
      fcInk: "#fafafa",
      fcInkSecondary: "#d4d4d8",
      fcMuted: "#a1a1aa",
      fcBorder: "#27272a",
      fcBorderStrong: "#3f3f46",
      fcSurface: "#18181b",
      fcSurfaceHover: "#27272a",
      fcAccent: "#e11d73",
      fcAccentHover: "#be185d",
      fcAccentSoft: "rgba(225, 29, 115, 0.1)",
      fcAccentBorder: "rgba(225, 29, 115, 0.3)",
      fcAccent2: "#f472b6",
      fcWarm: "#f59e0b",
      fcWarmSoft: "rgba(245, 158, 11, 0.1)",
      fcWarmBorder: "rgba(245, 158, 11, 0.25)",
      fcDanger: "#ef4444",
      fcSuccess: "#22c55e",
      fcChartBlue: "#60a5fa",
      fcChartRose: "#fb7185",
      fcChartAmber: "#fbbf24",
      fcScrollbarThumb: "#3f3f46",
      fcScrollbarThumbHover: "#52525b",
      fcScrollbarTrack: "#18181b",
    },
  },
  paper: {
    label: "Paper",
    colors: {
      fcColorScheme: "light",
      background: "#f6f1e8",
      foreground: "#2f2923",
      fcBg: "#f6f1e8",
      fcBgRaised: "#fffaf1",
      fcBgSurface: "#efe5d7",
      fcInk: "#2f2923",
      fcInkSecondary: "#544a40",
      fcMuted: "#7b6c5c",
      fcBorder: "#d8c8b4",
      fcBorderStrong: "#b89f82",
      fcSurface: "#f3e8d8",
      fcSurfaceHover: "#eadbc8",
      fcAccent: "#0f8b8d",
      fcAccentHover: "#0b6f71",
      fcAccentSoft: "rgba(15, 139, 141, 0.12)",
      fcAccentBorder: "rgba(15, 139, 141, 0.24)",
      fcAccent2: "#127273",
      fcWarm: "#c57b1a",
      fcWarmSoft: "rgba(197, 123, 26, 0.14)",
      fcWarmBorder: "rgba(197, 123, 26, 0.24)",
      fcDanger: "#c2410c",
      fcSuccess: "#15803d",
      fcChartBlue: "#2563eb",
      fcChartRose: "#db2777",
      fcChartAmber: "#d97706",
      fcScrollbarThumb: "#c7b59d",
      fcScrollbarThumbHover: "#b89f82",
      fcScrollbarTrack: "#f3e8d8",
    },
  },
} as const;

export type ThemeName = keyof typeof themes;

export const defaultTheme: ThemeName = "midnight";

export function buildThemeCss() {
  return Object.entries(themes)
    .map(([themeName, theme]) => {
      const declarations = Object.entries(theme.colors)
        .map(([key, value]) => {
          const cssVar = `--${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;
          return `${cssVar}: ${value};`;
        })
        .join("\n");

      return `:root[data-theme="${themeName}"] {\n${declarations}\n}`;
    })
    .join("\n\n");
}
