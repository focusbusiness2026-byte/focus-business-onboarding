import { env } from "cloudflare:workers";

const SESSION_HOURS = 8;
const MAGIC_LINK_MINUTES = 15;
const REQUEST_COOLDOWN_MINUTES = 2;

type PortalUserRow = {
  email: string;
  role: string;
  active: number;
  onboarding_id: string | null;
};

type MagicTokenRow = {
  email: string;
  expires_at: string;
  consumed_at: string | null;
  return_to: string;
};

export type PortalAccess = {
  role: string;
  prospection: boolean;
  radar: boolean;
};

export type PortalIdentity = {
  email: string;
  role: string;
  onboardingId: string | null;
  prospectionAccess: boolean;
  radarAccess: boolean;
};

const ALLOWED_DESTINATIONS = new Set([
  "https://onboarding.focusbusinesslab.es/portal",
  "https://prospeccion.focusbusinesslab.es/portal",
  "https://radar.focusbusinesslab.es/",
]);

function database() {
  if (!env.DB) throw new Error("El almacenamiento privado de acceso todavía no está configurado.");
  return env.DB;
}

function normalizeEmail(email: unknown) {
  return String(email || "").trim().toLowerCase();
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function safePortalDestination(raw: unknown) {
  const fallback = "https://prospeccion.focusbusinesslab.es/portal";
  if (!raw) return fallback;
  try {
    const url = new URL(String(raw));
    const normalized = `${url.origin}${url.pathname}`;
    return ALLOWED_DESTINATIONS.has(normalized) ? `${normalized}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export async function createMagicLogin(input: {
  email: string;
  role?: string;
  onboardingId?: string;
  returnTo?: string;
}) {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El correo de acceso no es válido.");

  const db = database();
  const now = new Date();
  const nowIso = now.toISOString();
  const recent = await db.prepare(`SELECT created_at FROM portal_magic_tokens
    WHERE email = ? AND purpose = 'magic-login' AND consumed_at IS NULL
    ORDER BY created_at DESC LIMIT 1`)
    .bind(email).first<{ created_at: string }>();
  if (recent && now.getTime() - Date.parse(recent.created_at) < REQUEST_COOLDOWN_MINUTES * 60 * 1000) {
    return { email, magicToken: "", expiresAt: "" };
  }

  await db.prepare(`INSERT INTO portal_users
    (email, role, active, email_verified_at, onboarding_id, created_at, updated_at)
    VALUES (?, ?, 1, NULL, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      role = excluded.role,
      active = 1,
      onboarding_id = COALESCE(excluded.onboarding_id, portal_users.onboarding_id),
      updated_at = excluded.updated_at`)
    .bind(email, input.role || "Cliente", input.onboardingId || null, nowIso, nowIso)
    .run();

  await db.prepare(`UPDATE portal_magic_tokens SET consumed_at = ?
    WHERE email = ? AND purpose = 'magic-login' AND consumed_at IS NULL`)
    .bind(nowIso, email).run();

  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  const expiresAt = new Date(now.getTime() + MAGIC_LINK_MINUTES * 60 * 1000).toISOString();
  await db.prepare(`INSERT INTO portal_magic_tokens
    (token_hash, email, purpose, return_to, expires_at, consumed_at, created_at)
    VALUES (?, ?, 'magic-login', ?, ?, NULL, ?)`)
    .bind(tokenHash, email, safePortalDestination(input.returnTo), expiresAt, nowIso)
    .run();
  return { email, magicToken: rawToken, expiresAt };
}

export async function consumeMagicLogin(rawToken: string, activeAccess?: PortalAccess | string) {
  if (!rawToken || rawToken.length > 256) throw new Error("El enlace no es válido o ya fue utilizado.");
  const db = database();
  const tokenHash = await sha256(rawToken);
  const now = new Date().toISOString();
  const token = await db.prepare(`SELECT email, expires_at, consumed_at, return_to
    FROM portal_magic_tokens
    WHERE token_hash = ? AND purpose = 'magic-login'`)
    .bind(tokenHash).first<MagicTokenRow>();
  if (!token || token.consumed_at || token.expires_at <= now) {
    throw new Error("El enlace no es válido, ya fue utilizado o ha caducado.");
  }

  const consumed = await db.prepare(`UPDATE portal_magic_tokens SET consumed_at = ?
    WHERE token_hash = ? AND purpose = 'magic-login' AND consumed_at IS NULL AND expires_at > ?`)
    .bind(now, tokenHash, now).run();
  if (Number(consumed.meta?.changes || 0) !== 1) {
    throw new Error("El enlace ya fue utilizado en otro dispositivo.");
  }

  const user = await db.prepare(`SELECT email, role, active, onboarding_id
    FROM portal_users WHERE email = ?`)
    .bind(token.email).first<PortalUserRow>();
  if (!user || !user.active) throw new Error("Este acceso ya no está activo.");
  const currentRole = typeof activeAccess === "string" ? activeAccess : activeAccess?.role || user.role;
  const isAdmin = currentRole.toLowerCase().includes("admin");
  const prospectionAccess = typeof activeAccess === "object" ? activeAccess.prospection : true;
  const radarAccess = typeof activeAccess === "object" ? activeAccess.radar : isAdmin;
  await db.batch([
    db.prepare(`UPDATE portal_users SET role = ?, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ?
      WHERE email = ?`).bind(currentRole, now, now, user.email),
    db.prepare(`INSERT INTO portal_access_permissions
      (email, prospection_allowed, radar_allowed, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        prospection_allowed = excluded.prospection_allowed,
        radar_allowed = excluded.radar_allowed,
        updated_at = excluded.updated_at`)
      .bind(user.email, prospectionAccess ? 1 : 0, radarAccess ? 1 : 0, now),
  ]);
  const session = await createPortalSession({
    email: user.email,
    role: currentRole,
    onboardingId: user.onboarding_id,
    prospectionAccess,
    radarAccess,
  });
  return { ...session, destination: safePortalDestination(token.return_to) };
}

export async function inspectMagicLogin(rawToken: string) {
  if (!rawToken || rawToken.length > 256) return null;
  const tokenHash = await sha256(rawToken);
  const now = new Date().toISOString();
  const token = await database().prepare(`SELECT email FROM portal_magic_tokens
    WHERE token_hash = ? AND purpose = 'magic-login' AND consumed_at IS NULL AND expires_at > ?`)
    .bind(tokenHash, now).first<{ email: string }>();
  return token?.email || null;
}

export async function invalidateMagicLogin(rawToken: string) {
  if (!rawToken) return;
  await database().prepare(`UPDATE portal_magic_tokens SET consumed_at = ?
    WHERE token_hash = ? AND purpose = 'magic-login' AND consumed_at IS NULL`)
    .bind(new Date().toISOString(), await sha256(rawToken)).run();
}

async function createPortalSession(identity: PortalIdentity) {
  const db = database();
  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  await db.batch([
    db.prepare("DELETE FROM portal_sessions WHERE email = ?").bind(identity.email),
    db.prepare("INSERT INTO portal_sessions (token_hash, email, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)")
      .bind(tokenHash, identity.email, expiresAt, now, now),
  ]);
  return { token: rawToken, expiresAt, identity };
}

export async function introspectPortalSession(rawToken: string) {
  if (!rawToken) return null;
  const db = database();
  const tokenHash = await sha256(rawToken);
  const now = new Date().toISOString();
  const result = await db.prepare(`SELECT u.email, u.role, u.onboarding_id,
      COALESCE(p.prospection_allowed, 1) AS prospection_allowed,
      COALESCE(p.radar_allowed, CASE WHEN LOWER(u.role) LIKE '%admin%' THEN 1 ELSE 0 END) AS radar_allowed
    FROM portal_sessions s
    JOIN portal_users u ON u.email = s.email
    LEFT JOIN portal_access_permissions p ON p.email = u.email
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1 AND u.email_verified_at IS NOT NULL`)
    .bind(tokenHash, now).first<{
      email: string;
      role: string;
      onboarding_id: string | null;
      prospection_allowed: number;
      radar_allowed: number;
    }>();
  if (!result) return null;
  await db.prepare("UPDATE portal_sessions SET last_seen_at = ? WHERE token_hash = ?").bind(now, tokenHash).run();
  return {
    email: result.email,
    role: result.role,
    onboardingId: result.onboarding_id,
    prospectionAccess: Boolean(result.prospection_allowed),
    radarAccess: Boolean(result.radar_allowed),
  } satisfies PortalIdentity;
}

export async function revokePortalSession(rawToken: string) {
  if (!rawToken) return;
  await database().prepare("DELETE FROM portal_sessions WHERE token_hash = ?").bind(await sha256(rawToken)).run();
}

export const portalAuthConfig = {
  cookieName: "focus_session",
  magicLinkMinutes: MAGIC_LINK_MINUTES,
  sessionMaxAgeSeconds: SESSION_HOURS * 60 * 60,
};
