import { NextResponse } from "next/server";
import { verifyPortalEmail } from "@/lib/portal-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  try {
    await verifyPortalEmail(token);
    return NextResponse.redirect(new URL("/portal?verified=1", url.origin));
  } catch (error) {
    const target = new URL("/portal", url.origin);
    target.searchParams.set("verification_error", error instanceof Error ? error.message : "No se pudo confirmar el correo.");
    return NextResponse.redirect(target);
  }
}
