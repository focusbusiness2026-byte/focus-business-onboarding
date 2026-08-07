import { NextResponse } from "next/server";
import { deleteSubmission, listSubmissions } from "../../../db/onboarding";
import { toSheetRecord } from "../../../lib/onboarding";
import { getChatGPTUser } from "../../chatgpt-auth";

async function authenticatedAccess() {
  const user = await getChatGPTUser();
  if (!user) return { email: "", authorized: false, authenticated: false };
  const normalized = user.email.trim().toLowerCase();
  const allowed = (process.env.PORTAL_ALLOWED_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return { email: normalized, authorized: allowed.includes(normalized), authenticated: true };
}

export async function POST() {
  const access = await authenticatedAccess();
  if (!access.authenticated) return NextResponse.json({ ok: false, error: "Primero debes verificar tu correo." }, { status: 401 });
  if (!access.authorized) return NextResponse.json({ ok: false, error: "Este correo no está autorizado en la pestaña Accesos." }, { status: 403 });
  try {
    const records = (await listSubmissions()).map(toSheetRecord);
    return NextResponse.json({ ok: true, role: "Administrador", email: access.email, records });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudieron cargar los registros." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const body = await request.json() as { id?: string };
  const access = await authenticatedAccess();
  if (!access.authenticated) return NextResponse.json({ ok: false, error: "Primero debes verificar tu correo." }, { status: 401 });
  if (!access.authorized) return NextResponse.json({ ok: false, error: "Correo no autorizado." }, { status: 403 });
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Falta el identificador del registro." }, { status: 400 });
  try {
    const deleted = await deleteSubmission(id);
    return deleted
      ? NextResponse.json({ ok: true, id })
      : NextResponse.json({ ok: false, error: "El registro ya no existe." }, { status: 404 });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo borrar el registro." }, { status: 502 });
  }
}
