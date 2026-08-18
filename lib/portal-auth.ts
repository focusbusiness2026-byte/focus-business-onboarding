import { env } from "cloudflare:workers";

const PASSWORD_ITERATIONS = 600_000;
const PASSWORD_MIN_LENGTH = 6;
const SESSION_HOURS = 8;
const TOKEN_HOURS = 24;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

type PortalUserRow = {
  email: string;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  role: string;
  active: number;
  email_verified_at: string | null;
  onboarding_id: string | null;
  failed_attempts: number;
  locked_until: string | null;
};

export type PortalIdentity = {
  email: string;
  role: string;
  onboardingId: string | null;
};

function database() {
  if (!env.DB) throw new Error("El almacenamiento privado de acceso todavía no está configurado.");
  return env.DB;
}

async function ensureAuthTables() {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS portal_users (
      email TEXT PRIMARY KEY NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_iterations INTEGER NOT NULL DEFAULT 600000,
      role TEXT NOT NULL DEFAULT 'Cliente',
      active INTEGER NOT NULL DEFAULT 1,
      email_verified_at TEXT,
      onboarding_id TEXT,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_portal_users_onboarding_id ON portal_users(onboarding_id)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS portal_sessions (
      token_hash TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_portal_sessions_email ON portal_sessions(email)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS portal_verification_tokens (
      token_hash TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      purpose TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_portal_verification_email ON portal_verification_tokens(email)"),
  ]);
}

function normalizeEmail(email: unknown) {
  return String(email || "").trim().toLowerCase();
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
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

async function derivePasswordHash(password: string, salt: Uint8Array, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations,
    },
    key,
    256,
  );
  return bytesToBase64Url(new Uint8Array(bits));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function validatePortalPassword(password: unknown) {
  const value = String(password || "");
  if (value.length < PASSWORD_MIN_LENGTH) return "La contraseña debe tener al menos 6 caracteres.";
  if (value.length > 128) return "La contraseña es demasiado larga.";
  if (!/\p{L}/u.test(value) || !/\p{N}/u.test(value)) {
    return "La contraseña debe incluir al menos una letra y un número.";
  }
  if (/^(?:password|contrase(?:ñ|n)a|empresa|focus|qwerty)\d*$/iu.test(value)) {
    return "Elige una palabra menos común combinada con un número.";
  }
  return "";
}

export async function registerPortalUser(input: {
  email: string;
  password: string;
  onboardingId?: string;
  role?: string;
}) {
  await ensureAuthTables();
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El correo de acceso no es válido.");
  const passwordError = validatePortalPassword(input.password);
  if (passwordError) throw new Error(passwordError);

  const db = database();
  const existing = await db.prepare("SELECT email, email_verified_at FROM portal_users WHERE email = ?")
    .bind(email).first<{ email: string; email_verified_at: string | null }>();
  if (existing?.email_verified_at) {
    throw new Error("Ya existe una cuenta verificada con este correo. Usa la opción para recuperar la contraseña.");
  }

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const passwordHash = await derivePasswordHash(input.password, salt);
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO portal_users (
      email, password_hash, password_salt, password_iterations, role, active,
      email_verified_at, onboarding_id, failed_attempts, locked_until, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, NULL, ?, 0, NULL, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      password_hash = excluded.password_hash,
      password_salt = excluded.password_salt,
      password_iterations = excluded.password_iterations,
      role = excluded.role,
      active = 1,
      onboarding_id = excluded.onboarding_id,
      failed_attempts = 0,
      locked_until = NULL,
      updated_at = excluded.updated_at`)
    .bind(email, passwordHash, bytesToBase64Url(salt), PASSWORD_ITERATIONS, input.role || "Cliente", input.onboardingId || null, now, now)
    .run();

  await db.prepare("UPDATE portal_verification_tokens SET consumed_at = ? WHERE email = ? AND purpose = 'verify-email' AND consumed_at IS NULL")
    .bind(now, email).run();
  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_HOURS * 60 * 60 * 1000).toISOString();
  await db.prepare(`INSERT INTO portal_verification_tokens
    (token_hash, email, purpose, expires_at, consumed_at, created_at)
    VALUES (?, ?, 'verify-email', ?, NULL, ?)`)
    .bind(tokenHash, email, expiresAt, now).run();
  return { email, verificationToken: rawToken };
}

export async function verifyPortalEmail(rawToken: string) {
  await ensureAuthTables();
  const db = database();
  const tokenHash = await sha256(rawToken);
  const now = new Date().toISOString();
  const token = await db.prepare(`SELECT email, expires_at, consumed_at
    FROM portal_verification_tokens WHERE token_hash = ? AND purpose = 'verify-email'`)
    .bind(tokenHash).first<{ email: string; expires_at: string; consumed_at: string | null }>();
  if (!token || token.consumed_at || token.expires_at <= now) throw new Error("El enlace de confirmación no es válido o ya venció.");
  await db.batch([
    db.prepare("UPDATE portal_users SET email_verified_at = ?, updated_at = ? WHERE email = ?").bind(now, now, token.email),
    db.prepare("UPDATE portal_verification_tokens SET consumed_at = ? WHERE token_hash = ?").bind(now, tokenHash),
  ]);
  return token.email;
}

export async function createPasswordSetup(input: { email: string; role: string }) {
  await ensureAuthTables();
  const email = normalizeEmail(input.email);
  const db = database();
  const now = new Date().toISOString();
  const recent = await db.prepare(`SELECT created_at FROM portal_verification_tokens
    WHERE email = ? AND purpose = 'set-password' AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`)
    .bind(email).first<{ created_at: string }>();
  if (recent && Date.now() - Date.parse(recent.created_at) < 5 * 60 * 1000) {
    return { email, setupToken: "" };
  }
  const unusableSalt = new Uint8Array(16);
  crypto.getRandomValues(unusableSalt);
  const unusablePassword = randomToken(48);
  const unusableHash = await derivePasswordHash(unusablePassword, unusableSalt);
  await db.prepare(`INSERT INTO portal_users (
      email, password_hash, password_salt, password_iterations, role, active,
      email_verified_at, onboarding_id, failed_attempts, locked_until, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, NULL, NULL, 0, NULL, ?, ?)
    ON CONFLICT(email) DO UPDATE SET role = excluded.role, active = 1, updated_at = excluded.updated_at`)
    .bind(email, unusableHash, bytesToBase64Url(unusableSalt), PASSWORD_ITERATIONS, input.role || "Cliente", now, now)
    .run();
  await db.prepare("UPDATE portal_verification_tokens SET consumed_at = ? WHERE email = ? AND purpose = 'set-password' AND consumed_at IS NULL")
    .bind(now, email).run();
  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_HOURS * 60 * 60 * 1000).toISOString();
  await db.prepare(`INSERT INTO portal_verification_tokens
    (token_hash, email, purpose, expires_at, consumed_at, created_at)
    VALUES (?, ?, 'set-password', ?, NULL, ?)`)
    .bind(tokenHash, email, expiresAt, now).run();
  return { email, setupToken: rawToken };
}

export async function setPortalPassword(rawToken: string, password: string) {
  await ensureAuthTables();
  const passwordError = validatePortalPassword(password);
  if (passwordError) throw new Error(passwordError);
  const db = database();
  const tokenHash = await sha256(rawToken);
  const now = new Date().toISOString();
  const token = await db.prepare(`SELECT email, expires_at, consumed_at
    FROM portal_verification_tokens WHERE token_hash = ? AND purpose = 'set-password'`)
    .bind(tokenHash).first<{ email: string; expires_at: string; consumed_at: string | null }>();
  if (!token || token.consumed_at || token.expires_at <= now) throw new Error("El enlace no es válido o ya venció.");
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const passwordHash = await derivePasswordHash(password, salt);
  await db.batch([
    db.prepare(`UPDATE portal_users SET password_hash = ?, password_salt = ?, password_iterations = ?,
      email_verified_at = ?, active = 1, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE email = ?`)
      .bind(passwordHash, bytesToBase64Url(salt), PASSWORD_ITERATIONS, now, now, token.email),
    db.prepare("UPDATE portal_verification_tokens SET consumed_at = ? WHERE token_hash = ?").bind(now, tokenHash),
  ]);
  return token.email;
}

export async function authenticatePortalUser(emailInput: unknown, passwordInput: unknown) {
  await ensureAuthTables();
  const db = database();
  const email = normalizeEmail(emailInput);
  const password = String(passwordInput || "");
  const user = await db.prepare("SELECT * FROM portal_users WHERE email = ?").bind(email).first<PortalUserRow>();
  const genericError = new Error("El correo o la contraseña no son correctos.");
  if (!user || !user.active || !user.email_verified_at) throw genericError;
  const nowMs = Date.now();
  if (user.locked_until && Date.parse(user.locked_until) > nowMs) {
    throw new Error("El acceso está temporalmente bloqueado por varios intentos. Inténtalo de nuevo en 15 minutos.");
  }
  const candidateHash = await derivePasswordHash(password, base64UrlToBytes(user.password_salt), user.password_iterations);
  if (!constantTimeEqual(candidateHash, user.password_hash)) {
    const attempts = (user.failed_attempts || 0) + 1;
    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS
      ? new Date(nowMs + LOCK_MINUTES * 60 * 1000).toISOString()
      : null;
    await db.prepare("UPDATE portal_users SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE email = ?")
      .bind(attempts >= MAX_FAILED_ATTEMPTS ? 0 : attempts, lockedUntil, new Date(nowMs).toISOString(), email).run();
    throw genericError;
  }
  await db.prepare("UPDATE portal_users SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE email = ?")
    .bind(new Date(nowMs).toISOString(), email).run();
  return createPortalSession({ email, role: user.role, onboardingId: user.onboarding_id });
}

async function createPortalSession(identity: PortalIdentity) {
  const db = database();
  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  await db.prepare("INSERT INTO portal_sessions (token_hash, email, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)")
    .bind(tokenHash, identity.email, expiresAt, now, now).run();
  return { token: rawToken, expiresAt, identity };
}

export async function introspectPortalSession(rawToken: string) {
  if (!rawToken) return null;
  await ensureAuthTables();
  const db = database();
  const tokenHash = await sha256(rawToken);
  const now = new Date().toISOString();
  const result = await db.prepare(`SELECT u.email, u.role, u.onboarding_id
    FROM portal_sessions s
    JOIN portal_users u ON u.email = s.email
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1 AND u.email_verified_at IS NOT NULL`)
    .bind(tokenHash, now).first<{ email: string; role: string; onboarding_id: string | null }>();
  if (!result) return null;
  await db.prepare("UPDATE portal_sessions SET last_seen_at = ? WHERE token_hash = ?").bind(now, tokenHash).run();
  return { email: result.email, role: result.role, onboardingId: result.onboarding_id } satisfies PortalIdentity;
}

export async function revokePortalSession(rawToken: string) {
  if (!rawToken) return;
  await ensureAuthTables();
  await database().prepare("DELETE FROM portal_sessions WHERE token_hash = ?").bind(await sha256(rawToken)).run();
}

export const portalAuthConfig = {
  cookieName: "focus_session",
  passwordMinLength: PASSWORD_MIN_LENGTH,
  sessionMaxAgeSeconds: SESSION_HOURS * 60 * 60,
};
