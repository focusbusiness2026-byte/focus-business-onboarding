"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useState } from "react";

const ALLOWED_DESTINATIONS = new Set([
  "https://onboarding.focusbusinesslab.es/portal",
  "https://prospeccion.focusbusinesslab.es/portal",
  "https://radar.focusbusinesslab.es/",
]);

function allowedReturnTo(raw: string | null) {
  const fallback = "https://prospeccion.focusbusinesslab.es/portal";
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    const normalized = `${url.origin}${url.pathname}`;
    return ALLOWED_DESTINATIONS.has(normalized) ? `${normalized}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export default function SharedAccessPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const returnTo = allowedReturnTo(new URLSearchParams(window.location.search).get("return_to"));
      const response = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, returnTo }),
      });
      const result = await response.json() as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo enviar el enlace.");
      setMessage(result.message || "Revisa tu correo.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo enviar el enlace.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="access"><section className="access-card">
    <a className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></a>
    <p className="eyebrow">ACCESO UNIFICADO</p>
    <h1>Entra a tus portales</h1>
    <p className="intro">Escribe el correo activo en Focus Business. Te enviaremos un enlace que caduca en 15 minutos y solo se puede usar una vez.</p>
    <form className="access-form" onSubmit={requestLink}>
      <label className="input"><span>Correo registrado</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="nombre@empresa.com" /></label>
      <button className="primary access-button" type="submit" disabled={loading}>{loading ? "Enviando…" : "Enviar enlace de acceso →"}</button>
    </form>
    {message && <p className="notice success">{message}</p>}
    {error && <p className="access-error" role="alert">{error}</p>}
    <p className="access-note">El primer uso invalida el enlace. Si solicitas uno nuevo, el anterior también deja de funcionar.</p>
    <p className="access-note"><a href="/">Volver al formulario público.</a></p>
  </section></main>;
}
