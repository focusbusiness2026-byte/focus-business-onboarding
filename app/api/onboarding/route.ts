import { NextResponse } from "next/server";

type SheetsWriteResponse = {
  ok?: boolean;
  id?: string;
  row?: number;
  error?: string;
};

async function saveToGoogleSheets(payload: Record<string, unknown>) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const token = process.env.FOCUS_PORTAL_TOKEN;
  if (!url || !token) {
    throw new Error("Google Sheets no está configurado. Faltan GOOGLE_SHEETS_WEBHOOK_URL o FOCUS_PORTAL_TOKEN.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, _focusToken: token }),
  });
  const text = await response.text();
  let result: SheetsWriteResponse;
  try {
    result = JSON.parse(text) as SheetsWriteResponse;
  } catch {
    throw new Error("Google Sheets devolvió una respuesta no válida.");
  }
  if (!response.ok || result.ok !== true) {
    throw new Error(result.error || `Google Sheets devolvió el estado ${response.status}.`);
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const sheets = await saveToGoogleSheets(payload);
    return NextResponse.json({
      ok: true,
      saved: { id: sheets.id, row: sheets.row, submittedAt: payload.submittedAt },
      sheets: { configured: true },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar el registro en Google Sheets." },
      { status: 502 },
    );
  }
}
