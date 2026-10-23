import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

async function routeFixture() {
  const calls = [];
  const mocks = {
    NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) },
    createMagicLogin: async (input) => { calls.push({ kind: "magic", input }); return { magicToken: "test-token" }; },
    invalidateMagicLogin: async () => calls.push({ kind: "invalidate" }),
    safePortalDestination: (destination) => destination,
    activeSheetAccess: async () => null,
    pendingShortSignup: async () => ({ payload_json: JSON.stringify({ prospection: true, radar: false }) }),
    fetchAppsScriptJson: async (_url, options) => {
      calls.push({ kind: "mail", action: JSON.parse(options.body).action });
      return { response: { ok: true }, payload: { ok: true } };
    },
  };
  const source = readFileSync(new URL("../app/api/auth/request-link/route.ts", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  Object.assign(globalThis, { __pendingRecoveryMocks: mocks });
  const route = await import(`data:text/javascript,${encodeURIComponent(`const { ${Object.keys(mocks).join(", ")} } = globalThis.__pendingRecoveryMocks;\n${code}`)}#${Math.random()}`);
  delete globalThis.__pendingRecoveryMocks;
  return { route, calls };
}

test("a pending Prospección signup can request a fresh verification email without sheet activation", async () => {
  const previous = { url: process.env.GOOGLE_SHEETS_WEBHOOK_URL, token: process.env.FOCUS_PORTAL_TOKEN };
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://example.test/webhook";
  process.env.FOCUS_PORTAL_TOKEN = "test-secret";
  try {
    const { route, calls } = await routeFixture();
    const response = await route.POST(new Request("https://onboarding.focusbusinesslab.es/api/auth/request-link", {
      method: "POST", body: JSON.stringify({ email: "person@example.test", returnTo: "https://prospeccion.focusbusinesslab.es/portal" }),
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(calls.map((call) => call.kind), ["magic", "mail"]);
    assert.equal(calls[1].action, "sendSignupLogin");
  } finally {
    if (previous.url === undefined) delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    else process.env.GOOGLE_SHEETS_WEBHOOK_URL = previous.url;
    if (previous.token === undefined) delete process.env.FOCUS_PORTAL_TOKEN;
    else process.env.FOCUS_PORTAL_TOKEN = previous.token;
  }
});

test("a pending Prospección-only signup cannot request a Radar link", async () => {
  const { route, calls } = await routeFixture();
  const response = await route.POST(new Request("https://onboarding.focusbusinesslab.es/api/auth/request-link", {
    method: "POST", body: JSON.stringify({ email: "person@example.test", returnTo: "https://radar.focusbusinesslab.es/" }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(calls, []);
});
