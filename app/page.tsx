"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
      ["Datos útiles para preparar la subcuenta", "Nombre legal y comercial, propietario, contacto principal, email y teléfono corporativos, web, dirección, país, ciudad, zona horaria e idioma ayudan a preparar correctamente la futura subcuenta. Puedes completarlos después."],
      ["Recomendado para personalizarla", "Logo, recursos de marca, colores, tipografías, redes y dominio o subdominio deseado ayudan a personalizarla; no son credenciales."],
      ["Seguridad", "No escribas contraseñas, claves API, códigos de acceso ni datos bancarios. Este formulario no crea ni conecta la subcuenta."],
      ["Actividad, ubicación y equipo", "Indica a qué se dedica la empresa, dónde trabaja principalmente y cuántas personas forman el equipo."],
      ["Descripción", "Resume qué hace la empresa, qué la diferencia y qué proyectos quiere conseguir."],
      ["Carpeta de recursos", "Comparte una carpeta de Google Drive con logos, fotografías, vídeos, documentos y referencias visuales."],
      ["Colores y tipografías", "Puedes elegir hasta tres colores. En tipografías verás una muestra, podrás indicar que no sabes cuál elegir o escribir otra fuente de tu manual de marca."],
    ],
  },
  {
    title: "Ayuda sobre oferta y cliente ideal",
    items: [
      ["Servicio, precio y forma de cobro", "Indica el servicio principal, el importe medio de una venta y cómo sueles presupuestar o cobrar."],
      ["Servicios que quieres impulsar", "Selecciona los servicios que quieres vender más. Si eliges Otro, escribe cuál es."],
      ["Por qué te lo pedimos", "Estos datos configuran la prueba y las búsquedas del dashboard. Una definición precisa mejora la relevancia, pero no garantiza resultados."],
      ["Público, sectores y tipo de cliente", "Define con detalle qué empresas quieres captar. Ejemplo: empresas privadas B2B de salud y tecnología con equipo de marketing."],
      ["Zonas, países y regiones", "Selecciona los mercados, países y regiones concretas donde quieres captar. Las regiones ayudan a preparar la segmentación geográfica posterior en Meta."],
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
      ["Campaña y landing", "Define el objetivo, la acción esperada, el público, el destino del tráfico, el contenido de la landing y si utilizará un VSL."],
    ],
  },
  {
    title: "Ayuda sobre equipo y reuniones",
    items: [
      ["Persona responsable", "Es la persona que recibirá avisos y coordinará la configuración."],
      ["Datos de contacto", "Añade su cargo, correo y teléfono o WhatsApp de trabajo."],
      ["Reuniones", "Define cómo se llamará la cita, cuánto durará y qué días y horarios están disponibles."],
      ["Tratamiento", "Indica si los mensajes deben hablar de tú, de usted o si cualquiera de las dos opciones es válida."],
      ["Dominio", "Propón tres dominios y comprueba su estado. Focus Business confirmará la compra y creará los subdominios necesarios para GoHighLevel, el portal, las landings y el correo."],
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
      ["Accesos de Meta", "Los accesos al negocio, la página y la cuenta publicitaria se revisan por separado. Son opcionales en el formulario y nunca requieren compartir contraseñas."],
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
  geographies: ["España", "Portugal", "Europa", "Latinoamérica", "Global", "Otro"],
  countries: ["España", "Portugal", "Francia", "Italia", "Alemania", "Reino Unido", "México", "Colombia", "Chile", "Argentina", "Estados Unidos", "Otro"],
  clientTypes: ["Empresa privada B2B", "Empresa B2C", "Agencia", "Marca con equipo de marketing", "Institución pública", "Startup", "Pyme", "Gran empresa", "Otro"],
  channels: ["Web", "Landing pages", "Instagram", "LinkedIn", "WhatsApp", "Llamadas", "Referidos", "Meta Ads", "Google Ads", "Email outbound"],
  leadFields: ["Nombre", "Empresa", "Email", "Teléfono", "Servicio de interés", "Presupuesto", "Fecha prevista", "Descripción del proyecto", "Otro"],
  objectives: ["Centralizar contactos", "Aumentar reuniones", "Captar clientes B2B", "Captar clientes B2C", "Automatizar seguimiento", "Recuperar contactos", "Medir ventas"],
  automations: ["Confirmación de lead", "Aviso interno", "Asignación automática", "Seguimiento sin respuesta", "Confirmación de cita", "Seguimiento de propuesta", "Solicitud de reseña", "Reactivación"],
  integrations: ["Google Calendar", "Gmail / Google Workspace", "WhatsApp", "Meta Ads", "Stripe", "Zoom", "Slack", "WordPress", "Shopify", "Notion", "Google Sheets"],
};
const toolOptions = ["Google Calendar", "Gmail / Google Workspace", "Google Authenticator", "Google Meet", "WhatsApp", "Telegram", "Meta Ads", "CRM actual"];
const workflowOptions = ["Nuevo lead", "Asignación de leads", "Seguimiento sin respuesta", "Confirmación de cita", "Seguimiento de propuesta", "Solicitud de reseña", "Reactivación"];
const whatsappOptions = ["Confirmación inmediata", "Recordatorio de cita", "Seguimiento comercial", "Reactivación", "Atención postventa"];
const emailOptions = ["Email de bienvenida", "Secuencia de seguimiento", "Confirmación de cita", "Propuesta enviada", "Solicitud de reseña"];
const adOptions = ["No gestionamos anuncios", "Meta Ads", "Google Ads", "YouTube Ads", "LinkedIn Ads", "TikTok Ads"];
const bodyFontOptions = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway", "Nunito", "Nunito Sans", "Source Sans 3", "Work Sans", "DM Sans", "Manrope", "Figtree", "Archivo", "Rubik", "Ubuntu", "Mulish", "Karla", "Cabin", "Assistant", "Hind", "Heebo", "Noto Sans", "Noto Sans Display", "Noto Serif", "Merriweather Sans", "Quicksand", "Josefin Sans", "Varela Round", "M PLUS Rounded 1c", "Exo 2", "Titillium Web", "Barlow", "Barlow Condensed", "Barlow Semi Condensed", "IBM Plex Sans", "IBM Plex Serif", "IBM Plex Mono", "Public Sans", "Lexend", "Outfit", "Urbanist", "Plus Jakarta Sans", "Space Grotesk", "Sora", "Onest", "Albert Sans", "Be Vietnam Pro", "Red Hat Display", "Red Hat Text", "Oxygen", "PT Sans", "PT Serif", "Fira Sans", "Fira Sans Condensed", "Fira Sans Extra Condensed", "Source Serif 4", "Source Code Pro", "Inconsolata", "Roboto Slab", "Roboto Serif", "Roboto Mono", "Bitter", "Arvo", "Zilla Slab", "Bree Serif", "Lora", "Merriweather", "Playfair Display", "Libre Baskerville", "Cormorant Garamond", "EB Garamond", "Crimson Text", "Crimson Pro", "Spectral", "Alegreya", "Alegreya Sans", "Cardo", "Domine", "Vollkorn", "Old Standard TT", "Newsreader", "Fraunces", "Bodoni Moda", "DM Serif Display", "DM Serif Text", "Libre Caslon Text", "Libre Caslon Display", "Prata", "Marcellus", "Cinzel", "Cinzel Decorative", "Gilda Display", "Yeseva One", "Abril Fatface", "Alfa Slab One", "Bevan", "Patua One", "Rokkitt", "Slabo 27px", "Sanchez", "MuseoModerno", "Unbounded", "Syne", "Chakra Petch", "Rajdhani", "Orbitron", "Audiowide", "Michroma", "Russo One", "Teko", "Oswald", "Bebas Neue", "Anton", "Archivo Black", "Black Han Sans", "League Spartan", "Fjalla One", "Yanone Kaffeesatz", "Pathway Gothic One", "Roboto Condensed", "Open Sans Condensed", "Noto Sans Condensed", "Jost", "Prompt", "Kanit", "Bai Jamjuree", "Chivo", "Chivo Mono", "Asap", "Asap Condensed", "Catamaran", "Maven Pro", "Dosis", "Comfortaa", "Baloo 2", "Fredoka", "Viga", "Signika", "Signika Negative", "Questrial", "Sen", "Epilogue", "Commissioner", "Encode Sans", "Encode Sans Condensed", "Expletus Sans", "Overpass", "Overpass Mono",
] as const;
const headingFontOptions = bodyFontOptions.slice(0, 100);

