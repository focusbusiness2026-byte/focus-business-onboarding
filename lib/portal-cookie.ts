import { portalAuthConfig } from "@/lib/portal-auth";

export function portalSessionFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const pair = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${portalAuthConfig.cookieName}=`));
  return pair ? decodeURIComponent(pair.slice(portalAuthConfig.cookieName.length + 1)) : "";
}

export function portalSessionCookie(token: string, maxAge = portalAuthConfig.sessionMaxAgeSeconds) {
  const domain = process.env.PORTAL_COOKIE_DOMAIN || ".focusbusinesslab.es";
  const parts = [
    `${portalAuthConfig.cookieName}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ];
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join("; ");
}

export function clearPortalSessionCookie() {
  return portalSessionCookie("", 0);
}
