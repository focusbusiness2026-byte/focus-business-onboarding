import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { listSubmissions } from "../../../db/onboarding";
import { toSheetRecord } from "../../../lib/onboarding";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const allowed = (process.env.PORTAL_ALLOWED_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(user.email.toLowerCase())) return NextResponse.json({ ok: false, error: "Acceso revocado o no autorizado" }, { status: 403 });
  try {
    const records = (await listSubmissions()).map(toSheetRecord);
    return NextResponse.json({ ok: true, role: "Administrador", records });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo consultar la base de datos." }, { status: 502 });
  }
}
