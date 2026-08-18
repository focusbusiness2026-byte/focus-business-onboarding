import { NextResponse } from "next/server";
import { introspectPortalSession } from "@/lib/portal-auth";
import { portalSessionFromRequest } from "@/lib/portal-cookie";

type SheetPortalResponse = {
  ok?: boolean;
  role?: string;
  records?: Record<string, unknown>[];
};

async function accessFor(email: unknown) {
  const normalized = String(email || "").trim().toLowerCase();
  const sheetUrl = process.env.GOOGLE_SHEETS_PORTAL_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;

  if (!normalized || !sheetUrl || !token) {
    return { email: normalized, authorized: false, unavailable: true };
  }

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
      records: Array.isArray(payload.records) ? payload.records : [],
      unavailable: false,
    };
  } catch {
    return { email: normalized, authorized: false, unavailable: true };
  }
}

export async function POST(request: Request) {
  const identity = await introspectPortalSession(portalSessionFromRequest(request));
  if (!identity) return NextResponse.json({ ok: false, error: "Inicia sesión con tu correo y contraseña." }, { status: 401 });
  const access = await accessFor(identity.email);
  if (access.unavailable) return NextResponse.json({ ok: false, error: "No se pudo comprobar la pestaña Accesos. Inténtalo de nuevo." }, { status: 502 });
  if (!access.authorized) return NextResponse.json({ ok: false, error: "Este correo no está autorizado en la pestaña Accesos." }, { status: 403 });
  try {
    return NextResponse.json({ ok: true, role: access.role, email: access.email, records: access.records || [] });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudieron cargar los registros." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const body = await request.json() as { id?: string };
  const identity = await introspectPortalSession(portalSessionFromRequest(request));
  if (!identity) return NextResponse.json({ ok: false, error: "Sesión no válida." }, { status: 401 });
  const access = await accessFor(identity.email);
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
        body: JSON.stringify({ action: "delete", id, email: access.email, _focusToken: token }),
      });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || payload.ok !== true) {
        return NextResponse.json({ ok: false, error: payload.error || "No se pudo borrar el registro de la hoja." }, { status: 502 });
      }
      return NextResponse.json({ ok: true, id });
    }
    return NextResponse.json({ ok: false, error: "Google Sheets no está configurado." }, { status: 502 });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo borrar el registro." }, { status: 502 });
  }
}
