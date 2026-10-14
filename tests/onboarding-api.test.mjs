import assert from "node:assert/strict";
import test from "node:test";

const payload = {
  companyName: "Productora de prueba",
  contactEmail: "contacto@productora.example.test",
  accuracy: true,
  terms: true,
  ghlPreparationAuthorization: true,
};

async function requestApp() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ onboarding: payload }),
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("an ambiguous Apps Script reply does not claim a save, while a confirmed retry reports saved without an access link", async (t) => {
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/test/exec";
  process.env.FOCUS_PORTAL_TOKEN = "test-token";
  let mode = "ambiguous";
  const outbound = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    assert.equal(String(input), process.env.GOOGLE_SHEETS_WEBHOOK_URL);
    assert.equal(init.method, "POST");
    const body = JSON.parse(init.body);
    assert.equal(body.companyName, payload.companyName);
    assert.equal(body._focusToken, "test-token");
    outbound.push(body);
    if (mode === "ambiguous") {
      return new Response("Internal Server Error", { status: 500, headers: { "content-type": "text/plain" } });
    }
    if (mode === "review") {
      return Response.json({ ok: false, code: "identity_review", error: "internal details" });
    }
    return Response.json({ ok: true, saved: true, id: "ONB-12345678", row: 2, deduplicated: true, accessReady: false });
  });

  const ambiguous = await requestApp();
  assert.equal(ambiguous.status, 502);
  const ambiguousBody = await ambiguous.json();
  assert.equal(ambiguousBody.ok, false);
  assert.equal(ambiguousBody.saved.confirmed, false);
  assert.match(ambiguousBody.error, /No pudimos confirmar/);

  mode = "confirmed";
  const confirmed = await requestApp();
  assert.equal(confirmed.status, 200);
  const confirmedBody = await confirmed.json();
  assert.equal(confirmedBody.ok, true);
  assert.equal(confirmedBody.saved.confirmed, true);
  assert.equal(confirmedBody.saved.id, "ONB-12345678");
  assert.equal(confirmedBody.saved.deduplicated, true);
  assert.equal(confirmedBody.account.accessReady, false);
  assert.equal(confirmedBody.account.accessLinkSent, false);
  mode = "review";
  const review = await requestApp();
  assert.equal(review.status, 409);
  const reviewBody = await review.json();
  assert.equal(reviewBody.saved.confirmed, false);
  assert.match(reviewBody.error, /contacta con soporte/);
  assert.doesNotMatch(reviewBody.error, /internal details/);
  assert.equal(outbound.length, 3);
});
