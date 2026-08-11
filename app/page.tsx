"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { createContext, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from "react";

type FormState = Record<string, string | string[] | boolean>;
type FormErrors = Record<string, string>;

const steps = [
  ["Empresa", "Identidad y datos básicos"],
  ["Oferta", "Servicios y público ideal"],
  ["Captación", "Canales y proceso comercial"],
  ["Equipo", "Calendarios y comunicación"],
  ["Automatización", "Herramientas y flujos"],
  ["Revisión", "Lanzamiento y autorización"],
];

const helpByStep = [
  {
    title: "Ayuda sobre empresa e identidad",
    items: [
      ["Requerido para crear la subcuenta", "Nombre legal y comercial, propietario, contacto principal, email y teléfono corporativos, web, dirección, país, ciudad, zona horaria e idioma permiten preparar correctamente la futura subcuenta."],
      ["Recomendado para personalizarla", "Logo, recursos de marca, colores, tipografías, redes y dominio o subdominio deseado ayudan a personalizarla; no son credenciales."],
      ["Seguridad", "No escribas contraseñas, claves API, códigos de acceso ni datos bancarios. Este formulario no crea ni conecta la subcuenta."],
      ["Actividad, ubicación y equipo", "Indica a qué se dedica la empresa, dónde trabaja principalmente y cuántas personas forman el equipo."],
      ["Descripción", "Resume qué hace la empresa, qué la diferencia y qué proyectos quiere conseguir."],
      ["Carpeta de recursos", "Comparte una carpeta de Google Drive con logos, fotografías, vídeos, documentos y referencias visuales."],
      ["Colores y tipografías", "Escribe los colores corporativos y las fuentes que debemos usar para mantener la identidad de marca."],
    ],
  },
  {
    title: "Ayuda sobre oferta y cliente ideal",
    items: [
      ["Servicio, precio y forma de cobro", "Indica el servicio principal, el importe medio de una venta y cómo sueles presupuestar o cobrar."],
      ["Servicios que quieres impulsar", "Selecciona los servicios que quieres vender más. Si eliges Otro, escribe cuál es."],
      ["Por qué te lo pedimos", "Estos datos configuran la prueba y las búsquedas del dashboard. Una definición precisa mejora la relevancia, pero no garantiza resultados."],
      ["Público, sectores y tipo de cliente", "Define con detalle qué empresas quieres captar. Ejemplo: empresas privadas B2B de salud y tecnología con equipo de marketing."],
      ["Zonas y países", "Indica ciudad, región y países donde puedes prestar el servicio. Ejemplo: Madrid, Comunidad de Madrid, España y Portugal."],
      ["Cliente ideal", "Explica tamaño, decisor, presupuesto mínimo, señales deseables y exclusiones. Ejemplo: 11–50 empleados, dirección de marketing, proyectos desde 3.000 €; excluir clientes actuales."],
      ["Capacidad y experiencia", "Indica cuántos proyectos nuevos puedes asumir y comparte casos, portafolio o empresas de referencia cuando existan. Esto ayuda a evitar oportunidades que no encajen con tu capacidad real."],
    ],
  },
  {
    title: "Ayuda sobre captación y ventas",
    items: [
      ["Objetivos", "Selecciona qué quieres mejorar: más contactos, reuniones, seguimiento o medición de ventas."],
      ["Canales de entrada", "Marca por dónde llegan o quieres que lleguen los nuevos contactos: web, redes, anuncios, llamadas u otros canales."],
      ["Datos del contacto", "Elige qué información pedirás en el formulario y añade las preguntas específicas que necesites."],
      ["Tiempo para responder", "Indica cuánto tiempo puede pasar como máximo desde que llega un contacto hasta que alguien le responde."],
      ["Quién recibe cada contacto", "Elige si los contactos van siempre a la misma persona, se reparten por turnos, dependen del servicio o se asignan manualmente."],
      ["Tiempo para decidir", "Indica cuánto tarda normalmente un cliente desde el primer contacto hasta aceptar una propuesta."],
      ["Buen contacto", "Describe las condiciones mínimas para considerar que merece seguimiento comercial, por ejemplo necesidad real, presupuesto y fecha prevista."],
    ],
  },
  {
    title: "Ayuda sobre equipo y reuniones",
    items: [
      ["Persona responsable", "Es la persona que recibirá avisos y coordinará la configuración."],
      ["Datos de contacto", "Añade su cargo, correo y teléfono o WhatsApp de trabajo."],
      ["Reuniones", "Define cómo se llamará la cita, cuánto durará y qué días y horarios están disponibles."],
      ["Tratamiento", "Indica si los mensajes deben hablar de tú, de usted o si cualquiera de las dos opciones es válida."],
    ],
  },
  {
    title: "Ayuda sobre automatizaciones",
    items: [
      ["Herramientas actuales", "Marca las aplicaciones que ya utiliza la empresa."],
      ["Herramientas a conectar", "Selecciona las aplicaciones que quieres integrar con el nuevo sistema."],
      ["Flujos automáticos", "Elige qué acciones deben ejecutarse solas cuando llega un contacto, se agenda una cita o se envía una propuesta."],
      ["WhatsApp y email", "Selecciona qué confirmaciones, recordatorios y seguimientos quieres enviar por cada canal."],
      ["Anuncios", "Indica las plataformas publicitarias, el nivel de acceso disponible y si necesitas una reunión de verificación."],
      ["Excepciones", "Escribe cualquier requisito, herramienta o situación que no esté contemplada en las opciones anteriores."],
    ],
  },
  {
    title: "Ayuda sobre revisión y lanzamiento",
    items: [
      ["Resumen", "Comprueba que la empresa, la oferta, el público, los canales y las conexiones seleccionadas son correctos."],
      ["Fecha objetivo", "Indica cuándo te gustaría tener la configuración preparada para empezar."],
      ["Responsable de aprobación", "Es la persona que revisará y dará el visto bueno final."],
      ["Confirmaciones", "Debes confirmar que los datos son correctos y autorizar su uso para preparar la cuenta."],
    ],
  },
] as const;

