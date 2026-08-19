"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useState } from "react";

const ADMIN_DESTINATION = "https://onboarding.focusbusinesslab.es/portal";

export default function AdminAccessPage() {
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
      const response = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, returnTo: ADMIN_DESTINATION }),
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
    <div className="access-context"><p className="eyebrow">ÁREA ADMINISTRATIVA</p><span className="access-destination-badge">ADMINISTRADOR</span></div>
    <h1>Administración de clientes</h1>
    <p className="intro">Acceso privado para revisar las empresas y formularios registrados. Solo los correos con rol de administrador pueden consultar este portal.</p>
    <form className="access-form" onSubmit={requestLink}>
      <label className="input"><span>Correo administrativo</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="nombre@empresa.com" /></label>
      <button className="primary access-button" type="submit" disabled={loading}>{loading ? "Enviando…" : "Enviar enlace administrativo →"}</button>
    </form>
    {message && <p className="notice success">{message}</p>}
    {error && <p className="access-error" role="alert">{error}</p>}
    <p className="access-note">El enlace caduca en 15 minutos, funciona una sola vez y no concede acceso si el correo no tiene rol administrativo.</p>
  </section></main>;
}
