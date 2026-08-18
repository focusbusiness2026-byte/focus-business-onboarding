import { NextResponse } from "next/server";
import { introspectPortalSession } from "@/lib/portal-auth";
import { portalSessionFromRequest } from "@/lib/portal-cookie";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
}

export async function POST(request: Request) {
  const identity = await introspectPortalSession(bearerToken(request) || portalSessionFromRequest(request));
  if (!identity) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...identity });
}
