const DOMAIN_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

type Bootstrap = { services?: [string[], string[]][] };

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("domain") || "";
  const normalized = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  if (!DOMAIN_PATTERN.test(normalized)) {
    return Response.json({ ok: false, normalized, status: "invalid", message: "Escribe un dominio válido, por ejemplo productoranorte.com" }, { status: 400 });
  }

  try {
    const tld = normalized.split(".").at(-1) || "";
    const bootstrapResponse = await fetch("https://data.iana.org/rdap/dns.json", { headers: { accept: "application/json" } });
    if (!bootstrapResponse.ok) throw new Error("bootstrap unavailable");
    const bootstrap = await bootstrapResponse.json() as Bootstrap;
    const service = bootstrap.services?.find(([tlds]) => tlds.some((candidate) => candidate.toLowerCase() === tld));
    const baseUrl = service?.[1]?.find((url) => url.startsWith("https://"));
    if (!baseUrl) {
      return Response.json({ ok: true, normalized, status: "unknown", message: "No hay una consulta registral automática para esta extensión; se revisará manualmente" });
    }

    const lookupUrl = `${baseUrl.replace(/\/$/, "")}/domain/${encodeURIComponent(normalized)}`;
    const lookup = await fetch(lookupUrl, { headers: { accept: "application/rdap+json, application/json" }, redirect: "follow" });
    if (lookup.status === 404) return Response.json({ ok: true, normalized, status: "available", message: "✅ Parece disponible" });
    if (lookup.ok) return Response.json({ ok: true, normalized, status: "unavailable", message: "❌ Ya está registrado" });
    return Response.json({ ok: true, normalized, status: "unknown", message: "No se pudo confirmar ahora; se revisará manualmente" });
  } catch {
    return Response.json({ ok: true, normalized, status: "unknown", message: "No se pudo consultar ahora; se revisará manualmente" });
  }
}
