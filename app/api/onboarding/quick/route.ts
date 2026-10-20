import { NextResponse } from "next/server";
import { createMagicLogin, invalidateMagicLogin } from "@/lib/portal-auth";
import { claimShortInvitation, consumePublicSignupAllowance, createPublicShortSignup, findShortInvitation, type ShortSignup } from "@/lib/short-invitations";
import { activeSheetAccess } from "@/lib/sheet-access";
import { fetchAppsScriptJson } from "@/lib/apps-script-fetch";

const noStore = { "Cache-Control": "no-store" };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const invite = new URL(request.url).searchParams.get("invite") || "";
  if (!invite) return NextResponse.json({ ok: true, public: true }, { headers: noStore });
  const record = await findShortInvitation(invite);
  if (!record) return NextResponse.json({ ok: false, error: "La invitación no existe o ha caducado." }, { status: 404, headers: noStore });
  return NextResponse.json({ ok: true, email: record.email, submitted: Boolean(record.submitted_at) }, { headers: noStore });
}

function parseSignup(value: Record<string, unknown>): ShortSignup {
  const firstName = String(value.firstName || "").trim();
  const lastName = String(value.lastName || "").trim();
  const email = String(value.email || "").trim().toLowerCase();
  const companyName = String(value.companyName || "").trim();
  const description = String(value.description || "").trim();
  const website = String(value.website || "").trim();
  const prospection = value.prospection === true;
  const radar = value.radar === true;
  if (!firstName || firstName.length > 100 || !lastName || lastName.length > 100 || !emailPattern.test(email)
    || !companyName || companyName.length > 160 || description.length < 12 || description.length > 600
    || (!prospection && !radar) || value.terms !== true) {
    throw new Error("Completa los datos básicos, elige al menos una herramienta y acepta la revisión pública de la web si la indicas.");
  }
  if (/-----BEGIN .*PRIVATE KEY-----|\b(?:password|contraseña|api[_ -]?key|token)\s*[:=]/i.test(description)) {
    throw new Error("No incluyas contraseñas ni claves en la descripción.");
  }
  if (website) {
    const url = new URL(website);
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
    const octets = ipv4?.slice(1).map(Number);
    const privateIp = octets && (octets.some((part) => part > 255) || octets[0] === 0 || octets[0] === 10
      || octets[0] === 127 || octets[0] === 169 && octets[1] === 254
      || octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31
      || octets[0] === 192 && octets[1] === 168 || octets[0] >= 224);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !host || website.length > 300
      || host === "localhost" || host.endsWith(".local") || host.includes(":") || privateIp) {
      throw new Error("La web debe ser una URL pública HTTP(S) sin credenciales.");
    }
  }
  return { firstName, lastName, email, companyName, description, website, prospection, radar, terms: true };
}

async function sendSignupLink(email: string, magicToken: string) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;
  if (!url || !token) throw new Error("El envío de enlaces no está configurado.");
  const magicUrl = new URL("/magic-login", process.env.PUBLIC_ONBOARDING_ORIGIN || "https://onboarding.focusbusinesslab.es");
  magicUrl.searchParams.set("token", magicToken);
  const result = await fetchAppsScriptJson<{ ok?: boolean; error?: string }>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "sendSignupLogin", email, magicUrl: magicUrl.toString(), _focusToken: token }),
  });
  if (!result.response.ok || result.payload.ok !== true) throw new Error(result.payload.error || "No se pudo enviar el enlace.");
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("Origin");
    if (origin && origin !== new URL(request.url).origin) {
      return NextResponse.json({ ok: false, error: "Origen no permitido." }, { status: 403, headers: noStore });
    }
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json({ ok: false, error: "Envía los datos en formato JSON." }, { status: 415, headers: noStore });
    }
    const raw = await request.text();
    if (raw.length > 12_000) {
      return NextResponse.json({ ok: false, error: "La solicitud es demasiado grande." }, { status: 413, headers: noStore });
    }
    const body = JSON.parse(raw) as Record<string, unknown>;
    const invite = String(body.invite || "");
    const signup = parseSignup(body);
    if (invite) {
      const record = await findShortInvitation(invite);
      if (!record || record.email !== signup.email) {
        return NextResponse.json({ ok: false, error: "La invitación no corresponde a este correo." }, { status: 403, headers: noStore });
      }
    } else if (!await consumePublicSignupAllowance(request.headers.get("CF-Connecting-IP") || "")) {
      return NextResponse.json({ ok: false, error: "Demasiadas solicitudes. Inténtalo más tarde." }, { status: 429, headers: noStore });
    }
    const existing = await activeSheetAccess(signup.email);
    if (existing) {
      return NextResponse.json({ ok: false, error: "Este correo ya tiene acceso. Entra desde el centro de acceso o contacta con soporte." }, { status: 409, headers: noStore });
    }
    if (invite) {
      await claimShortInvitation(invite, signup);
    } else {
      const pending = await createPublicShortSignup(signup);
      if (!pending.shouldSend) {
        return NextResponse.json({ ok: true, saved: true, linkSent: false,
          message: "Esta solicitud ya está guardada. Revisa el correo enviado; si no llegó, contacta con soporte. No necesitas enviarla otra vez." },
        { status: 202, headers: noStore });
      }
    }
    const destination = signup.prospection ? "https://prospeccion.focusbusinesslab.es/portal" : "https://radar.focusbusinesslab.es/";
    const magic = await createMagicLogin({ email: signup.email, role: "Cliente", returnTo: destination });
    const issuedToken = magic.magicToken;
    if (issuedToken) {
      try {
        await sendSignupLink(signup.email, issuedToken);
      } catch (error) {
        // A transport error after MailApp runs is ambiguous. Do not resend automatically.
        if (error instanceof Error && /no se pudo enviar|no está configurado/i.test(error.message)) {
          await invalidateMagicLogin(issuedToken);
          return NextResponse.json({ ok: false, saved: true, linkSent: false,
            error: "Los datos quedaron guardados, pero el enlace no se envió. Contacta con soporte; no necesitas rellenar el formulario de nuevo." },
          { status: 503, headers: noStore });
        }
        console.warn("short_signup_delivery_unconfirmed");
        return NextResponse.json({ ok: true, saved: true, linkSent: false,
          message: "Los datos quedaron guardados. No pudimos confirmar la entrega del correo: revisa tu bandeja y contacta con soporte si no llega. No reenvíes el formulario." },
        { status: 202, headers: noStore });
      }
    }
    return NextResponse.json({ ok: true, saved: true, linkSent: true,
      message: "Datos guardados y enlace de acceso enviado. Revisa tu correo; caduca en 15 minutos." }, { headers: noStore });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo preparar el alta." }, { status: 400, headers: noStore });
  }
}