const regionsByCountry: Record<string, string[]> = {
  "España": ["Andalucía", "Aragón", "Asturias", "Islas Baleares", "Canarias", "Cantabria", "Castilla-La Mancha", "Castilla y León", "Cataluña", "Comunidad Valenciana", "Extremadura", "Galicia", "Comunidad de Madrid", "Región de Murcia", "Navarra", "País Vasco", "La Rioja", "Ceuta", "Melilla"],
  "Portugal": ["Norte", "Centro", "Área Metropolitana de Lisboa", "Alentejo", "Algarve", "Azores", "Madeira"],
  "Francia": ["Auvernia-Ródano-Alpes", "Borgoña-Franco Condado", "Bretaña", "Centro-Valle del Loira", "Córcega", "Gran Este", "Alta Francia", "Isla de Francia", "Normandía", "Nueva Aquitania", "Occitania", "Países del Loira", "Provenza-Alpes-Costa Azul"],
  "Italia": ["Abruzos", "Apulia", "Basilicata", "Calabria", "Campania", "Emilia-Romaña", "Friuli-Venecia Julia", "Lacio", "Liguria", "Lombardía", "Marcas", "Piamonte", "Cerdeña", "Sicilia", "Toscana", "Trentino-Alto Adigio", "Umbría", "Valle de Aosta", "Véneto"],
  "Alemania": ["Baden-Wurtemberg", "Baviera", "Berlín", "Brandeburgo", "Bremen", "Hamburgo", "Hesse", "Baja Sajonia", "Mecklemburgo-Pomerania Occidental", "Renania del Norte-Westfalia", "Renania-Palatinado", "Sarre", "Sajonia", "Sajonia-Anhalt", "Schleswig-Holstein", "Turingia"],
  "Reino Unido": ["Inglaterra", "Escocia", "Gales", "Irlanda del Norte", "Londres", "Noroeste de Inglaterra", "Sudeste de Inglaterra", "Sudoeste de Inglaterra", "Midlands Occidentales", "Midlands Orientales"],
  "México": ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"],
  "Colombia": ["Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Quindío", "Risaralda", "Santander", "Sucre", "Tolima", "Valle del Cauca"],
  "Chile": ["Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso", "Metropolitana de Santiago", "O'Higgins", "Maule", "Ñuble", "Biobío", "La Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes"],
  "Argentina": ["Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"],
  "Estados Unidos": ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Carolina del Norte", "Carolina del Sur", "Colorado", "Connecticut", "Dakota del Norte", "Dakota del Sur", "Delaware", "Distrito de Columbia", "Florida", "Georgia", "Hawái", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Luisiana", "Maine", "Maryland", "Massachusetts", "Míchigan", "Minnesota", "Misisipi", "Misuri", "Montana", "Nebraska", "Nevada", "Nueva Hampshire", "Nueva Jersey", "Nueva York", "Nuevo México", "Ohio", "Oklahoma", "Oregón", "Pensilvania", "Rhode Island", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Virginia Occidental", "Washington", "Wisconsin", "Wyoming"],
};
const requiredByStep = [
  [],
  [],
  [],
  [],
  [],
  ["accuracy","terms","ghlPreparationAuthorization"],
];
const labels: Record<string,string> = {
  companyName:"Nombre comercial", legalName:"Razón social", ownerName:"Propietario o representante", businessEmail:"Email corporativo", website:"Página web", activity:"Actividad principal", location:"Ciudad / país principal", legalAddress:"Dirección comercial/legal", legalCity:"Ciudad legal", legalCountry:"País legal", timezone:"Zona horaria", primaryLanguage:"Idioma principal", teamSize:"Tamaño del equipo", description:"Descripción breve", billingLegalName:"Nombre de facturación", billingTaxId:"NIF/CIF fiscal", billingAddress:"Dirección de facturación", billingEmail:"Email de facturación",
  driveAssetsUrl:"Carpeta de recursos en Google Drive", brandPrimaryColor:"Color corporativo primario", brandSecondaryColor:"Color corporativo secundario", brandAccentColor:"Tercer color corporativo", headingFont:"Tipografía de títulos", bodyFont:"Tipografía de textos",
  mainService:"Servicio prioritario", ticket:"Ticket medio", priceModel:"Modelo de precio", monthlyCapacity:"Capacidad mensual", portfolioHighlights:"Casos de éxito o portafolio", referenceCompanies:"Empresas de referencia", services:"Servicios que quieres impulsar", audience:"Público", sectors:"Sectores prioritarios", geographies:"Mercados prioritarios", targetCity:"Ciudad objetivo", targetRegion:"Región objetivo", targetRegions:"Países y regiones objetivo", targetCountries:"Países objetivo", targetClientTypes:"Tipos de cliente objetivo", idealCompanySize:"Tamaño ideal (B2B)", idealProfileDetail:"Perfil ideal detallado", decisionMaker:"Persona que suele decidir la compra", minimumBudget:"Presupuesto mínimo deseado", prospectExclusions:"Exclusiones de prospección", prospectPreferences:"Preferencias y criterios de búsqueda", servicesOther:"Otro servicio", sectorsOther:"Otro sector", targetCountriesOther:"Otro país", targetRegionsOther:"Otra región", targetClientTypesOther:"Otro tipo de cliente", portalPassword:"Contraseña del portal", portalPasswordConfirmation:"Confirmación de contraseña",
  objectives:"Objetivos prioritarios", campaignObjective:"Objetivo principal de la campaña", campaignConversion:"Conversión principal", campaignAudience:"Público de la campaña", campaignDestination:"Destino del tráfico", channels:"Canales de entrada", leadFields:"Datos que quieres pedir", additionalLeadQuestions:"Preguntas para tus leads o prospectos", landingGoal:"Objetivo de la landing", landingSections:"Contenido deseado en la landing", landingCopyOwner:"Responsable del copy de landings", landingCopyBrief:"Copy, referencias y CTA de landings", landingVslChoice:"Uso de VSL en la landing", landingVslUrl:"Enlace del VSL", landingVslNotes:"Indicaciones del VSL", responseTime:"Tiempo máximo de respuesta", assignment:"Persona que recibe cada contacto", salesCycle:"Tiempo habitual para decidir", qualification:"Condiciones de un buen contacto",
  contactName:"Persona responsable", contactRole:"Cargo", contactEmail:"Correo electrónico", contactPhone:"Teléfono / WhatsApp", initialTeamRoles:"Equipo y roles iniciales", companySocialLinks:"Redes sociales de la empresa", desiredDomain:"Dominio o subdominio deseado", bookingName:"Nombre de la reunión", meetingDuration:"Duración", availability:"Días disponibles", schedule:"Horario de atención", pronoun:"Tratamiento",
  toolsInUse:"Herramientas que usan actualmente", toolsToConnect:"Herramientas que quieren conectar", workflowAutomations:"Automatizaciones del flujo de trabajo", whatsappAutomations:"Automatizaciones de WhatsApp", emailAutomations:"Automatizaciones de correo", adPlatforms:"Gestión de anuncios", adAccess:"Acceso a las cuentas publicitarias", adMeeting:"Reunión para verificar los anuncios", exceptions:"Excepciones o integraciones adicionales",
  whatsappSetup:"Incorporación de WhatsApp Business", whatsappBusinessAccount:"Estado de la cuenta Meta Business", whatsappNumberChoice:"Número para WhatsApp Business", whatsappUsNumberArea:"Estado o prefijo deseado en Estados Unidos", whatsappDisplayNumber:"Número que se mostrará en WhatsApp", whatsappCostAcceptance:"Confirmación de costes de WhatsApp",
  callingSetup:"Llamadas desde GoHighLevel", callingNumberChoice:"Número para llamadas", callingDisplayNumber:"Número que verá la persona llamada", callRecording:"Grabación de llamadas", callRecordingNotice:"Confirmación sobre grabación y normativa",
  subdomainSetup:"Configuración del subdominio", subdomainPurpose:"Uso del subdominio", subdomainPreferred:"Subdominio preferido", subdomainAlternative:"Alternativa de subdominio", subdomainOwnership:"Propiedad del dominio", subdomainDnsStatus:"Acceso para configurar DNS", subdomainVerification:"Estado de verificación",
  launchDate:"Fecha objetivo de lanzamiento", approvalOwner:"Responsable de aprobación", accuracy:"Confirmación de datos", terms:"Autorización", ghlPreparationAuthorization:"Autorización para preparar la subcuenta",
};

