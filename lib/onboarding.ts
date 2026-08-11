type StoredSubmission = {
  id: string;
  submittedAt: string;
  status: string;
  payload: Record<string, unknown>;
};

export const sheetHeaders = [
  "ID registro", "Fecha envío", "Estado", "Empresa", "Razón social", "Web", "Actividad", "Ciudad / país", "Tamaño equipo", "Descripción", "Color marca", "Logo URL", "Tono marca",
  "Servicio prioritario", "Ticket medio", "Modelo de precio", "Servicios", "Público", "Sectores", "Mercados", "Tamaño empresa ideal", "Decisor habitual", "Presupuesto mínimo",
  "Objetivos", "Canales", "Campos del lead", "Tiempo de respuesta", "Asignación de leads", "Ciclo de venta", "Criterio de cualificación",
  "Responsable", "Cargo", "Email responsable", "Teléfono / WhatsApp", "Nombre reunión", "Duración reunión", "Disponibilidad", "Horario", "Tratamiento", "Tono comunicación",
  "Automatizaciones", "Integraciones", "Cuenta GoHighLevel", "Google Sheets", "Excepciones", "Fecha lanzamiento", "Responsable aprobación", "Datos correctos", "Autorización", "Subcuenta GHL", "Config. técnica URL", "Notas internas",
  "Recursos Drive", "Color corporativo primario", "Color corporativo secundario", "Tipografía títulos", "Tipografía textos", "Preguntas adicionales", "Herramientas actuales", "Herramientas a conectar",
  "Automatizaciones workflow", "Automatizaciones WhatsApp", "Automatizaciones email", "Plataformas anuncios", "Acceso anuncios", "Reunión anuncios",
  "Ciudad objetivo", "Región objetivo", "Países objetivo", "Tipos de cliente objetivo", "Perfil ideal detallado", "Exclusiones de prospección", "Preferencias de prospección", "Preparación prospección",
  "Propietario / representante", "Email corporativo", "Dirección legal", "Ciudad legal", "País legal", "Zona horaria", "Idioma principal", "Nombre facturación", "ID fiscal empresarial", "Dirección facturación", "Email facturación", "Redes oficiales", "Dominio/subdominio deseado", "Equipo y roles iniciales", "Autorización preparación GHL", "Preparación subcuenta GHL", "Validación subcuenta GHL",
  "Capacidad mensual", "Casos de éxito / portafolio", "Empresas de referencia",
] as const;

function text(value: unknown) {
  return Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
}

function selectionWithOther(value: unknown, detail: unknown) {
  if (!Array.isArray(value)) return text(value);
  return value.map((item) => item === "Otro" && String(detail || "").trim() ? `Otro: ${String(detail).trim()}` : String(item)).join(", ");
}

