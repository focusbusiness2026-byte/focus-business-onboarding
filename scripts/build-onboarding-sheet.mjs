import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/Trabajo/OneDrive/Trabajo/Focus Business/outputs/onboarding-productoras";
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const guide = workbook.worksheets.add("LEER_PRIMERO");
const onboarding = workbook.worksheets.add("Onboarding");
const mapping = workbook.worksheets.add("Campos Codex y GHL");
const dashboard = workbook.worksheets.add("Vista operativa");

const gold = "#D9AF43";
const navy = "#0B1727";
const pale = "#F3F6FA";
const headers = [
  "ID registro", "Fecha envío", "Estado", "Empresa", "Razón social", "Web", "Actividad", "Ciudad / país", "Tamaño equipo", "Descripción", "Color marca", "Logo URL", "Tono marca",
  "Servicio prioritario", "Ticket medio", "Modelo de precio", "Servicios", "Público", "Sectores", "Mercados", "Tamaño empresa ideal", "Decisor habitual", "Presupuesto mínimo",
  "Objetivos", "Canales", "Campos del lead", "Tiempo de respuesta", "Asignación de leads", "Ciclo de venta", "Criterio de cualificación",
  "Responsable", "Cargo", "Email responsable", "Teléfono / WhatsApp", "Nombre reunión", "Duración reunión", "Disponibilidad", "Horario", "Tratamiento", "Tono comunicación",
  "Automatizaciones", "Integraciones", "Cuenta GoHighLevel", "Google Sheets", "Excepciones", "Fecha lanzamiento", "Responsable aprobación", "Datos correctos", "Autorización", "Subcuenta GHL", "Config. Codex URL", "Notas internas",
  "Recursos Drive", "Color corporativo primario", "Color corporativo secundario", "Tipografía títulos", "Tipografía textos", "Preguntas adicionales", "Herramientas actuales", "Herramientas a conectar",
  "Automatizaciones workflow", "Automatizaciones WhatsApp", "Automatizaciones email", "Plataformas anuncios", "Acceso anuncios", "Reunión anuncios"
];

guide.getRange("A1:H1").merge();
guide.getRange("A1").values = [["Focus Business · Registro central de onboarding"]];
guide.getRange("A1:H1").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 16 }, horizontalAlignment: "left", verticalAlignment: "center" };
guide.getRange("A3:B7").values = [
  ["Qué guarda", "Una fila por productora con toda la configuración comercial, operativa y técnica."],
  ["Quién lo usa", "Focus Business para preparar la subcuenta de GoHighLevel y Codex para construir la configuración."],
  ["Estado", "Nuevo → En revisión → Listo para GHL → Subcuenta creada → Activo."],
  ["Cómo llega", "El formulario envía el registro estructurado al webhook de Google Sheets."],
  ["Seguridad", "No guardar claves API ni contraseñas. Solo datos de onboarding y enlaces autorizados."],
];
guide.getRange("A3:A7").format = { fill: "#E8EDF4", font: { bold: true, color: navy } };
guide.getRange("B3:B7").format = { wrapText: true };
guide.getRange("A10:H10").merge();
guide.getRange("A10").values = [["Flujo operativo: Formulario → Google Sheets → Validación interna → Archivo JSON para Codex → Subcuenta GoHighLevel → Automatizaciones"]];
guide.getRange("A10:H10").format = { fill: "#FFF4D5", font: { bold: true, color: "#6F5311" }, wrapText: true };
guide.getRange("A:A").format.columnWidth = 24;
guide.getRange("B:B").format.columnWidth = 74;
guide.getRange("A1:H12").format.rowHeight = 24;
guide.getRange("A1:H1").format.rowHeight = 32;
guide.showGridLines = false;

onboarding.getRangeByIndexes(0, 0, 1, headers.length).values = [headers];
onboarding.getRange("A2").values = [["Pendiente de primer envío"]];
onboarding.getRange("B2").formulas = [["=IF(A2=\"Pendiente de primer envío\",\"\",TODAY())"]];
onboarding.getRange("C2").values = [["Nuevo"]];
onboarding.getRange("A1:BN1").format = { fill: navy, font: { bold: true, color: "#FFFFFF" }, wrapText: true, horizontalAlignment: "center", verticalAlignment: "center" };
onboarding.getRange("A2:BN2").format = { fill: pale, wrapText: true, verticalAlignment: "top" };
onboarding.getRange("A1:BN2").format.borders = { preset: "all", style: "thin", color: "#D8E0E9" };
onboarding.getRange("A1:BN1").format.rowHeight = 40;
onboarding.getRange("A:A").format.columnWidth = 22;
onboarding.getRange("B:C").format.columnWidth = 16;
onboarding.getRange("D:M").format.columnWidth = 21;
onboarding.getRange("N:W").format.columnWidth = 22;
onboarding.getRange("X:BN").format.columnWidth = 21;
onboarding.getRange("B2").format.numberFormat = "yyyy-mm-dd";
onboarding.getRange("C2:C501").dataValidation = { rule: { type: "list", values: ["Nuevo", "En revisión", "Listo para GHL", "Subcuenta creada", "Activo", "Pausado"] } };
onboarding.getRange("A1:BN2").format.wrapText = true;
onboarding.freezePanes.freezeRows(1);
onboarding.tables.add("A1:BN2", true, "OnboardingTable");
onboarding.showGridLines = false;