const initial: FormState = { audience: ["B2B"], services: [], sectors: [], geographies: ["España"], targetCountries: ["España"], targetClientTypes: [], channels: [], leadFields: ["Nombre", "Email", "Empresa"], integrations: [], objectives: [], automations: [], terms: false, accuracy: false, ghlPreparationAuthorization: false };

const options = {
  audience: ["B2B", "B2C", "B2B + B2C"],
  services: ["Vídeo corporativo", "Publicidad / spots", "Contenido para redes", "Fotografía", "Streaming / eventos", "Motion graphics", "Podcast", "Otro"],
  sectors: ["Tecnología", "Salud", "Industria", "Inmobiliario", "Retail / e-commerce", "Hostelería", "Educación", "Servicios profesionales", "Otro"],
  geographies: ["España", "Portugal", "Europa", "Latinoamérica", "Global"],
  countries: ["España", "Portugal", "Francia", "Italia", "Alemania", "Reino Unido", "México", "Colombia", "Chile", "Argentina", "Estados Unidos", "Otro"],
  clientTypes: ["Empresa privada B2B", "Empresa B2C", "Agencia", "Marca con equipo de marketing", "Institución pública", "Startup", "Pyme", "Gran empresa", "Otro"],
  channels: ["Web", "Landing pages", "Instagram", "LinkedIn", "WhatsApp", "Llamadas", "Referidos", "Meta Ads", "Google Ads", "Email outbound"],
  leadFields: ["Nombre", "Empresa", "Email", "Teléfono", "Servicio de interés", "Presupuesto", "Fecha prevista", "Descripción del proyecto"],
  objectives: ["Centralizar contactos", "Aumentar reuniones", "Captar clientes B2B", "Captar clientes B2C", "Automatizar seguimiento", "Recuperar contactos", "Medir ventas"],
  automations: ["Confirmación de lead", "Aviso interno", "Asignación automática", "Seguimiento sin respuesta", "Confirmación de cita", "Seguimiento de propuesta", "Solicitud de reseña", "Reactivación"],
  integrations: ["Google Calendar", "Gmail / Google Workspace", "WhatsApp", "Meta Ads", "Stripe", "Zoom", "Slack", "WordPress", "Shopify", "Notion", "Google Sheets"],
};
const toolOptions = ["Google Calendar", "Gmail / Google Workspace", "Google Authenticator", "Google Meet", "WhatsApp", "Telegram", "Meta Ads", "CRM actual"];
const workflowOptions = ["Nuevo lead", "Asignación de leads", "Seguimiento sin respuesta", "Confirmación de cita", "Seguimiento de propuesta", "Solicitud de reseña", "Reactivación"];
const whatsappOptions = ["Confirmación inmediata", "Recordatorio de cita", "Seguimiento comercial", "Reactivación", "Atención postventa"];
const emailOptions = ["Email de bienvenida", "Secuencia de seguimiento", "Confirmación de cita", "Propuesta enviada", "Solicitud de reseña"];
const adOptions = ["No gestionamos anuncios", "Meta Ads", "Google Ads", "YouTube Ads", "LinkedIn Ads", "TikTok Ads"];
const fontOptions = ["Inter", "Montserrat", "Poppins", "Roboto", "Lato", "Open Sans", "Raleway", "Playfair Display", "Merriweather", "DM Sans", "Manrope", "Archivo"];
const requiredByStep = [
  ["companyName","legalName","ownerName","businessEmail","contactPhone","website","activity","location","legalAddress","legalCity","legalCountry","timezone","primaryLanguage","teamSize","description","billingLegalName","billingTaxId","billingAddress","billingEmail"],
  ["mainService","ticket","priceModel","monthlyCapacity","services","audience","sectors","geographies","targetCity","targetRegion","targetCountries","targetClientTypes","idealCompanySize","idealProfileDetail","decisionMaker","minimumBudget","prospectExclusions","prospectPreferences"],
  ["objectives","channels","leadFields","additionalLeadQuestions","responseTime","assignment","salesCycle","qualification"],
  ["contactName","contactRole","contactEmail","contactPhone","initialTeamRoles","bookingName","meetingDuration","availability","schedule","pronoun"],
  ["toolsInUse","toolsToConnect","workflowAutomations","whatsappAutomations","emailAutomations","adPlatforms","adAccess","adMeeting","exceptions"],
  ["launchDate","approvalOwner","accuracy","terms","ghlPreparationAuthorization"],
];
const labels: Record<string,string> = {
  companyName:"Nombre comercial", legalName:"Razón social", ownerName:"Propietario o representante", businessEmail:"Email corporativo", website:"Página web", activity:"Actividad principal", location:"Ciudad / país principal", legalAddress:"Dirección comercial/legal", legalCity:"Ciudad legal", legalCountry:"País legal", timezone:"Zona horaria", primaryLanguage:"Idioma principal", teamSize:"Tamaño del equipo", description:"Descripción breve", billingLegalName:"Nombre de facturación", billingTaxId:"NIF/CIF fiscal", billingAddress:"Dirección de facturación", billingEmail:"Email de facturación",
  driveAssetsUrl:"Carpeta de recursos en Google Drive", brandPrimaryColor:"Color corporativo primario", brandSecondaryColor:"Color corporativo secundario", headingFont:"Tipografía de títulos", bodyFont:"Tipografía de textos",
  mainService:"Servicio prioritario", ticket:"Ticket medio", priceModel:"Modelo de precio", monthlyCapacity:"Capacidad mensual", portfolioHighlights:"Casos de éxito o portafolio", referenceCompanies:"Empresas de referencia", services:"Servicios que quieres impulsar", audience:"Público", sectors:"Sectores prioritarios", geographies:"Mercados prioritarios", targetCity:"Ciudad objetivo", targetRegion:"Región objetivo", targetCountries:"Países objetivo", targetClientTypes:"Tipos de cliente objetivo", idealCompanySize:"Tamaño ideal (B2B)", idealProfileDetail:"Perfil ideal detallado", decisionMaker:"Persona que suele decidir la compra", minimumBudget:"Presupuesto mínimo deseado", prospectExclusions:"Exclusiones de prospección", prospectPreferences:"Preferencias y criterios de búsqueda", servicesOther:"Otro servicio", sectorsOther:"Otro sector", targetCountriesOther:"Otro país", targetClientTypesOther:"Otro tipo de cliente",
  objectives:"Objetivos prioritarios", channels:"Canales de entrada", leadFields:"Datos que quieres pedir", additionalLeadQuestions:"Preguntas adicionales para tus clientes", responseTime:"Tiempo máximo de respuesta", assignment:"Persona que recibe cada contacto", salesCycle:"Tiempo habitual para decidir", qualification:"Condiciones de un buen contacto",
  contactName:"Persona responsable", contactRole:"Cargo", contactEmail:"Correo electrónico", contactPhone:"Teléfono / WhatsApp", initialTeamRoles:"Equipo y roles iniciales", companySocialLinks:"Redes sociales de la empresa", desiredDomain:"Dominio o subdominio deseado", bookingName:"Nombre de la reunión", meetingDuration:"Duración", availability:"Días disponibles", schedule:"Horario de atención", pronoun:"Tratamiento",
  toolsInUse:"Herramientas que usan actualmente", toolsToConnect:"Herramientas que quieren conectar", workflowAutomations:"Automatizaciones del flujo de trabajo", whatsappAutomations:"Automatizaciones de WhatsApp", emailAutomations:"Automatizaciones de correo", adPlatforms:"Gestión de anuncios", adAccess:"Acceso a las cuentas publicitarias", adMeeting:"Reunión para verificar los anuncios", exceptions:"Excepciones o integraciones adicionales",
  launchDate:"Fecha objetivo de lanzamiento", approvalOwner:"Responsable de aprobación", accuracy:"Confirmación de datos", terms:"Autorización", ghlPreparationAuthorization:"Autorización para preparar la subcuenta",
};

