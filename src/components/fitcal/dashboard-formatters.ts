import type { Locale } from "@/lib/preferences";

function getNumberLocale(locale: Locale) {
  return locale === "en" ? "en-US" : "de-DE";
}

export function formatDashboardCurrency(locale: Locale, cents: number) {
  return new Intl.NumberFormat(getNumberLocale(locale), {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatBirthDate(locale: Locale, value: Date | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(getNumberLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function formatBirthDateInput(locale: Locale, value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(getNumberLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function formatHeightInput(value: number | null | undefined) {
  if (value == null) {
    return "";
  }

  return Number.isInteger(value) ? String(value) : String(value).replace(",", ".");
}

export function formatDecimal(
  locale: Locale,
  value: number | null | undefined,
  digits = 1,
) {
  if (value == null) {
    return null;
  }

  return new Intl.NumberFormat(getNumberLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatChallengeDate(locale: Locale, value: string) {
  return new Intl.DateTimeFormat(getNumberLocale(locale), {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatFileSize(locale: Locale, sizeBytes: number) {
  const decimalSeparator = locale === "en" ? "." : ",";

  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024))
      .toFixed(1)
      .replace(".", decimalSeparator)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

export function parseNumberInput(value: string, fallback = 0) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatDateKeyForInput(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) {
    return "";
  }
  return `${day}.${month}.${year}`;
}

export function parseDateInputToDateKey(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}
