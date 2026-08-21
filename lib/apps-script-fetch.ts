const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export async function fetchAppsScriptJson<T>(url: string | URL, init?: RequestInit) {
  const first = await fetch(url, { ...init, redirect: "manual" });
  let response = first;

  if (REDIRECT_STATUSES.has(first.status)) {
    const location = first.headers.get("location");
    if (!location || !location.startsWith("https://script.googleusercontent.com/")) {
      throw new Error("Google Apps Script devolvió una redirección no permitida.");
    }
    response = await fetch(location, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
    });
  }

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Google Apps Script no devolvió una respuesta JSON válida.");
  }
  try {
    return { response, payload: JSON.parse(text) as T };
  } catch {
    throw new Error("Google Apps Script devolvió un JSON no válido.");
  }
}
