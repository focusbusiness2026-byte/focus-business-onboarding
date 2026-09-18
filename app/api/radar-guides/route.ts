import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { POST as quotaPost } from "@/app/api/radar-quota/route";
import { introspectPortalSession } from "@/lib/portal-auth";
import { portalSessionFromRequest } from "@/lib/portal-cookie";

const clientPattern = /^ONB-[A-F0-9]{8}$/;
const executionPattern = /^[a-f0-9-]{36}$/;
const noStore = { "Cache-Control": "private, no-store" };

async function authorize(request: Request, clientId: string, executionId?: string) {
  const identity = await introspectPortalSession(portalSessionFromRequest(request));
  if (!identity || !identity.radarAccess) return false;
  const response = await quotaPost(new Request("https://onboarding.focusbusinesslab.es/api/radar-quota", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: request.headers.get("cookie") || "" },
    body: JSON.stringify({ operation: executionId ? "receipt" : "access", clientId, executionId }),
  }));
  if (!response.ok) return false;
  const result = await response.json() as { ok?: boolean; consumed?: boolean; unlimited?: boolean };
  return result.ok === true && (!executionId || result.consumed === true || result.unlimited === true);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = String(url.searchParams.get("clientId") || "").toUpperCase();
  const executionId = url.searchParams.get("executionId");
  if (!clientPattern.test(clientId) || (executionId && !executionPattern.test(executionId))) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    if (!await authorize(request, clientId)) return NextResponse.json({ ok: false }, { status: 403 });
    if (executionId) {
      const row = await env.DB.prepare("SELECT record_json FROM radar_guide_history WHERE client_id = ? AND execution_id = ?")
        .bind(clientId, executionId).first<{ record_json: string }>();
      if (!row) return NextResponse.json({ ok: false }, { status: 404 });
      return NextResponse.json(JSON.parse(row.record_json), { headers: noStore });
    }
    const rows = await env.DB.prepare(`SELECT execution_id AS id, generated_at AS generated_at,
      item_id AS item_id, goal, title, producer, network, reference_url AS reference_url
      FROM radar_guide_history WHERE client_id = ? ORDER BY generated_at DESC`)
      .bind(clientId).all();
    return NextResponse.json({ available: true, items: rows.results }, { headers: noStore });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo consultar el historial de Radar." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let record: Record<string, unknown>;
  try {
    record = await request.json();
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("invalid");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const clientId = String(record.clientId || "").toUpperCase();
  const executionId = String(record.id || "");
  const referenceUrl = String(record.reference_url || "");
  const itemId = String(record.item_id || "");
  const title = String(record.title || "");
  const goal = String(record.goal || "");
  const encoded = JSON.stringify(record);
  if (!clientPattern.test(clientId) || !executionPattern.test(executionId) ||
    !["views", "leads", "general"].includes(goal) || !/^https:\/\//.test(referenceUrl) ||
    !itemId || itemId.length > 255 || !title || title.length > 300 || encoded.length > 150_000 ||
    !record.guide || typeof record.guide !== "object" || Array.isArray(record.guide) ||
    !record.item || typeof record.item !== "object" || Array.isArray(record.item) ||
    !record.client || typeof record.client !== "object" || Array.isArray(record.client)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    if (!await authorize(request, clientId, executionId)) return NextResponse.json({ ok: false }, { status: 403 });
    const generatedAt = new Date().toISOString();
    const saved = { ...record, clientId, id: executionId, generated_at: generatedAt };
    await env.DB.prepare(`INSERT INTO radar_guide_history
      (execution_id, client_id, generated_at, item_id, goal, title, producer, network, reference_url, record_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(execution_id) DO NOTHING`)
      .bind(executionId, clientId, generatedAt, itemId, goal, title,
        String(record.producer || ""), String(record.network || ""), referenceUrl, JSON.stringify(saved)).run();
    const owner = await env.DB.prepare("SELECT client_id FROM radar_guide_history WHERE execution_id = ?")
      .bind(executionId).first<{ client_id: string }>();
    if (owner?.client_id !== clientId) return NextResponse.json({ ok: false }, { status: 409 });
    return NextResponse.json({ ok: true, id: executionId }, { headers: noStore });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo guardar la guía de Radar." }, { status: 503 });
  }
}
