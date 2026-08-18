"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useState } from "react";

const ALLOWED_DESTINATIONS = new Set([
  "https://onboarding.focusbusinesslab.es/portal",
  "https://prospeccion.focusbusinesslab.es/portal",
  "https://radar.focusbusinesslab.es/",
]);

function allowedReturnTo(raw: string | null) {
  if (!raw) return "https://prospeccion.focusbusinesslab.es/portal";
  try {
    const url = new URL(raw);
    const normalized = `${url.origin}${url.pathname}`;
    return ALLOWED_DESTINATIONS.has(normalized) ? `${normalized}${url.hash}` : "https://prospeccion.focusbusinesslab.es/portal";
  } catch {
    return "https://prospeccion.focusbusinesslab.es/portal";
  }
}

export default function SharedAccessPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo iniciar sesión.");
      const destination = allowedReturnTo(new URLSearchParams(window.location.search).get("return_to"));
      window.location.assign(destination);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
      setLoading(false);
    }
  }

  return <main className="access"><section className="access-card">
    <a className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></a>
    <p className="eyebrow">ACCESO UNIFICADO</p>
    <h1>Entra a tus portales</h1>
    <p className="intro">Usa el correo confirmado y la contraseña creada en la configuración inicial.</p>
    <form className="access-form" onSubmit={login}>
      <label className="input"><span>Correo</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required placeholder="nombre@empresa.com" /></label>
      <label className="input"><span>Contraseña</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required minLength={6} maxLength={128} placeholder="Tu contraseña" /></label>
      <button className="primary access-button" type="submit" disabled={loading}>{loading ? "Verificando…" : "Continuar →"}</button>
    </form>
    {error && <p className="access-error" role="alert">{error}</p>}
    <p className="access-note"><a href="/crear-acceso">Crear o recuperar contraseña</a></p>
    <p className="access-note">La misma sesión permite abrir Prospección y Radar. Focus Business no envía ni muestra tu contraseña por correo.</p>
  </section></main>;
}
