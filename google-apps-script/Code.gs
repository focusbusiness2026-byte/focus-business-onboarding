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
  "Ciudad objetivo", "Región objetivo", "Países objetivo", "Tipos de cliente objetivo", "Perfil ideal detallado", "Exclusiones de prospección", "Preferencias de prospección", "Preparación prospección",
  "Propietario / representante", "Email corporativo", "Dirección legal", "Ciudad legal", "País legal", "Zona horaria", "Idioma principal", "Nombre facturación", "ID fiscal empresarial", "Dirección facturación", "Email facturación", "Redes oficiales", "Dominio/subdominio deseado", "Equipo y roles iniciales", "Autorización preparación GHL", "Preparación subcuenta GHL", "Validación subcuenta GHL",
  "Capacidad mensual", "Casos de éxito / portafolio", "Empresas de referencia", "Responsable copy landing", "Copy / referencias / CTA landing",
  "Tercer color corporativo", "Objetivo campaña", "Conversión campaña", "Público campaña", "Destino campaña", "Objetivo landing", "Contenido landing", "Uso VSL", "Enlace VSL", "Indicaciones VSL",
  "Acceso Meta Business", "Acceso página Facebook", "Acceso Ads Manager", "Método de pago Meta", "Regiones objetivo",
  "Incorporar WhatsApp", "Estado WhatsApp Business", "Número WhatsApp", "Zona número EE. UU.", "Número visible WhatsApp", "Confirmación costes WhatsApp",
  "Uso de llamadas", "Número para llamadas", "Número visible llamadas", "Grabación de llamadas", "Confirmación normativa grabación",
  "Configuración subdominio", "Uso del subdominio", "Subdominio preferido", "Subdominio alternativo", "Propiedad del dominio", "Estado acceso DNS", "Verificación subdominio", "Dominio opción 1", "Estado dominio 1", "Dominio opción 2", "Estado dominio 2", "Dominio opción 3", "Estado dominio 3", "Dominio existente", "Acceso dominio existente", "Reunión dominio existente",
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    if (!isPortalToken(data._focusToken)) return json({ ok: false, error: "No autorizado" });
    if (data.action === "delete") {
      const user = findActiveUser(data.email || "");
      if (!user) return json({ ok: false, error: "Acceso revocado o no autorizado" });
      return deleteRecord(data.id, user);
    }
    const sheet = onboardingSheet();
    const id = `ONB-${Utilities.getUuid().slice(0, 8).toUpperCase()}`;
    const values = ONBOARDING_HEADERS.map((header) => safeCellValue(valueFor(header, { ...data, _recordId: id })));
    sheet.appendRow(values);
    return json({ ok: true, id, row: sheet.getLastRow() });
  } catch (error) {
    return json({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function deleteRecord(id, user) {
  const sheet = onboardingSheet();
  const values = sheet.getDataRange().getValues();
  const idIndex = values[0].indexOf("ID registro");
  const rowIndex = values.findIndex((row, index) => index > 0 && String(row[idIndex]) === String(id));
  if (rowIndex < 1) return json({ ok: false, error: "El registro ya no existe" });
  if (!isAdminRole(user.role) && !recordBelongsToUser(values[rowIndex], values[0], user.email)) {
    return json({ ok: false, error: "No tienes permiso para borrar este registro" });
  }
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
    "Actividad": () => choiceWithOther(data.activity, data.activityOther),
    "Ciudad / país": () => data.location,
    "Tamaño equipo": () => data.teamSize,
    "Descripción": () => data.description,
    "Color marca": () => data.brandPrimaryColor || data.brandColor,
    "Logo URL": () => data.logoUrl,
    "Tono marca": () => data.formality,
    "Servicio prioritario": () => withOther(data.mainService, data.mainServiceOther),
    "Ticket medio": () => data.ticket,
    "Modelo de precio": () => data.priceModel,
    "Servicios": () => withOther(data.services, data.servicesOther), "Público": () => asText(data.audience), "Sectores": () => withOther(data.sectors, data.sectorsOther), "Mercados": () => withOther(data.geographies, data.geographiesOther),
    "Tamaño empresa ideal": () => data.idealCompanySize, "Decisor habitual": () => data.decisionMaker, "Presupuesto mínimo": () => data.minimumBudget,
    "Objetivos": () => asText(data.objectives), "Canales": () => asText(data.channels), "Campos del lead": () => withOther(data.leadFields, data.leadFieldsOther),
    "Tiempo de respuesta": () => data.responseTime, "Asignación de leads": () => data.assignment, "Ciclo de venta": () => data.salesCycle, "Criterio de cualificación": () => data.qualification,
    "Responsable": () => data.contactName, "Cargo": () => data.contactRole, "Email responsable": () => data.contactEmail, "Teléfono / WhatsApp": () => data.contactPhone,
    "Nombre reunión": () => data.bookingName, "Duración reunión": () => data.meetingDuration, "Disponibilidad": () => data.availability, "Horario": () => data.schedule,
    "Tratamiento": () => data.pronoun, "Tono comunicación": () => data.communicationTone, "Automatizaciones": () => asText(data.automations), "Integraciones": () => asText(data.integrations),
    "Cuenta GoHighLevel": () => data.existingGhl, "Google Sheets": () => data.sheets, "Excepciones": () => data.exceptions, "Fecha lanzamiento": () => data.launchDate,
    "Responsable aprobación": () => data.approvalOwner, "Datos correctos": () => Boolean(data.accuracy), "Autorización": () => Boolean(data.terms),
    "Recursos Drive": () => data.driveAssetsUrl, "Color corporativo primario": () => data.brandPrimaryColor || data.brandColor,
    "Color corporativo secundario": () => data.brandSecondaryColor, "Tercer color corporativo": () => data.brandAccentColor, "Tipografía títulos": () => data.headingFont, "Tipografía textos": () => data.bodyFont,
    "Preguntas adicionales": () => allLeadQuestions(data), "Objetivo campaña": () => choiceWithOther(data.campaignObjective, data.campaignObjectiveOther), "Conversión campaña": () => data.campaignConversion, "Público campaña": () => data.campaignAudience, "Destino campaña": () => choiceWithOther(data.campaignDestination, data.campaignDestinationOther), "Objetivo landing": () => choiceWithOther(data.landingGoal, data.landingGoalOther), "Contenido landing": () => data.landingSections, "Uso VSL": () => data.landingVslChoice, "Enlace VSL": () => data.landingVslUrl, "Indicaciones VSL": () => data.landingVslNotes, "Herramientas actuales": () => asText(data.toolsInUse), "Herramientas a conectar": () => asText(data.toolsToConnect),
    "Automatizaciones workflow": () => asText(data.workflowAutomations), "Automatizaciones WhatsApp": () => asText(data.whatsappAutomations),
    "Automatizaciones email": () => asText(data.emailAutomations), "Plataformas anuncios": () => asText(data.adPlatforms),
    "Acceso anuncios": () => data.adAccess, "Reunión anuncios": () => data.adMeeting, "Acceso Meta Business": () => data.metaBusinessAccess, "Acceso página Facebook": () => data.metaPageAccess, "Acceso Ads Manager": () => data.metaAdsAccess, "Método de pago Meta": () => data.metaPaymentStatus,
    "Ciudad objetivo": () => data.targetCity, "Región objetivo": () => data.targetRegion,
    "Países objetivo": () => withOther(data.targetCountries, data.targetCountriesOther), "Regiones objetivo": () => withOther(data.targetRegions, data.targetRegionsOther), "Tipos de cliente objetivo": () => withOther(data.targetClientTypes, data.targetClientTypesOther),
    "Perfil ideal detallado": () => data.idealProfileDetail, "Exclusiones de prospección": () => data.prospectExclusions, "Preferencias de prospección": () => data.prospectPreferences,
    "Preparación prospección": () => "Configuración lista para sincronizar", "Propietario / representante": () => data.ownerName, "Email corporativo": () => data.businessEmail,
    "Dirección legal": () => data.legalAddress, "Ciudad legal": () => data.legalCity, "País legal": () => data.legalCountry, "Zona horaria": () => choiceWithOther(data.timezone, data.timezoneOther), "Idioma principal": () => choiceWithOther(data.primaryLanguage, data.primaryLanguageOther),
    "Nombre facturación": () => data.billingLegalName, "ID fiscal empresarial": () => data.billingTaxId, "Dirección facturación": () => data.billingAddress, "Email facturación": () => data.billingEmail,
    "Redes oficiales": () => data.companySocialLinks, "Dominio/subdominio deseado": () => data.desiredDomain, "Equipo y roles iniciales": () => data.initialTeamRoles,
    "Autorización preparación GHL": () => Boolean(data.ghlPreparationAuthorization), "Preparación subcuenta GHL": () => "Lista para revisión; no creada", "Validación subcuenta GHL": () => "Pendiente de aprobación",
    "Capacidad mensual": () => data.monthlyCapacity, "Casos de éxito / portafolio": () => data.portfolioHighlights, "Empresas de referencia": () => data.referenceCompanies, "Responsable copy landing": () => data.landingCopyOwner, "Copy / referencias / CTA landing": () => data.landingCopyBrief,
    "Incorporar WhatsApp": () => data.whatsappSetup, "Estado WhatsApp Business": () => data.whatsappBusinessAccount, "Número WhatsApp": () => data.whatsappNumberChoice, "Zona número EE. UU.": () => data.whatsappUsNumberArea, "Número visible WhatsApp": () => data.whatsappDisplayNumber, "Confirmación costes WhatsApp": () => data.whatsappCostAcceptance,
    "Uso de llamadas": () => data.callingSetup, "Número para llamadas": () => data.callingNumberChoice, "Número visible llamadas": () => data.callingDisplayNumber, "Grabación de llamadas": () => data.callRecording, "Confirmación normativa grabación": () => data.callRecordingNotice,
    "Configuración subdominio": () => data.subdomainSetup, "Uso del subdominio": () => choiceWithOther(data.subdomainPurpose, data.subdomainPurposeOther), "Subdominio preferido": () => data.subdomainPreferred, "Subdominio alternativo": () => data.subdomainAlternative, "Propiedad del dominio": () => data.subdomainOwnership, "Estado acceso DNS": () => data.subdomainDnsStatus, "Verificación subdominio": () => data.subdomainVerification, "Dominio opción 1": () => data.domainOption1, "Estado dominio 1": () => data.domainOption1Status, "Dominio opción 2": () => data.domainOption2, "Estado dominio 2": () => data.domainOption2Status, "Dominio opción 3": () => data.domainOption3, "Estado dominio 3": () => data.domainOption3Status, "Dominio existente": () => data.existingDomainName, "Acceso dominio existente": () => data.existingDomainAccess, "Reunión dominio existente": () => data.existingDomainMeeting,
  };
  return fields[header] ? (fields[header]() || "") : "";
}

function asText(value) { return Array.isArray(value) ? value.join(", ") : (value || ""); }
function withOther(value, detail) { return Array.isArray(value) ? value.map((item) => item === "Otro" && detail ? `Otro: ${detail}` : item).join(", ") : (value || ""); }
function choiceWithOther(value, detail) { return /^Otr[oa]\b/i.test(String(value || "")) && String(detail || "").trim() ? String(detail).trim() : (value || ""); }
function configuredLeadQuestions(value) {
  if (!value || typeof value !== "string") return "";
  try {
    const questions = JSON.parse(value);
    if (!Array.isArray(questions)) return "";
    return questions.map((item, index) => {
      const options = Array.isArray(item.options) && item.options.length ? ` Opciones: ${item.options.join(" | ")}.` : "";
      return `${index + 1}. ${item.question} [${item.type}].${options}`;
    }).join("\n");
  } catch (error) { return ""; }
}
function allLeadQuestions(data) { return [String(data.additionalLeadQuestions || "").trim(), configuredLeadQuestions(data.leadQuestionConfig)].filter(Boolean).join("\n\n"); }
function safeCellValue(value) {
  if (typeof value !== "string") return value;
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function doGet(e) {
  try {
    if (e.parameter.action !== "portal" || !isPortalToken(e.parameter.token)) return json({ ok: false, error: "No autorizado" });
    const user = findActiveUser(e.parameter.email || "");
    if (!user) return json({ ok: false, error: "Acceso revocado o no autorizado" });
    const values = onboardingSheet().getDataRange().getValues();
    const headers = values.shift();
    const records = values
      .filter((row) => row[0] && row[0] !== "Pendiente de primer envío")
      .filter((row) => isAdminRole(user.role) || recordBelongsToUser(row, headers, user.email))
      .map((row) => Object.fromEntries(ONBOARDING_HEADERS.map((header, index) => [header, row[index] instanceof Date ? row[index].toISOString() : String(row[index] || "")] )));
    return json({ ok: true, role: user.role, records });
  } catch (error) {
    return json({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function onboardingSheet() {
  const sheet = SpreadsheetApp.openById(ONBOARDING_SHEET_ID).getSheetByName(ONBOARDING_TAB);
  ensureOnboardingHeaders(sheet);
  return sheet;
}

function ensureOnboardingHeaders(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map((value) => String(value).trim());
  if (ONBOARDING_HEADERS.every((header, index) => current[index] === header)) return;
  if (current.every((header, index) => ONBOARDING_HEADERS[index] === header)) {
    const missing = ONBOARDING_HEADERS.slice(current.length);
    if (missing.length) sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
    return;
  }
  if (current.some((header) => !header || header === "#REF!") || new Set(current).size !== current.length) {
    throw new Error("No se puede migrar Onboarding: hay encabezados vacíos, duplicados o dañados.");
  }
  const unknown = current.filter((header) => !ONBOARDING_HEADERS.includes(header));
  const migratedHeaders = ONBOARDING_HEADERS.concat(unknown);
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, lastColumn).getValues() : [];
  const indexByHeader = Object.fromEntries(current.map((header, index) => [header, index]));
  const migratedRows = rows.map((row) => migratedHeaders.map((header) => indexByHeader[header] === undefined ? "" : row[indexByHeader[header]]));
  const backupName = `${ONBOARDING_TAB} respaldo ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss")}`;
  sheet.copyTo(sheet.getParent()).setName(backupName);
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), Math.max(lastColumn, migratedHeaders.length)).clearContent();
  sheet.getRange(1, 1, 1, migratedHeaders.length).setValues([migratedHeaders]);
  if (migratedRows.length) sheet.getRange(2, 1, migratedRows.length, migratedHeaders.length).setValues(migratedRows);
}

function migrateOnboardingHeaders() {
  const sheet = SpreadsheetApp.openById(ONBOARDING_SHEET_ID).getSheetByName(ONBOARDING_TAB);
  ensureOnboardingHeaders(sheet);
  return { ok: true, columns: sheet.getLastColumn(), rows: sheet.getLastRow() };
}

function findActiveUser(email) {
  const rows = SpreadsheetApp.openById(ONBOARDING_SHEET_ID).getSheetByName(ACCESS_TAB).getDataRange().getValues();
  const headers = rows.shift();
  const emailIndex = headers.indexOf("Correo autorizado");
  const roleIndex = headers.indexOf("Rol");
  const statusIndex = headers.indexOf("Estado");
  const normalized = String(email).trim().toLowerCase();
  const match = rows.find((row) => String(row[emailIndex]).trim().toLowerCase() === normalized && String(row[statusIndex]).trim().toLowerCase() === "activo");
  return match ? { email: normalized, role: match[roleIndex] } : null;
}

function isAdminRole(role) { return String(role || "").trim().toLowerCase().includes("admin"); }
function recordBelongsToUser(row, headers, email) {
  const normalized = String(email || "").trim().toLowerCase();
  const responsible = String(row[headers.indexOf("Email responsable")] || "").trim().toLowerCase();
  const corporate = String(row[headers.indexOf("Email corporativo")] || "").trim().toLowerCase();
  return normalized && (normalized === responsible || normalized === corporate);
}

function isPortalToken(token) { return token && token === PropertiesService.getScriptProperties().getProperty("FOCUS_PORTAL_TOKEN"); }
function json(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
