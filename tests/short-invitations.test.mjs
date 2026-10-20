import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

async function fixture() {
  const rows = new Map();
  const limits = new Map();
  const DB = {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async first() {
          if (sql.includes("WHERE token_hash = ?")) return rows.get(args[0]) || null;
          if (sql.includes("submitted_at IS NOT NULL")) return [...rows.values()].find((row) =>
            row.email === args[0] && row.submitted_at && !row.activated_at) || null;
          if (sql.includes("WHERE email = ?")) return [...rows.values()].find((row) =>
            row.email === args[0] && !row.activated_at && row.expires_at > args[1]) || null;
          return null;
        },
        async run() {
          if (sql.includes("INSERT INTO public_short_signup_limits")) {
            const previous = limits.get(args[0]);
            if (previous?.windowStart === args[1] && previous.attempts >= args[2]) return { meta: { changes: 0 } };
            limits.set(args[0], { windowStart: args[1], attempts: previous?.windowStart === args[1] ? previous.attempts + 1 : 1 });
            return { meta: { changes: 1 } };
          }
          if (sql.includes("INSERT INTO")) {
            if (args.length === 6 && [...rows.values()].some((row) => row.email === args[1] && row.submitted_at && !row.activated_at)) {
              throw new Error("UNIQUE constraint failed");
            }
            rows.set(args[0], { token_hash: args[0], email: args[1], expires_at: args[2],
              created_at: args[3], submitted_at: args[4] || null, activated_at: null, payload_json: args[5] || null, onboarding_id: null });
            return { meta: { changes: 1 } };
          }
          if (sql.includes("SET expires_at")) {
            const row = rows.get(args[2]);
            if (!row || row.activated_at || row.expires_at > args[3]) return { meta: { changes: 0 } };
            row.expires_at = args[0]; row.submitted_at = args[1];
            return { meta: { changes: 1 } };
          }
          const row = rows.get(args[2]);
          if (!row || row.activated_at || sql.includes("SET submitted_at") && (row.submitted_at || row.expires_at <= args[3])) {
            return { meta: { changes: 0 } };
          }
          if (sql.includes("SET submitted_at")) { row.submitted_at = args[0]; row.payload_json = args[1]; }
          else { row.activated_at = args[0]; row.onboarding_id = args[1]; row.payload_json = null; }
          return { meta: { changes: 1 } };
        },
      };
    },
  };
  const source = readFileSync(new URL("../lib/short-invitations.ts", import.meta.url), "utf8")
    .replace('import { env } from "cloudflare:workers";', "const env = globalThis.__shortInviteEnv;");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  globalThis.__shortInviteEnv = { DB };
  const invitationApi = await import(`data:text/javascript,${encodeURIComponent(code)}#${Math.random()}`);
  delete globalThis.__shortInviteEnv;
  return { invitationApi, rows, limits };
}

const signup = { firstName: "Ana", lastName: "Pérez", email: "ana@example.test", companyName: "Productora A",
  description: "Servicios audiovisuales para empresas", website: "", prospection: true, radar: false, terms: true };

test("private invitation is email-bound, expires, and cannot be changed after submission", async () => {
  const { invitationApi, rows } = await fixture();
  const { token } = await invitationApi.createShortInvitation(signup.email);
  assert.equal((await invitationApi.findShortInvitation(token)).email, signup.email);
  await assert.rejects(invitationApi.createShortInvitation(signup.email), /invitación pendiente/);
  await assert.rejects(invitationApi.claimShortInvitation(token, { ...signup, email: "otra@example.test" }), /no es válida/);
  assert.equal((await invitationApi.claimShortInvitation(token, signup)).email, signup.email);
  assert.equal((await invitationApi.claimShortInvitation(token, signup)).email, signup.email);
  await assert.rejects(invitationApi.claimShortInvitation(token, { ...signup, companyName: "Otra" }), /alta pendiente/);
  const row = [...rows.values()][0];
  row.expires_at = new Date(Date.now() - 1000).toISOString();
  assert.equal(await invitationApi.findShortInvitation(token), null);
});

test("completed invitation cannot be reused", async () => {
  const { invitationApi, rows } = await fixture();
  const { token } = await invitationApi.createShortInvitation(signup.email);
  const claimed = await invitationApi.claimShortInvitation(token, signup);
  await invitationApi.finishShortSignup(claimed.token_hash, "ONB-12345678");
  assert.equal(await invitationApi.findShortInvitation(token), null);
  assert.equal([...rows.values()][0].onboarding_id, "ONB-12345678");
  await assert.rejects(invitationApi.claimShortInvitation(token, signup), /no es válida/);
});

test("public signup is email-bound, idempotent, and does not resend a pending submission", async () => {
  const { invitationApi, rows } = await fixture();
  const first = await invitationApi.createPublicShortSignup(signup);
  assert.equal(first.shouldSend, true);
  assert.equal(first.record.email, signup.email);
  assert.equal(rows.size, 1);
  const repeated = await invitationApi.createPublicShortSignup(signup);
  assert.equal(repeated.shouldSend, false);
  assert.equal(rows.size, 1);
  await assert.rejects(invitationApi.createPublicShortSignup({ ...signup, companyName: "Otra" }), /solicitud pendiente/);
  rows.get(first.record.token_hash).expires_at = new Date(Date.now() - 1000).toISOString();
  const renewed = await invitationApi.createPublicShortSignup(signup);
  assert.equal(renewed.shouldSend, true);
  assert.equal(rows.size, 1);
  assert.equal((await invitationApi.pendingShortSignup(signup.email))?.token_hash, first.record.token_hash);
  await invitationApi.finishShortSignup(first.record.token_hash, "ONB-PUBLIC");
  assert.equal(await invitationApi.pendingShortSignup(signup.email), null);
});

test("public signup limits requests without retaining the raw visitor IP", async () => {
  const { invitationApi, limits } = await fixture();
  const original = process.env.FOCUS_PORTAL_TOKEN;
  process.env.FOCUS_PORTAL_TOKEN = "test-secret-not-for-production";
  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      assert.equal(await invitationApi.consumePublicSignupAllowance("203.0.113.8"), true);
    }
    assert.equal(await invitationApi.consumePublicSignupAllowance("203.0.113.8"), false);
    assert.equal(await invitationApi.consumePublicSignupAllowance("203.0.113.9"), true);
    assert.equal(limits.size, 2);
    assert.ok(![...limits.keys()].some((key) => key.includes("203.0.113")));
  } finally {
    if (original === undefined) delete process.env.FOCUS_PORTAL_TOKEN;
    else process.env.FOCUS_PORTAL_TOKEN = original;
  }
});
