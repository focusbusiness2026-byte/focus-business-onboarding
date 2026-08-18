import { NextResponse } from "next/server";
import { buildDownstreamProfile } from "@/lib/downstream-profile";

type SheetsWriteResponse = {
  ok?: boolean;
  id?: string;
  row?: number;
  error?: string;
};

class SubmissionValidationError extends Error {}

function nonEmptyText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function containsSecretLikeValue(value: unknown): boolean {
  if (typeof value === "string") {
    return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(value)
      || /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/.test(value)
      || /\b(?:password|contrase(?:ñ|n)a|api[_ -]?key|token)\s*[:=]\s*\S{8,}/i.test(value);
  }
  if (Array.isArray(value)) return value.some(containsSecretLikeValue);
  if (value && typeof value === "object") return Object.values(value).some(containsSecretLikeValue);
  return false;
}

function validateSubmission(payload: Record<string, unknown>) {
  if (Array.isArray(payload.sectors) && payload.sectors.length > 3) {
    throw new SubmissionValidationError("Puedes seleccionar un máximo de 3 sectores prioritarios.");
  }
  if (nonEmptyText(payload.landingCopyOwner)
    && !["Cliente", "Focus Business", "En conjunto"].includes(String(payload.landingCopyOwner))) {
      throw new SubmissionValidationError("El responsable del copy de las landings no es válido.");
  }
  for (const field of ["businessEmail", "billingEmail", "contactEmail"] as const) {
    if (nonEmptyText(payload[field]) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload[field]))) {
      throw new SubmissionValidationError(`El campo ${field} no contiene un correo válido.`);
    }
  }
  if (nonEmptyText(payload.website)) {
    try {
      const website = new URL(String(payload.website));
      if (!["http:", "https:"].includes(website.protocol)) throw new Error("invalid");
    } catch {
      throw new SubmissionValidationError("La web pública debe ser una URL HTTP(S) válida.");
    }
  }
  if (payload.accuracy !== true || payload.terms !== true || payload.ghlPreparationAuthorization !== true) {
    throw new SubmissionValidationError("Faltan las confirmaciones y autorizaciones obligatorias.");
  }
  if (containsSecretLikeValue(payload)) {
    throw new SubmissionValidationError("El formulario no admite contraseñas, tokens, claves API ni claves privadas.");
  }
}

async function saveToGoogleSheets(payload: Record<string, unknown>) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;
  if (!url || !token) {
    throw new Error("Google Sheets no está configurado. Faltan GOOGLE_SHEETS_WEBHOOK_URL o FOCUS_PORTAL_TOKEN.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, _focusToken: token }),
  });
  const text = await response.text();
  let result: SheetsWriteResponse;
  try {
    result = JSON.parse(text) as SheetsWriteResponse;
  } catch {
    throw new Error("Google Sheets devolvió una respuesta no válida.");
  }
  if (!response.ok || result.ok !== true) {
    throw new Error(result.error || `Google Sheets devolvió el estado ${response.status}.`);
  }
  return result;
}

async function sendVerificationEmail(email: string, verificationToken: string) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;
  const publicOrigin = process.env.PUBLIC_ONBOARDING_ORIGIN || "https://onboarding.focusbusinesslab.es";
  if (!url || !token) throw new Error("El envío de confirmación no está configurado.");
  const verificationUrl = new URL("/api/auth/verify", publicOrigin);
  verificationUrl.searchParams.set("token", verificationToken);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "sendAccountVerification",
      email,
      verificationUrl: verificationUrl.toString(),
      _focusToken: token,
    }),
  });
  const result = await response.json() as { ok?: boolean; error?: string };
  if (!response.ok || result.ok !== true) throw new Error(result.error || "No se pudo enviar el correo de confirmación.");
}

async function notifyProspection(onboardingId: string) {
  const url = process.env.PROSPECTION_TRIGGER_URL;
  const token = process.env.PROSPECTION_TRIGGER_TOKEN;
  if (!url || !token || !onboardingId) return { configured: false, notified: false };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ onboarding_id: onboardingId, prepare_only: true }),
      signal: AbortSignal.timeout(8000),
    });
    return { configured: true, notified: response.ok };
  } catch {
    return { configured: true, notified: false };
  }
}

async function notifyViralRadar(profile: ReturnType<typeof buildDownstreamProfile>) {
  const url = process.env.VIRAL_RADAR_SYNC_URL;
  const token = process.env.VIRAL_RADAR_SYNC_TOKEN;
  if (!url || !token || !profile.onboarding_id) return { configured: false, notified: false };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(profile),
      signal: AbortSignal.timeout(8000),
    });
    return { configured: true, notified: response.ok };
  } catch {
    return { configured: true, notified: false };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const payload = (body.onboarding && typeof body.onboarding === "object" && !Array.isArray(body.onboarding)
      ? body.onboarding
      : body) as Record<string, unknown>;
    const account = (body.account && typeof body.account === "object" && !Array.isArray(body.account)
      ? body.account
      : null) as { email?: unknown; password?: unknown; passwordConfirmation?: unknown } | null;
    validateSubmission(payload);
    if (!account) throw new SubmissionValidationError("Configura el correo y la contraseña de acceso al portal.");
    const accountEmail = String(account.email || "").trim().toLowerCase();
    const contactEmail = String(payload.contactEmail || payload.businessEmail || "").trim().toLowerCase();
    if (!contactEmail || accountEmail !== contactEmail) {
      throw new SubmissionValidationError("El correo de acceso debe coincidir con el correo de contacto del formulario.");
    }
    if (String(account.password || "") !== String(account.passwordConfirmation || "")) {
      throw new SubmissionValidationError("Las dos contraseñas no coinciden.");
    }
    const sheets = await saveToGoogleSheets(payload);
    const onboardingId = String(sheets.id || "");
    const { registerPortalUser } = await import("@/lib/portal-auth");
    const accountRegistration = await registerPortalUser({
      email: accountEmail,
      password: String(account.password || ""),
      onboardingId,
      role: "Cliente",
    });
    await sendVerificationEmail(accountRegistration.email, accountRegistration.verificationToken);
    const downstreamProfile = buildDownstreamProfile(payload, onboardingId);
    const [prospection, viralRadar] = await Promise.all([
      notifyProspection(onboardingId),
      notifyViralRadar(downstreamProfile),
    ]);
    return NextResponse.json({
      ok: true,
      saved: { id: sheets.id, row: sheets.row, submittedAt: payload.submittedAt },
      sheets: { configured: true },
      prospection,
      viralRadar,
      account: { email: accountRegistration.email, verificationSent: true, passwordStoredInSheets: false },
      downstream: { schemaVersion: downstreamProfile.schema_version, externalSearchStarted: false },
    });
  } catch (error) {
    const validationError = error instanceof SubmissionValidationError;
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar el registro en Google Sheets." },
      { status: validationError ? 400 : 502 },
    );
  }
}
