import { NextResponse } from "next/server";
import { revokePortalSession } from "@/lib/portal-auth";
import { clearPortalSessionCookie, portalSessionFromRequest } from "@/lib/portal-cookie";

export async function GET(request: Request) {
  await revokePortalSession(portalSessionFromRequest(request));
  const requestUrl = new URL(request.url);
  const destination = requestUrl.searchParams.get("return_to");
  let safeDestination = new URL("/access", requestUrl.origin);
  if (destination) {
    try {
      const parsed = new URL(destination);
      if (["https://onboarding.focusbusinesslab.es", "https://prospeccion.focusbusinesslab.es", "https://radar.focusbusinesslab.es"].includes(parsed.origin)) {
        safeDestination = parsed;
      }
    } catch { /* use the safe default */ }
  }
  const response = NextResponse.redirect(safeDestination);
  response.headers.set("Set-Cookie", clearPortalSessionCookie());
  return response;
}
