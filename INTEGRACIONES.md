# Integraciones del onboarding

## Flujo al enviar

1. El formulario envía un único objeto JSON a `/api/onboarding`.
2. La ruta reenvía el mismo objeto a `GOOGLE_SHEETS_WEBHOOK_URL` para registrar la respuesta completa en una hoja de cálculo.
3. En paralelo lo reenvía a `GHL_ONBOARDING_WEBHOOK_URL`. Ese webhook debe crear o actualizar el contacto con `contactName`, `contactEmail` y `contactPhone`, asignar etiquetas como `audience`, `services` y `sectors`, y lanzar el email de bienvenida.
4. La hoja se convierte en el registro operativo para preparar la subcuenta de GoHighLevel y el panel de administración.

## Configuración pendiente

1. Abrir `google-apps-script/Code.gs` desde Google Apps Script, implementar como aplicación web y limitar el acceso a las personas autorizadas de Focus Business.
2. En Propiedades del script, crear `FOCUS_PORTAL_TOKEN` con un valor aleatorio largo.
3. Copiar la URL de la implementación tanto en `GOOGLE_SHEETS_WEBHOOK_URL` como en `GOOGLE_SHEETS_PORTAL_URL`, y usar el mismo secreto como `FOCUS_PORTAL_TOKEN` del sitio.
4. Crear el webhook entrante de GoHighLevel y pegarlo en `GHL_ONBOARDING_WEBHOOK_URL`.

## Acceso al portal

El portal usa el inicio de sesión protegido de Focus Business/ChatGPT. Para conceder o revocar acceso, añadir o actualizar un correo en la pestaña `Accesos` de Google Sheets. Las contraseñas no se almacenan ni se gestionan en la hoja.

No guardar claves de Google, GoHighLevel, OpenAI o Gemini en el navegador ni en el repositorio.

## Preparación para Codex

El payload conserva tanto las respuestas de selección múltiple como los datos de contacto, calendario, automatizaciones e integraciones. Una automatización posterior puede leer esa fila o webhook, validar los datos y utilizar la API autorizada de GoHighLevel para crear la subcuenta y sus activos. Esa acción requiere credenciales y permisos que aún no se han facilitado.
