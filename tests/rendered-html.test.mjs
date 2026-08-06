import assert from "node:assert/strict";
import test from "node:test";

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
  assert.doesNotMatch(html, /Stripe|Zoom|Slack|WordPress|Shopify|Notion/);
});

test("renders a public portal access screen for anonymous visitors", async () => {
  const response = await render("/portal");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Accede con tu correo/);
  assert.match(html, /Continuar con ChatGPT/);
  assert.match(html, /formulario público/);
});
