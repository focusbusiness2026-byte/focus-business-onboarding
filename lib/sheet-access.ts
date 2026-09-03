import { fetchAppsScriptJson } from "@/lib/apps-script-fetch";

export type SheetAccess = {
  role: string;
  prospection: boolean;
  radar: boolean;
};

const ACCESS_LOOKUP_ATTEMPTS = 2;
const ACCESS_LOOKUP_TIMEOUT_MS = 20_000;

function accessEndpoints() {
  return [...new Set([
    process.env.GOOGLE_SHEETS_PORTAL_URL,
    process.env.GOOGLE_SHEETS_WEBHOOK_URL,
  ].filter((value): value is string => Boolean(value)))];
}

async function waitBeforeRetry() {
  await new Promise((resolve) => setTimeout(resolve, 350));
}

export async function activeSheetAccess(email: string): Promise<SheetAccess | null> {
  const token = process.env.FOCUS_PORTAL_TOKEN;
  const endpoints = accessEndpoints();
  if (!endpoints.length || !token) throw new Error("La validación de accesos no está configurada.");

  let lastError: unknown;
  for (let attempt = 0; attempt < ACCESS_LOOKUP_ATTEMPTS; attempt += 1) {
    const url = new URL(endpoints[attempt % endpoints.length]);
    url.searchParams.set("action", "portal");
    url.searchParams.set("email", email);
    url.searchParams.set("token", token);
    try {
      const { response, payload } = await fetchAppsScriptJson<{
        ok?: boolean;
        role?: string;
        access?: { prospection?: boolean; radar?: boolean };
      }>(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(ACCESS_LOOKUP_TIMEOUT_MS),
      });
      if (!response.ok || payload.ok !== true) return null;
      const role = String(payload.role || "Cliente");
      const isAdmin = role.toLowerCase().includes("admin");
      return {
        role,
        prospection: payload.access?.prospection ?? true,
        radar: payload.access?.radar ?? isAdmin,
      };
    } catch (error) {
      lastError = error;
      if (attempt + 1 < ACCESS_LOOKUP_ATTEMPTS) {
        console.warn("portal_access_lookup_retry", { attempt: attempt + 1 });
        await waitBeforeRetry();
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No se pudo validar el acceso.");
}

export async function activeSheetRole(email: string) {
  return (await activeSheetAccess(email))?.role || "";
}
