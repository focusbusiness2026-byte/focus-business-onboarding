/*
 * Vincular este script a la hoja "Focus Business - Onboarding de Productoras",
 * implementar como aplicación web y pegar su URL en GOOGLE_SHEETS_WEBHOOK_URL.
 * Implementar ejecutando como propietario y permitir acceso a cualquier usuario.
 * Las lecturas y escrituras quedan protegidas por FOCUS_PORTAL_TOKEN.
 */
const ONBOARDING_SHEET_ID = "1FTWbZ1gDpA4RezEz89w9PmbRjwx_2bX2mhzF67V8wiE";
const ONBOARDING_TAB = "Onboarding";
const ACCESS_TAB = "Accesos";
const ONBOARDING_HEADERS = [
  "ID registro", "Fecha envío", "Estado", "Empresa", "Razón social", "Web", "Actividad", "Ciudad / país", "Tamaño equipo", "Descripción", "Color marca", "Logo URL", "Tono marca",
  "Servicio prioritario", "Ticket medio", "Modelo de precio", "Servicios", "Público", "Sectores", "Mercados", "Tamaño empresa ideal", "Decisor habitual", "Presupuesto mínimo",
  "Objetivos", "Canales", "Campos del lead", "Tiempo de respuesta", "Asignación de leads", "Ciclo de venta", "Criterio de cualificación",
  "Responsable", "Cargo", "Email responsable", "Teléfono / WhatsApp", "Nombre reunión", "Duración reunión", "Disponibilidad", "Horario", "Tratamiento", "Tono comunicación",
  "Automatizaciones", "Integraciones", "Cuenta GoHighLevel", "Google Sheets", "Excepciones", "Fecha lanzamiento", "Responsable aprobación", "Datos correctos", "Autorización", "Subcuenta GHL", "Config. técnica URL", "Notas internas",
  "Recursos Drive", "Color corporativo primario", "Color corporativo secundario", "Tipografía títulos", "Tipografía textos", "Preguntas adicionales", "Herramientas actuales", "Herramientas a conectar",
  "Automatizaciones workflow", "Automatizaciones WhatsApp", "Automatizaciones email", "Plataformas anuncios", "Acceso anuncios", "Reunión anuncios",
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    if (!isPortalToken(data._focusToken)) return json({ ok: false, error: "No autorizado" });
    if (data.action === "delete") return deleteRecord(data.id);
    const sheet = onboardingSheet();
    const id = `ONB-${Utilities.getUuid().slice(0, 8).toUpperCase()}`;
    const values = ONBOARDING_HEADERS.map((header) => valueFor(header, { ...data, _recordId: id }));
    sheet.appendRow(values);
    return json({ ok: true, id, row: sheet.getLastRow() });
  } catch (error) {
    return json({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function deleteRecord(id) {
  const sheet = onboardingSheet();
  const values = sheet.getDataRange().getValues();
  const idIndex = values[0].indexOf("ID registro");
  const rowIndex = values.findIndex((row, index) => index > 0 && String(row[idIndex]) === String(id));
  if (rowIndex < 1) return json({ ok: false, error: "El registro ya no existe" });
  sheet.deleteRow(rowIndex + 1);
  return json({ ok: true, id: String(id) });
}

function valueFor(header, data) {
  const fields = {
    "ID registro": () => data._recordId,
    "Fecha envío": () => data.submittedAt ? new Date(data.submittedAt) : new Date(),
    "Estado": () => "Nuevo",
    "Empresa": () => data.companyName,
    "Razón social": () => data.legalName,
    "Web": () => data.website,
    "Actividad": () => data.activity,
    "Ciudad / país": () => data.location,
    "Tamaño equipo": () => data.teamSize,
    "Descripción": () => data.description,
    "Color marca": () => data.brandPrimaryColor || data.brandColor,
    "Logo URL": () => data.logoUrl,
    "Tono marca": () => data.formality,
    "Servicio prioritario": () => data.mainService,
    "Ticket medio": () => data.ticket,
    "Modelo de precio": () => data.priceModel,
    "Servicios": () => withOther(data.services, data.servicesOther), "Público": () => asText(data.audience), "Sectores": () => withOther(data.sectors, data.sectorsOther), "Mercados": () => asText(data.geographies),
    "Tamaño empresa ideal": () => data.idealCompanySize, "Decisor habitual": () => data.decisionMaker, "Presupuesto mínimo": () => data.minimumBudget,
    "Objetivos": () => asText(data.objectives), "Canales": () => asText(data.channels), "Campos del lead": () => asText(data.leadFields),
    "Tiempo de respuesta": () => data.responseTime, "Asignación de leads": () => data.assignment, "Ciclo de venta": () => data.salesCycle, "Criterio de cualificación": () => data.qualification,
    "Responsable": () => data.contactName, "Cargo": () => data.contactRole, "Email responsable": () => data.contactEmail, "Teléfono / WhatsApp": () => data.contactPhone,
    "Nombre reunión": () => data.bookingName, "Duración reunión": () => data.meetingDuration, "Disponibilidad": () => data.availability, "Horario": () => data.schedule,
    "Tratamiento": () => data.pronoun, "Tono comunicación": () => data.communicationTone, "Automatizaciones": () => asText(data.automations), "Integraciones": () => asText(data.integrations),
    "Cuenta GoHighLevel": () => data.existingGhl, "Google Sheets": () => data.sheets, "Excepciones": () => data.exceptions, "Fecha lanzamiento": () => data.launchDate,
    "Responsable aprobación": () => data.approvalOwner, "Datos correctos": () => Boolean(data.accuracy), "Autorización": () => Boolean(data.terms),
    "Recursos Drive": () => data.driveAssetsUrl, "Color corporativo primario": () => data.brandPrimaryColor || data.brandColor,
    "Color corporativo secundario": () => data.brandSecondaryColor, "Tipografía títulos": () => data.headingFont, "Tipografía textos": () => data.bodyFont,
    "Preguntas adicionales": () => data.additionalLeadQuestions, "Herramientas actuales": () => asText(data.toolsInUse), "Herramientas a conectar": () => asText(data.toolsToConnect),
    "Automatizaciones workflow": () => asText(data.workflowAutomations), "Automatizaciones WhatsApp": () => asText(data.whatsappAutomations),
    "Automatizaciones email": () => asText(data.emailAutomations), "Plataformas anuncios": () => asText(data.adPlatforms),
    "Acceso anuncios": () => data.adAccess, "Reunión anuncios": () => data.adMeeting,
  };
  return fields[header] ? (fields[header]() || "") : "";
}

function asText(value) { return Array.isArray(value) ? value.join(", ") : (value || ""); }
function withOther(value, detail) { return Array.isArray(value) ? value.map((item) => item === "Otro" && detail ? `Otro: ${detail}` : item).join(", ") : (value || ""); }

function doGet(e) {
  try {
    if (e.parameter.action !== "portal" || !isPortalToken(e.parameter.token)) return json({ ok: false, error: "No autorizado" });
    const user = findActiveUser(e.parameter.email || "");
    if (!user) return json({ ok: false, error: "Acceso revocado o no autorizado" });
    const values = onboardingSheet().getDataRange().getValues();
    values.shift();
    const records = values
      .filter((row) => row[0] && row[0] !== "Pendiente de primer envío")
      .map((row) => Object.fromEntries(ONBOARDING_HEADERS.map((header, index) => [header, row[index] instanceof Date ? row[index].toISOString() : String(row[index] || "")] )));
    return json({ ok: true, role: user.role, records });
  } catch (error) {
    return json({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function onboardingSheet() {
  const sheet = SpreadsheetApp.openById(ONBOARDING_SHEET_ID).getSheetByName(ONBOARDING_TAB);
  const headers = sheet.getRange(1, 1, 1, ONBOARDING_HEADERS.length).getDisplayValues()[0];
  if (headers.some((header, index) => header !== ONBOARDING_HEADERS[index])) {
    throw new Error("La fila 1 de Onboarding no contiene los encabezados esperados.");
  }
  return sheet;
}

function findActiveUser(email) {
  const rows = SpreadsheetApp.openById(ONBOARDING_SHEET_ID).getSheetByName(ACCESS_TAB).getDataRange().getValues();
  const headers = rows.shift();
  const emailIndex = headers.indexOf("Correo autorizado");
  const roleIndex = headers.indexOf("Rol");
  const statusIndex = headers.indexOf("Estado");
  const normalized = String(email).trim().toLowerCase();
  const match = rows.find((row) => String(row[emailIndex]).trim().toLowerCase() === normalized && String(row[statusIndex]).trim().toLowerCase() === "activo");
  return match ? { role: match[roleIndex] } : null;
}

function isPortalToken(token) { return token && token === PropertiesService.getScriptProperties().getProperty("FOCUS_PORTAL_TOKEN"); }
function json(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
