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

const detailGroups = [
  {
    step: "REG",
    title: "Datos del registro",
    description: "Identificación y estado dentro del portal.",
    fields: ["ID registro", "Fecha envío", "Estado"],
  },
  {
    step: "01",
    title: "Empresa e identidad de marca",
    description: "Datos generales, recursos visuales, colores y tipografías.",
    fields: ["Empresa", "Razón social", "Web", "Actividad", "Ciudad / país", "Tamaño equipo", "Descripción", "Recursos Drive", "Color corporativo primario", "Color corporativo secundario", "Tipografía títulos", "Tipografía textos"],
  },
  {
    step: "02",
    title: "Oferta y cliente ideal",
    description: "Servicios, precios, público, sectores y mercados prioritarios.",
    fields: ["Servicio prioritario", "Ticket medio", "Modelo de precio", "Servicios", "Público", "Sectores", "Mercados", "Tamaño empresa ideal", "Decisor habitual", "Presupuesto mínimo"],
  },
  {
    step: "03",
    title: "Captación y proceso comercial",
    description: "Canales, información del contacto y reglas de seguimiento.",
    fields: ["Objetivos", "Canales", "Campos del lead", "Preguntas adicionales", "Tiempo de respuesta", "Asignación de leads", "Ciclo de venta", "Criterio de cualificación"],
  },
  {
    step: "04",
    title: "Equipo, calendarios y comunicación",
    description: "Responsable, reuniones, disponibilidad y tono de comunicación.",
    fields: ["Responsable", "Cargo", "Email responsable", "Teléfono / WhatsApp", "Nombre reunión", "Duración reunión", "Disponibilidad", "Horario", "Tratamiento", "Tono comunicación"],
  },
  {
    step: "05",
    title: "Automatizaciones e integraciones",
    description: "Herramientas, flujos automáticos, mensajes y anuncios.",
    fields: ["Herramientas actuales", "Herramientas a conectar", "Automatizaciones workflow", "Automatizaciones WhatsApp", "Automatizaciones email", "Plataformas anuncios", "Acceso anuncios", "Reunión anuncios", "Automatizaciones", "Integraciones", "Excepciones"],
  },
  {
    step: "06",
    title: "Revisión y lanzamiento",
    description: "Confirmaciones, fecha objetivo y persona responsable de aprobar.",
    fields: ["Fecha lanzamiento", "Responsable aprobación", "Datos correctos", "Autorización"],
  },
  {
    step: "INT",
    title: "Gestión interna",
    description: "Información operativa añadida durante la configuración.",
    fields: ["Cuenta GoHighLevel", "Google Sheets", "Subcuenta GHL", "Config. técnica URL", "Notas internas"],
  },
] as const;

export default function PortalClient() {
  const [email, setEmail] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [data, setData] = useState<PortalResponse | null>(null);
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [error, setError] = useState("");

  const records = data?.records ?? [];
  const selectedGroups = selected ? detailGroups.map((group) => ({
    ...group,
    values: group.fields
      .map((label) => ({ label, value: String(selected[label] ?? "").trim() }))
      .filter(({ value }) => value !== ""),
  })).filter((group) => group.step === "REG" || /^\d/.test(group.step) || group.values.length > 0) : [];

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
    setCopiedField("");
    setError("");
  }

  async function copyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      window.setTimeout(() => setCopiedField((current) => current === key ? "" : current), 1600);
    } catch {
      setError("No se pudo copiar la respuesta. Selecciona el texto y cópialo manualmente.");
    }
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
            <label className="input"><span>Correo autorizado</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.com" autoComplete="email" required /></label>
            <button className="primary access-button" type="submit" disabled={loading}>{loading ? "Verificando…" : "Entrar al portal →"}</button>
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
        <div className="viewer">
          <div><strong>{data.role || "Administrador"}</strong><small>{currentEmail}</small></div>
          <button className="link-button" type="button" onClick={changeEmail}>Cambiar correo</button>
        </div>
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
            <button type="button" className="record record-button" key={`${String(row["ID registro"])}-${index}`} onClick={() => { setSelected(row); setCopiedField(""); setError(""); }}>
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
          <p className="copy-status" aria-live="polite">{copiedField ? "Respuesta copiada." : ""}</p>
          <div className="detail-groups">
            {selectedGroups.map((group) => <section className="detail-group" key={group.title}>
              <div className="detail-group-heading"><span className="detail-step">{group.step}</span><div><h3>{group.title}</h3><p>{group.description}</p></div></div>
              <div className="detail-fields">
                {group.values.length === 0 && <p className="detail-empty">No se registraron respuestas en este bloque.</p>}
                {group.values.map(({ label, value }) => {
                  const copyKey = `${group.step}-${label}`;
                  return <article className="detail-field" key={label}><div><b>{label}</b><span>{value}</span></div><button type="button" className="copy-button" aria-label={`Copiar ${label}`} onClick={() => copyValue(copyKey, value)}>{copiedField === copyKey ? "Copiado ✓" : "Copiar"}</button></article>;
                })}
              </div>
            </section>)}
          </div>
        </section>}
      </section>
    </main>
  );
}
