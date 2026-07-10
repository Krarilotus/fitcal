export const PREVIEW_MODE_COOKIE = "fitcal_preview_mode";
export const LIGHT_PREVIEW_VALUE = "light";

export function isLightPreview(value: string | undefined) {
  return value === LIGHT_PREVIEW_VALUE;
}
