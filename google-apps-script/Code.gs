/*
 * Vincular este script a la hoja "Focus Business - Onboarding de Productoras",
 * implementar como aplicación web y pegar su URL en GOOGLE_SHEETS_WEBHOOK_URL.
 * Acceso recomendado: solo usuarios autorizados de Focus Business.
 */
const ONBOARDING_SHEET_ID = "1FTWbZ1gDpA4RezEz89w9PmbRjwx_2bX2mhzF67V8wiE";
const ONBOARDING_TAB = "Onboarding";
const ACCESS_TAB = "Accesos";

function doPost(e) {
  const data = JSON.parse(e.postData.contents || "{}");
  const sheet = SpreadsheetApp.openById(ONBOARDING_SHEET_ID).getSheetByName(ONBOARDING_TAB);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = headers.map((header) => valueFor(header, data));
  sheet.appendRow(values);
  return ContentService.createTextOutput(JSON.stringify({ ok: true, row: sheet.getLastRow() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function valueFor(header, data) {
  const fields = {
    "ID registro": () => `ONB-${Utilities.getUuid().slice(0, 8).toUpperCase()}`,
    "Fecha envío": () => new Date(),
    "Estado": () => "Nuevo",
    "Empresa": () => data.companyName,
    "Razón social": () => data.legalName,
    "Web": () => data.website,
    "Actividad": () => data.activity,
    "Ciudad / país": () => data.location,
    "Tamaño equipo": () => data.teamSize,
    "Descripción": () => data.description,
    "Color marca": () => data.brandColor,
    "Logo URL": () => data.logoUrl,
    "Tono marca": () => data.formality,
    "Servicio prioritario": () => data.mainService,
    "Ticket medio": () => data.ticket,
    "Modelo de precio": () => data.priceModel,
    "Servicios": () => asText(data.services), "Público": () => asText(data.audience), "Sectores": () => asText(data.sectors), "Mercados": () => asText(data.geographies),
    "Tamaño empresa ideal": () => data.idealCompanySize, "Decisor habitual": () => data.decisionMaker, "Presupuesto mínimo": () => data.minimumBudget,
    "Objetivos": () => asText(data.objectives), "Canales": () => asText(data.channels), "Campos del lead": () => asText(data.leadFields),
    "Tiempo de respuesta": () => data.responseTime, "Asignación de leads": () => data.assignment, "Ciclo de venta": () => data.salesCycle, "Criterio de cualificación": () => data.qualification,
    "Responsable": () => data.contactName, "Cargo": () => data.contactRole, "Email responsable": () => data.contactEmail, "Teléfono / WhatsApp": () => data.contactPhone,
    "Nombre reunión": () => data.bookingName, "Duración reunión": () => data.meetingDuration, "Disponibilidad": () => data.availability, "Horario": () => data.schedule,
    "Tratamiento": () => data.pronoun, "Tono comunicación": () => data.communicationTone, "Automatizaciones": () => asText(data.automations), "Integraciones": () => asText(data.integrations),
    "Cuenta GoHighLevel": () => data.existingGhl, "Google Sheets": () => data.sheets, "Excepciones": () => data.exceptions, "Fecha lanzamiento": () => data.launchDate,
    "Responsable aprobación": () => data.approvalOwner, "Datos correctos": () => Boolean(data.accuracy), "Autorización": () => Boolean(data.terms),
  };
  return fields[header] ? (fields[header]() || "") : "";
}

function asText(value) { return Array.isArray(value) ? value.join(", ") : (value || ""); }

function doGet(e) {
  if (e.parameter.action !== "portal" || !isPortalToken(e.parameter.token)) return json({ ok: false, error: "No autorizado" });
  const user = findActiveUser(e.parameter.email || "");
  if (!user) return json({ ok: false, error: "Acceso revocado o no autorizado" });
  const sheet = SpreadsheetApp.openById(ONBOARDING_SHEET_ID).getSheetByName(ONBOARDING_TAB);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const records = values
    .filter((row) => row[0] && row[0] !== "Pendiente de primer envío")
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] instanceof Date ? row[index].toISOString() : String(row[index] || "")] )));
  return json({ ok: true, role: user.role, records });
}

function findActiveUser(email) {
  const rows = SpreadsheetApp.openById(ONBOARDING_SHEET_ID).getSheetByName(ACCESS_TAB).getDataRange().getValues();
  const headers = rows.shift();
  const emailIndex = headers.indexOf("Correo autorizado");
  const roleIndex = headers.indexOf("Rol");
  const statusIndex = headers.indexOf("Estado");
  const match = rows.find((row) => String(row[emailIndex]).toLowerCase() === String(email).toLowerCase() && row[statusIndex] === "Activo");
  return match ? { role: match[roleIndex] } : null;
}

function isPortalToken(token) { return token && token === PropertiesService.getScriptProperties().getProperty("FOCUS_PORTAL_TOKEN"); }
function json(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
