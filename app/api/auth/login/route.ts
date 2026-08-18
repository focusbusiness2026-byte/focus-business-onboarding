import { NextResponse } from "next/server";
import { authenticatePortalUser } from "@/lib/portal-auth";
import { portalSessionCookie } from "@/lib/portal-cookie";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const session = await authenticatePortalUser(body.email, body.password);
    const response = NextResponse.json({ ok: true, ...session.identity, expiresAt: session.expiresAt });
    response.headers.set("Set-Cookie", portalSessionCookie(session.token));
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo iniciar sesión." },
      { status: 401 },
    );
  }
}
