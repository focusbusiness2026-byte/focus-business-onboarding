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
    if (data.action === "sendMagicLogin") {
      return sendMagicLogin(data.email, data.magicUrl);
    }
    const sheet = onboardingSheet();
    const id = `ONB-${Utilities.getUuid().slice(0, 8).toUpperCase()}`;
    const values = ONBOARDING_HEADERS.map((header) => safeCellValue(valueFor(header, { ...data, _recordId: id })));
    sheet.appendRow(values);
    ensureClientAccess(data.contactEmail || data.businessEmail || "");
    return json({ ok: true, id, row: sheet.getLastRow() });
  } catch (error) {
    return json({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function sendMagicLogin(email, magicUrl) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!findActiveUser(normalized)) return json({ ok: false, error: "El correo no está activo en Accesos" });
  if (!/^https:\/\/onboarding\.focusbusinesslab\.es\/magic-login\?token=[A-Za-z0-9_-]+$/.test(String(magicUrl || ""))) {
    return json({ ok: false, error: "Enlace de acceso no permitido" });
  }
  MailApp.sendEmail({
    to: normalized,
    subject: "Tu acceso seguro a Focus Business",
    body: [
      "Abre este enlace para acceder a los portales de Focus Business:",
      "",
      String(magicUrl),
      "",
      "El enlace caduca en 15 minutos y solo funciona una vez. Al utilizarlo se cerrará cualquier sesión anterior asociada a este correo.",
      "Si no solicitaste este acceso, puedes ignorar el mensaje.",
    ].join("\n"),
    htmlBody: accessEmailHtml(magicUrl),
    name: "Focus Business",
  });
  return json({ ok: true });
}

function accessEmailHtml(magicUrl) {
  const safeUrl = escapeEmailHtml(String(magicUrl || ""));
  return [
    '<!doctype html>',
    '<html lang="es">',
    '<body style="margin:0;padding:0;background:#06101e;color:#eef1f5;font-family:Arial,Helvetica,sans-serif;">',
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Tu enlace seguro de acceso a Focus Business está listo.</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#06101e;">',
    '<tr><td align="center" style="padding:32px 16px;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:#0c1727;border:1px solid #263548;border-radius:18px;overflow:hidden;">',
    '<tr><td style="height:5px;background:#d9af43;font-size:0;line-height:0;">&nbsp;</td></tr>',
    '<tr><td style="padding:36px 38px 20px;">',
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>',
    '<td style="width:62px;height:62px;border:2px solid #d9af43;border-radius:50%;text-align:center;vertical-align:middle;color:#d9af43;font-family:Georgia,serif;font-size:35px;line-height:62px;">F</td>',
    '<td style="padding-left:16px;vertical-align:middle;"><div style="font-size:24px;letter-spacing:7px;color:#eef1f5;">FOCUS</div><div style="margin-top:6px;font-size:11px;letter-spacing:6px;color:#d9af43;">BUSINESS</div></td>',
    '</tr></table>',
    '</td></tr>',
    '<tr><td style="padding:12px 38px 38px;">',
    '<div style="font-size:12px;font-weight:bold;letter-spacing:2px;color:#d9af43;">ACCESO SEGURO</div>',
    '<h1 style="margin:14px 0 12px;color:#eef1f5;font-size:30px;line-height:1.2;">Entra a Focus Business</h1>',
    '<p style="margin:0 0 24px;color:#9aa7b8;font-size:16px;line-height:1.65;">Tu enlace personal está listo. Utilízalo para entrar al portal solicitado con el correo autorizado.</p>',
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;"><tr><td bgcolor="#d9af43" style="border-radius:10px;">',
    '<a href="' + safeUrl + '" style="display:inline-block;padding:15px 28px;color:#162030;text-decoration:none;font-size:16px;font-weight:bold;">Entrar a Focus Business &rarr;</a>',
    '</td></tr></table>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background:#101c2c;border:1px solid #263548;border-radius:12px;">',
    '<tr><td style="padding:18px 20px;color:#bdc5d0;font-size:14px;line-height:1.6;">',
    '<strong style="color:#eef1f5;">Válido durante 15 minutos</strong><br>El enlace solo funciona una vez. Al utilizarlo se cerrará cualquier sesión anterior asociada a este correo.',
    '</td></tr></table>',
    '<p style="margin:0 0 8px;color:#9aa7b8;font-size:12px;line-height:1.5;">Si el botón no funciona, copia y pega esta dirección en el navegador:</p>',
    '<p style="margin:0;word-break:break-all;color:#d9af43;font-size:12px;line-height:1.6;">' + safeUrl + '</p>',
    '<p style="margin:26px 0 0;color:#9aa7b8;font-size:12px;line-height:1.6;">No compartas ni reenvíes este enlace. Si no solicitaste el acceso, puedes ignorar este mensaje con seguridad.</p>',
    '</td></tr>',
    '<tr><td style="padding:20px 38px;background:#101c2c;border-top:1px solid #263548;color:#9aa7b8;font-size:11px;line-height:1.5;">Focus Business &middot; Portal de Prospección &middot; Focus Viral Radar</td></tr>',
    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join("");
}

function escapeEmailHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function authorizePortalEmailSending() {
  return MailApp.getRemainingDailyQuota();
}

function ensureClientAccess(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return;
  const sheet = SpreadsheetApp.openById(ONBOARDING_SHEET_ID).getSheetByName(ACCESS_TAB);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((value) => String(value).trim());
  const emailIndex = headers.indexOf("Correo autorizado");
  const roleIndex = headers.indexOf("Rol");
  const statusIndex = headers.indexOf("Estado");
  const updatedIndex = headers.indexOf("Última actualización");
  const assignedIndex = headers.indexOf("Raspados asignados");
  const usedIndex = headers.indexOf("Raspados usados");
  const availableIndex = headers.indexOf("Raspados disponibles");
  const percentageIndex = headers.indexOf("% disponible");
  const quotaStatusIndex = headers.indexOf("Estado cuota");
  if (emailIndex < 0 || roleIndex < 0 || statusIndex < 0) {
    throw new Error("La pestaña Accesos debe contener Correo autorizado, Rol y Estado");
  }
  const existingIndex = values.findIndex((row, index) => index > 0 && String(row[emailIndex]).trim().toLowerCase() === normalized);
  if (existingIndex > 0) {
    const role = String(values[existingIndex][roleIndex] || "").trim();
    if (!role) sheet.getRange(existingIndex + 1, roleIndex + 1).setValue("Cliente");
    sheet.getRange(existingIndex + 1, statusIndex + 1).setValue("Activo");
    if (updatedIndex >= 0) sheet.getRange(existingIndex + 1, updatedIndex + 1).setValue(new Date());
    return;
  }
  const row = headers.map((header) => {
    if (header === "Correo autorizado") return normalized;
    if (header === "Rol") return "Cliente";
    if (header === "Estado") return "Activo";
    if (header === "Última actualización") return new Date();
    if (header === "Raspados usados") return 0;
    return "";
  });
  sheet.appendRow(row);
  const newRow = sheet.getLastRow();
  if (assignedIndex >= 0 && usedIndex >= 0 && availableIndex >= 0) {
    sheet.getRange(newRow, availableIndex + 1).setFormula(`=MAX(${columnLetter(assignedIndex + 1)}${newRow}-${columnLetter(usedIndex + 1)}${newRow},0)`);
  }
  if (assignedIndex >= 0 && availableIndex >= 0 && percentageIndex >= 0) {
    sheet.getRange(newRow, percentageIndex + 1).setFormula(`=IFERROR(${columnLetter(availableIndex + 1)}${newRow}/${columnLetter(assignedIndex + 1)}${newRow},0)`);
  }
  if (availableIndex >= 0 && percentageIndex >= 0 && quotaStatusIndex >= 0) {
    sheet.getRange(newRow, quotaStatusIndex + 1).setFormula(`=IF(${columnLetter(availableIndex + 1)}${newRow}=0,"Agotado",IF(${columnLetter(percentageIndex + 1)}${newRow}<=20%,"Crítico",IF(${columnLetter(percentageIndex + 1)}${newRow}<=50%,"Atención","Disponible")))`);
  }
}

function syncExistingClientAccessFromOnboarding() {
  const onboardingValues = onboardingSheet().getDataRange().getValues();
  const onboardingHeaders = onboardingValues.shift().map((value) => String(value).trim());
  const responsibleIndex = onboardingHeaders.indexOf("Email responsable");
  const corporateIndex = onboardingHeaders.indexOf("Email corporativo");
  if (responsibleIndex < 0 && corporateIndex < 0) {
    throw new Error("Onboarding debe contener Email responsable o Email corporativo");
  }

  const accessSheet = SpreadsheetApp.openById(ONBOARDING_SHEET_ID).getSheetByName(ACCESS_TAB);
  const accessValues = accessSheet.getDataRange().getValues();
  const accessHeaders = accessValues[0].map((value) => String(value).trim());
  const accessEmailIndex = accessHeaders.indexOf("Correo autorizado");
  if (accessEmailIndex < 0) throw new Error("Accesos debe contener Correo autorizado");

  const existing = new Set(accessValues.slice(1)
    .map((row) => String(row[accessEmailIndex] || "").trim().toLowerCase())
    .filter(Boolean));
  const candidates = new Set();
  onboardingValues.forEach((row) => {
    [responsibleIndex, corporateIndex].forEach((index) => {
      if (index < 0) return;
      const email = String(row[index] || "").trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) candidates.add(email);
    });
  });

  let added = 0;
  candidates.forEach((email) => {
    if (existing.has(email)) return;
    ensureClientAccess(email);
    existing.add(email);
    added += 1;
  });
  return { ok: true, reviewed: candidates.size, added, alreadyPresent: candidates.size - added };
}

function columnLetter(column) {
  let value = Number(column);
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
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
