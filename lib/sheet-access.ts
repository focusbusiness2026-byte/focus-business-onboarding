import { fetchAppsScriptJson } from "@/lib/apps-script-fetch";

export type SheetAccess = {
  role: string;
  prospection: boolean;
  radar: boolean;
};

export async function activeSheetAccess(email: string): Promise<SheetAccess | null> {
  const sheetUrl = process.env.GOOGLE_SHEETS_PORTAL_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;
  if (!sheetUrl || !token) throw new Error("La validación de accesos no está configurada.");
  const url = new URL(sheetUrl);
  url.searchParams.set("action", "portal");
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  const { response, payload } = await fetchAppsScriptJson<{
    ok?: boolean;
    role?: string;
    access?: { prospection?: boolean; radar?: boolean };
  }>(url, { cache: "no-store" });
  if (!response.ok || payload.ok !== true) return null;
  const role = String(payload.role || "Cliente");
  const isAdmin = role.toLowerCase().includes("admin");
  return {
    role,
    prospection: payload.access?.prospection ?? true,
    radar: payload.access?.radar ?? isAdmin,
  };
}

export async function activeSheetRole(email: string) {
  return (await activeSheetAccess(email))?.role || "";
}
