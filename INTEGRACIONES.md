# Integración del onboarding

## Flujo activo

1. El formulario envía un único objeto JSON a `/api/onboarding`.
2. La API valida la respuesta de `GOOGLE_SHEETS_WEBHOOK_URL` y confirma el envío únicamente cuando Apps Script devuelve `ok: true`.
3. Apps Script agrega una fila en la pestaña `Onboarding`.
4. El portal consulta `GOOGLE_SHEETS_PORTAL_URL`, valida el correo contra la pestaña `Accesos` y muestra las filas de `Onboarding`.
5. Al borrar un lead en el portal, Apps Script elimina esa misma fila de la hoja.

Google Sheets es la única fuente de verdad del flujo. El registro no depende de D1, GoHighLevel, Meta ni de otros webhooks.

## Variables requeridas

- `GOOGLE_SHEETS_WEBHOOK_URL`: URL `/exec` de la aplicación web de Apps Script.
- `GOOGLE_SHEETS_PORTAL_URL`: la misma URL `/exec`.
- `FOCUS_PORTAL_TOKEN`: secreto largo e idéntico en el sitio y en las propiedades del script.

No guardar el valor de `FOCUS_PORTAL_TOKEN` en el repositorio ni en el navegador.

## Apps Script

El archivo fuente es `google-apps-script/Code.gs`. Debe publicarse como aplicación web:

- Ejecutar como el propietario de la hoja.
- Permitir acceso a cualquier usuario; el token protege las lecturas y escrituras.
- Mantener en la fila 1 de `Onboarding` los 66 encabezados definidos por `ONBOARDING_HEADERS`.

## Acceso al portal

Para conceder o revocar acceso, añadir o actualizar un correo en la pestaña `Accesos`. Solo los correos cuyo estado sea `Activo` pueden entrar. La fecha es informativa.