function asArray(value: FormState[string]) { return Array.isArray(value) ? value : []; }

const FieldContext = createContext<{ data: FormState; errors: FormErrors; setValue: (key: string, value: string | boolean) => void; toggle: (key: string, item: string) => void } | null>(null);

function ErrorMessage({ field }: { field: string }) {
  const context = useContext(FieldContext);
  const error = context?.errors[field];
  return error ? <small id={`error-${field}`} className="field-error-message" role="alert">{error}</small> : null;
}

function Text({ field, label, placeholder, required = false }: { field: string; label: string; placeholder?: string; required?: boolean }) {
  const context = useContext(FieldContext);
  if (!context) return null;
  const error = context.errors[field];
  const type = ["contactEmail", "businessEmail", "billingEmail"].includes(field) ? "email" : ["website", "driveAssetsUrl"].includes(field) ? "url" : "text";
  return <label id={`field-${field}`} className={`input${error ? " field-error" : ""}`}><span>{label}{required ? " *" : ""}</span><input type={type} required={required} value={String(context.data[field] ?? "")} onChange={(e) => context.setValue(field, e.target.value)} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined} /><ErrorMessage field={field} /></label>;
}

function ColorField({ field, label, fallback, required = false }: { field: string; label: string; fallback: string; required?: boolean }) {
  const context = useContext(FieldContext);
  if (!context) return null;
  const rawValue = String(context.data[field] ?? "");
  const colorValue = /^#[0-9a-fA-F]{6}$/.test(rawValue) ? rawValue : fallback;
  const error = context.errors[field];
  return <div id={`field-${field}`} className={`color-field${error ? " field-error" : ""}`}><span>{label}{required ? " *" : ""}</span><div className="color-controls"><label className="color-picker" aria-label={`Elegir ${label.toLowerCase()}`}><input type="color" value={colorValue} onChange={(e) => context.setValue(field, e.target.value.toUpperCase())} /><i style={{ backgroundColor: colorValue }} /></label><label className="input color-code"><span>Código hexadecimal</span><input required={required} value={rawValue} onChange={(e) => context.setValue(field, e.target.value.toUpperCase())} placeholder={fallback} pattern="#[0-9A-Fa-f]{6}" aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined} /></label></div><ErrorMessage field={field} /></div>;
}

function TextArea({ field, label, placeholder, required = false }: { field: string; label: string; placeholder?: string; required?: boolean }) {
  const context = useContext(FieldContext);
  if (!context) return null;
  const error = context.errors[field];
  return <label id={`field-${field}`} className={`input full${error ? " field-error" : ""}`}><span>{label}{required ? " *" : ""}</span><textarea required={required} value={String(context.data[field] ?? "")} onChange={(event) => context.setValue(field, event.target.value)} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined} /><ErrorMessage field={field} /></label>;
}

