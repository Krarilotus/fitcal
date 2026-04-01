import { getBerlinDateKey } from "@/lib/challenge";

export function measurementDateFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

export function normalizeMeasurementDate(date = new Date()) {
  return measurementDateFromKey(getBerlinDateKey(date));
}

export function formatMeasurementDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function getMeasurementDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}
