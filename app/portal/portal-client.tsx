"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useState } from "react";

type RecordRow = Record<string, string | boolean>;
type PortalResponse = {
  ok: boolean;
  role?: string;
  email?: string;
  records?: RecordRow[];
  error?: string;
};

export default function PortalClient() {
  const [email, setEmail] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [data, setData] = useState<PortalResponse | null>(null);
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const records = data?.records ?? [];
  const selectedFields = selected
    ? Object.entries(selected).filter(([, value]) => String(value ?? "").trim() !== "")
    : [];

  async function enterPortal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = (await response.json()) as PortalResponse;
      if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo abrir el portal.");
      setCurrentEmail(result.email || email.trim().toLowerCase());
      setData(result);
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : "No se pudo abrir el portal.");
    } finally {
      setLoading(false);
    }
  }

  function changeEmail() {
    setCurrentEmail("");
    setData(null);
    setSelected(null);
    setError("");
  }

  async function deleteRecord() {
    const id = String(selected?.["ID registro"] || "");
    if (!id || !window.confirm("¿Quieres borrar este lead? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    setError("");
    try {
      const response = await fetch("/api/portal", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentEmail, id }),
      });
      const result = (await response.json()) as PortalResponse;
      if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo borrar el registro.");
      setData((previous) => previous ? {
        ...previous,
        records: (previous.records || []).filter((row) => String(row["ID registro"]) !== id),
      } : previous);
      setSelected(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo borrar el registro.");
    } finally {
      setDeletingId("");
    }
  }

  if (!data?.ok) {
    return (
      <main className="access">
        <section className="access-card">
          <a className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></a>
          <p className="eyebrow">PORTAL DE CONFIGURACIÓN</p>
          <h1>Ingresa tu correo</h1>
          <p className="intro">Escribe el correo autorizado en la pestaña Accesos de la hoja de cálculo.</p>
          <form className="access-form" onSubmit={enterPortal}>
            <label className="input">
              <span>Correo autorizado</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.com" autoComplete="email" required />
            </label>
            <button className="primary access-button" type="submit" disabled={loading}>
              {loading ? "Verificando…" : "Entrar al portal →"}
            </button>
          </form>
          {error && <p className="access-error" role="alert">{error}</p>}
          <p className="access-note">¿Necesitas registrar una empresa? <a href="/">Abre el formulario público.</a></p>
        </section>
      </main>
    );
  }

  return (
    <main className="portal">
      <header className="portal-header">
        <a className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></a>
          <div className="viewer"><span>{data.role || "Usuario autorizado"}</span><small>{currentEmail}</small><button className="link-button" type="button" onClick={changeEmail}>Cambiar correo</button></div>
      </header>
      <section className="portal-body">
        <p className="eyebrow">PORTAL DE CONFIGURACIÓN</p>
        <h1>Empresas registradas</h1>
        <p className="intro">Consulta la información recibida y abre un registro para ver todos sus datos.</p>
        <div className="portal-stats">
          <div><b>{records.length}</b><span>Registros recibidos</span></div>
          <div><b>{records.filter((row) => row["Estado"] === "Listo para GHL").length}</b><span>Listos para GoHighLevel</span></div>
          <div><b>{data.role}</b><span>Tu acceso</span></div>
        </div>
        <div className="record-list">
          {records.length === 0 ? <div className="portal-state">Todavía no hay formularios enviados.<br /><a className="primary" href="/">Abrir formulario de registro →</a></div> : records.map((row, index) => (
            <button type="button" className="record record-button" key={`${String(row["ID registro"])}-${index}`} onClick={() => setSelected(row)}>
              <div><p className="record-id">{String(row["ID registro"] || "Nuevo registro")}</p><h2>{String(row["Empresa"] || "Empresa sin nombre")}</h2><p>{String(row["Servicio prioritario"] || "Servicio pendiente")} · {String(row["Público"] || "Público pendiente")}</p></div>
              <div className="record-meta"><span className={row["Estado"] === "Activo" ? "tag active" : "tag"}>{String(row["Estado"] || "Nuevo")}</span><span>{String(row["Email responsable"] || "Sin correo")}</span><span>{String(row["Fecha lanzamiento"] || "Sin fecha")}</span></div>
            </button>
          ))}
        </div>
        {selected && <section className="detail-card">
          <div className="detail-heading">
            <div><p className="eyebrow">DATOS COMPLETOS</p><h2>{String(selected["Empresa"] || "Registro")}</h2></div>
            <div className="detail-actions"><button type="button" className="secondary" onClick={() => setSelected(null)}>Cerrar</button><button type="button" className="danger" onClick={deleteRecord} disabled={Boolean(deletingId)}>{deletingId ? "Borrando…" : "Borrar lead"}</button></div>
          </div>
          {error && <p className="delete-error" role="alert">{error}</p>}
          <div className="detail-section"><div className="detail-grid">{selectedFields.map(([label, value]) => <div key={label}><b>{label}</b><span>{String(value)}</span></div>)}</div></div>
        </section>}
      </section>
    </main>
  );
}
