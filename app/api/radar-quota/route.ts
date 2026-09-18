import { NextResponse } from "next/server";
import { fetchAppsScriptJson } from "@/lib/apps-script-fetch";
import { introspectPortalSession } from "@/lib/portal-auth";
import { portalSessionFromRequest } from "@/lib/portal-cookie";

type QuotaResponse = {
  ok?: boolean;
  code?: string;
  error?: string;
  remaining?: number;
  assigned?: number;
  used?: number;
  unlimited?: boolean;
};

export async function POST(request: Request) {
  const identity = await introspectPortalSession(portalSessionFromRequest(request));
  if (!identity) return NextResponse.json({ ok: false, error: "Sesión no válida." }, { status: 401 });

  let body: { operation?: unknown; clientId?: unknown; executionId?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud no válida." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Solicitud no válida." }, { status: 400 });
  }
  const operation = String(body.operation || "");
  const clientId = String(body.clientId || "").toUpperCase();
  const executionId = String(body.executionId || "");
  if (!["balance", "reserve", "commit", "refund"].includes(operation) || !/^ONB-[A-F0-9]{8}$/.test(clientId) || (operation !== "balance" && !/^[a-f0-9-]{36}$/.test(executionId))) {
    return NextResponse.json({ ok: false, error: "Operación no válida." }, { status: 400 });
  }

  try {
    const endpoints = [...new Set([process.env.GOOGLE_SHEETS_PORTAL_URL, process.env.GOOGLE_SHEETS_WEBHOOK_URL].filter((url): url is string => Boolean(url)))];
    const token = process.env.FOCUS_PORTAL_TOKEN;
    if (!endpoints.length || !token) throw new Error("Cuota no configurada");
    let sheetUrl: string | undefined;
    for (const endpoint of endpoints) {
      try {
        const statusUrl = new URL(endpoint);
        statusUrl.searchParams.set("action", "radarQuotaStatus");
        statusUrl.searchParams.set("token", token);
        const status = await fetchAppsScriptJson<{ ok?: boolean; version?: number }>(statusUrl, {
          cache: "no-store",
          signal: AbortSignal.timeout(20_000),
        });
        console.warn("radar_quota_status", { responseStatus: status.response.status, ready: status.payload.ok === true && status.payload.version === 1 });
        if (status.response.ok && status.payload.ok === true && status.payload.version === 1) {
          sheetUrl = endpoint;
          break;
        }
      } catch (error) {
        console.warn("radar_quota_status_error", { name: error instanceof Error ? error.name : "unknown" });
        continue;
      }
    }
    if (!sheetUrl) throw new Error("Cuota de Radar pendiente de activación");
    const { response, payload } = await fetchAppsScriptJson<QuotaResponse>(sheetUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "radarQuota", operation, clientId, executionId, email: identity.email, _focusToken: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok || payload.ok !== true) console.warn("radar_quota_rejected", { responseStatus: response.status, code: payload.code || "unknown" });
    if (!response.ok || payload.ok !== true) {
      const status = payload.code === "quota_exhausted" ? 403 : payload.code === "forbidden" ? 403 : payload.code === "invalid" ? 400 : 503;
      return NextResponse.json({ ok: false, error: payload.error || "No se pudo comprobar el saldo de Radar.", code: payload.code }, { status });
    }
    return NextResponse.json({ ok: true, assigned: payload.assigned, used: payload.used, remaining: payload.remaining, unlimited: payload.unlimited === true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("radar_quota_error", { name: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ ok: false, error: "No se pudo comprobar el saldo de Radar." }, { status: 503 });
  }
}
