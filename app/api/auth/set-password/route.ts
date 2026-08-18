import { NextResponse } from "next/server";
import { setPortalPassword } from "@/lib/portal-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string; password?: string; passwordConfirmation?: string };
    if (String(body.password || "") !== String(body.passwordConfirmation || "")) {
      return NextResponse.json({ ok: false, error: "Las contraseñas no coinciden." }, { status: 400 });
    }
    await setPortalPassword(String(body.token || ""), String(body.password || ""));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo guardar la contraseña." }, { status: 400 });
  }
}
