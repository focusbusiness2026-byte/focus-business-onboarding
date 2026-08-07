import { NextResponse } from "next/server";
import { deleteSubmission, listSubmissions } from "../../../db/onboarding";
import { toSheetRecord } from "../../../lib/onboarding";

type SheetPortalResponse = {
  ok?: boolean;
  role?: string;
  records?: Record<string, unknown>[];
};

async function accessFor(email: unknown) {
  const normalized = String(email || "").trim().toLowerCase();
  const sheetUrl = process.env.GOOGLE_SHEETS_PORTAL_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;

  if (normalized && sheetUrl && token) {
    try {
      const url = new URL(sheetUrl);
      url.searchParams.set("action", "portal");
      url.searchParams.set("email", normalized);
      url.searchParams.set("token", token);
      const response = await fetch(url, { cache: "no-store" });
      const payload = await response.json() as SheetPortalResponse;
      return {
        email: normalized,
        authorized: response.ok && payload.ok === true,
        role: payload.role || "Administrador",
        records: Array.isArray(payload.records) ? payload.records : undefined,
        unavailable: false,
      };
    } catch {
      return { email: normalized, authorized: false, unavailable: true };
    }
  }

  const allowed = (process.env.PORTAL_ALLOWED_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return {
    email: normalized,
    authorized: Boolean(normalized) && allowed.includes(normalized),
    role: "Administrador",
    unavailable: false,
  };
}

export async function POST(request: Request) {
  const body = await request.json() as { email?: string };
  const access = await accessFor(body.email);
  if (access.unavailable) return NextResponse.json({ ok: false, error: "No se pudo comprobar la pestaña Accesos. Inténtalo de nuevo." }, { status: 502 });
  if (!access.authorized) return NextResponse.json({ ok: false, error: "Este correo no está autorizado en la pestaña Accesos." }, { status: 403 });
  try {
    const records = access.records || (await listSubmissions()).map(toSheetRecord);
    return NextResponse.json({ ok: true, role: access.role, email: access.email, records });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudieron cargar los registros." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const body = await request.json() as { email?: string; id?: string };
  const access = await accessFor(body.email);
  if (access.unavailable) return NextResponse.json({ ok: false, error: "No se pudo comprobar la pestaña Accesos. Inténtalo de nuevo." }, { status: 502 });
  if (!access.authorized) return NextResponse.json({ ok: false, error: "Correo no autorizado." }, { status: 403 });
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Falta el identificador del registro." }, { status: 400 });
  try {
    const sheetUrl = process.env.GOOGLE_SHEETS_PORTAL_URL;
    const token = process.env.FOCUS_PORTAL_TOKEN;
    if (sheetUrl && token) {
      const response = await fetch(sheetUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete", id, _focusToken: token }),
      });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || payload.ok !== true) {
        return NextResponse.json({ ok: false, error: payload.error || "No se pudo borrar el registro de la hoja." }, { status: 502 });
      }
      await deleteSubmission(id).catch(() => false);
      return NextResponse.json({ ok: true, id });
    }
    const deleted = await deleteSubmission(id);
    return deleted
      ? NextResponse.json({ ok: true, id })
      : NextResponse.json({ ok: false, error: "El registro ya no existe." }, { status: 404 });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo borrar el registro." }, { status: 502 });
  }
}
