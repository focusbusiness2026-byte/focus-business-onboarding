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

test("keeps optional choices clear and removes newsletter", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /servicesOther/);
  assert.match(source, /sectorsOther/);
  assert.match(source, /¿Quién recibe cada contacto\?/);
  assert.doesNotMatch(source, /Newsletter|Enlace al logo \(opcional\)|label="Tono de marca"/);
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
