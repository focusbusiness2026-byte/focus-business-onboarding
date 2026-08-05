import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const endpoint = process.env.GOOGLE_SHEETS_PORTAL_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;
  if (!endpoint || !token) return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  try {
    const url = new URL(endpoint);
    url.searchParams.set("action", "portal");
    url.searchParams.set("email", user.email);
    url.searchParams.set("token", token);
    const response = await fetch(url, { cache: "no-store" });
    const body = await response.json();
    return NextResponse.json(body, { status: response.ok ? 200 : 403 });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo consultar Google Sheets." }, { status: 502 });
  }
}
