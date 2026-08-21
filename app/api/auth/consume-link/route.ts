import { NextResponse } from "next/server";
import { consumeMagicLogin, inspectMagicLogin, invalidateMagicLogin } from "@/lib/portal-auth";
import { portalSessionCookie } from "@/lib/portal-cookie";
import { activeSheetAccess } from "@/lib/sheet-access";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string };
    const rawToken = String(body.token || "");
    const email = await inspectMagicLogin(rawToken);
    if (!email) throw new Error("El enlace no es válido, ya fue utilizado o ha caducado.");
    const activeAccess = await activeSheetAccess(email);
    if (!activeAccess) {
      await invalidateMagicLogin(rawToken);
      return NextResponse.json({ ok: false, error: "Este correo ya no está activo." }, { status: 403 });
    }
    const session = await consumeMagicLogin(rawToken, activeAccess);
    const response = NextResponse.json({ ok: true, destination: session.destination });
    response.headers.set("Set-Cookie", portalSessionCookie(session.token));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "El enlace no es válido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
}
