import { NextResponse } from "next/server";
import { createMagicLogin, invalidateMagicLogin, safePortalDestination } from "@/lib/portal-auth";
import { activeSheetAccess } from "@/lib/sheet-access";
import { fetchAppsScriptJson } from "@/lib/apps-script-fetch";

class MagicLinkDeliveryUnconfirmedError extends Error {
  constructor() {
    super("Google procesó el envío, pero no confirmó la respuesta.");
    this.name = "MagicLinkDeliveryUnconfirmedError";
  }
}

async function sendMagicLink(email: string, magicToken: string) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;
  if (!url || !token) throw new Error("El envío de correo no está configurado.");
  const publicOrigin = process.env.PUBLIC_ONBOARDING_ORIGIN || "https://onboarding.focusbusinesslab.es";
  const magicUrl = new URL("/magic-login", publicOrigin);
  magicUrl.searchParams.set("token", magicToken);
  let delivery;
  try {
    delivery = await fetchAppsScriptJson<{ ok?: boolean; error?: string }>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sendMagicLogin", email, magicUrl: magicUrl.toString(), _focusToken: token }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    // Apps Script may execute MailApp successfully and then return a malformed or
    // rejected redirect. Retrying could send the same email twice, so preserve the
    // one-time link and report a neutral success to the requester.
    throw new MagicLinkDeliveryUnconfirmedError();
  }
  const { response, payload } = delivery;
  if (!response.ok || payload.ok !== true) throw new Error(payload.error || "No se pudo enviar el correo.");
}

export async function POST(request: Request) {
  let stage = "read-request";
  try {
    const body = await request.json() as { email?: string; returnTo?: string };
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Escribe un correo válido." }, { status: 400 });
    }
    stage = "validate-sheet-access";
    const destination = safePortalDestination(body.returnTo);
    const access = await activeSheetAccess(email);
    const destinationAllowed = access && (
      destination.startsWith("https://radar.focusbusinesslab.es") ? access.radar : access.prospection
    );
    if (access && destinationAllowed) {
      stage = "create-one-time-link";
      const magic = await createMagicLogin({ email, role: access.role, returnTo: destination });
      if (magic.magicToken) {
        try {
          stage = "send-access-email";
          await sendMagicLink(email, magic.magicToken);
        } catch (error) {
          if (error instanceof MagicLinkDeliveryUnconfirmedError) {
            console.warn("portal_access_delivery_unconfirmed", { stage });
          } else {
            await invalidateMagicLogin(magic.magicToken);
            throw error;
          }
        }
      }
    }
    return NextResponse.json({
      ok: true,
      message: "Si el correo está activo, recibirás un enlace de acceso válido durante 15 minutos.",
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Error desconocido";
    console.error("portal_access_request_failed", { stage, reason });
    return NextResponse.json({ ok: false, error: "No se pudo procesar la solicitud ahora. Inténtalo de nuevo." }, { status: 502 });
  }
}
