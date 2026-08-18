import { NextResponse } from "next/server";
import { revokePortalSession } from "@/lib/portal-auth";
import { clearPortalSessionCookie, portalSessionFromRequest } from "@/lib/portal-cookie";

export async function POST(request: Request) {
  await revokePortalSession(portalSessionFromRequest(request));
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearPortalSessionCookie());
  return response;
}
