import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8");

class FakeSheet {
  constructor(headers) { this.rows = [headers]; }
  getDataRange() { return { getValues: () => this.rows.map((row) => [...row]) }; }
  getLastRow() { return this.rows.length; }
  appendRow(values) { this.rows.push([...values]); }
  getRange(row, column, rowCount = 1, columnCount = 1) {
    return {
      setValues: (values) => {
        assert.equal(rowCount, values.length);
        assert.equal(columnCount, values[0].length);
        values.forEach((valueRow, rowOffset) => valueRow.forEach((value, columnOffset) => {
          this.rows[row + rowOffset - 1][column + columnOffset - 1] = value;
        }));
      },
    };
  }
}

function setup() {
  let busy = false;
  let uuid = 0;
  let accessFails = false;
  let accessCalls = 0;
  const context = vm.createContext({
    Utilities: { getUuid: () => String(++uuid).padStart(8, "0") },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => "test-token" }) },
    LockService: { getScriptLock: () => ({
      tryLock: () => !busy,
      releaseLock() {},
    }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (value) => ({ setMimeType: () => ({ value }) }) },
  });
  vm.runInContext(source, context);
  const headers = [...vm.runInContext("ONBOARDING_HEADERS", context), "Columna externa"];
  const sheet = new FakeSheet(headers);
  context.onboardingSheet = () => sheet;
  context.ensureClientAccess = () => {
    accessCalls += 1;
    if (accessFails) throw new Error("Permiso de escritura denegado");
  };
  context.json = (value) => value;
  const submit = (data = {}) => context.doPost({ postData: { contents: JSON.stringify({
    _focusToken: "test-token",
    companyName: "Productora de prueba",
    website: "https://productora.example.test/",
    contactEmail: "contacto@productora.example.test",
    submittedAt: "2026-10-14T10:00:00.000Z",
    ...data,
  }) } });
  return { sheet, headers, submit, setBusy(value) { busy = value; }, setAccessFails(value) { accessFails = value; }, get accessCalls() { return accessCalls; } };
}

function setupExistingAccess(status) {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const headers = [
    "Correo autorizado", "Rol", "Estado", "Raspados asignados", "Raspados usados",
    "Última renovación", "Acceso Prospección", "Acceso Radar",
  ];
  const sheet = new FakeSheet(headers);
  sheet.rows.push([
    "contacto@productora.example.test", "Cliente", status, 37, 8,
    "2026-09-01", "Bloqueado", "Bloqueado",
  ]);
  context.SpreadsheetApp = {
    openById: () => ({ getSheetByName: () => sheet }),
  };
  return { context, sheet };
}

test("equivalent retries reuse the same row and ID without changing workflow fields or extra columns", () => {
  const { sheet, headers, submit } = setup();
  const first = submit({ description: "Primera versión" });
  assert.equal(first.ok, true);
  assert.equal(first.saved, true);
  assert.equal(first.deduplicated, false);
  const stateIndex = headers.indexOf("Estado");
  const sentAtIndex = headers.indexOf("Fecha envío");
  const notesIndex = headers.indexOf("Notas internas");
  const descriptionIndex = headers.indexOf("Descripción");
  const originalSentAt = sheet.rows[1][sentAtIndex];
  sheet.rows[1][stateIndex] = "En revisión";
  sheet.rows[1][notesIndex] = "Nota operativa";
  sheet.rows[1][headers.length - 1] = "Preservar";

  const retry = submit({ description: "Primera versión" });
  assert.equal(retry.ok, true);
  assert.equal(retry.deduplicated, true);
  assert.equal(retry.id, first.id);
  assert.equal(retry.row, first.row);
  assert.equal(sheet.rows.length, 2);
  assert.equal(sheet.rows[1][sentAtIndex], originalSentAt);
  assert.equal(sheet.rows[1][stateIndex], "En revisión");
  assert.equal(sheet.rows[1][notesIndex], "Nota operativa");
  assert.equal(sheet.rows[1][descriptionIndex], "Primera versión");
  assert.equal(sheet.rows[1][headers.length - 1], "Preservar");
});

