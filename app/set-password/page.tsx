"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useState } from "react";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = new URLSearchParams(window.location.search).get("token") || "";
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, passwordConfirmation: confirmation }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo guardar la contraseña.");
      setPassword(""); setConfirmation(""); setMessage("Contraseña guardada. Ya puedes entrar a los portales.");
    } catch (setErrorValue) {
      setError(setErrorValue instanceof Error ? setErrorValue.message : "No se pudo guardar la contraseña.");
    } finally { setLoading(false); }
  }
  return <main className="access"><section className="access-card">
    <a className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></a>
    <p className="eyebrow">ACCESO AL PORTAL</p><h1>Elige tu contraseña</h1>
    <p className="intro">Mínimo 6 caracteres, con al menos una letra y un número. No exige mayúsculas ni símbolos.</p>
    <form className="access-form" onSubmit={submit}><label className="input"><span>Contraseña</span><input type="password" required minLength={6} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label><label className="input"><span>Repite la contraseña</span><input type="password" required minLength={6} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" /></label><button className="primary access-button" disabled={loading}>{loading ? "Guardando…" : "Guardar contraseña →"}</button></form>
    {message && <><p className="notice success">{message}</p><p className="access-note"><a href="/access">Entrar ahora →</a></p></>}{error && <p className="access-error" role="alert">{error}</p>}
  </section></main>;
}
