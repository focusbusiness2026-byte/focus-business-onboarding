"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useState } from "react";

export default function MagicLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function enter() {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/consume-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as { ok?: boolean; destination?: string; error?: string };
      if (!response.ok || !result.ok || !result.destination) {
        throw new Error(result.error || "El enlace no es válido.");
      }
      window.history.replaceState({}, "", "/magic-login");
      window.location.assign(result.destination);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "El enlace no es válido.");
      setLoading(false);
    }
  }

  return <main className="access"><section className="access-card">
    <a className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></a>
    <p className="eyebrow">ENLACE DE UN SOLO USO</p>
    <h1>Confirma tu acceso</h1>
    <p className="intro">Este enlace caduca en 15 minutos y dejará de funcionar en cuanto lo utilices.</p>
    <button className="primary access-button" type="button" onClick={enter} disabled={loading}>
      {loading ? "Comprobando…" : "Entrar a Focus Business →"}
    </button>
    <p className="access-note">Al entrar se cerrará cualquier sesión anterior asociada a este correo.</p>
    {error && <><p className="access-error" role="alert">{error}</p><p className="access-note"><a href="/access">Solicitar un enlace nuevo →</a></p></>}
  </section></main>;
}
