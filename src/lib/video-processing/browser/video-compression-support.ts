export interface BrowserVideoCompressionEnvironment {
  hasVideoDecoder: boolean;
  hasVideoEncoder: boolean;
  isSecureContext: boolean;
}

export function getBrowserVideoCompressionSupportError(
  environment: BrowserVideoCompressionEnvironment,
) {
  if (!environment.isSecureContext) {
    return "Lokale Videokompression braucht einen sicheren Ursprung (HTTPS oder localhost).";
  }

  if (!environment.hasVideoEncoder || !environment.hasVideoDecoder) {
    return "Dieser Browser unterstuetzt keine hardwarebeschleunigte lokale Videokompression.";
  }

  return null;
}

export function assertBrowserVideoCompressionSupport() {
  if (typeof window === "undefined") {
    throw new Error("Die lokale Videokompression ist nur im Browser verfuegbar.");
  }

  const error = getBrowserVideoCompressionSupportError({
    hasVideoDecoder: typeof VideoDecoder !== "undefined",
    hasVideoEncoder: typeof VideoEncoder !== "undefined",
    isSecureContext: window.isSecureContext,
  });

  if (error) {
    throw new Error(error);
  }
}
