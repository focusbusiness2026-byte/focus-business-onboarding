import { NextResponse } from "next/server";
import { consumeMagicLogin, inspectMagicLogin, invalidateMagicLogin } from "@/lib/portal-auth";
import { portalSessionCookie } from "@/lib/portal-cookie";
import { activeSheetAccess } from "@/lib/sheet-access";
import { fetchAppsScriptJson } from "@/lib/apps-script-fetch";
import { finishShortSignup, pendingShortSignup, type ShortSignup } from "@/lib/short-invitations";
import { buildDownstreamProfile } from "@/lib/downstream-profile";

async function activateShortSignup(email: string) {
  const pending = await pendingShortSignup(email);
  if (!pending?.payload_json) return null;
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;
  if (!url || !token) throw new Error("No se pudo activar la cuenta. Inténtalo de nuevo más tarde.");
  const signup = JSON.parse(pending.payload_json) as ShortSignup;
  const { response, payload } = await fetchAppsScriptJson<{ ok?: boolean; id?: string; error?: string }>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "activateShortSignup", signupId: pending.token_hash, signup, _focusToken: token }),
  });
  if (!response.ok || payload.ok !== true || !payload.id) {
    throw new Error(payload.error || "No se pudo activar la cuenta. Inténtalo de nuevo más tarde.");
  }
  return { tokenHash: pending.token_hash, onboardingId: payload.id, signup };
}

async function notifyShortProfile(onboardingId: string) {
  const url = process.env.PROSPECTION_TRIGGER_URL;
  const token = process.env.PROSPECTION_TRIGGER_TOKEN;
  if (!url || !token) return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ onboarding_id: onboardingId, prepare_only: true, light_profile: true }),
    signal: AbortSignal.timeout(8000),
  });
}

async function syncShortRadar(signup: ShortSignup, onboardingId: string) {
  if (!signup.radar || !process.env.VIRAL_RADAR_SYNC_URL || !process.env.VIRAL_RADAR_SYNC_TOKEN) return;
  const profile = buildDownstreamProfile({
    companyName: signup.companyName, website: signup.website,
    activity: signup.description, mainService: [signup.description],
    sectors: ["Multisectorial"], targetCountries: ["España"],
    targetClientTypes: ["Empresa privada B2B"],
    idealProfileDetail: "Empresas B2B en España; criterios provisionales",
  }, onboardingId);
  await fetch(process.env.VIRAL_RADAR_SYNC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.VIRAL_RADAR_SYNC_TOKEN}` },
    body: JSON.stringify(profile),
    signal: AbortSignal.timeout(8000),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string };
    const rawToken = String(body.token || "");
    const email = await inspectMagicLogin(rawToken);
    if (!email) throw new Error("El enlace no es válido, ya fue utilizado o ha caducado.");
    const shortSignup = await activateShortSignup(email);
    const activeAccess = await activeSheetAccess(email);
    if (!activeAccess) {
      if (!shortSignup) await invalidateMagicLogin(rawToken);
      return NextResponse.json({ ok: false, error: "Este correo ya no está activo." }, { status: 403 });
    }
    if (shortSignup) {
      await finishShortSignup(shortSignup.tokenHash, shortSignup.onboardingId);
    }
    const session = await consumeMagicLogin(rawToken, activeAccess);
    if (shortSignup) {
      // Profile preparation is independent from account activation and never runs lead research.
      await notifyShortProfile(shortSignup.onboardingId).catch(() => undefined);
      await syncShortRadar(shortSignup.signup, shortSignup.onboardingId).catch(() => undefined);
    }
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
