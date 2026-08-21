import { fetchAppsScriptJson } from "@/lib/apps-script-fetch";

export async function activeSheetRole(email: string) {
  const sheetUrl = process.env.GOOGLE_SHEETS_PORTAL_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;
  if (!sheetUrl || !token) throw new Error("La validación de accesos no está configurada.");
  const url = new URL(sheetUrl);
  url.searchParams.set("action", "portal");
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  const { response, payload } = await fetchAppsScriptJson<{ ok?: boolean; role?: string }>(url, { cache: "no-store" });
  if (!response.ok || payload.ok !== true) return "";
  return String(payload.role || "Cliente");
}
