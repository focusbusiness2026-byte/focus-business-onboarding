import { env } from "cloudflare:workers";

export type StoredSubmission = {
  id: string;
  submittedAt: string;
  status: string;
  companyName: string;
  contactEmail: string;
  payload: Record<string, unknown>;
};

async function database() {
  const db = env.DB;
  if (!db) throw new Error("La base de datos del sitio no está disponible.");
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS onboarding_submissions (
      id TEXT PRIMARY KEY NOT NULL,
      submitted_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Nuevo',
      company_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      payload_json TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_onboarding_submitted_at ON onboarding_submissions (submitted_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_onboarding_contact_email ON onboarding_submissions (contact_email)"),
  ]);
  return db;
}

export async function saveSubmission(payload: Record<string, unknown>) {
  const db = await database();
  const id = `ONB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const submittedAt = typeof payload.submittedAt === "string" ? payload.submittedAt : new Date().toISOString();
  const companyName = String(payload.companyName || "").trim();
  const contactEmail = String(payload.contactEmail || "").trim().toLowerCase();
  if (!companyName || !contactEmail) throw new Error("Faltan el nombre comercial o el correo responsable.");
  await db.prepare(`INSERT INTO onboarding_submissions
    (id, submitted_at, status, company_name, contact_email, payload_json)
    VALUES (?, ?, 'Nuevo', ?, ?, ?)`)
    .bind(id, submittedAt, companyName, contactEmail, JSON.stringify(payload))
    .run();
  return { id, submittedAt, status: "Nuevo" };
}

export async function listSubmissions(): Promise<StoredSubmission[]> {
  const db = await database();
  const result = await db.prepare(`SELECT id, submitted_at, status, company_name, contact_email, payload_json
    FROM onboarding_submissions ORDER BY submitted_at DESC`).all<{
      id: string; submitted_at: string; status: string; company_name: string; contact_email: string; payload_json: string;
    }>();
  return (result.results || []).map((row) => ({
    id: row.id,
    submittedAt: row.submitted_at,
    status: row.status,
    companyName: row.company_name,
    contactEmail: row.contact_email,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
  }));
}

export async function deleteSubmission(id: string) {
  const db = await database();
  const result = await db.prepare("DELETE FROM onboarding_submissions WHERE id = ?").bind(id).run();
  return Number(result.meta?.changes || 0) > 0;
}
