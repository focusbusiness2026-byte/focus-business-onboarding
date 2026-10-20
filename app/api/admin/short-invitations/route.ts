import { NextResponse } from "next/server";
import { introspectPortalSession } from "@/lib/portal-auth";
import { portalSessionFromRequest } from "@/lib/portal-cookie";
import { activeSheetAccess } from "@/lib/sheet-access";
import { createShortInvitation } from "@/lib/short-invitations";

export async function POST(request: Request) {
  const identity = await introspectPortalSession(portalSessionFromRequest(request));
  if (!identity) return NextResponse.json({ ok: false, error: "Sesión no válida." }, { status: 401 });
  const access = await activeSheetAccess(identity.email).catch(() => null);
  if (!access || !access.role.toLowerCase().includes("admin")) {
    return NextResponse.json({ ok: false, error: "Solo administración puede crear invitaciones." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({})) as { email?: string };
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Escribe un correo válido." }, { status: 400 });
  }
  let existing;
  try {
    existing = await activeSheetAccess(email);
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo comprobar si el correo ya existe." }, { status: 502 });
  }
  if (existing) return NextResponse.json({ ok: false, error: "Este correo ya tiene acceso. Revisa sus permisos sin crear otra cuenta." }, { status: 409 });
  try {
    const invitation = await createShortInvitation(email);
    const origin = process.env.PUBLIC_ONBOARDING_ORIGIN || "https://onboarding.focusbusinesslab.es";
    const url = new URL("/alta-herramientas", origin);
    url.searchParams.set("invite", invitation.token);
    return NextResponse.json({ ok: true, url: url.toString(), expiresAt: invitation.expiresAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo crear la invitación." }, { status: 409 });
  }
}
