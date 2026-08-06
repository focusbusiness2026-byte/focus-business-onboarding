import { listSubmissions } from "../../../../db/onboarding";
import { asCsv } from "../../../../lib/onboarding";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || token !== process.env.SHEET_EXPORT_TOKEN) return new Response("No autorizado", { status: 403 });
  const csv = asCsv(await listSubmissions());
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": "inline; filename=focus-business-onboarding.csv",
    },
  });
}