export function toSheetRecord(row: StoredSubmission): Record<string, string> {
  const data = row.payload;
  return {
    "ID registro": row.id, "Fecha envío": row.submittedAt, "Estado": row.status,
    "Empresa": text(data.companyName), "Razón social": text(data.legalName), "Web": text(data.website), "Actividad": text(data.activity), "Ciudad / país": text(data.location), "Tamaño equipo": text(data.teamSize), "Descripción": text(data.description),
    "Color marca": text(data.brandPrimaryColor || data.brandColor), "Logo URL": text(data.logoUrl), "Tono marca": text(data.formality),
    "Servicio prioritario": text(data.mainService), "Ticket medio": text(data.ticket), "Modelo de precio": text(data.priceModel), "Servicios": selectionWithOther(data.services, data.servicesOther), "Público": text(data.audience), "Sectores": selectionWithOther(data.sectors, data.sectorsOther), "Mercados": text(data.geographies),
    "Tamaño empresa ideal": text(data.idealCompanySize), "Decisor habitual": text(data.decisionMaker), "Presupuesto mínimo": text(data.minimumBudget),
    "Objetivos": text(data.objectives), "Canales": text(data.channels), "Campos del lead": text(data.leadFields), "Tiempo de respuesta": text(data.responseTime), "Asignación de leads": text(data.assignment), "Ciclo de venta": text(data.salesCycle), "Criterio de cualificación": text(data.qualification),
    "Responsable": text(data.contactName), "Cargo": text(data.contactRole), "Email responsable": text(data.contactEmail), "Teléfono / WhatsApp": text(data.contactPhone), "Nombre reunión": text(data.bookingName), "Duración reunión": text(data.meetingDuration), "Disponibilidad": text(data.availability), "Horario": text(data.schedule), "Tratamiento": text(data.pronoun), "Tono comunicación": text(data.communicationTone),
    "Automatizaciones": text(data.automations), "Integraciones": text(data.integrations), "Cuenta GoHighLevel": text(data.existingGhl), "Google Sheets": "Sincronización web activa", "Excepciones": text(data.exceptions), "Fecha lanzamiento": text(data.launchDate), "Responsable aprobación": text(data.approvalOwner), "Datos correctos": text(Boolean(data.accuracy)), "Autorización": text(Boolean(data.terms)), "Subcuenta GHL": "", "Config. técnica URL": "", "Notas internas": "",
    "Recursos Drive": text(data.driveAssetsUrl), "Color corporativo primario": text(data.brandPrimaryColor || data.brandColor), "Color corporativo secundario": text(data.brandSecondaryColor), "Tipografía títulos": text(data.headingFont), "Tipografía textos": text(data.bodyFont), "Preguntas adicionales": text(data.additionalLeadQuestions), "Herramientas actuales": text(data.toolsInUse), "Herramientas a conectar": text(data.toolsToConnect),
    "Automatizaciones workflow": text(data.workflowAutomations), "Automatizaciones WhatsApp": text(data.whatsappAutomations), "Automatizaciones email": text(data.emailAutomations), "Plataformas anuncios": text(data.adPlatforms), "Acceso anuncios": text(data.adAccess), "Reunión anuncios": text(data.adMeeting),
    "Ciudad objetivo": text(data.targetCity), "Región objetivo": text(data.targetRegion), "Países objetivo": selectionWithOther(data.targetCountries, data.targetCountriesOther), "Tipos de cliente objetivo": selectionWithOther(data.targetClientTypes, data.targetClientTypesOther), "Perfil ideal detallado": text(data.idealProfileDetail), "Exclusiones de prospección": text(data.prospectExclusions), "Preferencias de prospección": text(data.prospectPreferences), "Preparación prospección": "Configuración lista para sincronizar",
    "Propietario / representante": text(data.ownerName), "Email corporativo": text(data.businessEmail), "Dirección legal": text(data.legalAddress), "Ciudad legal": text(data.legalCity), "País legal": text(data.legalCountry), "Zona horaria": text(data.timezone), "Idioma principal": text(data.primaryLanguage), "Nombre facturación": text(data.billingLegalName), "ID fiscal empresarial": text(data.billingTaxId), "Dirección facturación": text(data.billingAddress), "Email facturación": text(data.billingEmail), "Redes oficiales": text(data.companySocialLinks), "Dominio/subdominio deseado": text(data.desiredDomain), "Equipo y roles iniciales": text(data.initialTeamRoles), "Autorización preparación GHL": text(Boolean(data.ghlPreparationAuthorization)), "Preparación subcuenta GHL": "Lista para revisión; no creada", "Validación subcuenta GHL": "Pendiente de aprobación",
    "Capacidad mensual": text(data.monthlyCapacity), "Casos de éxito / portafolio": text(data.portfolioHighlights), "Empresas de referencia": text(data.referenceCompanies),
  };
}

export function asCsv(rows: StoredSubmission[]) {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [sheetHeaders, ...rows.map((row) => {
    const record = toSheetRecord(row);
    return sheetHeaders.map((header) => record[header] || "");
  })].map((row) => row.map((value) => escape(String(value))).join(",")).join("\r\n");
}