function asArray(value: FormState[string]) { return Array.isArray(value) ? value : []; }

const FieldContext = createContext<{ data: FormState; errors: FormErrors; setValue: (key: string, value: string | boolean) => void; toggle: (key: string, item: string) => void } | null>(null);

function ErrorMessage({ field }: { field: string }) {
  const context = useContext(FieldContext);
  const error = context?.errors[field];
  return error ? <small id={`error-${field}`} className="field-error-message" role="alert">{error}</small> : null;
}

function Text({ field, label, placeholder }: { field: string; label: string; placeholder?: string; required?: boolean }) {
  const context = useContext(FieldContext);
  if (!context) return null;
  const error = context.errors[field];
  const type = ["contactEmail", "businessEmail", "billingEmail"].includes(field) ? "email" : ["website", "driveAssetsUrl", "landingVslUrl"].includes(field) ? "url" : "text";
  return <label id={`field-${field}`} className={`input${error ? " field-error" : ""}`}><span>{label}</span><input type={type} value={String(context.data[field] ?? "")} onChange={(e) => context.setValue(field, e.target.value)} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined} /><ErrorMessage field={field} /></label>;
}

function ColorField({ field, label, fallback }: { field: string; label: string; fallback: string }) {
  const context = useContext(FieldContext);
  if (!context) return null;
  const rawValue = String(context.data[field] ?? "");
  const colorValue = /^#[0-9a-fA-F]{6}$/.test(rawValue) ? rawValue : fallback;
  const error = context.errors[field];
  return <div id={`field-${field}`} className={`color-field${error ? " field-error" : ""}`}><span>{label}</span><div className="color-controls"><label className="color-picker" aria-label={`Elegir ${label.toLowerCase()}`}><input type="color" value={colorValue} onChange={(e) => context.setValue(field, e.target.value.toUpperCase())} /><i style={{ backgroundColor: colorValue }} /></label><label className="input color-code"><span>Código hexadecimal</span><input value={rawValue} onChange={(e) => context.setValue(field, e.target.value.toUpperCase())} placeholder={fallback} pattern="#[0-9A-Fa-f]{6}" aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined} /></label></div><ErrorMessage field={field} /></div>;
}

