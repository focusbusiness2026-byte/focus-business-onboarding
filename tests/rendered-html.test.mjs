import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function requestApp(request) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${request.url}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(request, { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the public Focus Business onboarding form", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Focus Business \| Onboarding de productoras<\/title>/i);
  assert.match(html, /Nombre comercial/);
  assert.match(html, /Color corporativo primario/);
  assert.match(html, /Color corporativo secundario/);
  assert.match(html, /Abrir ayuda del paso 1/);
  assert.doesNotMatch(html, /Enlace al logo|Tono de marca/);
  assert.doesNotMatch(html, /Stripe|Zoom|Slack|WordPress|Shopify|Notion/);
});

test("defines detailed prospecting and safe subaccount preparation fields", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const mapping = await readFile(new URL("../lib/onboarding.ts", import.meta.url), "utf8");
  assert.match(page, /Ciudad objetivo principal/);
  assert.match(page, /Tipos de cliente objetivo/);
  assert.match(page, /Exclusiones de prospección/);
  assert.match(page, /Capacidad mensual para nuevos proyectos/);
  assert.match(page, /Casos de éxito o portafolio/);
  assert.match(page, /Empresas de referencia/);
  assert.match(page, /Puedes seleccionar un máximo de 3 sectores prioritarios/);
  assert.match(page, /Preguntas que quieres hacer a tus leads o prospectos/);
  assert.match(page, /Objetivo y público de la campaña/);
  assert.match(page, /Landing page, contenido y VSL/);
  assert.match(page, /Tercer color corporativo/);
  assert.match(page, /Coste adicional/);
  assert.match(page, /Integración oficial de WhatsApp Business/);
  assert.match(page, /Llamadas desde GoHighLevel/);
  assert.match(page, /Buscar un dominio nuevo/);
  assert.match(page, /MÁS COMPLEJA/);
  assert.match(page, /DomainSearch/);
  assert.doesNotMatch(page, /Campos informativos opcionales/);
  assert.match(page, /mediante OAuth cuando el proveedor lo permita/);
  assert.match(page, /Accesos opcionales para configurar Meta/);
  assert.match(page, /No compartas contraseñas/);
  assert.match(page, /No la crean ni solicitan credenciales/);
  assert.match(page, /recomendado para personalizar/i);
  assert.match(mapping, /Preparación prospección/);
  assert.match(mapping, /Lista para revisión; no creada/);
  assert.match(mapping, /Pendiente de aprobación/);
  assert.match(mapping, /"Capacidad mensual"/);
  assert.match(mapping, /"Responsable copy landing"/);
  assert.match(mapping, /"Copy \/ referencias \/ CTA landing"/);
  assert.match(mapping, /"Objetivo campaña"/);
  assert.match(mapping, /"Uso VSL"/);
  assert.match(mapping, /"Regiones objetivo"/);
  assert.match(mapping, /"Acceso Meta Business"/);
});

test("keeps optional choices clear and removes newsletter", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /servicesOther/);
  assert.match(source, /sectorsOther/);
  assert.match(source, /¿Quién recibe cada contacto\?/);
  assert.doesNotMatch(source, /Newsletter|Enlace al logo \(opcional\)|label="Tono de marca"/);
});

