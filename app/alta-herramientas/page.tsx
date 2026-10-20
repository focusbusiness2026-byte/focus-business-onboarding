"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

export default function ShortOnboardingPage() {
  const [invite] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("invite") || "");
  const [email, setEmail] = useState("");
  const [valid, setValid] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch(`/api/onboarding/quick?invite=${encodeURIComponent(invite)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { ok?: boolean; email?: string; submitted?: boolean; error?: string };
        if (!response.ok || !data.ok) throw new Error(data.error || "Invitación no válida.");
        setEmail(data.email || "");
        setSubmitted(data.submitted === true);
        setValid(true);
      }).catch((cause) => setError(cause instanceof Error ? cause.message : "Invitación no válida."));
  }, [invite]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/onboarding/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite, email,
          firstName: fields.get("firstName"), lastName: fields.get("lastName"),
          companyName: fields.get("companyName"), description: fields.get("description"),
          website: fields.get("website"), prospection: fields.get("prospection") === "on",
          radar: fields.get("radar") === "on", terms: fields.get("terms") === "on",
        }),
      });
      const result = await response.json() as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo preparar el alta.");
      setSubmitted(true);
      setMessage(result.message || "Revisa tu correo para confirmar el acceso.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo preparar el alta.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="access"><section className="access-card short-onboarding-card">
    <Link className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></Link>
    <p className="eyebrow">ALTA BÁSICA · PROSPECCIÓN Y RADAR</p>
    <h1>Empieza con Focus Business</h1>
    <p className="intro">Completa solo los datos esenciales para Prospección, Radar o ambos. La web es opcional y el acceso se activa después de confirmar tu correo.</p>
    <Link className="short-full-link" href="/">¿Necesitas la configuración completa? Abrir el formulario original →</Link>
    {!valid && !error && <p className="intro">{invite ? "Comprobando invitación…" : "Preparando formulario…"}</p>}
    {valid && submitted && <p className="notice success" role="status">{message || "Tu solicitud está enviada. Revisa tu correo para confirmar el acceso."}</p>}
    {valid && !submitted && <form className="short-onboarding-form" onSubmit={submit}>
      <div className="grid two"><label className="input"><span>Nombre</span><input name="firstName" maxLength={100} required autoComplete="given-name" /></label>
      <label className="input"><span>Apellido</span><input name="lastName" maxLength={100} required autoComplete="family-name" /></label></div>
      <label className="input"><span>{invite ? "Correo de la invitación" : "Correo electrónico"}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} readOnly={Boolean(invite)} required autoComplete="email" /></label>
      <label className="input"><span>Empresa</span><input name="companyName" maxLength={160} required autoComplete="organization" /></label>
      <label className="input"><span>¿Qué ofrece tu empresa?</span><textarea name="description" minLength={12} maxLength={600} required placeholder="Describe en una frase tus servicios o productos." /></label>
      <label className="input"><span>Sitio web (opcional)</span><input type="url" name="website" maxLength={300} placeholder="https://tuempresa.com" /></label>
      <fieldset className="short-products"><legend>Herramientas que quieres usar</legend>
        <label><input type="checkbox" name="prospection" defaultChecked /> Prospección</label>
        <label><input type="checkbox" name="radar" /> Focus Viral Radar</label>
      </fieldset>
      <label className="short-terms"><input type="checkbox" name="terms" required /> Confirmo que los datos son correctos y autorizo a Focus Business a revisar la web pública indicada para preparar un perfil provisional. El alta no inicia búsquedas de clientes ni automatizaciones.</label>
      <button className="primary access-button" type="submit" disabled={busy}>{busy ? "Preparando…" : "Confirmar solicitud →"}</button>
    </form>}
    {error && <p className="access-error" role="alert">{error}</p>}
  </section></main>;
}
