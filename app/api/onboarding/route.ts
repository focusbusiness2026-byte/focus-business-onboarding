import { NextResponse } from "next/server";
import { saveSubmission } from "../../../db/onboarding";

async function forward(url: string | undefined, body: unknown) {
  if (!url) return { configured: false };
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Integration returned ${response.status}`);
  return { configured: true };
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const saved = await saveSubmission(payload);
    const sheetsPayload = { ...payload, _focusToken: process.env.FOCUS_PORTAL_TOKEN };
    const [sheets, ghl] = await Promise.all([
      forward(process.env.GOOGLE_SHEETS_WEBHOOK_URL, sheetsPayload),
      forward(process.env.GHL_ONBOARDING_WEBHOOK_URL, payload),
    ]);
    return NextResponse.json({ ok: true, saved, sheets, ghl });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 502 });
  }
}
