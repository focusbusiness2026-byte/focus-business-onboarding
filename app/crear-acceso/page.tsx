"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useState } from "react";

export default function RequestAccessPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/auth/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo procesar la solicitud.");
      setMessage(result.message || "Revisa tu correo.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo procesar la solicitud.");
    } finally { setLoading(false); }
  }
  return <main className="access"><section className="access-card">
    <a className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></a>
    <p className="eyebrow">ACCESO AL PORTAL</p><h1>Crear o recuperar contraseña</h1>
    <p className="intro">Si tu correo está activo en Focus Business, te enviaremos un enlace de un solo uso.</p>
    <form className="access-form" onSubmit={submit}><label className="input"><span>Correo registrado</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="nombre@empresa.com" /></label><button className="primary access-button" disabled={loading}>{loading ? "Enviando…" : "Enviar enlace →"}</button></form>
    {message && <p className="notice success">{message}</p>}{error && <p className="access-error" role="alert">{error}</p>}
    <p className="access-note"><a href="/access">Volver al acceso.</a></p>
  </section></main>;
}
