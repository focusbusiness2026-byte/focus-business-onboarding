# Onboarding de productoras - Focus Business

Aplicación multipaso con dos finalidades exclusivas: configurar la captación/prospección de clientes de una productora y recopilar, sin secretos ni credenciales, los datos para preparar una futura subcuenta de GoHighLevel.

## Incluye

- Formulario rápido de seis pasos, principalmente con selección múltiple.
- Borrador automático en el navegador mientras la productora completa el proceso.
- Revisión final con consentimiento y resumen de la configuración.
- Segmentación estructurada y explicada: ciudad/región/países, sectores, tipos de cliente, tamaño, servicios, presupuesto, exclusiones y preferencias.
- Capacidad mensual, casos/portafolio y empresas de referencia para evitar una segmentación incompatible con la operación real.
- Datos de preparación de subcuenta clasificados como requeridos o recomendados, con estado `Lista para revisión; no creada` y validación pendiente.
- Endpoint único para guardar el registro completo en Google Sheets.
- Validación final de los seis pasos y rechazo defensivo de contraseñas, claves API, tokens y claves privadas.
- Portal operativo en `/portal`; la ruta heredada `/admin` redirige allí y la exportación D1 heredada está desactivada.
- Acceso unificado por correo mediante enlace de un solo uso: caduca en 15 minutos, se invalida al primer canje y reemplaza cualquier sesión anterior del mismo correo.
- Vista pública de diseño del portal en `/portal-demo`, con una productora ficticia.

## Para activar las integraciones

Seguir `INTEGRACIONES.md` y configurar la URL de Apps Script y su token. Google Sheets es la única fuente de datos del formulario, portal y configuración de prospección. El formulario no crea subcuentas ni conecta GoHighLevel.