function FontField({ field, label, required = false }: { field: string; label: string; required?: boolean }) {
  const context = useContext(FieldContext);
  if (!context) return null;
  const error = context.errors[field];
  return <label id={`field-${field}`} className={`input${error ? " field-error" : ""}`}><span>{label}{required ? " *" : ""}</span><input required={required} list="font-options" value={String(context.data[field] ?? "")} onChange={(event) => context.setValue(field, event.target.value)} placeholder="Busca o escribe una fuente" aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined} /><ErrorMessage field={field} /></label>;
}

function Select({ field, label, items }: { field: string; label: string; items: string[] }) {
  const context = useContext(FieldContext);
  if (!context) return null;
  if (["communicationTone", "existingGhl", "sheets"].includes(field)) return null;
  const error = context.errors[field];
  return <label id={`field-${field}`} className={`input${error ? " field-error" : ""}`}><span>{label} *</span><select required value={String(context.data[field] ?? "")} onChange={(e) => context.setValue(field, e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined}><option value="">Selecciona una opción</option>{items.map((item) => <option key={item}>{item}</option>)}</select><ErrorMessage field={field} /></label>;
}

function Multi({ field, title, items, otherField, otherLabel }: { field: string; title: string; items: string[]; otherField?: string; otherLabel?: string }) {
  const context = useContext(FieldContext);
  if (!context || ["automations", "integrations"].includes(field)) return null;
  const values = asArray(context.data[field]);
  const error = context.errors[field];
  const otherError = otherField ? context.errors[otherField] : undefined;
  return <section id={`field-${field}`} className={`field-group${error ? " field-error" : ""}`}><p className="field-label">{title}</p><div className="chips" aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined}>{items.map((item) => <button type="button" className={values.includes(item) ? "chip active" : "chip"} key={item} onClick={() => context.toggle(field, item)}>{item}</button>)}</div><ErrorMessage field={field} />{otherField && values.includes("Otro") && <label id={`field-${otherField}`} className={`input other-detail${otherError ? " field-error" : ""}`}><span>{otherLabel || "Especifica otra opción"} *</span><input required value={String(context.data[otherField] ?? "")} onChange={(event) => context.setValue(otherField, event.target.value)} placeholder="Escribe aquí…" aria-invalid={Boolean(otherError)} aria-describedby={otherError ? `error-${otherField}` : undefined} /><ErrorMessage field={otherField} /></label>}</section>;
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "sent" | "error">("idle");
  const [draftReady, setDraftReady] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = localStorage.getItem("focus-productora-draft");
      if (draft) {
        try { setData({ ...initial, ...JSON.parse(draft) }); } catch { localStorage.removeItem("focus-productora-draft"); }
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { if (draftReady) localStorage.setItem("focus-productora-draft", JSON.stringify(data)); }, [data, draftReady]);

  const completion = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);
  const goToStep = useCallback((next: number) => { setStep(next); setHelpOpen(false); setFieldErrors({}); }, []);
  const clearFieldError = useCallback((key: string) => setFieldErrors((previous) => {
    if (!previous[key]) return previous;
    const next = { ...previous };
    delete next[key];
    return next;
  }), []);
  const setValue = useCallback((key: string, value: string | boolean) => {
    setData((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);
  }, [clearFieldError]);
  const toggle = useCallback((key: string, item: string) => {
    setData((prev) => {
      const values = asArray(prev[key]);
      const next = values.includes(item) ? values.filter((v) => v !== item) : [...values, item];
      const otherField = key === "services" ? "servicesOther" : key === "sectors" ? "sectorsOther" : key === "targetCountries" ? "targetCountriesOther" : key === "targetClientTypes" ? "targetClientTypesOther" : "";
      return { ...prev, [key]: next, ...(item === "Otro" && !next.includes("Otro") && otherField ? { [otherField]: "" } : {}) };
    });
    clearFieldError(key);
  }, [clearFieldError]);
  const focusField = useCallback((field: string) => {
    window.requestAnimationFrame(() => {
      const wrapper = document.getElementById(`field-${field}`);
      wrapper?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => wrapper?.querySelector<HTMLElement>("input, select, textarea, button")?.focus({ preventScroll: true }), 350);
    });
  }, []);
  const validate = (index: number) => {
    const errors: FormErrors = {};
    for (const key of requiredByStep[index]) {
      const value = data[key];
      const empty = Array.isArray(value) ? value.length === 0 : typeof value === "string" ? value.trim() === "" : !value;
      if (!empty) continue;
      if (key === "accuracy") errors[key] = "Debes confirmar que los datos son correctos.";
      else if (key === "terms") errors[key] = "Debes autorizar el uso de los datos para continuar.";
      else if (key === "ghlPreparationAuthorization") errors[key] = "Debes autorizar la preparación y validación de los datos de la futura subcuenta.";
      else errors[key] = `Falta completar “${labels[key] || key}”.`;
    }
    if (index === 1 && asArray(data.services).includes("Otro") && !String(data.servicesOther || "").trim()) errors.servicesOther = "Escribe qué otro servicio quieres impulsar.";
    if (index === 1 && asArray(data.sectors).includes("Otro") && !String(data.sectorsOther || "").trim()) errors.sectorsOther = "Escribe qué otro sector quieres priorizar.";
    if (index === 1 && asArray(data.targetCountries).includes("Otro") && !String(data.targetCountriesOther || "").trim()) errors.targetCountriesOther = "Escribe qué otro país quieres incluir.";
    if (index === 1 && asArray(data.targetClientTypes).includes("Otro") && !String(data.targetClientTypesOther || "").trim()) errors.targetClientTypesOther = "Describe el otro tipo de cliente.";

    const validUrl = (value: string) => {
      try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
    };
    const website = String(data.website || "").trim();
    const driveUrl = String(data.driveAssetsUrl || "").trim();
    const email = String(data.contactEmail || "").trim();
    const businessEmail = String(data.businessEmail || "").trim();
    const billingEmail = String(data.billingEmail || "").trim();
    const phone = String(data.contactPhone || "").trim();
    if (index === 0 && website && !validUrl(website)) errors.website = "Escribe una dirección web completa, por ejemplo https://tudominio.com.";
    if (index === 0 && driveUrl && !validUrl(driveUrl)) errors.driveAssetsUrl = "Escribe un enlace válido que comience por https://.";
    if (index === 0 && businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) errors.businessEmail = "Escribe un email corporativo válido, por ejemplo hola@empresa.com.";
    if (index === 0 && billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) errors.billingEmail = "Escribe un email de facturación válido.";
    for (const colorField of ["brandPrimaryColor", "brandSecondaryColor"]) {
      const color = String(data[colorField] || "").trim();
      if (index === 0 && color && !/^#[0-9A-Fa-f]{6}$/.test(color)) errors[colorField] = "Usa un color hexadecimal de 6 caracteres, por ejemplo #D4AF37.";
    }
    if (index === 3 && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.contactEmail = "Escribe un correo válido, por ejemplo nombre@empresa.com.";
    if (index === 3 && phone && phone.replace(/\D/g, "").length < 7) errors.contactPhone = "Escribe un teléfono válido con al menos 7 números.";

    setFieldErrors(errors);
    const firstError = Object.keys(errors)[0];
    if (firstError) focusField(firstError);
    return !firstError;
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    for (let index = 0; index < requiredByStep.length; index += 1) {
      if (!validate(index)) {
        if (index !== step) {
          setStep(index);
          window.setTimeout(() => {
            document.querySelector<HTMLElement>(".validation-summary button")?.click();
          }, 80);
        }
        return;
      }
    }
    setStatus("saving");
    const payload = { ...data, submittedAt: new Date().toISOString(), source: "focus-productora-onboarding" };
    localStorage.setItem("focus-productora-last-submission", JSON.stringify(payload));
    try {
      const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo guardar la configuración");
      localStorage.removeItem("focus-productora-draft");
      setStatus("sent");
    } catch { setStatus("error"); }
  }

  return <FieldContext.Provider value={{ data, errors: fieldErrors, setValue, toggle }}><main>
    <aside className="sidebar"><a className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></a><p className="eyebrow">CONFIGURACIÓN INICIAL</p><nav>{steps.map(([name, detail], index) => <button type="button" key={name} className={index === step ? "nav-step current" : "nav-step"} onClick={() => goToStep(index)}><b>{String(index + 1).padStart(2, "0")}</b><span>{name}<small>{detail}</small></span></button>)}</nav><div className="help"><strong>¿Necesitas ayuda?</strong><p>Guardamos tu avance automáticamente.</p><a href="mailto:hola@focusbusiness.es">Contactar soporte →</a></div></aside>
    <section className="content"><header><div><p className="eyebrow">PASO {step + 1} DE {steps.length}</p><div className="progress"><i style={{ width: `${completion}%` }} /></div></div></header>
      <form onSubmit={submit} noValidate className="card">
        <button type="button" className="info-button" aria-label={`Abrir ayuda del paso ${step + 1}`} aria-expanded={helpOpen} onClick={() => setHelpOpen((open) => !open)}>i</button>
        {helpOpen && <aside className="step-help" aria-live="polite"><div><p className="eyebrow">GUÍA DEL PASO</p><h2>{helpByStep[step].title}</h2></div><button type="button" className="help-close" aria-label="Cerrar ayuda" onClick={() => setHelpOpen(false)}>×</button><dl>{helpByStep[step].items.map(([term, explanation]) => <div key={term}><dt>{term}</dt><dd>{explanation}</dd></div>)}</dl></aside>}
        {Object.keys(fieldErrors).length > 0 && <div className="validation-summary" role="alert"><strong>Revisa los campos marcados en rojo.</strong><p>Selecciona un aviso para ir directamente al campo.</p><ul>{Object.entries(fieldErrors).map(([field, message]) => <li key={field}><button type="button" onClick={() => focusField(field)}><span>{labels[field] || field}</span><small>{message}</small></button></li>)}</ul></div>}
        {step === 2 && <section id="field-additionalLeadQuestions" className={`field-group additional-questions${fieldErrors.additionalLeadQuestions ? " field-error" : ""}`}><p className="field-label">Preguntas adicionales para tus clientes B2B o B2C *</p><p className="intro">Escribe las preguntas concretas que quieres incluir en los formularios de captación. Por ejemplo: “¿Cuál es el objetivo de la campaña?”, “¿Cuál es el presupuesto disponible?” o “¿Para cuándo necesitas el proyecto?”.</p><textarea required aria-label="Preguntas adicionales para tus clientes B2B o B2C" value={String(data.additionalLeadQuestions ?? "")} onChange={(e) => setValue("additionalLeadQuestions", e.target.value)} placeholder="Escribe una pregunta por línea…" aria-invalid={Boolean(fieldErrors.additionalLeadQuestions)} aria-describedby={fieldErrors.additionalLeadQuestions ? "error-additionalLeadQuestions" : undefined} /><ErrorMessage field="additionalLeadQuestions" /></section>}
        {step === 4 && <><h1>Automatizaciones e integraciones</h1><p className="intro">Selecciona lo que quieres poner en marcha desde el inicio. Podrás ampliar el sistema después.</p><Multi field="toolsInUse" title="Herramientas que usan actualmente" items={toolOptions} /><Multi field="toolsToConnect" title="Herramientas que quieren conectar" items={toolOptions} /><Multi field="workflowAutomations" title="Automatizaciones del flujo de trabajo" items={workflowOptions} /><Multi field="whatsappAutomations" title="Automatizaciones de WhatsApp" items={whatsappOptions} /><Multi field="emailAutomations" title="Automatizaciones de correo" items={emailOptions} /><Multi field="adPlatforms" title="Gestión de anuncios" items={adOptions} /><div className="grid two"><Select field="adAccess" label="Acceso a las cuentas publicitarias" items={["No aplica", "Tengo acceso de administrador", "Puedo invitar a Focus Business", "Necesito ayuda para encontrar el acceso"]} /><Select field="adMeeting" label="Reunión para verificar los anuncios" items={["No aplica", "Sí, solicitar reunión", "Ya hay una reunión programada"]} /></div><label id="field-exceptions" className={`input full${fieldErrors.exceptions ? " field-error" : ""}`}><span>Excepciones o integraciones adicionales</span><textarea value={String(data.exceptions ?? "")} onChange={(e) => setValue("exceptions", e.target.value)} placeholder="Cuéntanos cualquier ajuste, excepción o herramienta que debamos considerar." aria-invalid={Boolean(fieldErrors.exceptions)} aria-describedby={fieldErrors.exceptions ? "error-exceptions" : undefined} /><ErrorMessage field="exceptions" /></label></>}
        {step === 0 && <><h1>Empresa y preparación de la subcuenta</h1><p className="intro">Estos datos se usan solo para configurar la captación y preparar una futura subcuenta de GoHighLevel. No la crean ni solicitan credenciales.</p><section className="purpose-note"><strong>Información · ¿por qué te lo pedimos?</strong><p><b>Requerido:</b> identifica legalmente la empresa y permite preparar ubicación, idioma, facturación administrativa y usuarios iniciales. <b>Recomendado:</b> personaliza la marca. No escribas contraseñas, claves API, datos bancarios ni códigos de acceso.</p></section><p className="field-label">Requerido para preparar la subcuenta</p><div className="grid three"><Text field="companyName" label="Nombre comercial" placeholder="Ej. Productora Norte" required /><Text field="legalName" label="Razón social" placeholder="Ej. Productora Norte S.L." required /><Text field="ownerName" label="Propietario o representante legal" placeholder="Nombre y apellidos" required /></div><div className="grid three"><Text field="businessEmail" label="Email corporativo" placeholder="hola@productora.com" required /><Text field="contactPhone" label="Teléfono corporativo" placeholder="+34 ..." required /><Text field="website" label="Página web" placeholder="https://tudominio.com" required /></div><div className="grid three"><Select field="activity" label="Actividad principal" items={["Productora audiovisual", "Agencia creativa", "Estudio de fotografía", "Eventos", "Marketing", "Otra"]} /><Text field="legalAddress" label="Dirección comercial o legal" placeholder="Calle, número y oficina" required /><Text field="legalCity" label="Ciudad" placeholder="Madrid" required /></div><div className="grid three"><Text field="legalCountry" label="País" placeholder="España" required /><Select field="timezone" label="Zona horaria" items={["Europe/Madrid", "Europe/Lisbon", "America/Mexico_City", "America/Bogota", "America/Santiago", "America/Argentina/Buenos_Aires", "Otra"]} /><Select field="primaryLanguage" label="Idioma principal" items={["Español", "Portugués", "Inglés", "Francés", "Italiano", "Alemán", "Otro"]} /></div><div className="grid three"><Text field="location" label="Ciudad / país principal de operación" placeholder="Madrid, España" required /><Select field="teamSize" label="Tamaño del equipo" items={["Solo/a", "2–5", "6–10", "11–25", "26–50", "+50"]} /><TextArea field="description" label="Descripción breve" placeholder="Qué hacéis, qué os diferencia y qué proyectos buscáis." required /></div><section className="brand-color"><div><span className="color-label">Datos de facturación administrativa · requerido</span><p>Solo datos empresariales necesarios para preparar la configuración. No incluyas tarjeta, cuenta bancaria ni información de pago.</p></div><div className="grid two"><Text field="billingLegalName" label="Nombre o razón social de facturación" placeholder="Productora Norte S.L." required /><Text field="billingTaxId" label="NIF/CIF u otro identificador fiscal empresarial" placeholder="B12345678" required /></div><div className="grid two"><Text field="billingAddress" label="Dirección de facturación" placeholder="Dirección completa" required /><Text field="billingEmail" label="Email de facturación" placeholder="facturacion@productora.com" required /></div></section><section className="brand-color"><div><span className="color-label">Recursos e identidad visual · recomendado para personalizar</span><p>Comparte una carpeta de Google Drive con logos, imágenes, vídeos, PDFs y referencias. Esto no concede acceso a ninguna cuenta.</p></div><Text field="driveAssetsUrl" label="Carpeta de recursos en Google Drive" placeholder="https://drive.google.com/drive/folders/..." /><div className="grid two"><ColorField field="brandPrimaryColor" label="Color corporativo primario" fallback="#D4AF37" /><ColorField field="brandSecondaryColor" label="Color corporativo secundario" fallback="#101D2D" /></div><div className="grid two"><FontField field="headingFont" label="Tipografía de títulos" /><FontField field="bodyFont" label="Tipografía de textos" /></div><datalist id="font-options">{fontOptions.map((font) => <option key={font} value={font} />)}</datalist></section></>}
        {step === 1 && <><h1>Oferta y configuración de prospección</h1><p className="intro">Define con precisión qué vendes y qué empresas deben buscarse. Estos datos configuran automáticamente la prueba y el dashboard.</p><section className="purpose-note"><strong>Información · ¿por qué te lo pedimos?</strong><p>Una definición más concreta mejora la relevancia de los prospectos, pero no garantiza resultados. Incluye ejemplos reales de sector, zona, tamaño, presupuesto, señales deseables y exclusiones para evitar empresas mal segmentadas.</p></section><div className="grid three"><Text field="mainService" label="Servicio prioritario que quieres promover" placeholder="Ej. Vídeo corporativo recurrente para empresas B2B" required /><Select field="ticket" label="Valor habitual del servicio" items={["< 1.000 €", "1.000–3.000 €", "3.000–8.000 €", "8.000–20.000 €", "+20.000 €"]} /><Select field="priceModel" label="Modelo de precio" items={["Presupuesto personalizado", "Precio cerrado", "Retainer mensual", "Suscripción", "Comisión"]} /></div><div className="grid three"><Select field="monthlyCapacity" label="Capacidad mensual para nuevos proyectos" items={["1 proyecto", "2–3 proyectos", "4–6 proyectos", "7–10 proyectos", "Más de 10", "Depende del alcance"]} /><TextArea field="portfolioHighlights" label="Casos de éxito o portafolio (si corresponde)" placeholder="Ej. URL del portafolio y 2–3 proyectos relevantes, sector, resultado y tipo de pieza." /><TextArea field="referenceCompanies" label="Empresas de referencia que te gustaría captar" placeholder="Ej. marcas similares a clientes rentables actuales. Una empresa por línea; no incluyas datos privados." /></div><Multi field="services" title="Servicios concretos que quieres impulsar" items={options.services} otherField="servicesOther" otherLabel="¿Qué otro servicio quieres impulsar? Ej. vídeo de casos de éxito" /><Multi field="audience" title="¿A qué público vendes?" items={options.audience} /><div className="grid two"><Multi field="sectors" title="Sectores prioritarios (elige solo los que realmente encajan)" items={options.sectors} otherField="sectorsOther" otherLabel="¿Qué otro sector es prioritario?" /><Multi field="targetClientTypes" title="Tipos de cliente objetivo" items={options.clientTypes} otherField="targetClientTypesOther" otherLabel="Describe el otro tipo de cliente" /></div><div className="grid two"><Multi field="geographies" title="Mercados generales" items={options.geographies} /><Multi field="targetCountries" title="Países concretos donde quieres captar" items={options.countries} otherField="targetCountriesOther" otherLabel="Escribe el otro país" /></div><div className="grid two"><Text field="targetCity" label="Ciudad objetivo principal" placeholder="Ej. Madrid; escribe 'Sin preferencia' si aplica" required /><Text field="targetRegion" label="Región o zona objetivo" placeholder="Ej. Comunidad de Madrid, radio de 100 km" required /></div><div className="grid three"><Select field="idealCompanySize" label="Tamaño ideal de empresa" items={["Autónomos", "1–10 empleados", "11–50 empleados", "51–200 empleados", "201–1.000 empleados", "+1.000 empleados"]} /><Text field="decisionMaker" label="Cargo que suele decidir la compra" placeholder="Ej. Dirección de marketing o CEO" required /><Text field="minimumBudget" label="Valor o presupuesto mínimo aceptable" placeholder="Ej. proyectos desde 3.000 €" required /></div><TextArea field="idealProfileDetail" label="Perfil ideal detallado" placeholder="Ej. empresa privada B2B, 11–50 empleados, equipo de marketing activo, publica contenido y contrata proveedores externos." required /><TextArea field="prospectPreferences" label="Preferencias y señales que mejoran el encaje" placeholder="Ej. está contratando marketing, lanza productos, abre sedes o anuncia campañas." required /><TextArea field="prospectExclusions" label="Exclusiones obligatorias" placeholder="Ej. clientes actuales, competidores directos, administración pública, empresas sin web o fuera de España." required /></>}
        {step === 2 && <><h1>Captación y proceso comercial</h1><p className="intro">Así convertiremos cada contacto en una oportunidad ordenada y medible.</p><Multi field="objectives" title="Objetivos prioritarios" items={options.objectives} /><Multi field="channels" title="Canales por los que llegan los contactos" items={options.channels} /><Multi field="leadFields" title="Datos que quieres pedir a cada contacto" items={options.leadFields} /><div className="grid three"><Select field="responseTime" label="¿En cuánto tiempo quieres responder?" items={["En 5 minutos", "En 15 minutos", "En 1 hora", "En 4 horas", "En 24 horas"]} /><Select field="assignment" label="¿Quién recibe cada contacto?" items={["Siempre la misma persona", "Repartir por turnos", "Según el servicio solicitado", "Decidirlo manualmente"]} /><Select field="salesCycle" label="¿Cuánto tarda un cliente en decidir?" items={["Menos de 1 semana", "1–2 semanas", "3–6 semanas", "Más de 6 semanas"]} /></div><TextArea field="qualification" label="¿Qué condiciones debe cumplir un buen contacto?" placeholder="Ej. Tiene una necesidad real, presupuesto disponible y quiere empezar en los próximos 90 días." /></>}
        {step === 3 && <><h1>Equipo, acceso futuro y comunicación</h1><p className="intro">Identificamos a las personas y roles que se prepararán en la futura subcuenta. No solicites contraseñas ni accesos.</p><section className="purpose-note"><strong>Requerido para crear la subcuenta</strong><p>Nombre, cargo, email, teléfono y roles iniciales permiten preparar usuarios y responsabilidades. <b>Recomendado:</b> redes y dominio deseado ayudan a personalizarla, pero no conceden acceso.</p></section><div className="grid three"><Text field="contactName" label="Contacto principal" placeholder="Nombre y apellidos" required /><Text field="contactRole" label="Cargo" placeholder="Ej. Dirección comercial" required /><Text field="contactEmail" label="Correo corporativo del contacto" placeholder="email@empresa.com" required /></div><div className="grid two"><Text field="contactPhone" label="Teléfono / WhatsApp de trabajo" placeholder="+34 ..." required /><TextArea field="initialTeamRoles" label="Equipo y roles iniciales" placeholder="Una persona por línea. Ej.: Ana Pérez — Administradora; Luis Gómez — Comercial; Marta Ruiz — Solo lectura." required /></div><div className="grid two"><TextArea field="companySocialLinks" label="Redes sociales oficiales (recomendado)" placeholder="Una URL por línea: LinkedIn, Instagram, YouTube, Facebook..." /><Text field="desiredDomain" label="Dominio o subdominio deseado (recomendado)" placeholder="Ej. crm.productora.com; no incluyas credenciales DNS" /></div><div className="grid three"><Text field="bookingName" label="Nombre de la reunión" placeholder="Ej. Reunión de diagnóstico" /><Select field="meetingDuration" label="Duración" items={["15 minutos", "30 minutos", "45 minutos", "60 minutos"]} /><Select field="availability" label="Días disponibles" items={["Lunes–viernes", "Lunes–jueves", "Todos los días", "Variable"]} /></div><div className="grid two"><Text field="schedule" label="Horario de atención" placeholder="09:00–18:00" /><Select field="pronoun" label="Tratamiento" items={["Tú", "Usted", "Indiferente"]} /></div><Select field="communicationTone" label="Tono de comunicación" items={["Cercano", "Profesional", "Directo", "Premium"]} /></>}
        {step === 5 && <><h1>Revisión y preparación</h1><p className="intro">El envío crea la configuración de prospección y deja la futura subcuenta preparada para revisión. No crea GoHighLevel ni ejecuta mensajes.</p><div className="summary"><p><b>Empresa</b>{String(data.companyName || "Pendiente")}</p><p><b>Oferta principal</b>{String(data.mainService || "Pendiente")}</p><p><b>Cliente objetivo</b>{asArray(data.targetClientTypes).join(", ") || "Pendiente"}</p><p><b>Países</b>{asArray(data.targetCountries).join(", ") || "Pendiente"}</p><p><b>Preparación GHL</b>Lista para validación; sin crear subcuenta</p></div><div className="grid two"><Text field="launchDate" label="Fecha objetivo de lanzamiento" placeholder="Ej. 15/09/2026" /><Text field="approvalOwner" label="Responsable de aprobación" placeholder="Nombre y cargo" /></div><div id="field-accuracy" className={`check-field${fieldErrors.accuracy ? " field-error" : ""}`}><label className="check"><input type="checkbox" checked={Boolean(data.accuracy)} onChange={(e) => setValue("accuracy", e.target.checked)} aria-invalid={Boolean(fieldErrors.accuracy)} aria-describedby={fieldErrors.accuracy ? "error-accuracy" : undefined} /> Confirmo que los datos facilitados son correctos.</label><ErrorMessage field="accuracy" /></div><div id="field-terms" className={`check-field${fieldErrors.terms ? " field-error" : ""}`}><label className="check"><input type="checkbox" checked={Boolean(data.terms)} onChange={(e) => setValue("terms", e.target.checked)} aria-invalid={Boolean(fieldErrors.terms)} aria-describedby={fieldErrors.terms ? "error-terms" : undefined} /> Autorizo el uso de estos datos exclusivamente para configurar la captación y preparar la futura subcuenta.</label><ErrorMessage field="terms" /></div><div id="field-ghlPreparationAuthorization" className={`check-field${fieldErrors.ghlPreparationAuthorization ? " field-error" : ""}`}><label className="check"><input type="checkbox" checked={Boolean(data.ghlPreparationAuthorization)} onChange={(e) => setValue("ghlPreparationAuthorization", e.target.checked)} aria-invalid={Boolean(fieldErrors.ghlPreparationAuthorization)} aria-describedby={fieldErrors.ghlPreparationAuthorization ? "error-ghlPreparationAuthorization" : undefined} /> Autorizo a Focus Business a preparar y validar estos datos para una creación posterior aprobada de la subcuenta. Entiendo que este envío no la crea ni conecta.</label><ErrorMessage field="ghlPreparationAuthorization" /></div>{status === "sent" && <div className="notice success">Configuración enviada. La prospección queda preparada y la subcuenta queda pendiente de revisión/aprobación.</div>}{status === "error" && <div className="notice error">No se pudo enviar la configuración. Inténtalo de nuevo; el borrador permanece guardado en este dispositivo.</div>}</>}
        <footer><button type="button" className="secondary" onClick={() => goToStep(Math.max(0, step - 1))} disabled={step === 0}>← Anterior</button>{step < steps.length - 1 ? <button type="button" className="primary" onClick={() => { if (validate(step)) goToStep(step + 1); }}>Continuar →</button> : <button className="primary" type="submit" disabled={status === "saving"}>{status === "saving" ? "Enviando…" : "Enviar configuración →"}</button>}</footer>
      </form>
    </section>
  </main></FieldContext.Provider>;
}
