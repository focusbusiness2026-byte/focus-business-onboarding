const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const APPS_SCRIPT_RESPONSE_HOST = "script.googleusercontent.com";
const MAX_APPS_SCRIPT_REDIRECTS = 5;

export async function fetchAppsScriptJson<T>(url: string | URL, init?: RequestInit) {
  let response = await fetch(url, { ...init, redirect: "manual" });
  let redirects = 0;

  while (REDIRECT_STATUSES.has(response.status)) {
    redirects += 1;
    if (redirects > MAX_APPS_SCRIPT_REDIRECTS) {
      throw new Error("Google Apps Script devolvió demasiadas redirecciones.");
    }

    const location = response.headers.get("location");
    let nextUrl: URL;
    try {
      nextUrl = new URL(location || "", response.url);
    } catch {
      throw new Error("Google Apps Script devolvió una redirección no permitida.");
    }
    if (nextUrl.protocol !== "https:" || nextUrl.hostname !== APPS_SCRIPT_RESPONSE_HOST) {
      throw new Error("Google Apps Script devolvió una redirección no permitida.");
    }

    response = await fetch(nextUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
    });
  }

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  const trimmed = text.trim();
  const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!contentType.toLowerCase().includes("application/json") && !looksLikeJson) {
    throw new Error("Google Apps Script no devolvió una respuesta JSON válida.");
  }
  try {
    return { response, payload: JSON.parse(text) as T };
  } catch {
    throw new Error("Google Apps Script devolvió un JSON no válido.");
  }
}
