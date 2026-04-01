export function getAppBaseUrl(requestUrl?: string) {
  if (process.env.AUTH_URL) {
    return process.env.AUTH_URL;
  }

  if (requestUrl) {
    return new URL(requestUrl).origin;
  }

  return "http://localhost:3000";
}