test("supports searchable typography, dependent regions and configurable lead questions", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const mapping = await readFile(new URL("../lib/onboarding.ts", import.meta.url), "utf8");
  const appsScript = await readFile(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8");
  const fontLiteral = source.match(/const bodyFontOptions = \[([\s\S]*?)\] as const;/);
  assert.ok(fontLiteral);
  const fonts = Function(`return [${fontLiteral[1]}]`)();
  assert.equal(fonts.length, 150);
  assert.equal(new Set(fonts).size, 150);
  assert.match(source, /bodyFontOptions\.slice\(0, 100\)/);
  assert.match(source, /Buscar tipografía/);
  assert.match(source, /regionsByCountry/);
  assert.match(source, /"Portugal": \["Norte", "Centro"/);
  assert.match(source, /key === "targetCountries"/);
  assert.match(source, /Selección múltiple/);
  assert.match(source, /Añade al menos dos opciones, una por línea/);
  assert.match(source, /window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
  assert.match(mapping, /allLeadQuestions\(data\)/);
  assert.match(appsScript, /allLeadQuestions\(data\)/);
});

test("provides expanded official-platform setup guides", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const meta = await readFile(new URL("../app/guias/meta-business/page.tsx", import.meta.url), "utf8");
  const facebook = await readFile(new URL("../app/guias/facebook-page/page.tsx", import.meta.url), "utf8");
  const ads = await readFile(new URL("../app/guias/ads-manager/page.tsx", import.meta.url), "utf8");
  const phone = await readFile(new URL("../app/guias/telefonia/page.tsx", import.meta.url), "utf8");
  const whatsapp = await readFile(new URL("../app/guias/whatsapp/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Ver guía completa de WhatsApp Business/);
  assert.match(page, /más completa sea la información, mejor podremos orientar la campaña/);
  assert.match(page, /Por qué no recomendamos esta opción/);
  for (const guide of [meta, facebook, ads, phone, whatsapp]) {
    assert.ok((guide.match(/title:/g) || []).length >= 8);
  }
  assert.match(phone, /número existente para determinadas llamadas salientes/);
  assert.match(whatsapp, /coexistencia o migración/);
  assert.doesNotMatch(whatsapp, /contraseña.*Focus Business/i);
});

test("identifies invalid fields and navigates directly to each error", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /className="validation-summary"/);
  assert.match(source, /scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/);
  assert.match(source, /Escribe un correo válido, por ejemplo nombre@empresa\.com\./);
  assert.match(source, /Usa un color hexadecimal de 6 caracteres/);
  assert.match(source, /aria-invalid=/);
  assert.match(source, /noValidate/);
  assert.doesNotMatch(source, /onClickCapture/);
  assert.match(css, /\.field-error input/);
  assert.match(css, /\.field-error-message/);
  assert.match(css, /\.validation-summary/);
});

test("renders a public portal access screen for anonymous visitors", async () => {
  const response = await render("/portal");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Ingresa tu correo/);
  assert.match(html, /Correo autorizado/);
  assert.match(html, /Entrar al portal/);
  assert.match(html, /formulario público/);
});

test("allows an authorized portal user to delete a record", async () => {
  const source = await readFile(new URL("../app/portal/portal-client.tsx", import.meta.url), "utf8");
  assert.match(source, /Borrar lead/);
  assert.match(source, /method: "DELETE"/);
  assert.match(source, /Esta acción no se puede deshacer/);
  assert.match(source, /JSON.stringify\(\{ email: currentEmail, id \}\)/);
});

test("opens the portal directly with an authorized email", async () => {
  const client = await readFile(new URL("../app/portal/portal-client.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/portal/route.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/portal/page.tsx", import.meta.url), "utf8");
  assert.match(client, /body: JSON.stringify\(\{ email: email\.trim\(\) \}\)/);
  assert.match(route, /accessFor\(body\.email\)/);
  assert.doesNotMatch(`${client}\n${route}\n${page}`, /signin-with-|signout-with-/);
});

test("uses Google Sheets as the only submission and portal data source", async () => {
  const onboardingRoute = await readFile(new URL("../app/api/onboarding/route.ts", import.meta.url), "utf8");
  const portalRoute = await readFile(new URL("../app/api/portal/route.ts", import.meta.url), "utf8");
  const appsScript = await readFile(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8");
  assert.match(onboardingRoute, /GOOGLE_SHEETS_WEBHOOK_URL/);
  assert.match(onboardingRoute, /result\.ok !== true/);
  assert.doesNotMatch(onboardingRoute, /GHL_ONBOARDING_WEBHOOK_URL|saveSubmission/);
  assert.match(onboardingRoute, /PROSPECTION_TRIGGER_URL/);
  assert.match(onboardingRoute, /onboarding_id: onboardingId/);
  assert.doesNotMatch(onboardingRoute, /\.\.\.payload.*PROSPECTION/i);
  assert.match(portalRoute, /GOOGLE_SHEETS_PORTAL_URL/);
  assert.doesNotMatch(portalRoute, /listSubmissions|toSheetRecord|deleteSubmission/);
  assert.match(appsScript, /safeCellValue/);
  assert.match(appsScript, /\^\[=\+\\-@\]/);
  assert.match(appsScript, /recordBelongsToUser/);
  assert.match(appsScript, /isAdminRole/);
  assert.match(appsScript, /migrateOnboardingHeaders/);
  assert.match(onboardingRoute, /validateSubmission\(payload\)/);
  assert.match(onboardingRoute, /El formulario no admite contraseñas, tokens, claves API ni claves privadas/);
});

test("keeps the legacy D1 export disabled", async () => {
  const response = await requestApp(new Request("http://localhost/api/export/onboarding.csv"));
  assert.equal(response.status, 410);
  assert.match((await response.json()).error, /Google Sheets es la única fuente operativa/);
});

test("accepts optional informational fields but requires final authorizations", async () => {
  const incomplete = await requestApp(new Request("http://localhost/api/onboarding", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyName: "Demo" }),
  }));
  assert.equal(incomplete.status, 400);
  assert.match((await incomplete.json()).error, /confirmaciones y autorizaciones obligatorias/);

  const authorizedMinimal = await requestApp(new Request("http://localhost/api/onboarding", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accuracy: true, terms: true, ghlPreparationAuthorization: true }),
  }));
  assert.equal(authorizedMinimal.status, 502);
  assert.match((await authorizedMinimal.json()).error, /Google Sheets no está configurado/);

  const route = await readFile(new URL("../app/api/onboarding/route.ts", import.meta.url), "utf8");
  assert.match(route, /containsSecretLikeValue/);
  assert.match(route, /PRIVATE KEY/);
  assert.match(route, /status: validationError \? 400 : 502/);
});

