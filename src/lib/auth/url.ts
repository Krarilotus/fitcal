function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getOriginFromRequest(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const requestProtocol = new URL(request.url).protocol.replace(/:$/, "");
  const protocol = forwardedProto || requestProtocol || "http";

  if (host) {
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}

export function getAppBaseUrl(request?: Request | string) {
  if (process.env.AUTH_URL) {
    return trimTrailingSlash(process.env.AUTH_URL);
  }

  if (request && typeof request !== "string") {
    return trimTrailingSlash(getOriginFromRequest(request));
  }

  if (typeof request === "string" && request.length > 0) {
    return trimTrailingSlash(new URL(request).origin);
  }

  return "http://localhost:3000";
}

export function getAppUrl(pathname: string, request?: Request | string) {
  return new URL(pathname, `${getAppBaseUrl(request)}/`);
}
