# Integración del onboarding

## Flujo activo

1. El formulario envía un único objeto JSON a `/api/onboarding`.
2. La API valida la respuesta de `GOOGLE_SHEETS_WEBHOOK_URL` y confirma el envío únicamente cuando Apps Script devuelve `ok: true`.
3. Apps Script agrega una fila en la pestaña `Onboarding`.
4. El portal consulta `GOOGLE_SHEETS_PORTAL_URL`, valida el correo contra la pestaña `Accesos` y muestra las filas de `Onboarding`.
5. Al borrar un lead en el portal, Apps Script elimina esa misma fila de la hoja.
6. Tras confirmar la fila, la API notifica a Prospección enviando el `ID registro` en modo `prepare_only`; Prospección vuelve a leer Google Sheets y prepara el prompt y la configuración predeterminada con un máximo de 5 resultados, sin iniciar búsquedas ni consumir créditos.
7. La API también puede enviar a Focus Viral Radar un perfil estratégico minimizado para preparar búsquedas de contenido. Esta sincronización no inicia búsquedas ni consume APIs o créditos.
8. Si una notificación opcional no está configurada o falla, el registro principal del formulario no se pierde ni se marca como fallido.

Google Sheets es la única fuente de verdad del flujo. GoHighLevel no recibe datos ni se conecta: el formulario solo recopila y valida la información necesaria para que una creación posterior aprobada pueda prepararse sin pedir secretos.

El formulario no llama directamente al módulo de prospección ni duplica datos. La integración se realiza desde la lectura de la misma hoja. Si una fila no tiene una web pública válida o la autorización confirmada, Prospección debe mostrarla como bloqueada y no inventar un valor alternativo.

## Variables requeridas

- `GOOGLE_SHEETS_WEBHOOK_URL`: URL `/exec` de la aplicación web de Apps Script.
- `GOOGLE_SHEETS_PORTAL_URL`: la misma URL `/exec`.
- `FOCUS_PORTAL_TOKEN`: secreto largo e idéntico en el sitio y en las propiedades del script.
- `PROSPECTION_TRIGGER_URL`: endpoint interno del servicio de Prospección.
- `PROSPECTION_TRIGGER_TOKEN`: secreto compartido solo entre servidores; no se envía al navegador ni a Sheets.
- `VIRAL_RADAR_SYNC_URL`: endpoint interno que guarda el perfil estratégico del cliente en Focus Viral Radar sin ejecutar búsquedas.
- `VIRAL_RADAR_SYNC_TOKEN`: secreto compartido solo entre servidores para esa sincronización; nunca se incluye en el navegador ni en Google Sheets.

No guardar el valor de `FOCUS_PORTAL_TOKEN` en el repositorio ni en el navegador.

## Apps Script

El archivo fuente es `google-apps-script/Code.gs`. Debe publicarse como aplicación web:

- Ejecutar como el propietario de la hoja.
- Permitir acceso a cualquier usuario; el token protege las lecturas y escrituras.
- Mantener en la fila 1 de `Onboarding` los 138 encabezados definidos por `ONBOARDING_HEADERS`.

Los 42 encabezados nuevos se añaden después de los 96 existentes para preservar las filas actuales. Incluyen campaña, landing/VSL, accesos de Meta, regiones, WhatsApp, llamadas y dominio/subdominio. `ensureOnboardingHeaders` añade automáticamente solo las columnas finales que falten. Si detecta otro orden, crea una pestaña de respaldo antes de reorganizar por nombre. También puede ejecutarse manualmente `migrateOnboardingHeaders()` después de revisar la hoja.

## Acceso al portal

Para conceder o revocar acceso, añadir o actualizar un correo en la pestaña `Accesos`. Solo los correos cuyo estado sea `Activo` pueden entrar. Los roles que contienen `admin` ven todas las productoras; los demás solo ven y pueden borrar registros cuyo `Email responsable` o `Email corporativo` coincide con su correo autorizado. La fecha es informativa.

## Activación pendiente de autorización

1. Revisar y publicar la nueva versión de `google-apps-script/Code.gs`.
2. Ejecutar `migrateOnboardingHeaders()` y comprobar 138 columnas sin borrar la pestaña de respaldo.
3. Publicar el formulario con `GOOGLE_SHEETS_WEBHOOK_URL`, `GOOGLE_SHEETS_PORTAL_URL`, `FOCUS_PORTAL_TOKEN`, `PROSPECTION_TRIGGER_URL`, `PROSPECTION_TRIGGER_TOKEN`, `VIRAL_RADAR_SYNC_URL` y `VIRAL_RADAR_SYNC_TOKEN` como secretos del servidor.
4. No introducir contraseñas, claves API ni tokens en el formulario o la hoja.