function TextArea({ field, label, placeholder }: { field: string; label: string; placeholder?: string; required?: boolean }) {
  const context = useContext(FieldContext);
  if (!context) return null;
  const error = context.errors[field];
  return <label id={`field-${field}`} className={`input full${error ? " field-error" : ""}`}><span>{label}</span><textarea value={String(context.data[field] ?? "")} onChange={(event) => context.setValue(field, event.target.value)} onInput={(event) => { const area = event.currentTarget; area.style.height = "auto"; area.style.height = `${area.scrollHeight}px`; }} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined} /><ErrorMessage field={field} /></label>;
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function FontField({ field, label, items }: { field: string; label: string; items: readonly string[] }) {
  const context = useContext(FieldContext);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const error = context?.errors[field];
  const rawValue = String(context?.data[field] ?? "");
  const listed = items.includes(rawValue);
  const custom = Boolean(rawValue) && !listed && rawValue !== "No sé cuál elegir";
  const customMode = rawValue === "__custom" || custom;
  const normalizedQuery = normalizeSearch(query);
  const filtered = items.filter((font) => normalizeSearch(font).includes(normalizedQuery));
  useEffect(() => {
    if (!listed || !rawValue) return;
    const id = `font-preview-${rawValue.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(rawValue).replaceAll("%20", "+")}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }, [listed, rawValue]);
  if (!context) return null;
  function choose(value: string) {
    context?.setValue(field, value);
    setQuery("");
    setOpen(false);
  }
  return <div id={`field-${field}`} className={`input font-choice${error ? " field-error" : ""}`}><span>{label}</span><div className={`font-picker${open ? " open" : ""}`}><button type="button" className="font-picker-toggle" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span style={{ fontFamily: listed ? rawValue : "inherit" }}>{rawValue && rawValue !== "__custom" ? rawValue : "Selecciona una tipografía"}</span><small>{items.length} fuentes · buscar ▾</small></button>{open && <div className="font-picker-panel"><label className="font-search"><span>Buscar tipografía</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Escribe una parte del nombre…" /></label><div className="font-picker-results" role="listbox" aria-label={`${label}: ${items.length} tipografías`}><button type="button" role="option" aria-selected={rawValue === "No sé cuál elegir"} onClick={() => choose("No sé cuál elegir")}>No sé cuál elegir</button>{filtered.map((font) => <button type="button" role="option" aria-selected={rawValue === font} key={font} style={{ fontFamily: font }} onClick={() => choose(font)}>{font}</button>)}<button type="button" role="option" aria-selected={customMode} onClick={() => choose("__custom")}>Otra tipografía…</button>{filtered.length === 0 && <p>No encontramos coincidencias. Puedes escribir otra tipografía.</p>}</div></div>}</div>{customMode && <label className="input font-custom"><span>Escribe la tipografía que quieres utilizar</span><input value={rawValue === "__custom" ? "" : rawValue} onChange={(event) => context.setValue(field, event.target.value)} placeholder="Ej. Avenir, Gotham o la fuente de tu manual de marca" /></label>}<div className="font-preview" style={{ fontFamily: listed ? rawValue : "inherit" }}>Focus Business · Productora audiovisual</div><ErrorMessage field={field} /></div>;
}

function Select({ field, label, items }: { field: string; label: string; items: string[] }) {
  const context = useContext(FieldContext);
  if (!context) return null;
  if (["communicationTone", "existingGhl", "sheets"].includes(field)) return null;
  const error = context.errors[field];
  const value = String(context.data[field] ?? "");
  const hasOther = items.some((item) => /^Otr[oa]\b/i.test(item));
  const showOther = hasOther && /^Otr[oa]\b/i.test(value);
  const otherField = `${field}Other`;
  return <label id={`field-${field}`} className={`input${error ? " field-error" : ""}`}><span>{label}</span><select value={value} onChange={(e) => { context.setValue(field, e.target.value); if (!/^Otr[oa]\b/i.test(e.target.value)) context.setValue(otherField, ""); }} aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined}><option value="">Selecciona una opción</option>{items.map((item) => <option key={item}>{item}</option>)}</select>{showOther && <span className="select-other"><span>Especifica la otra opción</span><input value={String(context.data[otherField] ?? "")} onChange={(event) => context.setValue(otherField, event.target.value)} placeholder="Escribe aquí…" /></span>}<ErrorMessage field={field} /></label>;
}

function Multi({ field, title, items, otherField, otherLabel, maxSelections }: { field: string; title: string; items: string[]; otherField?: string; otherLabel?: string; maxSelections?: number }) {
  const context = useContext(FieldContext);
  if (!context || ["automations", "integrations"].includes(field)) return null;
  const values = asArray(context.data[field]);
  const effectiveMax = field === "sectors" ? 3 : maxSelections;
  const error = context.errors[field];
  const otherError = otherField ? context.errors[otherField] : undefined;
  return <details id={`field-${field}`} className={`choice-disclosure${error ? " field-error" : ""}`}><summary><span>{title}</span><small>{values.length ? `${values.length} seleccionado${values.length === 1 ? "" : "s"}` : "Seleccionar"}</small></summary><div className="choice-panel">{effectiveMax && <p className="selection-limit">Selecciona hasta {effectiveMax}. Has elegido {values.length}.</p>}<div className="chips" aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined}>{items.map((item) => <button type="button" className={values.includes(item) ? "chip active" : "chip"} key={item} onClick={() => context.toggle(field, item)} aria-pressed={values.includes(item)}>{item}</button>)}</div><ErrorMessage field={field} />{otherField && values.includes("Otro") && <label id={`field-${otherField}`} className={`input other-detail${otherError ? " field-error" : ""}`}><span>{otherLabel || "Especifica otra opción"}</span><input value={String(context.data[otherField] ?? "")} onChange={(event) => context.setValue(otherField, event.target.value)} placeholder="Escribe aquí…" aria-invalid={Boolean(otherError)} aria-describedby={otherError ? `error-${otherField}` : undefined} /><ErrorMessage field={otherField} /></label>}</div></details>;
}

function DomainSearch() {
  const context = useContext(FieldContext);
  const [checking, setChecking] = useState<string>("");
  if (!context) return null;
  const fields = ["domainOption1", "domainOption2", "domainOption3"];
  async function check(field: string) {
    const domain = String(context?.data[field] ?? "").trim().toLowerCase();
    if (!domain) return;
    setChecking(field);
    context?.setValue(`${field}Status`, "Comprobando…");
    try {
      const response = await fetch(`/api/domain-availability?domain=${encodeURIComponent(domain)}`);
      const result = await response.json() as { ok?: boolean; status?: string; message?: string; normalized?: string };
      if (result.normalized) context?.setValue(field, result.normalized);
      context?.setValue(`${field}Status`, result.message || "No se pudo confirmar");
    } catch {
      context?.setValue(`${field}Status`, "No se pudo consultar ahora; se revisará manualmente");
    } finally { setChecking(""); }
  }
  return <div className="domain-search"><p>Escribe y comprueba tres opciones. Focus Business revisará las opciones disponibles y confirmará cuál se utilizará.</p>{fields.map((field, index) => { const status = String(context.data[`${field}Status`] ?? ""); return <div className="domain-row" key={field}><label className="input"><span>Opción de dominio {index + 1}</span><input inputMode="url" autoComplete="off" value={String(context.data[field] ?? "")} onChange={(event) => { context.setValue(field, event.target.value); context.setValue(`${field}Status`, ""); }} placeholder={index === 0 ? "Ej. productoranorte.com" : index === 1 ? "Ej. productoranorte.es" : "Ej. nortepeliculas.com"} /></label><button type="button" className="domain-check" disabled={checking === field} onClick={() => check(field)}>{checking === field ? "Comprobando…" : "Comprobar"}</button>{status && <p className={status.startsWith("✅") ? "domain-status available" : status.startsWith("❌") ? "domain-status unavailable" : "domain-status"} aria-live="polite">{status}</p>}</div>; })}<small>La consulta utiliza datos registrales RDAP. Un resultado disponible debe confirmarse nuevamente en el momento de la compra.</small></div>;
}

function CostNotice({ visible, children }: { visible: boolean; children: ReactNode }) {
  return visible ? <p className="cost-notice"><strong>Coste adicional</strong><span>{children}</span></p> : null;
}

type LeadQuestion = { id: string; question: string; type: string; options: string[] };

function readLeadQuestions(value: FormState[string]): LeadQuestion[] {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.question === "string" && typeof item.type === "string") : [];
  } catch { return []; }
}

function LeadQuestionBuilder() {
  const context = useContext(FieldContext);
  const [message, setMessage] = useState("");
  if (!context) return null;
  const questions = readLeadQuestions(context.data.leadQuestionConfig);
  const question = String(context.data.leadQuestionDraft ?? "").trim();
  const type = String(context.data.leadQuestionType ?? "Texto corto");
  const choices = String(context.data.leadQuestionOptions ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const needsChoices = ["Selección única", "Selección múltiple"].includes(type);
  function addQuestion() {
    if (!question) { setMessage("Escribe la pregunta antes de añadirla."); return; }
    if (needsChoices && choices.length < 2) { setMessage("Añade al menos dos opciones, una por línea."); return; }
    const nextId = String(questions.reduce((highest, item) => Math.max(highest, Number.parseInt(item.id, 10) || 0), 0) + 1);
    const next = [...questions, { id: nextId, question, type, options: needsChoices ? choices : [] }];
    context?.setValue("leadQuestionConfig", JSON.stringify(next));
    context?.setValue("leadQuestionDraft", "");
    context?.setValue("leadQuestionOptions", "");
    setMessage("Pregunta añadida.");
  }
  function removeQuestion(id: string) {
    context?.setValue("leadQuestionConfig", JSON.stringify(questions.filter((item) => item.id !== id)));
    setMessage("Pregunta eliminada.");
  }
  return <section className="question-builder"><div><span className="color-label">Preguntas configurables para el formulario de captación</span><p>Crea preguntas de texto, sí/no o selección. Para las selecciones, escribe una opción por línea.</p></div><div className="grid two"><Text field="leadQuestionDraft" label="Pregunta" placeholder="Ej. ¿Qué tipo de producción audiovisual necesitas?" /><Select field="leadQuestionType" label="Tipo de respuesta" items={["Texto corto", "Texto largo", "Selección única", "Selección múltiple", "Sí / No", "Número", "Fecha"]} /></div>{needsChoices && <TextArea field="leadQuestionOptions" label="Opciones de respuesta" placeholder={"Vídeo corporativo\nContenido para redes\nPublicidad / spot\nOtro"} />}<button type="button" className="question-add" onClick={addQuestion}>+ Añadir pregunta</button><p className="question-message" aria-live="polite">{message}</p>{questions.length > 0 && <div className="question-list">{questions.map((item, index) => <article key={item.id}><div><b>{index + 1}. {item.question}</b><span>{item.type}{item.options.length ? ` · ${item.options.join(" · ")}` : ""}</span></div><button type="button" onClick={() => removeQuestion(item.id)} aria-label={`Eliminar pregunta ${index + 1}`}>Eliminar</button></article>)}</div>}</section>;
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "sent" | "error">("idle");
  const [draftReady, setDraftReady] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [helpOpen, setHelpOpen] = useState(false);
  const [portalPassword, setPortalPassword] = useState("");
  const [portalPasswordConfirmation, setPortalPasswordConfirmation] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requestedStep = Number(new URLSearchParams(window.location.search).get("step"));
      if (Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep < steps.length) setStep(requestedStep);
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
  const availableRegions = useMemo(() => {
    const countries = asArray(data.targetCountries);
    const regions = countries.flatMap((country) => regionsByCountry[country] || []);
    return [...new Set([...regions, ...(countries.includes("Otro") ? ["Otra región, provincia, estado o zona"] : []), "Otro"])];
  }, [data.targetCountries]);
  const goToStep = useCallback((next: number) => {
    setStep(next);
    setHelpOpen(false);
    setFieldErrors({});
  }, []);
  useEffect(() => {
    if (!draftReady) return;
    const frame = window.requestAnimationFrame(() => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step, draftReady]);
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
      if (key === "sectors" && !values.includes(item) && values.length >= 3) {
        setFieldErrors((current) => ({ ...current, sectors: "Puedes seleccionar un máximo de 3 sectores prioritarios." }));
        return prev;
      }
      const next = values.includes(item) ? values.filter((v) => v !== item) : [...values, item];
      const validRegions = key === "targetCountries"
        ? asArray(prev.targetRegions).filter((region) => region === "Otro" || next.some((country) => (regionsByCountry[country] || []).includes(region)))
        : asArray(prev.targetRegions);
      const otherField = key === "services" ? "servicesOther" : key === "sectors" ? "sectorsOther" : key === "geographies" ? "geographiesOther" : key === "targetCountries" ? "targetCountriesOther" : key === "targetRegions" ? "targetRegionsOther" : key === "targetClientTypes" ? "targetClientTypesOther" : "";
      setFieldErrors((current) => {
        if (!current[key]) return current;
        const nextErrors = { ...current };
        delete nextErrors[key];
        return nextErrors;
      });
      return {
        ...prev,
        [key]: next,
        ...(key === "targetCountries" ? {
          targetRegions: validRegions,
          ...(!validRegions.includes("Otro") ? { targetRegionsOther: "" } : {}),
        } : {}),
        ...(item === "Otro" && !next.includes("Otro") && otherField ? { [otherField]: "" } : {}),
      };
    });
  }, []);
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
    if (index === 1 && asArray(data.sectors).length > 3) errors.sectors = "Puedes seleccionar un máximo de 3 sectores prioritarios.";

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
    for (const colorField of ["brandPrimaryColor", "brandSecondaryColor", "brandAccentColor"]) {
      const color = String(data[colorField] || "").trim();
      if (index === 0 && color && !/^#[0-9A-Fa-f]{6}$/.test(color)) errors[colorField] = "Usa un color hexadecimal de 6 caracteres, por ejemplo #D4AF37.";
    }
    if (index === 3 && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.contactEmail = "Escribe un correo válido, por ejemplo nombre@empresa.com.";
    if (index === 3 && phone && phone.replace(/\D/g, "").length < 7) errors.contactPhone = "Escribe un teléfono válido con al menos 7 números.";
    if (index === 5) {
      const accessEmail = String(data.contactEmail || data.businessEmail || "").trim();
      if (!accessEmail) errors.contactEmail = "Añade un correo de contacto para crear el acceso al portal.";
      if (portalPassword.length < 6) errors.portalPassword = "La contraseña debe tener al menos 6 caracteres.";
      else if (!/\p{L}/u.test(portalPassword) || !/\p{N}/u.test(portalPassword)) errors.portalPassword = "Incluye al menos una letra y un número.";
      if (portalPassword !== portalPasswordConfirmation) errors.portalPasswordConfirmation = "Las contraseñas no coinciden.";
    }
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
    setSubmissionError("");
    const payload = { ...data, submittedAt: new Date().toISOString(), source: "focus-productora-onboarding" };
    localStorage.setItem("focus-productora-last-submission", JSON.stringify(payload));
    try {
      const accountEmail = String(data.contactEmail || data.businessEmail || "").trim().toLowerCase();
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboarding: payload,
          account: {
            email: accountEmail,
            password: portalPassword,
            passwordConfirmation: portalPasswordConfirmation,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo guardar la configuración");
      localStorage.removeItem("focus-productora-draft");
      setPortalPassword("");
      setPortalPasswordConfirmation("");
      setStatus("sent");
    } catch (submitError) {
      setSubmissionError(submitError instanceof Error ? submitError.message : "No se pudo guardar la configuración.");
      setStatus("error");
    }
  }

  return <FieldContext.Provider value={{ data, errors: fieldErrors, setValue, toggle }}><main>
    <aside className="sidebar"><a className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></a><p className="eyebrow">CONFIGURACIÓN INICIAL</p><nav>{steps.map(([name, detail], index) => <button type="button" key={name} className={index === step ? "nav-step current" : "nav-step"} onClick={() => goToStep(index)}><b>{String(index + 1).padStart(2, "0")}</b><span>{name}<small>{detail}</small></span></button>)}</nav><div className="help"><strong>¿Necesitas ayuda?</strong><p>Guardamos tu avance automáticamente.</p><a href="mailto:hola@focusbusiness.es">Contactar soporte →</a></div></aside>
    <section className="content"><header><div><p className="eyebrow">PASO {step + 1} DE {steps.length}</p><div className="progress"><i style={{ width: `${completion}%` }} /></div></div></header>
      <form onSubmit={submit} noValidate className="card">
        <button type="button" className="info-button" aria-label={`Abrir ayuda del paso ${step + 1}`} aria-expanded={helpOpen} onClick={() => setHelpOpen((open) => !open)}>i</button>
        {helpOpen && <aside className="step-help" aria-live="polite"><div><p className="eyebrow">GUÍA DEL PASO</p><h2>{helpByStep[step].title}</h2></div><button type="button" className="help-close" aria-label="Cerrar ayuda" onClick={() => setHelpOpen(false)}>×</button><dl>{helpByStep[step].items.map(([term, explanation]) => <div key={term}><dt>{term}</dt><dd>{explanation}</dd></div>)}</dl></aside>}
        {Object.keys(fieldErrors).length > 0 && <div className="validation-summary" role="alert"><strong>Revisa los campos marcados en rojo.</strong><p>Selecciona un aviso para ir directamente al campo.</p><ul>{Object.entries(fieldErrors).map(([field, message]) => <li key={field}><button type="button" onClick={() => focusField(field)}><span>{labels[field] || field}</span><small>{message}</small></button></li>)}</ul></div>}
        {step === 2 && <><section className="brand-color campaign-brief"><div><span className="color-label">Objetivo y público de la campaña</span><p>Define qué debe conseguir la publicidad, a quién debe atraer y a dónde enviaremos el tráfico.</p></div><div className="grid two"><Select field="campaignObjective" label="Objetivo principal de la campaña" items={["Generar solicitudes de presupuesto", "Conseguir reuniones", "Captar leads cualificados", "Promocionar un servicio audiovisual", "Dar visibilidad a la marca o portafolio", "Lanzar una producción, evento o servicio", "Otro / pendiente de definir"]} /><Select field="campaignConversion" label="Acción que debe realizar el lead" items={["Completar un formulario", "Reservar una reunión", "Solicitar presupuesto", "Llamar", "Iniciar conversación por WhatsApp", "Ver un VSL o pieza audiovisual", "Visitar el portafolio o sitio web"]} /><TextArea field="campaignAudience" label="Público al que quieres llegar" placeholder="Ej. responsables de marketing de empresas B2B en Madrid que necesitan vídeo corporativo o contenido recurrente." /><Select field="campaignDestination" label="Destino principal del tráfico" items={["Landing page", "Sitio web", "Formulario de captación", "Calendario de reservas", "WhatsApp Business", "Instagram / Facebook", "LinkedIn", "Otro"]} /></div></section><section id="field-additionalLeadQuestions" className={`field-group additional-questions${fieldErrors.additionalLeadQuestions ? " field-error" : ""}`}><p className="field-label">Preguntas que quieres hacer a tus leads o prospectos</p><p className="intro">Estas preguntas aparecerán en tus propios formularios de captación. Escribe una por línea. Ejemplos para una productora: “¿Qué pieza audiovisual necesitas?”, “¿Cuál es el objetivo de la campaña?”, “¿Qué presupuesto y fecha de entrega manejas?”.</p><textarea aria-label="Preguntas que quieres hacer a tus leads o prospectos" value={String(data.additionalLeadQuestions ?? "")} onChange={(e) => setValue("additionalLeadQuestions", e.target.value)} onInput={(event) => { const area = event.currentTarget; area.style.height = "auto"; area.style.height = `${area.scrollHeight}px`; }} placeholder="Escribe una pregunta por línea…" aria-invalid={Boolean(fieldErrors.additionalLeadQuestions)} aria-describedby={fieldErrors.additionalLeadQuestions ? "error-additionalLeadQuestions" : undefined} /><ErrorMessage field="additionalLeadQuestions" /></section><section className="brand-color landing-copy"><div><span className="color-label">Landing page, contenido y VSL</span><p>Indica qué debe incluir la página, quién preparará el copy y si quieres incorporar un vídeo de venta. No se suben archivos desde este formulario.</p></div><div className="grid two"><Select field="landingGoal" label="Objetivo principal de la landing" items={["Captar solicitudes de presupuesto", "Conseguir reuniones", "Presentar un servicio", "Mostrar portafolio o casos de éxito", "Promocionar un evento o lanzamiento", "Otro / pendiente de definir"]} /><TextArea field="landingSections" label="Secciones o contenido que te gustaría incluir" placeholder="Ej. cabecera, servicios, reel/portafolio, proceso, casos de éxito, testimonios, preguntas frecuentes y formulario." /></div><div className="grid two"><Select field="landingCopyOwner" label="Responsable del copy" items={["Cliente", "Focus Business", "En conjunto"]} /><TextArea field="landingCopyBrief" label="Copy, referencias y CTA" placeholder="Pega el copy o indica referencias, mensaje principal y CTA. Ej.: Solicitar presupuesto." /></div><div className="grid three"><Select field="landingVslChoice" label="¿Quieres incorporar un VSL?" items={["No", "Sí, ya tenemos el vídeo", "Sí, hay que producirlo", "Pendiente de decidir"]} /><Text field="landingVslUrl" label="Enlace del VSL o material existente" placeholder="URL de Drive, YouTube, Vimeo u otro recurso autorizado" /><TextArea field="landingVslNotes" label="Indicaciones para el VSL" placeholder="Duración, mensaje, formato, portavoz, CTA o referencias." /></div><p className="intro">Si el VSL aún no existe, esta respuesta sirve para planificarlo. La carga y publicación del vídeo se coordinarán después.</p></section></>}
        {step === 4 && <><h1>Automatizaciones e integraciones</h1><p className="intro">Selecciona lo que quieres poner en marcha desde el inicio. Podrás ampliar el sistema después.</p><section className="purpose-note"><strong>Autorización segura de integraciones</strong><p>Las conexiones se autorizan después mediante OAuth cuando el proveedor lo permita. No pegues contraseñas, tokens, claves API ni códigos de acceso en este formulario.</p></section><Multi field="toolsInUse" title="Herramientas que usan actualmente" items={toolOptions} /><Multi field="toolsToConnect" title="Herramientas que quieren conectar" items={toolOptions} /><Multi field="workflowAutomations" title="Automatizaciones del flujo de trabajo" items={workflowOptions} /><Multi field="whatsappAutomations" title="Automatizaciones de WhatsApp" items={whatsappOptions} /><CostNotice visible={asArray(data.toolsToConnect).includes("WhatsApp") || asArray(data.whatsappAutomations).length > 0}>La conexión mediante WhatsApp Business Platform o un proveedor puede generar cargos externos según el uso y el proveedor elegido.</CostNotice><Multi field="emailAutomations" title="Automatizaciones de correo" items={emailOptions} /><Multi field="adPlatforms" title="Gestión de anuncios" items={adOptions} /><CostNotice visible={asArray(data.adPlatforms).some((item) => item !== "No gestionamos anuncios")}>La inversión publicitaria se abona directamente a la plataforma seleccionada y es independiente de la configuración.</CostNotice><div className="grid two"><Select field="adAccess" label="Acceso a las cuentas publicitarias" items={["No aplica", "Tengo acceso de administrador", "Puedo invitar a Focus Business", "Necesito ayuda para encontrar el acceso"]} /><Select field="adMeeting" label="Reunión para verificar los anuncios" items={["No aplica", "Sí, solicitar reunión", "Ya hay una reunión programada"]} /></div><section id="meta-access" className="meta-access"><div><span className="color-label">Accesos opcionales para configurar Meta</span><p>Si se gestionará Meta, revisa por separado el negocio, la página de Facebook y la cuenta publicitaria. Focus Business enviará el nombre y correo exactos de la persona que debe recibir el acceso. No compartas contraseñas.</p></div><div className="grid three"><Select field="metaBusinessAccess" label="Meta Business Suite / portafolio" items={["No aplica", "Pendiente", "Puedo otorgar acceso", "Acceso enviado", "Necesito ayuda"]} /><Select field="metaPageAccess" label="Página de Facebook" items={["No aplica", "Pendiente", "Puedo otorgar acceso", "Acceso enviado", "Necesito ayuda"]} /><Select field="metaAdsAccess" label="Administrador de anuncios" items={["No aplica", "Pendiente", "Puedo otorgar acceso", "Acceso enviado", "Necesito ayuda"]} /></div><Select field="metaPaymentStatus" label="Método de pago para anuncios" items={["No aplica", "Ya está configurado en la cuenta publicitaria", "Pendiente de configurar por la empresa", "Necesito ayuda"]} /><div className="guide-cards"><a href="/guias/meta-business?returnStep=4"><b>Meta Business Suite</b><span>Ver guía paso a paso →</span></a><a href="/guias/facebook-page?returnStep=4"><b>Página de Facebook</b><span>Ver guía paso a paso →</span></a><a href="/guias/ads-manager?returnStep=4"><b>Administrador de anuncios</b><span>Ver guía y método de pago →</span></a></div><p className="meta-warning">El control total es un permiso sensible. Concédelo únicamente a la persona confirmada por Focus Business y redúcelo o retíralo cuando termine la configuración.</p></section><label id="field-exceptions" className={`input full${fieldErrors.exceptions ? " field-error" : ""}`}><span>Excepciones o integraciones adicionales</span><textarea value={String(data.exceptions ?? "")} onChange={(e) => setValue("exceptions", e.target.value)} placeholder="Cuéntanos cualquier ajuste, excepción o herramienta que debamos considerar." aria-invalid={Boolean(fieldErrors.exceptions)} aria-describedby={fieldErrors.exceptions ? "error-exceptions" : undefined} /><ErrorMessage field="exceptions" /></label></>}
        {step === 0 && <><h1>Empresa y preparación de la subcuenta</h1><p className="intro">Estos datos se usan solo para configurar la captación y preparar una futura subcuenta de GoHighLevel. No la crean ni solicitan credenciales.</p><p className="completion-callout">Tómate el tiempo necesario para completar el formulario con la mayor cantidad de datos que conozcas. Cuanto más completa sea la información, mejor podremos orientar la campaña, el posicionamiento y la configuración del sistema.</p><div className="grid three"><Text field="companyName" label="Nombre comercial" placeholder="Ej. Productora Norte" /><Text field="legalName" label="Razón social" placeholder="Ej. Productora Norte S.L." /><Text field="ownerName" label="Propietario o representante legal" placeholder="Nombre y apellidos" /></div><div className="grid three"><Text field="businessEmail" label="Email corporativo" placeholder="hola@productora.com" /><Text field="contactPhone" label="Teléfono corporativo" placeholder="+34 ..." /><Text field="website" label="Página web" placeholder="https://tudominio.com" /></div><div className="grid three"><Select field="activity" label="Actividad principal" items={["Productora audiovisual", "Agencia creativa", "Estudio de fotografía", "Eventos", "Marketing", "Otra"]} /><Text field="legalAddress" label="Dirección comercial o legal" placeholder="Calle, número y oficina" /><Text field="legalCity" label="Ciudad" placeholder="Madrid" /></div><div className="grid three"><Text field="legalCountry" label="País" placeholder="España" /><Select field="timezone" label="Zona horaria" items={["Europe/Madrid", "Europe/Lisbon", "America/Mexico_City", "America/Bogota", "America/Santiago", "America/Argentina/Buenos_Aires", "Otra"]} /><Select field="primaryLanguage" label="Idioma principal" items={["Español", "Portugués", "Inglés", "Francés", "Italiano", "Alemán", "Otro"]} /></div><div className="grid three"><Text field="location" label="Ciudad / país principal de operación" placeholder="Madrid, España" /><Select field="teamSize" label="Tamaño del equipo" items={["Solo/a", "2–5", "6–10", "11–25", "26–50", "+50"]} /><TextArea field="description" label="Descripción breve" placeholder="Qué hacéis, qué os diferencia y qué proyectos buscáis." /></div><section className="brand-color"><div><span className="color-label">Datos de facturación administrativa</span><p>Solo datos empresariales necesarios para preparar la configuración. No incluyas tarjeta, cuenta bancaria ni información de pago.</p></div><div className="grid two"><Text field="billingLegalName" label="Nombre o razón social de facturación" placeholder="Productora Norte S.L." /><Text field="billingTaxId" label="NIF/CIF u otro identificador fiscal empresarial" placeholder="B12345678" /></div><div className="grid two"><Text field="billingAddress" label="Dirección de facturación" placeholder="Dirección completa" /><Text field="billingEmail" label="Email de facturación" placeholder="facturacion@productora.com" /></div></section><section className="brand-color"><div><span className="color-label">Recursos e identidad visual · recomendado para personalizar</span><p>Comparte una carpeta de Google Drive con logos, imágenes, vídeos, PDFs y referencias. Esto no concede acceso a ninguna cuenta.</p></div><Text field="driveAssetsUrl" label="Carpeta de recursos en Google Drive" placeholder="https://drive.google.com/drive/folders/..." /><p className="selection-limit">Selecciona hasta 3 colores de marca. Puedes usar el selector o pegar el código hexadecimal.</p><div className="grid three"><ColorField field="brandPrimaryColor" label="Color corporativo primario" fallback="#D4AF37" /><ColorField field="brandSecondaryColor" label="Color corporativo secundario" fallback="#101D2D" /><ColorField field="brandAccentColor" label="Tercer color corporativo" fallback="#FFFFFF" /></div><div className="grid two"><FontField field="headingFont" label="Tipografía de títulos" items={headingFontOptions} /><FontField field="bodyFont" label="Tipografía de textos" items={bodyFontOptions} /></div></section></>}
        {step === 1 && <><h1>Oferta y configuración de prospección</h1><p className="intro">Define con precisión qué vendes y qué empresas deben buscarse. Estos datos configuran automáticamente la prueba y el dashboard.</p><div className="grid three"><Text field="mainService" label="Servicio prioritario que quieres promover" placeholder="Ej. Vídeo corporativo recurrente para empresas B2B" /><Select field="ticket" label="Valor habitual del servicio" items={["< 1.000 €", "1.000–3.000 €", "3.000–8.000 €", "8.000–20.000 €", "+20.000 €"]} /><Select field="priceModel" label="Modelo de precio" items={["Presupuesto personalizado", "Precio cerrado", "Retainer mensual", "Suscripción", "Comisión"]} /></div><div className="grid three"><Select field="monthlyCapacity" label="Capacidad mensual para nuevos proyectos" items={["1 proyecto", "2–3 proyectos", "4–6 proyectos", "7–10 proyectos", "Más de 10", "Depende del alcance"]} /><TextArea field="portfolioHighlights" label="Casos de éxito o portafolio (si corresponde)" placeholder="Ej. URL del portafolio y 2–3 proyectos relevantes, sector, resultado y tipo de pieza." /><TextArea field="referenceCompanies" label="Empresas de referencia que te gustaría captar" placeholder="Ej. marcas similares a clientes rentables actuales. Una empresa por línea; no incluyas datos privados." /></div><Multi field="services" title="Servicios concretos que quieres impulsar" items={options.services} otherField="servicesOther" otherLabel="¿Qué otro servicio quieres impulsar? Ej. vídeo de casos de éxito" /><Multi field="audience" title="¿A qué público vendes?" items={options.audience} /><div className="grid two"><Multi field="sectors" title="Sectores prioritarios (elige solo los que realmente encajan)" items={options.sectors} otherField="sectorsOther" otherLabel="¿Qué otro sector es prioritario?" /><Multi field="targetClientTypes" title="Tipos de cliente objetivo" items={options.clientTypes} otherField="targetClientTypesOther" otherLabel="Describe el otro tipo de cliente" /></div><div className="grid two"><Multi field="geographies" title="Mercados generales" items={options.geographies} otherField="geographiesOther" otherLabel="Escribe el otro mercado o zona" /><Multi field="targetCountries" title="Países concretos donde quieres captar" items={options.countries} otherField="targetCountriesOther" otherLabel="Escribe el otro país" /><Multi field="targetRegions" title="Regiones específicas para la segmentación" items={availableRegions} otherField="targetRegionsOther" otherLabel="Escribe la otra región, provincia, estado o zona" /></div><div className="grid two"><Text field="targetCity" label="Ciudad objetivo principal" placeholder="Ej. Madrid; escribe 'Sin preferencia' si aplica" /><Text field="targetRegion" label="Región o zona objetivo" placeholder="Ej. Comunidad de Madrid, radio de 100 km" /></div><div className="grid three"><Select field="idealCompanySize" label="Tamaño ideal de empresa" items={["Autónomos", "1–10 empleados", "11–50 empleados", "51–200 empleados", "201–1.000 empleados", "+1.000 empleados"]} /><Text field="decisionMaker" label="Cargo que suele decidir la compra" placeholder="Ej. Dirección de marketing o CEO" /><Text field="minimumBudget" label="Valor o presupuesto mínimo aceptable" placeholder="Ej. proyectos desde 3.000 €" /></div><TextArea field="idealProfileDetail" label="Perfil ideal detallado" placeholder="Ej. empresa privada B2B, 11–50 empleados, equipo de marketing activo, publica contenido y contrata proveedores externos." /><TextArea field="prospectPreferences" label="Preferencias y señales que mejoran el encaje" placeholder="Ej. está contratando marketing, lanza productos, abre sedes o anuncia campañas." /><TextArea field="prospectExclusions" label="Exclusiones de prospección" placeholder="Ej. clientes actuales, competidores directos, administración pública, empresas sin web o fuera de España." /></>}
        {step === 2 && <><h1>Captación y proceso comercial</h1><p className="intro">Así convertiremos cada contacto en una oportunidad ordenada y medible.</p><Multi field="objectives" title="Objetivos prioritarios" items={options.objectives} /><Multi field="channels" title="Canales por los que llegan los contactos" items={options.channels} /><Multi field="leadFields" title="Datos que quieres pedir a cada contacto" items={options.leadFields} otherField="leadFieldsOther" otherLabel="Escribe el otro dato que quieres solicitar" /><LeadQuestionBuilder /><div className="grid three"><Select field="responseTime" label="¿En cuánto tiempo quieres responder?" items={["En 5 minutos", "En 15 minutos", "En 1 hora", "En 4 horas", "En 24 horas"]} /><Select field="assignment" label="¿Quién recibe cada contacto?" items={["Siempre la misma persona", "Repartir por turnos", "Según el servicio solicitado", "Decidirlo manualmente"]} /><Select field="salesCycle" label="¿Cuánto tarda un cliente en decidir?" items={["Menos de 1 semana", "1–2 semanas", "3–6 semanas", "Más de 6 semanas"]} /></div><TextArea field="qualification" label="¿Qué condiciones debe cumplir un buen contacto?" placeholder="Ej. Tiene una necesidad real, presupuesto disponible y quiere empezar en los próximos 90 días." /></>}
        {step === 3 && <><h1>Equipo, acceso futuro y comunicación</h1><p className="intro">Identificamos a las personas y roles que se prepararán en la futura subcuenta. No solicites contraseñas ni accesos.</p><div className="grid three"><Text field="contactName" label="Contacto principal" placeholder="Nombre y apellidos" /><Text field="contactRole" label="Cargo" placeholder="Ej. Dirección comercial" /><Text field="contactEmail" label="Correo corporativo del contacto" placeholder="email@empresa.com" /></div><div className="grid two"><Text field="contactPhone" label="Teléfono / WhatsApp de trabajo" placeholder="+34 ..." /><TextArea field="initialTeamRoles" label="Equipo y roles iniciales" placeholder="Una persona por línea. Ej.: Ana Pérez — Administradora; Luis Gómez — Comercial; Marta Ruiz — Solo lectura." /></div><TextArea field="companySocialLinks" label="Redes sociales oficiales" placeholder="Una URL por línea: LinkedIn, Instagram, YouTube, Facebook..." /><div className="grid three"><Text field="bookingName" label="Nombre de la reunión" placeholder="Ej. Reunión de diagnóstico" /><Select field="meetingDuration" label="Duración" items={["15 minutos", "30 minutos", "45 minutos", "60 minutos"]} /><Select field="availability" label="Días disponibles" items={["Lunes–viernes", "Lunes–jueves", "Todos los días", "Variable"]} /></div><div className="grid two"><Text field="schedule" label="Horario de atención" placeholder="09:00–18:00" /><Select field="pronoun" label="Tratamiento" items={["Tú", "Usted", "Indiferente"]} /></div><Select field="communicationTone" label="Tono de comunicación" items={["Cercano", "Profesional", "Directo", "Premium"]} /></>}
        {step === 5 && <><h1>Revisión y preparación</h1><p className="intro">El envío crea la configuración de prospección y deja la futura subcuenta preparada para revisión. No crea GoHighLevel ni ejecuta mensajes.</p><div className="summary"><p><b>Empresa</b>{String(data.companyName || "Pendiente")}</p><p><b>Oferta principal</b>{String(data.mainService || "Pendiente")}</p><p><b>Cliente objetivo</b>{asArray(data.targetClientTypes).join(", ") || "Pendiente"}</p><p><b>Países</b>{asArray(data.targetCountries).join(", ") || "Pendiente"}</p><p><b>Preparación GHL</b>Lista para validación; sin crear subcuenta</p></div><div className="grid two"><Text field="launchDate" label="Fecha objetivo de lanzamiento" placeholder="Ej. 15/09/2026" /><Text field="approvalOwner" label="Responsable de aprobación" placeholder="Nombre y cargo" /></div><section className="portal-account"><div><span className="color-label">Acceso a los portales de Focus Business</span><p>Utilizarás el correo de contacto y una contraseña sencilla. Debe tener un mínimo de 6 caracteres, con al menos una letra y un número. No exige mayúsculas ni símbolos.</p></div><p className="portal-account-email"><b>Correo de acceso</b>{String(data.contactEmail || data.businessEmail || "Añade un correo de contacto")}</p><div className="grid two"><label id="field-portalPassword" className={`input${fieldErrors.portalPassword ? " field-error" : ""}`}><span>Contraseña</span><input type="password" value={portalPassword} onChange={(event) => { setPortalPassword(event.target.value); clearFieldError("portalPassword"); }} placeholder="Ej. estudio8" autoComplete="new-password" minLength={6} maxLength={128} aria-invalid={Boolean(fieldErrors.portalPassword)} aria-describedby={fieldErrors.portalPassword ? "error-portalPassword" : undefined} /><ErrorMessage field="portalPassword" /></label><label id="field-portalPasswordConfirmation" className={`input${fieldErrors.portalPasswordConfirmation ? " field-error" : ""}`}><span>Repite la contraseña</span><input type="password" value={portalPasswordConfirmation} onChange={(event) => { setPortalPasswordConfirmation(event.target.value); clearFieldError("portalPasswordConfirmation"); }} placeholder="Repite la misma contraseña" autoComplete="new-password" minLength={6} maxLength={128} aria-invalid={Boolean(fieldErrors.portalPasswordConfirmation)} aria-describedby={fieldErrors.portalPasswordConfirmation ? "error-portalPasswordConfirmation" : undefined} /><ErrorMessage field="portalPasswordConfirmation" /></label></div><p className="portal-account-note">Recibirás un enlace para confirmar el correo. La contraseña no se guarda en Google Sheets ni se envía por correo.</p></section><div id="field-accuracy" className={`check-field${fieldErrors.accuracy ? " field-error" : ""}`}><label className="check"><input type="checkbox" checked={Boolean(data.accuracy)} onChange={(e) => setValue("accuracy", e.target.checked)} aria-invalid={Boolean(fieldErrors.accuracy)} aria-describedby={fieldErrors.accuracy ? "error-accuracy" : undefined} /> Confirmo que los datos facilitados son correctos.</label><ErrorMessage field="accuracy" /></div><div id="field-terms" className={`check-field${fieldErrors.terms ? " field-error" : ""}`}><label className="check"><input type="checkbox" checked={Boolean(data.terms)} onChange={(e) => setValue("terms", e.target.checked)} aria-invalid={Boolean(fieldErrors.terms)} aria-describedby={fieldErrors.terms ? "error-terms" : undefined} /> Autorizo el uso de estos datos exclusivamente para configurar la captación y preparar la futura subcuenta.</label><ErrorMessage field="terms" /></div><div id="field-ghlPreparationAuthorization" className={`check-field${fieldErrors.ghlPreparationAuthorization ? " field-error" : ""}`}><label className="check"><input type="checkbox" checked={Boolean(data.ghlPreparationAuthorization)} onChange={(e) => setValue("ghlPreparationAuthorization", e.target.checked)} aria-invalid={Boolean(fieldErrors.ghlPreparationAuthorization)} aria-describedby={fieldErrors.ghlPreparationAuthorization ? "error-ghlPreparationAuthorization" : undefined} /> Autorizo a Focus Business a preparar y validar estos datos para una creación posterior aprobada de la subcuenta. Entiendo que este envío no la crea ni conecta.</label><ErrorMessage field="ghlPreparationAuthorization" /></div>{status === "sent" && <div className="notice success">Configuración enviada. Revisa tu correo para confirmar la cuenta y acceder a los portales.</div>}{status === "error" && <div className="notice error">{submissionError || "No se pudo enviar la configuración. Inténtalo de nuevo; el borrador permanece guardado en este dispositivo."}</div>}</>}
        {step === 3 && <details className="setup-disclosure domain-disclosure"><summary>Dominio para configurar GoHighLevel</summary><div className="domain-option-heading"><span>OPCIÓN 1 · RECOMENDADA</span><h2>Buscar un dominio nuevo</h2><p>El dominio elegido se utilizará para configurar la cuenta de GoHighLevel, sus subdominios, el portal, las páginas de aterrizaje y el envío de correos automáticos.</p></div><DomainSearch /><details className="domain-own-option"><summary><span>Opción 2 · utilizar un dominio ya registrado</span><b>MÁS COMPLEJA</b></summary><div><div className="domain-warning-detailed"><h3>Por qué no recomendamos esta opción</h3><p>Utilizar un dominio que ya está en uso obliga a coordinar cambios técnicos con la persona o proveedor que lo administra. Un registro incorrecto puede afectar temporalmente la web o el correo de la empresa.</p><ul><li>Necesitaremos una videollamada con la persona que tenga acceso al registrador o DNS.</li><li>Habrá que identificar qué servicios actuales dependen del dominio antes de modificarlo.</li><li>Se crearán y verificarán varios subdominios para portal, páginas, formularios y correo.</li><li>La autenticación de correo puede requerir registros SPF, DKIM y DMARC sin sobrescribir los existentes.</li><li>Los cambios dependen del proveedor y pueden tardar por la propagación DNS.</li><li>Si el acceso no está disponible o lo gestiona un tercero, la configuración puede quedar detenida hasta coordinarlo.</li></ul><p><b>Elige esta opción únicamente si necesitas conservar tu dominio actual y puedes facilitar la coordinación técnica.</b> Si buscas una configuración más rápida y aislada de tu web y correo actuales, utiliza la opción recomendada.</p></div><div className="grid two"><Text field="existingDomainName" label="Dominio que ya tienes registrado" placeholder="Ej. tuproductora.com" /><Select field="existingDomainAccess" label="¿Quién puede configurar el dominio?" items={["Yo tengo acceso al registrador", "Lo gestiona otra persona o proveedor", "Necesito ayuda para localizar el acceso", "No lo sé"]} /><Select field="existingDomainMeeting" label="Videollamada para la configuración" items={["Puedo realizarla", "Necesito coordinar fecha", "Prefiero utilizar la opción recomendada"]} /><Select field="subdomainPurpose" label="Uso principal" items={["Cuenta y portal de GoHighLevel", "Landing pages y formularios", "Correos automáticos", "Todo lo anterior", "Otro"]} /></div><ul><li>Se crearán los subdominios necesarios.</li><li>Se configurarán CNAME y registros de verificación.</li><li>Para el correo se revisarán SPF, DKIM y DMARC cuando corresponda.</li><li>La propagación DNS puede tardar de minutos a horas.</li></ul><p>No escribas contraseñas ni claves del registrador en este formulario.</p></div></details></details>}
        {step === 4 && <><details className="setup-disclosure"><summary>Integración oficial de WhatsApp Business</summary><div className="purpose-note"><strong>Conexión independiente</strong><p>WhatsApp se conecta después mediante la integración oficial de WhatsApp Business Platform disponible en GoHighLevel. No escribas contraseñas, códigos ni claves en este formulario.</p></div><div className="grid three"><Select field="whatsappSetup" label="¿Quieres incorporar WhatsApp?" items={["No", "Sí, conectar WhatsApp Business", "Ya utilizamos WhatsApp Business", "Necesitamos asesoramiento"]} /><Select field="whatsappBusinessAccount" label="Estado de WhatsApp Business" items={["Cuenta de WhatsApp Business activa", "Tenemos número, falta preparar la cuenta", "Necesitamos crear o revisar la cuenta", "No lo sé"]} /><Text field="whatsappDisplayNumber" label="Número de WhatsApp Business" placeholder="Indícalo solo si ya existe" /></div><Select field="whatsappCostAcceptance" label="Información sobre costes" items={["Entiendo que WhatsApp puede generar cargos directos de la plataforma", "Necesito recibir información antes de decidir", "No aplica"]} /><a className="guide-link" href="/guias/whatsapp?returnStep=4">Ver guía completa de WhatsApp Business →</a><p className="intro">El envío del formulario no conecta WhatsApp ni activa mensajes.</p></details><details className="setup-disclosure"><summary>Llamadas desde GoHighLevel</summary><div className="purpose-note"><strong>Telefonía con coste adicional</strong><p>Para un sistema telefónico completo suele utilizarse un número contratado o portado a GoHighLevel. En algunos casos se puede verificar un número existente para llamadas salientes. La plataforma puede cobrar por el número, las llamadas y funciones como la grabación. No se activa nada al enviar este formulario.</p></div><div className="grid three"><Select field="callingSetup" label="¿Harán llamadas desde la plataforma?" items={["No", "Sí, llamadas salientes", "Sí, llamadas entrantes y salientes", "Necesitamos asesoramiento"]} /><Select field="callingNumberChoice" label="Configuración del número de llamadas" items={["Necesitamos comprar o portar un número", "Queremos verificar un número existente para llamadas salientes", "Ya tenemos telefonía configurada", "Necesitamos revisar disponibilidad y costes"]} /><Text field="callingDisplayNumber" label="Número local que quieren mostrar al cliente" placeholder="Ej. +34...; se verificará compatibilidad y normativa" /></div><div className="grid two"><Select field="callRecording" label="¿Se grabarán las llamadas?" items={["Sí, cuando sea legal y esté informado", "No", "Pendiente de revisión legal"]} /><Select field="callRecordingNotice" label="Confirmación sobre grabación" items={["Informaremos y obtendremos los consentimientos necesarios", "Necesitamos asesoramiento legal", "No aplica"]} /></div><a className="guide-link" href="/guias/telefonia?returnStep=4">Ver guía de telefonía y costes →</a><p className="intro">Mostrar un número local depende de que pueda verificarse y de la disponibilidad del país. La grabación debe cumplir la normativa aplicable.</p></details></>}
        <footer><button type="button" className="secondary" onClick={() => goToStep(Math.max(0, step - 1))} disabled={step === 0}>← Anterior</button>{step < steps.length - 1 ? <button type="button" className="primary" onClick={() => { if (validate(step)) goToStep(step + 1); }}>Continuar →</button> : <button className="primary" type="submit" disabled={status === "saving"}>{status === "saving" ? "Enviando…" : "Enviar configuración →"}</button>}</footer>
      </form>
    </section>
  </main></FieldContext.Provider>;
}