const mappings = [
  ["Campo", "Uso en GoHighLevel", "Uso para Codex", "Obligatorio antes de crear subcuenta"],
  ["Empresa", "Nombre de ubicación / subcuenta", "Nombre del proyecto", "Sí"],
  ["Email responsable", "Contacto principal y correo de bienvenida", "Contacto de aprobación", "Sí"],
  ["Teléfono / WhatsApp", "Canal de contacto y campos personalizados", "Configuración de canales", "No"],
  ["Público, sectores y mercados", "Etiquetas y segmentos", "Criterios del motor de leads", "Sí"],
  ["Servicios, ticket y presupuesto mínimo", "Pipeline y oportunidades", "Priorización de prospects", "Sí"],
  ["Canales y campos del lead", "Formularios, funnels y custom fields", "Especificación de captación", "Sí"],
  ["Calendario y disponibilidad", "Calendario y confirmaciones", "Configuración de citas", "No"],
  ["Automatizaciones e integraciones", "Workflows y conexiones", "Plan de activación", "No"],
  ["Tono y tratamiento", "Plantillas de email / WhatsApp", "Guía de comunicación", "No"],
  ["Excepciones", "Notas de implementación", "Restricciones y decisiones", "No"],
];
mapping.getRange("A1:D11").values = mappings;
mapping.getRange("A1:D1").format = { fill: gold, font: { bold: true, color: navy }, wrapText: true };
mapping.getRange("A1:D11").format.borders = { preset: "all", style: "thin", color: "#D8E0E9" };
mapping.getRange("A2:D11").format.wrapText = true;
mapping.getRange("A:D").format.columnWidth = 32;
mapping.getRange("B:B").format.columnWidth = 38;
mapping.getRange("C:C").format.columnWidth = 38;
mapping.getRange("D:D").format.columnWidth = 26;
mapping.freezePanes.freezeRows(1);
mapping.showGridLines = false;

dashboard.getRange("A1:F1").merge();
dashboard.getRange("A1").values = [["Vista operativa · Onboarding de productoras"]];
dashboard.getRange("A1:F1").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 16 }, verticalAlignment: "center" };
dashboard.getRange("A3:B6").values = [["Métrica", "Valor"], ["Registros recibidos", null], ["Listos para GHL", null], ["Subcuentas creadas", null]];
dashboard.getRange("B4").formulas = [["=COUNTIF('Onboarding'!$A$2:$A$501,\"<>\")-COUNTIF('Onboarding'!$A$2:$A$501,\"Pendiente de primer envío\")"]];
dashboard.getRange("B5").formulas = [["=COUNTIF('Onboarding'!$C$2:$C$501,\"Listo para GHL\")"]];
dashboard.getRange("B6").formulas = [["=COUNTIF('Onboarding'!$C$2:$C$501,\"Subcuenta creada\")"]];
dashboard.getRange("A3:B3").format = { fill: gold, font: { bold: true, color: navy } };
dashboard.getRange("A3:B6").format.borders = { preset: "all", style: "thin", color: "#D8E0E9" };
dashboard.getRange("B4:B6").format = { fill: "#FFF4D5", font: { bold: true, color: navy, size: 14 }, horizontalAlignment: "center" };
dashboard.getRange("A9:F9").merge();
dashboard.getRange("A9").values = [["Próximo paso: filtrar Onboarding por Estado = ‘Nuevo’, verificar los campos obligatorios y descargar el JSON de configuración para Codex."]];
dashboard.getRange("A9:F9").format = { fill: "#E8EDF4", font: { color: navy }, wrapText: true };
dashboard.getRange("A:A").format.columnWidth = 34;
dashboard.getRange("B:B").format.columnWidth = 18;
dashboard.getRange("A1:F1").format.rowHeight = 32;
dashboard.getRange("A9:F9").format.rowHeight = 38;
dashboard.showGridLines = false;

const inspection = await workbook.inspect({ kind: "table", range: "Onboarding!A1:BN2", include: "values,formulas", tableMaxRows: 2, tableMaxCols: 66 });
console.log(inspection.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 50 }, summary: "formula check" });
console.log(errors.ndjson);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/focus_business_onboarding_productoras.xlsx`);
for (const [sheetName, range] of [["LEER_PRIMERO", "A1:H12"], ["Onboarding", "A1:BN2"], ["Campos Codex y GHL", "A1:D11"], ["Vista operativa", "A1:F9"]]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/${sheetName.replaceAll(" ", "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}
