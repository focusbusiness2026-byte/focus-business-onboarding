"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

const PORTAL_DESTINATIONS = [
  {
    value: "https://prospeccion.focusbusinesslab.es/portal",
    title: "Prospección",
    description: "Busca, revisa y gestiona leads y ejecuciones.",
    eyebrow: "PORTAL DE PROSPECCIÓN",
    heading: "Acceso a Prospección",
    badge: "PROSPECTOS",
  },
  {
    value: "https://radar.focusbusinesslab.es/",
    title: "Focus Viral Radar",
    description: "Consulta tendencias, estructuras y contenidos guardados.",
    eyebrow: "INTELIGENCIA CREATIVA",
    heading: "Acceso a Focus Viral Radar",
    badge: "RADAR",
  },
] as const;

const ALLOWED_DESTINATIONS = new Set([
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
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const requestedDestination = allowedReturnTo(searchParams.get("return_to"));
  const destination = selectedDestination || (
    PORTAL_DESTINATIONS.some((item) => item.value === requestedDestination)
      ? requestedDestination
      : PORTAL_DESTINATIONS[0].value
  );
  const activeDestination = PORTAL_DESTINATIONS.find((item) => item.value === destination) || PORTAL_DESTINATIONS[0];

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, returnTo: destination }),
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
    <div className="access-context"><p className="eyebrow">{activeDestination.eyebrow}</p><span className="access-destination-badge">{activeDestination.badge}</span></div>
    <h1>{activeDestination.heading}</h1>
    <p className="intro">Elige Prospección o Focus Viral Radar y escribe el correo activo en Focus Business. Te enviaremos un enlace que caduca en 15 minutos y solo se puede usar una vez.</p>
    <form className="access-form" onSubmit={requestLink}>
      <fieldset className="portal-destinations">
        <legend>¿A dónde quieres entrar?</legend>
        {PORTAL_DESTINATIONS.map((item, index) => <div className="portal-destination" key={item.value}>
          <input id={`portal-destination-${index}`} type="radio" name="destination" value={item.value} checked={destination === item.value} onChange={() => setSelectedDestination(item.value)} />
          <label htmlFor={`portal-destination-${index}`}><b>{item.title}</b><small>{item.description}</small></label>
        </div>)}
      </fieldset>
      <label className="input"><span>Correo registrado</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="nombre@empresa.com" /></label>
      <button className="primary access-button" type="submit" disabled={loading}>{loading ? "Enviando…" : `Entrar a ${activeDestination.title} →`}</button>
    </form>
    {message && <p className="notice success">{message}</p>}
    {error && <p className="access-error" role="alert">{error}</p>}
    <p className="access-note">El primer uso invalida el enlace. Si solicitas uno nuevo, el anterior también deja de funcionar.</p>
    <p className="access-note"><a href="/">Volver al formulario público.</a></p>
  </section></main>;
}
