import { env } from "cloudflare:workers";

export type ShortSignup = {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  description: string;
  website: string;
  prospection: boolean;
  radar: boolean;
  terms: true;
};

type InvitationRow = {
  token_hash: string;
  email: string;
  expires_at: string;
  submitted_at: string | null;
  activated_at: string | null;
  payload_json: string | null;
  onboarding_id: string | null;
};

function database() {
  if (!env.DB) throw new Error("El almacenamiento privado no está configurado.");
  return env.DB;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function hashShortToken(raw: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createShortInvitation(email: string) {
  const existing = await database().prepare(`SELECT token_hash FROM short_invitations
    WHERE email = ? AND activated_at IS NULL AND expires_at > ? LIMIT 1`)
    .bind(email, new Date().toISOString()).first();
  if (existing) throw new Error("Ya existe una invitación pendiente para este correo.");
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = base64Url(bytes);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await database().prepare(`INSERT INTO short_invitations
    (token_hash, email, expires_at, created_at) VALUES (?, ?, ?, ?)`).bind(
    await hashShortToken(token), email, expiresAt, now.toISOString(),
  ).run();
  return { token, expiresAt };
}

export async function findShortInvitation(raw: string) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(raw)) return null;
  const result = await database().prepare(`SELECT * FROM short_invitations WHERE token_hash = ?`)
    .bind(await hashShortToken(raw)).first<InvitationRow>();
  return result && result.expires_at > new Date().toISOString() && !result.activated_at ? result : null;
}

export async function claimShortInvitation(raw: string, signup: ShortSignup) {
  const invite = await findShortInvitation(raw);
  if (!invite || invite.email !== signup.email) throw new Error("La invitación no es válida para este correo.");
  const payload = JSON.stringify(signup);
  if (invite.submitted_at) {
    if (invite.payload_json !== payload) throw new Error("Esta invitación ya tiene un alta pendiente. Contacta con soporte para cambiar los datos.");
    return invite;
  }
  const result = await database().prepare(`UPDATE short_invitations
    SET submitted_at = ?, payload_json = ?
    WHERE token_hash = ? AND submitted_at IS NULL AND activated_at IS NULL AND expires_at > ?`)
    .bind(new Date().toISOString(), payload, invite.token_hash, new Date().toISOString()).run();
  if (Number(result.meta?.changes || 0) !== 1) throw new Error("Esta invitación ya fue utilizada.");
  return { ...invite, submitted_at: new Date().toISOString(), payload_json: payload };
}

export async function pendingShortSignup(email: string) {
  return database().prepare(`SELECT * FROM short_invitations
    WHERE email = ? AND submitted_at IS NOT NULL AND activated_at IS NULL
    ORDER BY submitted_at DESC LIMIT 1`).bind(email).first<InvitationRow>();
}

export async function finishShortSignup(tokenHash: string, onboardingId: string) {
  await database().prepare(`UPDATE short_invitations SET activated_at = ?, onboarding_id = ?, payload_json = NULL
    WHERE token_hash = ? AND activated_at IS NULL`)
    .bind(new Date().toISOString(), onboardingId, tokenHash).run();
}
