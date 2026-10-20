import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8");

class Sheet {
  constructor(headers) { this.rows = [[...headers]]; this.maxColumns = headers.length; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return this.rows[0].length; }
  getMaxColumns() { return this.maxColumns; }
  insertColumnsAfter(column, count) {
    for (const row of this.rows) row.splice(column, 0, ...Array(count).fill(""));
    this.maxColumns += count;
  }
  getDataRange() { return { getValues: () => this.rows.map((row) => [...row]) }; }
  appendRow(row) { this.rows.push([...row]); }
  getRange(row, column, rowCount = 1, columnCount = 1) {
    return {
      getDisplayValues: () => this.rows.slice(row - 1, row - 1 + rowCount).map((values) => values.slice(column - 1, column - 1 + columnCount)),
      setValues: (values) => { values.forEach((cells, offset) => {
        const target = this.rows[row + offset - 1] || [];
        cells.forEach((cell, index) => { target[column + index - 1] = cell; });
        this.rows[row + offset - 1] = target;
      }); },
    };
  }
}

function fixture() {
  const context = vm.createContext({
    Utilities: { getUuid: () => "12345678-0000-0000-0000-000000000000" },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  });
  vm.runInContext(source, context);
  const onboarding = new Sheet([...vm.runInContext("ONBOARDING_HEADERS", context)]);
  const access = new Sheet(["Correo autorizado", "Rol", "Estado", "Última actualización", "Raspados asignados", "Raspados usados", "Raspados disponibles", "% disponible", "Estado cuota", "Última renovación", "Acceso Prospección", "Acceso Radar"]);
  const radar = new Sheet(["ID registro", "Asignadas", "Usadas", "Disponibles", "Actualizada", "Notas"]);
  context.onboardingSheet = () => onboarding;
  context.SpreadsheetApp = { openById: () => ({ getSheetByName: (name) => ({ Onboarding: onboarding, Accesos: access, "Radar cuotas": radar })[name] }) };
  context.json = (value) => value;
  const submit = (changes = {}) => context.activateShortSignup({
    signupId: "a".repeat(64), signup: {
      firstName: "Ana", lastName: "Pérez", email: "ana@example.test",
      companyName: "Productora A", description: "Vídeo corporativo para empresas",
      website: "", prospection: true, radar: true, terms: true, ...changes,
    },
  });
  return { context, onboarding, access, radar, submit };
}

test("short fields append to the existing Onboarding header without shifting old columns", () => {
  const { context, onboarding } = fixture();
  const original = onboarding.rows[0].slice(0, -5);
  onboarding.rows[0] = [...original];
  onboarding.maxColumns = original.length;
  context.ensureOnboardingHeaders(onboarding);
  assert.equal(onboarding.getMaxColumns(), original.length + 5);
  assert.deepEqual(onboarding.rows[0].slice(0, original.length), original);
  assert.deepEqual(onboarding.rows[0].slice(-5), [
    "Modalidad alta", "ID invitación", "Estado perfil", "Origen perfil", "Fecha perfil",
  ]);
});

test("short signup assigns 50 per selected product once, even after a retry", () => {
  const { onboarding, access, radar, submit } = fixture();
  const first = submit();
  assert.equal(first.ok, true);
  assert.equal(first.id, "ONB-12345678");
  assert.equal(submit().id, first.id);
  assert.equal(onboarding.rows.length, 2);
  assert.equal(access.rows.length, 2);
  assert.equal(radar.rows.length, 2);
  assert.equal(access.rows[1][4], 50);
  assert.equal(access.rows[1][5], 0);
  assert.equal(access.rows[1][10], "Permitido");
  assert.equal(access.rows[1][11], "Permitido");
  assert.equal(radar.rows[1][1], 50);
  assert.equal(onboarding.rows[1][onboarding.rows[0].indexOf("Estado perfil")], "Pendiente");
});

test("Radar-only signup grants no Prospección quota or access", () => {
  const { access, radar, submit } = fixture();
  assert.equal(submit({ prospection: false }).ok, true);
  assert.equal(access.rows[1][4], 0);
  assert.equal(access.rows[1][10], "Bloqueado");
  assert.equal(access.rows[1][11], "Permitido");
  assert.equal(radar.rows[1][1], 50);
});

test("a different email cannot reuse an invitation or reset an existing account", () => {
  const { onboarding, access, submit } = fixture();
  assert.equal(submit().ok, true);
  access.rows[1][5] = 7;
  assert.throws(() => submit({ email: "otra@example.test" }), /invitación ya está vinculada/);
  assert.equal(submit().ok, true);
  assert.equal(access.rows[1][5], 7);
  assert.equal(onboarding.rows.length, 2);
});

test("an existing onboarding email without access cannot be duplicated", () => {
  const { onboarding, access, submit } = fixture();
  const prior = onboarding.rows[0].map(() => "");
  prior[onboarding.rows[0].indexOf("Email responsable")] = "ana@example.test";
  prior[onboarding.rows[0].indexOf("Empresa")] = "Productora A";
  onboarding.rows.push(prior);
  assert.throws(submit, /ficha existente/);
  assert.equal(onboarding.rows.length, 2);
  assert.equal(access.rows.length, 1);
});

test("a blocked account stays blocked after a partial signup retry", () => {
  const { access, submit } = fixture();
  assert.equal(submit().ok, true);
  access.rows[1][2] = "Bloqueado";
  assert.throws(submit, /permisos existentes requieren revisión/);
  assert.equal(access.rows[1][2], "Bloqueado");
});

test("retry after onboarding row was saved but access write failed reuses the row", () => {
  const { onboarding, access, submit } = fixture();
  const append = access.appendRow.bind(access);
  access.appendRow = () => { throw new Error("write interrupted"); };
  assert.throws(submit, /write interrupted/);
  assert.equal(onboarding.rows.length, 2);
  access.appendRow = append;
  assert.equal(submit().ok, true);
  assert.equal(onboarding.rows.length, 2);
  assert.equal(access.rows.length, 2);
});
