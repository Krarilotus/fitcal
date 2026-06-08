import { getDictionary } from "@/i18n";
import { getAppUrl } from "@/lib/auth/url";
import { getPreferredLocale } from "@/lib/preferences";

export async function getApiMessages() {
  const locale = await getPreferredLocale();

  return getDictionary(locale).api;
}

export function withMessage(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function localizedUrl(
  request: Request,
  pathname: string,
  type: "error" | "success",
  message: string,
) {
  return getAppUrl(`${pathname}?${type}=${encodeURIComponent(message)}`, request);
}

export function dashboardMessageUrl(
  request: Request,
  type: "error" | "success",
  message: string,
) {
  return localizedUrl(request, "/dashboard", type, message);
}
