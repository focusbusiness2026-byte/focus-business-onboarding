export async function GET() {
  return Response.json(
    { ok: false, error: "Exportación heredada desactivada. Google Sheets es la única fuente operativa." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
