"use client";

import { createContext, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from "react";

type FormState = Record<string, string | string[] | boolean>;

const steps = [
  ["Empresa", "Identidad y datos básicos"],
  ["Oferta", "Servicios y público ideal"],
  ["Captación", "Canales y proceso comercial"],
  ["Equipo", "Calendarios y comunicación"],
  ["Automatización", "Herramientas y flujos"],
  ["Revisión", "Lanzamiento y autorización"],
];

const initial: FormState = { audience: ["B2B"], services: [], sectors: [], geographies: ["España"], channels: [], leadFields: ["Nombre", "Email", "Empresa"], integrations: [], objectives: [], automations: [], terms: false, accuracy: false };

const options = {
  audience: ["B2B", "B2C", "B2B + B2C"],
  services: ["Vídeo corporativo", "Publicidad / spots", "Contenido para redes", "Fotografía", "Streaming / eventos", "Motion graphics", "Podcast", "Otro"],
  sectors: ["Tecnología", "Salud", "Industria", "Inmobiliario", "Retail / e-commerce", "Hostelería", "Educación", "Servicios profesionales", "Otro"],
  geographies: ["España", "Portugal", "Europa", "Latinoamérica", "Global"],
  channels: ["Web", "Landing pages", "Instagram", "LinkedIn", "WhatsApp", "Llamadas", "Referidos", "Meta Ads", "Google Ads", "Email outbound"],
  leadFields: ["Nombre", "Empresa", "Email", "Teléfono", "Servicio de interés", "Presupuesto", "Fecha prevista", "Descripción del proyecto"],
  objectives: ["Centralizar contactos", "Aumentar reuniones", "Captar clientes B2B", "Captar clientes B2C", "Automatizar seguimiento", "Recuperar contactos", "Medir ventas"],
  automations: ["Confirmación de lead", "Aviso interno", "Asignación automática", "Seguimiento sin respuesta", "Confirmación de cita", "Seguimiento de propuesta", "Solicitud de reseña", "Reactivación"],
  integrations: ["Google Calendar", "Gmail / Google Workspace", "WhatsApp", "Meta Ads", "Stripe", "Zoom", "Slack", "WordPress", "Shopify", "Notion", "Google Sheets"],
};
const toolOptions = ["Google Calendar", "Gmail / Google Workspace", "WhatsApp", "Meta Ads", "Stripe", "Zoom", "Slack", "WordPress", "Shopify", "Notion", "CRM actual", "Otra"];
const workflowOptions = ["Nuevo lead", "Asignación de leads", "Seguimiento sin respuesta", "Confirmación de cita", "Seguimiento de propuesta", "Solicitud de reseña", "Reactivación"];
const whatsappOptions = ["Confirmación inmediata", "Recordatorio de cita", "Seguimiento comercial", "Reactivación", "Atención postventa"];
const emailOptions = ["Email de bienvenida", "Secuencia de seguimiento", "Confirmación de cita", "Propuesta enviada", "Solicitud de reseña", "Newsletter"];
const adOptions = ["No gestionamos anuncios", "Meta Ads", "Google Ads", "YouTube Ads", "LinkedIn Ads", "TikTok Ads"];
const fontOptions = ["Inter", "Montserrat", "Poppins", "Roboto", "Lato", "Open Sans", "Raleway", "Playfair Display", "Merriweather", "DM Sans", "Manrope", "Archivo"];
const requiredByStep = [
  ["companyName","legalName","website","activity","location","teamSize","description","brandColor","logoUrl","formality"],
  ["mainService","ticket","priceModel","services","audience","sectors","geographies","idealCompanySize","decisionMaker","minimumBudget"],
  ["objectives","channels","leadFields","additionalLeadQuestions","responseTime","assignment","salesCycle","qualification"],
  ["contactName","contactRole","contactEmail","contactPhone","bookingName","meetingDuration","availability","schedule","pronoun"],
  ["toolsInUse","toolsToConnect","workflowAutomations","whatsappAutomations","emailAutomations","adPlatforms","adAccess","adMeeting","exceptions"],
  ["launchDate","approvalOwner","accuracy","terms"],
];
const labels: Record<string,string> = { additionalLeadQuestions:"Preguntas adicionales para tus clientes", driveAssetsUrl:"Carpeta de recursos en Google Drive", brandPrimaryColor:"Color corporativo primario", brandSecondaryColor:"Color corporativo secundario", headingFont:"Tipografía de títulos", bodyFont:"Tipografía de textos", description:"Descripción breve", qualification:"Criterio de cualificación", exceptions:"Excepciones o integraciones adicionales", accuracy:"Confirmación de datos", terms:"Autorización" };

function asArray(value: FormState[string]) { return Array.isArray(value) ? value : []; }

const FieldContext = createContext<{ data: FormState; setValue: (key: string, value: string | boolean) => void; toggle: (key: string, item: string) => void } | null>(null);

function Text({ field, label, placeholder, required = false }: { field: string; label: string; placeholder?: string; required?: boolean }) {
  const context = useContext(FieldContext);
  if (!context) return null;
  return <label className="input"><span>{label} *</span><input required value={String(context.data[field] ?? "")} onChange={(e) => context.setValue(field, e.target.value)} placeholder={placeholder} /></label>;
}

function Select({ field, label, items }: { field: string; label: string; items: string[] }) {
  const context = useContext(FieldContext);
  if (!context) return null;
  if (["communicationTone", "existingGhl", "sheets"].includes(field)) return null;
  return <label className="input"><span>{label} *</span><select required value={String(context.data[field] ?? "")} onChange={(e) => context.setValue(field, e.target.value)}><option value="">Selecciona una opción</option>{items.map((item) => <option key={item}>{item}</option>)}</select></label>;
}

function Multi({ field, title, items }: { field: string; title: string; items: string[] }) {
  const context = useContext(FieldContext);
  if (!context || ["automations", "integrations"].includes(field)) return null;
  return <section className="field-group"><label>{title}</label><div className="chips">{items.map((item) => <button type="button" className={asArray(context.data[field]).includes(item) ? "chip active" : "chip"} key={item} onClick={() => context.toggle(field, item)}>{item}</button>)}</div></section>;
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "sent" | "error">("idle");
  const [draftReady, setDraftReady] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    const draft = localStorage.getItem("focus-productora-draft");
    if (draft) setData({ ...initial, ...JSON.parse(draft) });
    setDraftReady(true);
  }, []);

  useEffect(() => { if (draftReady) localStorage.setItem("focus-productora-draft", JSON.stringify(data)); }, [data, draftReady]);

  const completion = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);
  const setValue = useCallback((key: string, value: string | boolean) => setData((prev) => ({ ...prev, [key]: value })), []);
  const toggle = useCallback((key: string, item: string) => setData((prev) => {
    const values = asArray(prev[key]);
    return { ...prev, [key]: values.includes(item) ? values.filter((v) => v !== item) : [...values, item] };
  }), []);
  const validate = (index: number) => { const absent = requiredByStep[index].filter((key) => { const value = data[key]; return Array.isArray(value) ? value.length === 0 : !value; }); setMissing(absent); return absent.length === 0; };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate(5)) return setStatus("error");
    setStatus("saving");
    const payload = { ...data, submittedAt: new Date().toISOString(), source: "focus-productora-onboarding" };
    localStorage.setItem("focus-productora-last-submission", JSON.stringify(payload));
    try {
      const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("No se pudo enviar");
      localStorage.removeItem("focus-productora-draft");
      setStatus("sent");
    } catch { setStatus("error"); }
  }

  return <FieldContext.Provider value={{ data, setValue, toggle }}><main>
    <aside className="sidebar"><a className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></a><p className="eyebrow">CONFIGURACIÓN INICIAL</p><nav>{steps.map(([name, detail], index) => <button type="button" key={name} className={index === step ? "nav-step current" : "nav-step"} onClick={() => setStep(index)}><b>{String(index + 1).padStart(2, "0")}</b><span>{name}<small>{detail}</small></span></button>)}</nav><div className="help"><strong>¿Necesitas ayuda?</strong><p>Guardamos tu avance automáticamente.</p><a href="mailto:hola@focusbusiness.es">Contactar soporte →</a></div></aside>
    <section className="content"><header><div><p className="eyebrow">PASO {step + 1} DE {steps.length}</p><div className="progress"><i style={{ width: `${completion}%` }} /></div></div></header>
      <form onSubmit={submit} onClickCapture={(event) => { if ((event.target as HTMLElement).textContent?.includes("Continuar") && !validate(step)) event.stopPropagation(); }} className="card">
        {step === 2 && <section className="field-group additional-questions"><label>Preguntas adicionales para tus clientes B2B o B2C *</label><p className="intro">Escribe las preguntas concretas que quieres incluir en los formularios de captación. Por ejemplo: “¿Cuál es el objetivo de la campaña?”, “¿Cuál es el presupuesto disponible?” o “¿Para cuándo necesitas el proyecto?”.</p><textarea required value={String(data.additionalLeadQuestions ?? "")} onChange={(e) => setValue("additionalLeadQuestions", e.target.value)} placeholder="Escribe una pregunta por línea…" /></section>}
        {step === 4 && <><Multi field="toolsInUse" title="Herramientas que ya utilizáis" items={toolOptions} /><Multi field="toolsToConnect" title="Herramientas que queréis conectar" items={toolOptions} /><Multi field="workflowAutomations" title="Automatizaciones de workflow" items={workflowOptions} /><Multi field="whatsappAutomations" title="Automatizaciones de WhatsApp" items={whatsappOptions} /><Multi field="emailAutomations" title="Automatizaciones de email" items={emailOptions} /><Multi field="adPlatforms" title="Gestión de anuncios" items={adOptions} /><div className="grid two"><Select field="adAccess" label="Acceso al portfolio comercial" items={["No aplica", "Tengo acceso de administrador", "Puedo invitar a Focus Business", "Necesito ayuda para localizar el acceso"]} /><Select field="adMeeting" label="Reunión de verificación de anuncios" items={["No aplica", "Sí, solicitar reunión", "Ya hay reunión programada"]} /></div></>}
        {missing.length > 0 && <div className="notice error">Completa estos campos antes de continuar: {missing.map((field) => labels[field] || field).join(", ")}.</div>}
        {step === 0 && <><h1>Empresa e identidad de marca</h1><p className="intro">Lo esencial para crear tu espacio de trabajo y personalizar las comunicaciones.</p><div className="grid three"><Text field="companyName" label="Nombre comercial" placeholder="Ej. Productora Norte" required /><Text field="legalName" label="Razón social" placeholder="Ej. Productora Norte S.L." /><Text field="website" label="Página web" placeholder="https://tudominio.com" /></div><div className="grid three"><Select field="activity" label="Actividad principal" items={["Productora audiovisual", "Agencia creativa", "Estudio de fotografía", "Eventos", "Marketing", "Otra"]} /><Text field="location" label="Ciudad / país principal" placeholder="Madrid, España" /><Select field="teamSize" label="Tamaño del equipo" items={["Solo/a", "2–5", "6–10", "11–25", "26–50", "+50"]} /></div><label className="input full"><span>Descripción breve</span><textarea value={String(data.description ?? "")} onChange={(e) => setValue("description", e.target.value)} placeholder="Qué hacéis, qué os diferencia y qué tipo de proyectos buscáis." /></label><section className="brand-color"><div><span className="color-label">Color corporativo</span><p>Elige un color visualmente o escribe su código hexadecimal.</p></div><div className="color-controls"><label className="color-picker" aria-label="Elegir color corporativo"><input type="color" value={/^#[0-9a-fA-F]{6}$/.test(String(data.brandColor ?? "")) ? String(data.brandColor) : "#D4AF37"} onChange={(e) => setValue("brandColor", e.target.value.toUpperCase())} /><i style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(String(data.brandColor ?? "")) ? String(data.brandColor) : "#D4AF37" }} /></label><Text field="brandColor" label="Código de color" placeholder="#D4AF37" /></div></section><div className="grid two"><Text field="logoUrl" label="Enlace al logo (opcional)" placeholder="https://..." /><Select field="formality" label="Tono de marca" items={["Cercano", "Profesional", "Directo", "Premium"]} /></div></>}
        {step === 1 && <><h1>Oferta y cliente ideal</h1><p className="intro">Define qué vendes, a quién y qué oportunidades merece la pena priorizar.</p><div className="grid three"><Text field="mainService" label="Servicio prioritario" placeholder="Ej. Producción audiovisual" required /><Select field="ticket" label="Ticket medio" items={["< 1.000 €", "1.000–3.000 €", "3.000–8.000 €", "8.000–20.000 €", "+20.000 €"]} /><Select field="priceModel" label="Modelo de precio" items={["Presupuesto personalizado", "Precio cerrado", "Retainer mensual", "Suscripción", "Comisión"]} /></div><Multi field="services" title="Servicios que quieres impulsar" items={options.services} /><Multi field="audience" title="¿A qué público vendes?" items={options.audience} /><div className="grid three"><Multi field="sectors" title="Sectores prioritarios" items={options.sectors} /><Multi field="geographies" title="Mercados prioritarios" items={options.geographies} /><Select field="idealCompanySize" label="Tamaño ideal (B2B)" items={["Autónomos", "1–10 empleados", "11–50 empleados", "51–200 empleados", "201–1.000 empleados", "+1.000 empleados"]} /></div><div className="grid two"><Text field="decisionMaker" label="Decisor habitual" placeholder="Ej. Dirección de marketing" /><Text field="minimumBudget" label="Presupuesto mínimo deseado" placeholder="Ej. 3.000 €" /></div></>}
        {step === 2 && <><h1>Captación y proceso comercial</h1><p className="intro">Así convertiremos cada contacto en una oportunidad ordenada y medible.</p><Multi field="objectives" title="Objetivos prioritarios" items={options.objectives} /><Multi field="channels" title="Canales de entrada actuales o deseados" items={options.channels} /><Multi field="leadFields" title="Datos que quieres solicitar al lead" items={options.leadFields} /><div className="grid three"><Select field="responseTime" label="Tiempo máximo de respuesta" items={["5 minutos", "15 minutos", "1 hora", "4 horas", "24 horas"]} /><Select field="assignment" label="Asignación de leads" items={["Una persona", "Ronda (round robin)", "Según servicio", "Manual"]} /><Select field="salesCycle" label="Ciclo de venta habitual" items={["Menos de 1 semana", "1–2 semanas", "3–6 semanas", "Más de 6 semanas"]} /></div><label className="input full"><span>Qué debe cumplir un lead cualificado</span><textarea value={String(data.qualification ?? "")} onChange={(e) => setValue("qualification", e.target.value)} placeholder="Ej. Necesidad real, presupuesto y proyecto previsto en los próximos 90 días." /></label></>}
        {step === 3 && <><h1>Equipo, calendarios y comunicación</h1><p className="intro">Identificamos a quién avisar, quién atiende las reuniones y cómo hablar con cada lead.</p><div className="grid three"><Text field="contactName" label="Persona responsable" placeholder="Nombre y apellidos" required /><Text field="contactRole" label="Cargo" placeholder="Ej. Dirección comercial" /><Text field="contactEmail" label="Correo electrónico" placeholder="email@empresa.com" required /></div><div className="grid three"><Text field="contactPhone" label="Teléfono / WhatsApp" placeholder="+34 ..." /><Text field="bookingName" label="Nombre de la reunión" placeholder="Ej. Reunión de diagnóstico" /><Select field="meetingDuration" label="Duración" items={["15 minutos", "30 minutos", "45 minutos", "60 minutos"]} /></div><div className="grid three"><Select field="availability" label="Días disponibles" items={["Lunes–viernes", "Lunes–jueves", "Todos los días", "Variable"]} /><Text field="schedule" label="Horario de atención" placeholder="09:00–18:00" /><Select field="pronoun" label="Tratamiento" items={["Tú", "Usted", "Indiferente"]} /></div><Select field="communicationTone" label="Tono de comunicación" items={["Cercano", "Profesional", "Directo", "Premium"]} /></>}
        {step === 4 && <><h1>Automatizaciones e integraciones</h1><p className="intro">Selecciona lo que quieres poner en marcha desde el inicio. Podrás ampliar el sistema después.</p><Multi field="automations" title="Automatizaciones necesarias" items={options.automations} /><Multi field="integrations" title="Herramientas que ya utilizáis o queréis conectar" items={options.integrations} /><div className="grid two"><Select field="existingGhl" label="¿Tenéis ya cuenta de GoHighLevel?" items={["No", "Sí, cuenta propia", "Sí, subcuenta", "No lo sé"]} /><Select field="sheets" label="Registro en Google Sheets" items={["Sí, hoja nueva", "Sí, hoja existente", "No, más adelante"]} /></div><label className="input full"><span>Excepciones o integraciones adicionales</span><textarea value={String(data.exceptions ?? "")} onChange={(e) => setValue("exceptions", e.target.value)} placeholder="Cuéntanos cualquier ajuste, excepción o herramienta que debamos considerar." /></label></>}
        {step === 5 && <><h1>Revisión y lanzamiento</h1><p className="intro">Antes de enviar, confirma la información para preparar tu cuenta y el plan de activación.</p><div className="summary"><p><b>Empresa</b>{String(data.companyName || "Pendiente")}</p><p><b>Oferta principal</b>{String(data.mainService || "Pendiente")}</p><p><b>Público</b>{asArray(data.audience).join(", ") || "Pendiente"}</p><p><b>Canales</b>{asArray(data.channels).join(", ") || "Pendiente"}</p><p><b>Integraciones</b>{asArray(data.integrations).join(", ") || "Pendiente"}</p></div><div className="grid two"><Text field="launchDate" label="Fecha objetivo de lanzamiento" placeholder="Ej. 15/09/2026" /><Text field="approvalOwner" label="Responsable de aprobación" placeholder="Nombre y cargo" /></div><label className="check"><input type="checkbox" checked={Boolean(data.accuracy)} onChange={(e) => setValue("accuracy", e.target.checked)} /> Confirmo que los datos facilitados son correctos.</label><label className="check"><input type="checkbox" checked={Boolean(data.terms)} onChange={(e) => setValue("terms", e.target.checked)} /> Autorizo el uso de estos datos para configurar la cuenta y sus automatizaciones.</label>{status === "sent" && <div className="notice success">Configuración enviada correctamente. Nuestro equipo revisará los datos para iniciar la activación.</div>}{status === "error" && <div className="notice error">Confirma las dos autorizaciones y vuelve a intentarlo. Si el envío sigue fallando, el borrador permanece guardado en este dispositivo.</div>}</>}
        <footer><button type="button" className="secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>← Anterior</button>{step < steps.length - 1 ? <button type="button" className="primary" onClick={() => setStep(step + 1)}>Continuar →</button> : <button className="primary" type="submit" disabled={status === "saving"}>{status === "saving" ? "Enviando…" : "Enviar configuración →"}</button>}</footer>
      </form>
    </section>
  </main></FieldContext.Provider>;
}
