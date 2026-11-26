# Candidato local para revisión del cliente — 26 de noviembre de 2026

El recorrido conserva el diseño y todos los datos de los seis pasos. La entrada principal pide una web, presenta la ficha encontrada y una propuesta editable, solicita un único contacto y permite terminar la revisión. Precios y capacidad son opcionales. Los accesos, números, recursos, herramientas y otros detalles se coordinan después o se editan en «Personalizar los seis pasos». El catálogo completo contiene 89 preguntas y conserva sus ramas. No se inventan nombres, precios, permisos ni datos internos para reducir los campos.

La vista del cliente no muestra proveedor, modelo, tokens, contadores de pendientes ni mensajes de depuración. Los campos admiten autocompletado del navegador. La generación no acepta las tres confirmaciones ni envía el formulario. La ayuda permite proponer cambios sujetos a revisión.

## Ejecución

- Node.js 22.13 o superior; validado con 24.19.
- Local: `npm run dev:review`, con la configuración privada autorizada en el entorno del proceso. La revisión bloquea todas las otras rutas `/api` antes de llegar a Google Sheets u otras integraciones. No usar una clave en el navegador ni en un fichero versionado.
- Comprobaciones: `npm test`, `npm run lint`, `npm run typecheck`. El último comando genera tipos reales del runtime Cloudflare con Wrangler; la configuración de tipos en `outputs/` contiene identificadores de ejemplo y no se despliega. Referencia: [documentación de Cloudflare](https://developers.cloudflare.com/workers/languages/typescript/#generate-types).

## Arquitectura preparada para publicación

El asistente ya tiene rutas de producción en el frontend compilado, además del middleware de revisión local. Las rutas `/api/onboarding/assistant`, `/assistant/logo` y `/assets/:asset` actúan como proxy hacia un servicio Node privado que reutiliza el mismo análisis validado y la lectura con protección SSRF y DNS fijado. El resto del formulario conserva su API y Google Sheets como fuente operativa.

Servicio Node: `npm run start:assistant`. Variables privadas del servicio:

- `OPENAI_API_KEY`; `OPENAI_MODEL` opcional, por defecto `gpt-5-mini`.
- `ASSISTANT_SERVICE_TOKEN`: secreto aleatorio de al menos 32 caracteres, compartido únicamente con el proxy.
- `HOST` y `PORT`: interfaz del alojamiento; por defecto escucha solo en `127.0.0.1:8140`. Configurar la interfaz privada del alojamiento al publicar.
- `ASSISTANT_ASSETS_DIR`: directorio persistente para logos; en local usa `outputs/assistant-assets`.

Frontend: `ASSISTANT_SERVICE_URL` y el mismo `ASSISTANT_SERVICE_TOKEN`, ambos exclusivamente en el entorno del servidor. El destino debe usar HTTPS salvo localhost. El proxy rechaza origen ajeno y solicitudes mayores de 60 KB; no sigue redirecciones y no devuelve errores privados del servicio. El servicio rechaza peticiones sin autenticación, serializa las consultas y limita cada origen a 30 unidades por hora (preparar una web cuesta 3, las acciones 1) y el total a 300. Los contadores viven en memoria: publicar una sola instancia; para escalar, trasladarlos a almacenamiento compartido. No registra cuerpos ni claves. Los logos tienen identificadores validados y se sirven con CSP restrictiva. `store:false` se conserva en las solicitudes al proveedor.

## Antes de publicar: pasos aún no ejecutados

1. Revisar este candidato local con el cliente y aprobar el destino de publicación. No se ha hecho push, despliegue ni cambio de configuración remota.
2. Configurar el servicio privado, sus secretos, almacenamiento persistente y variables del proxy en el alojamiento aprobado. Esto todavía no está conectado ni verificado en producción. Cambiar la clave expuesta previamente en la sesión de configuración conforme al incidente ya documentado.
3. Seguir `INTEGRACIONES.md`: comparar los 143 encabezados de `Onboarding`, conservar copia y revisar `migrateOnboardingHeaders()` y el Apps Script vigente antes de cambiarlo. Los campos ampliados continúan mapeados a columnas existentes; no modificar encabezados por la simplificación visual.
4. Validar en un entorno autorizado separado el guardado idempotente, enlace de acceso y permisos reales. La revisión local bloquea estos efectos; no representa una prueba de envío, correo, cuentas, dominios ni activaciones. Mantener separada la aprobación de envío y publicación.
5. Publicar solo tras autorización explícita. Después comprobar el recorrido público completo, logo persistente, límites, web privada/no disponible, opciones y ayuda; disponer de reversión a la versión anterior.

Este documento describe un candidato preparado y comprobado en local, no una publicación ni una verificación de integraciones remotas.