test("accepts the complete six-step shape up to the disabled Sheets boundary", async () => {
  const textFields = [
    "companyName","legalName","ownerName","businessEmail","contactPhone","website","activity","location",
    "legalAddress","legalCity","legalCountry","timezone","primaryLanguage","teamSize","description",
    "billingLegalName","billingTaxId","billingAddress","billingEmail","mainService","ticket","priceModel",
    "monthlyCapacity","targetCity","targetRegion","idealCompanySize","idealProfileDetail","decisionMaker",
    "minimumBudget","prospectExclusions","prospectPreferences","additionalLeadQuestions","landingCopyOwner","landingCopyBrief","responseTime",
    "assignment","salesCycle","qualification","contactName","contactRole","contactEmail","initialTeamRoles",
    "bookingName","meetingDuration","availability","schedule","pronoun","adAccess","adMeeting","exceptions",
    "launchDate","approvalOwner",
  ];
  const payload = Object.fromEntries(textFields.map((field) => [field, "Dato de prueba"]));
  Object.assign(payload, {
    businessEmail: "empresa@example.test", billingEmail: "facturacion@example.test", contactEmail: "persona@example.test",
    website: "https://example.test", accuracy: true, terms: true, ghlPreparationAuthorization: true,
  });
  for (const field of ["services","audience","sectors","geographies","targetCountries","targetClientTypes","objectives","channels","leadFields","toolsInUse","toolsToConnect","workflowAutomations","whatsappAutomations","emailAutomations","adPlatforms"]) payload[field] = ["Opción de prueba"];
  payload.channels = ["Landing pages"];
  payload.landingCopyOwner = "En conjunto";
  payload.landingCopyBrief = "Referencia de campaña y CTA: Solicitar presupuesto";
  payload.sectors = ["Tecnología", "Salud", "Industria"];
  const response = await requestApp(new Request("http://localhost/api/onboarding", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  }));
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /Google Sheets no está configurado/);

  payload.sectors = ["Tecnología", "Salud", "Industria", "Educación"];
  const sectorLimitResponse = await requestApp(new Request("http://localhost/api/onboarding", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  }));
  assert.equal(sectorLimitResponse.status, 400);
  assert.match((await sectorLimitResponse.json()).error, /máximo de 3 sectores prioritarios/);
  payload.sectors = ["Tecnología", "Salud", "Industria"];

  payload.prospectPreferences = "api_key=1234567890abcdef";
  const secretResponse = await requestApp(new Request("http://localhost/api/onboarding", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  }));
  assert.equal(secretResponse.status, 400);
  assert.match((await secretResponse.json()).error, /no admite contraseñas, tokens, claves API ni claves privadas/);
});

test("keeps the mobile navigation and long choices inside the viewport", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /Herramientas que usan actualmente/);
  assert.match(page, /Herramientas que quieren conectar/);
  assert.doesNotMatch(page, /Herramientas que ya utilizáis|Herramientas que queréis conectar/);
  assert.match(css, /flex-basis:min\(78vw,280px\)/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /overflow-x:hidden/);
});

test("groups portal answers like the form and makes every response copyable", async () => {
  const client = await readFile(new URL("../app/portal/portal-client.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(client, /Empresa y preparación de subcuenta/);
  assert.match(client, /Oferta y configuración de prospección/);
  assert.match(client, /Captación y proceso comercial/);
  assert.match(client, /Equipo, acceso futuro y comunicación/);
  assert.match(client, /Automatizaciones e integraciones/);
  assert.match(client, /Revisión y lanzamiento/);
  assert.match(client, /navigator\.clipboard\.writeText/);
  assert.match(client, /aria-label={`Copiar \$\{label\}`}/);
  assert.match(client, /No se registraron respuestas en este bloque/);
  assert.match(css, /\.portal \{ display:block/);
  assert.match(css, /\.detail-fields \{ display:grid/);
});
