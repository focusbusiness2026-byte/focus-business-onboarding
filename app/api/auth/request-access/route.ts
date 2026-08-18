import { NextResponse } from "next/server";

async function activeSheetRole(email: string) {
  const sheetUrl = process.env.GOOGLE_SHEETS_PORTAL_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;
  if (!sheetUrl || !token) throw new Error("La validación de accesos no está configurada.");
  const url = new URL(sheetUrl);
  url.searchParams.set("action", "portal");
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json() as { ok?: boolean; role?: string };
  if (!response.ok || payload.ok !== true) return "";
  return String(payload.role || "Cliente");
}

async function sendSetupEmail(email: string, setupToken: string) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;
  if (!url || !token) throw new Error("El envío de correo no está configurado.");
  const publicOrigin = process.env.PUBLIC_ONBOARDING_ORIGIN || "https://onboarding.focusbusinesslab.es";
  const setupUrl = new URL("/set-password", publicOrigin);
  setupUrl.searchParams.set("token", setupToken);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "sendPasswordSetup", email, setupUrl: setupUrl.toString(), _focusToken: token }),
  });
  const payload = await response.json() as { ok?: boolean; error?: string };
  if (!response.ok || payload.ok !== true) throw new Error(payload.error || "No se pudo enviar el correo.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string };
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Escribe un correo válido." }, { status: 400 });
    }
    const role = await activeSheetRole(email);
    if (role) {
      const { createPasswordSetup } = await import("@/lib/portal-auth");
      const setup = await createPasswordSetup({ email, role });
      if (setup.setupToken) await sendSetupEmail(email, setup.setupToken);
    }
    return NextResponse.json({ ok: true, message: "Si el correo está activo, recibirás un enlace para crear o cambiar la contraseña." });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo procesar la solicitud ahora. Inténtalo de nuevo." }, { status: 502 });
  }
}
