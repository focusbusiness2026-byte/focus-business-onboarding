import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8");

class FakeSheet {
  constructor(rows) { this.rows = rows; }
  getDataRange() { return { getValues: () => this.rows.map((row) => [...row]) }; }
  getLastRow() { return this.rows.length; }
  appendRow(row) { this.rows.push([...row]); }
  getRange(row, column, rowCount = 1, columnCount = 1) {
    return {
      getValues: () => Array.from({ length: rowCount }, (_, offset) =>
        Array.from({ length: columnCount }, (_, index) => this.rows[row + offset - 1]?.[column + index - 1] ?? "")),
      setValue: (value) => { this.rows[row - 1][column - 1] = value; },
      setValues: (values) => {
        values.forEach((valuesRow, offset) => {
          while (this.rows.length < row + offset) this.rows.push([]);
          valuesRow.forEach((value, index) => { this.rows[row + offset - 1][column + index - 1] = value; });
        });
      },
    };
  }
}

function setup() {
  const user = { email: "client@example.test", role: "Cliente", radarAllowed: true };
  const onboarding = new FakeSheet([
    ["ID registro", "Email responsable", "Email corporativo"],
    ["ONB-A23D5DB5", user.email, ""],
    ["ONB-33296F71", "other@example.test", ""],
  ]);
  const quota = new FakeSheet([
    ["ID cliente", "Ejecuciones asignadas", "Ejecuciones usadas", "Ejecuciones disponibles", "Última actualización", "Nota"],
    ["ONB-A23D5DB5", 50, 0, "=MAX(0;B2-C2)", "", ""],
    ["ONB-33296F71", 50, 0, "=MAX(0;B3-C3)", "", ""],
  ]);
  const executions = new FakeSheet([["ID ejecución", "ID cliente", "Estado", "Fecha reserva", "Fecha cierre", "Tipo"]]);
  let busy = false;
  const sheets = { "Radar cuotas": quota, "Radar ejecuciones": executions };
  const context = {
    SpreadsheetApp: { openById: () => ({ getSheetByName: (name) => sheets[name] }) },
    LockService: { getScriptLock: () => ({ tryLock: () => !busy, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => "test-token" }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (value) => ({ setMimeType: () => ({ value }) }) },
  };
  vm.runInNewContext(source, context);
  context.findActiveUser = () => user;
  context.onboardingSheet = () => onboarding;
  context.json = (value) => value;
  const call = (operation, clientId = "ONB-A23D5DB5", executionId = randomUUID()) =>
    context.radarQuota({ operation, clientId, executionId, email: user.email });
  return { call, context, user, quota, executions, setBusy(value) { busy = value; } };
}

test("Radar charges only its own client, caps at 50, and honors manual adjustments", () => {
  const { call, quota, executions, user } = setup();
  const ids = Array.from({ length: 50 }, () => randomUUID());
  for (const id of ids) assert.equal(call("reserve", "ONB-A23D5DB5", id).ok, true);
  assert.equal(quota.rows[1][2], 50);
  assert.equal(quota.rows[2][2], 0);
  assert.equal(call("reserve").code, "quota_exhausted");
  assert.equal(executions.rows.length, 51);
  quota.rows[1][1] = 51;
  assert.equal(call("reserve").remaining, 0);
  assert.equal(quota.rows[1][2], 51);
  assert.equal(call("refund", "ONB-A23D5DB5", ids[0]).remaining, 1);
  assert.equal(call("refund", "ONB-A23D5DB5", ids[0]).remaining, 1);
  assert.equal(quota.rows[1][2], 50);
  user.role = "Administrador";
  assert.equal(call("reserve").unlimited, true);
  assert.equal(quota.rows[1][2], 50);
});

test("Radar rejects another client's ID and serializes quota operations", () => {
  const { call, quota, setBusy } = setup();
  assert.equal(call("reserve", "ONB-33296F71").code, "forbidden");
  setBusy(true);
  assert.equal(call("reserve").code, "busy");
  assert.equal(quota.rows[1][2], 0);
});

test("Radar balance reads only the selected client's row, including for administrators", () => {
  const { call, user, quota } = setup();
  quota.rows[1][2] = 4;
  quota.rows[2][2] = 9;
  assert.equal(call("balance").remaining, 46);
  assert.equal(call("balance").used, 4);
  assert.equal(call("balance", "ONB-33296F71").code, "forbidden");
  user.role = "Administrador";
  const selected = call("balance", "ONB-33296F71");
  assert.equal(selected.assigned, 50);
  assert.equal(selected.used, 9);
  assert.equal(selected.remaining, 41);
  assert.equal(selected.unlimited, true);
});

test("Radar guide history validates ownership and a consumed execution", () => {
  const { call, user } = setup();
  const id = randomUUID();
  assert.equal(call("access", "ONB-A23D5DB5", "").ok, true);
  assert.equal(call("access", "ONB-33296F71", "").code, "forbidden");
  assert.equal(call("receipt", "ONB-A23D5DB5", id).ok, false);
  assert.equal(call("reserve", "ONB-A23D5DB5", id).ok, true);
  assert.equal(call("receipt", "ONB-A23D5DB5", id).ok, false);
  assert.equal(call("commit", "ONB-A23D5DB5", id).ok, true);
  assert.equal(call("receipt", "ONB-A23D5DB5", id).consumed, true);
  assert.equal(call("receipt", "ONB-33296F71", id).code, "forbidden");
  user.role = "Administrador";
  assert.equal(call("access", "ONB-33296F71", "").unlimited, true);
  assert.equal(call("receipt", "ONB-33296F71", randomUUID()).unlimited, true);
});

test("reading a client without a quota row never creates one", () => {
  const { call, quota } = setup();
  quota.rows.splice(1, 1);
  const before = quota.rows.length;
  assert.equal(call("balance").code, "missing");
  assert.equal(quota.rows.length, before);
});

test("Radar status and action dispatch require the script token", () => {
  const { context, quota } = setup();
  assert.equal(context.doGet({ parameter: { action: "radarQuotaStatus", token: "test-token" } }).ok, true);
  assert.equal(context.doPost({ postData: { contents: JSON.stringify({ action: "radarQuota", operation: "reserve", clientId: "ONB-A23D5DB5", executionId: randomUUID(), email: "client@example.test", _focusToken: "wrong" }) } }).ok, false);
  assert.equal(quota.rows[1][2], 0);
});