test("a changed public submission cannot overwrite the previous company's answers", () => {
  const { sheet, headers, submit } = setup();
  const first = submit({ description: "Respuesta original" });
  const edited = submit({ description: "Respuesta modificada" });
  assert.equal(edited.ok, false);
  assert.equal(edited.code, "identity_review");
  assert.equal(sheet.rows.length, 2);
  assert.equal(sheet.rows[1][headers.indexOf("Descripción")], "Respuesta original");
  assert.equal(sheet.rows[1][0], first.id);
});

test("a saved row remains confirmed when access creation fails, and a later retry reuses it", () => {
  const fixture = setup();
  const { sheet, submit, setAccessFails } = fixture;
  setAccessFails(true);
  const first = submit();
  assert.equal(first.ok, true);
  assert.equal(first.saved, true);
  assert.equal(first.accessReady, false);
  assert.equal(sheet.rows.length, 2);

  setAccessFails(false);
  const retry = submit();
  assert.equal(retry.ok, true);
  assert.equal(retry.accessReady, true);
  assert.equal(retry.id, first.id);
  assert.equal(sheet.rows.length, 2);
  assert.equal(fixture.accessCalls, 2);
});

test("busy lock cannot append and a different company cannot overwrite an existing client", () => {
  const { sheet, submit, setBusy } = setup();
  setBusy(true);
  assert.equal(submit().code, "busy");
  assert.equal(sheet.rows.length, 1);
  setBusy(false);
  const first = submit();
  const second = submit({ companyName: "Otra productora" });
  assert.equal(second.ok, true);
  assert.notEqual(second.id, first.id);
  assert.equal(sheet.rows.length, 3);
});

test("email and website pointing to different rows never overwrite or append", () => {
  const { sheet, submit } = setup();
  submit();
  submit({ companyName: "Productora de prueba", website: "https://otra.example.test", contactEmail: "otra@productora.example.test" });
  const conflict = submit({ website: "https://otra.example.test", contactEmail: "contacto@productora.example.test" });
  assert.equal(conflict.ok, false);
  assert.match(conflict.error, /identidad/);
  assert.equal(sheet.rows.length, 3);
});

test("a public website cannot attach a different email to an existing client ID", () => {
  const { sheet, submit } = setup();
  const original = submit();
  const takeover = submit({ contactEmail: "intruso@example.test" });
  assert.equal(takeover.ok, false);
  assert.match(takeover.error, /verificación por soporte/);
  assert.equal(sheet.rows.length, 2);
  assert.equal(sheet.rows[1][0], original.id);
});

test("missing identity headers fail closed before a new row is written", () => {
  const { sheet, headers, submit } = setup();
  sheet.rows[0][headers.indexOf("Email responsable")] = "Encabezado alterado";
  const result = submit();
  assert.equal(result.ok, false);
  assert.match(result.error, /encabezados esperados/);
  assert.equal(sheet.rows.length, 1);
});

test("reordered headers fail closed before any onboarding write", () => {
  const { sheet, headers, submit } = setup();
  const companyColumn = headers.indexOf("Empresa");
  const websiteColumn = headers.indexOf("Web");
  [sheet.rows[0][companyColumn], sheet.rows[0][websiteColumn]] = [sheet.rows[0][websiteColumn], sheet.rows[0][companyColumn]];
  const result = submit();
  assert.equal(result.ok, false);
  assert.match(result.error, /encabezados esperados/);
  assert.equal(sheet.rows.length, 1);
});

test("a retry leaves blocked access and all product, quota, role, and renewal controls untouched", () => {
  const { context, sheet } = setupExistingAccess("Bloqueado");
  const original = [...sheet.rows[1]];
  assert.equal(context.ensureClientAccess("contacto@productora.example.test"), false);
  assert.deepEqual(sheet.rows[1], original);
  assert.equal(sheet.rows.length, 2);
});

test("a retry of an active account may request a link without expanding product access or resetting quota", () => {
  const { context, sheet } = setupExistingAccess("Activo");
  const original = [...sheet.rows[1]];
  assert.equal(context.ensureClientAccess("contacto@productora.example.test"), true);
  assert.deepEqual(sheet.rows[1], original);
  assert.equal(sheet.rows.length, 2);
});
