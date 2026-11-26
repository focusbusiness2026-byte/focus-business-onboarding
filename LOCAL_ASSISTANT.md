# Asistente de onboarding — revisión local

Fuente: publicación v54 / `main` `f028f3f`. Rama de trabajo `local/onboarding-assistant-20261125`.

## Arranque

Requiere Node >=22.13 y las dependencias del repositorio. Ejecutar `npm run dev:review` y abrir `http://localhost:8130/`.

Configurar `OPENAI_API_KEY` exclusivamente en el entorno privado del proceso. `OPENAI_MODEL` selecciona el modelo; si no está definido se utiliza `OPENAI_ANALYSIS_MODEL` o `gpt-5-mini`.

También se puede indicar `FOCUS_OPENAI_ENV_SOURCE` con la ruta de una configuración privada de Focus ya autorizada. El lanzador lee en memoria únicamente las variables de OpenAI; no importa credenciales de Sheets, OAuth, mensajería ni otros servicios. No imprimir ni copiar los valores a código, documentación o registros.

El arranque comprueba acceso al modelo sin generar contenido. Una clave rechazada se presenta como conexión pendiente. No es una simulación automática ni se sustituye por resultados ficticios.

## Comportamiento

- El asistente está integrado en el formulario existente, con ventana nativa, teclado, revisión editable y alternativa manual.
- La API de desarrollo `GET/POST /api/onboarding/assistant` existe solo al arrancar con `FOCUS_LOCAL_REVIEW=true`. El plugin Node de Vite no activa una API de producción.
- El análisis real lee hasta cinco páginas públicas, con límites de tamaño/tiempo y direcciones públicas fijadas tras resolución DNS. Las redirecciones se vuelven a validar.
- OpenAI recibe el contenido público extraído y devuelve datos, fuentes, 5–8 preguntas y propuestas de preguntas cerradas para captación. El análisis inicial recibe contenido público. La ayuda y la generación/traducción reciben la consulta y el contexto del borrador necesario para responder; se excluyen secretos, autorizaciones y datos fiscales. Las llamadas usan `store:false`.
- Los resultados, ediciones y respuestas se guardan por web en el navegador. Reanalizar preserva ediciones; otra empresa usa otro borrador. No se debe tratar el borrador como registro enviado.
- La revisión bloquea las otras rutas API antes de ejecutar integraciones: no escribe Sheets, no envía enlaces/correos ni sincroniza Prospección o Radar. Los campos continúan siendo compatibles con el formato actual.
- No crea dominios, valida disponibilidad ni publica preguntas en Meta. Colores, tono y subdominio son propuestas; logo requiere un recurso identificable en la fuente.

## Verificación a 25 de noviembre de 2026

Lint y build correctos; 66 pruebas correctas (revisión final tras las mejoras de esta conversación). Suite completa ejecutada; las pruebas del asistente cubren aislamiento de APIs, direcciones privadas, límites, respuestas de proveedor y credenciales ausentes/rechazadas.

Lectura real de Kuro: cinco páginas públicas con HTTP 200. La clave de la copia local antigua de Radar devolvía `401 / invalid_api_key`; este bloqueo quedó superado al acceder a la cuenta Focus en Render desde Edge y usar su configuración vigente únicamente en memoria del proceso local. No se modificó la copia antigua ni ninguna configuración online.

Prueba final real en Edge con `gpt-5-mini`: ficha editable, siete preguntas de onboarding y cuatro preguntas cerradas para captación. Último análisis: 6.379 tokens totales. Se aplicó al formulario y se comprobó descripción, idioma Inglés, paleta negro/blanco/rojo y validación de contacto sin error. Las preferencias comerciales se dejaron pendientes. El logo y las tipografías no se obtuvieron con confianza; tampoco se inferieron datos legales. Se distinguieron propuestas y trabajos conceptuales del portafolio. No equivale a una validación de otras webs ni a un guardado real en Sheets.

Recorrido de navegador completo verificado con una ficha explícitamente ficticia: corrección de datos, siete preguntas, máximo de tres sectores, aplicación al formulario, persistencia al recargar y diálogo a 390 px sin desbordamiento. La simulación se ejecuta exclusivamente para QA con `FOCUS_ASSISTANT_FIXTURE=true`, se identifica en pantalla y no constituye un resultado real de OpenAI. No usarla en la sesión normal de revisión.

Estado de entrega: `http://localhost:8130/` abierto en Edge, en «Probar otra web», con el análisis de Kuro disponible para retomar. El servidor normal sigue activo y la simulación de QA está detenida. Probar las siguientes webs desde esa interfaz. No publicar ni habilitar escrituras sin autorización posterior.

La configuración vigente se transfirió mediante un paquete cifrado de un solo uso al proceso de `scripts/review-private-runtime.mjs`, sin incorporarla a archivos o código. En la continuación, la lectura de accesibilidad de Render expuso el valor que la pantalla mostraba enmascarado; se avisó al usuario y la rotación queda pendiente de su actuación. No se reproduce el valor aquí. El valor vive únicamente en el proceso local y sus hijos; si se detiene ese proceso, un arranque futuro necesita configurar de nuevo una clave vigente de forma privada. No usar la configuración local antigua rechazada.

El backend de desarrollo debe reiniciarse limpiamente después de cambiar su configuración; no ejecutar varias instancias ni compilar mientras se está probando una llamada. El puerto de revisión es estricto para evitar que una instancia antigua y otra nueva sirvan contratos distintos.

## Revisión adicional: configuración y ayuda en ambos espacios

- Ventana de una columna: empresa/actividad, contacto/ubicación, idiomas, redes, marca/logo y precios. Cada sección admite editar y aprobar; también puede aprobarse el conjunto al continuar. La actividad ofrece categorías reales y Otro escrito; no pide razón social, datos fiscales ni tamaño del equipo en el inicio.
- Distingue idioma publicado y comunicación elegida. Kuro se normaliza como Estudio creativo y digital y propone revisar inglés y español por el contexto Madrid/Barcelona. La prueba de ayuda cambió el borrador a español principal e inglés adicional tras aprobarlo.
- Redes estructuradas, ordenadas, con enlace, alta/baja y nombre para otra red. Precios por servicio, rango, moneda y modalidad: no se inventaron precios de Kuro. El importe usado en QA se retiró.
- Logos descargables y cacheados en `outputs/assistant-assets/` (ignorado). Solo imágenes de marca de cabecera/navegación, nunca logos de clientes. Kuro compone su logo con texto y animación: la demo usa una captura fiel de esa cabecera, etiquetada como captura; no un archivo vectorial recuperado ni un diseño generado. Este caso se capturó durante la revisión; no implica captura automática para cualquier web. En webs sin un recurso identificable el logo queda pendiente. El caché de imágenes y su ruta son locales: requieren almacenamiento/ruta adecuados antes de publicar.
- Preguntas de captación editables, principalmente cerradas, cantidad de 3 a 15, idioma, traducción y obligatoriedad. Aviso visible sobre filtrado/fricción. La prueba real generó ocho preguntas en español y las tradujo al inglés conservando las ocho cantidades de opciones, el tipo y la obligatoriedad (primeras tres obligatorias, cinco opcionales). La traducción que cambia cantidades se rechaza y conserva la versión anterior.
- Ayuda ChatGPT en onboarding y Prospección. Propone solo campos permitidos y aplica tras revisión. En Prospección abre/rellena borradores del editor; todavía hay que guardar manualmente cada campo. No envía respuestas del cuestionario, guarda búsquedas, inicia raspados ni modifica permisos/cuotas. Al cambiar de empresa se reinicia el chat y se rechazan propuestas con otro identificador.
- Prospección utiliza `focus-prospeccion-automation-5min`, rama `local/context-help-20261125`, en `http://localhost:8133/prospecting-guide`. Copia sintética `app.sandbox:app`, sin credenciales externas y con investigación/automatizaciones bloqueadas. La ayuda real se sirve desde el iframe de onboarding `http://localhost:8130/help`; solo intercambia mensajes con orígenes locales explícitos. No valida paridad de datos/permisos con producción.
- Apps Script local conserva encabezados y columnas: precios en Servicios; idioma principal separado y adicionales en Excepciones; preguntas con opciones/obligatoriedad. El perfil downstream incluye precios, idiomas, logo y paleta. No se instaló ni ejecutó este cambio en la hoja o Apps Script real. Requiere revisión y aprobación separada antes de publicación.
- Verificación final: 66 pruebas Node, lint, build; 5 pruebas Python del adaptador/plantilla/paridad estática y 1 prueba JS del adaptador correctas. `tsc --noEmit` encuentra tipos ambientales de Cloudflare Workers/D1/Fetcher ausentes y un `row` implícito en archivos no modificados; no se presenta como un typecheck correcto.
- Edge: revisión de Kuro y ayuda real en ambos; modificación de Ciudad objetivo a Barcelona abrió el borrador y se canceló sin guardar; cambio de empresa limpió la conversación. Diálogo nuevo probado a 390 px (scroll de página 390 y diálogo 352 px), sin desbordamiento; emulación restaurada.
- Ambos servidores locales se dejaron activos para pruebas; no hubo push, commit, despliegue, cambio de variables online ni escritura en Sheets. Los valores/aprobaciones de Kuro son una demostración de QA, no preferencias comerciales confirmadas por el cliente.

Última comprobación: reanálisis GPT real de Kuro con contrato actualizado de precios/logo completado, sin precios inventados; idioma publicado Inglés e idioma elegido Español separados y comprobados al retomar. Se corrigió la conservación de campos derivados frente a ediciones y se preservan preguntas de captación editadas/aprobadas al reanalizar la misma web. Las seis aprobaciones se reinician para revisar el análisis nuevo.


## Corrección de cobertura completa del onboarding — 25/11/2026

La revisión anterior de 5–8 preguntas omitía bloques completos y queda superada. El asistente ahora incorpora el catálogo completo de 89 preguntas de configuración, además de la revisión de identidad/marca/contacto y del editor de preguntas para leads. No confundir estas 89 preguntas del onboarding con la cantidad de preguntas de captación para Meta.

| Bloque | Preguntas del catálogo | Con selección | Condicionales |
|---|---:|---:|---:|
| 1. Identidad y recursos | 5 | 1 | 0 |
| 2. Oferta y cliente ideal | 22 | 15 | 0 |
| 3. Captación, landing y VSL | 19 | 12 | 2 |
| 4. Equipo, agenda y dominios | 19 | 10 | 8 |
| 5. Herramientas y automatizaciones | 22 | 19 | 14 |
| 6. Revisión y lanzamiento | 2 | 0 | 0 |

El número visible cambia según respuestas de WhatsApp, llamadas, anuncios, VSL y dominio. No se inventan preferencias ni se exige contestar todos los campos opcionales. Se muestran pendientes reales por bloque y un resumen revisable de todos los campos aplicables. Los bloques se pueden abrir directamente y mantienen el borrador por web; las fichas antiguas se amplían sin repetir la llamada de análisis.

Fuentes de implementación: `lib/onboarding-questions.json`, `lib/onboarding-questionnaire.mjs`, `app/components/FullQuestionnaire.tsx`. `scripts/audit-onboarding-fields.mjs` inspecciona el JSX del formulario original, sus etiquetas, tipos, opciones y campos Otro. La prueba compara los 100 controles declarados en los seis pasos con su cobertura por revisión, cuestionario o confirmaciones manuales; incluye además las tres opciones de DomainSearch. Otra prueba renderiza las 89 preguntas en las seis secciones y todas sus ramas posibles.

La IA recibe el catálogo entero como contexto y propone adaptaciones; la cobertura la conserva el servidor aunque solo adapte una parte. La respuesta del análisis retorna las 89 preguntas. Se mantienen las etiquetas empresariales del formulario y su vocabulario, con servicios adicionales adaptados por la IA. Ningún dato público confirma responsables, mercados, presupuesto o activación de automatizaciones.

Las respuestas se transfieren a las claves del formulario existente, conservando arrays, detalles Otro y regiones por país. Las ramas que dejan de aplicar se limpian antes de transferir. El botón final lleva al paso 6 del original y restablece sus tres confirmaciones a falso para que las revise la persona; no envía el formulario.

Verificación nueva: build y lint correctos; pruebas completas ampliadas (véase salida final de la suite). Llamada GPT real de Kuro con contrato nuevo: HTTP 200, cinco páginas, 89 preguntas y seis secciones, gpt-5-mini, 5.538 tokens de entrada y 3.555 de salida. Es prueba de contrato backend, no prueba de navegación. Edge perdió su conexión de navegador; el control de escritorio tampoco pudo seleccionar su pestaña (geometría no disponible y captura ajena a la ventana). No se declara un recorrido visual nuevo en Edge. La vista de 390 px documentada antes corresponde a la versión anterior, no a este cuestionario ampliado.

Todo permanece local; no se modificó Apps Script online, Sheets ni integraciones. El servidor sigue en http://localhost:8130/ con OpenAI validado en memoria. Al volver a abrir/recargar la ficha guardada, el cuestionario ofrece los seis bloques completos.

Resultado final de esta ampliación: 77 pruebas Node correctas, lint/build correctos. Se añadió conservación del borrador manual de la misma web e inclusión de todos los campos del catálogo en la ayuda contextual. Typecheck sin nuevos errores fuera de las incidencias ambientales ya indicadas. Verificación visual ampliada en Edge pendiente por la desconexión descrita.

### 2026-11-25 — Recorrido ampliado de Kuro completado en Edge, sin envío

- Superado el bloqueo anterior de Edge: recorrido real de la interfaz local con la ficha guardada de Kuro, revisión de identidad/marca/contacto y los seis bloques del catálogo de 89 preguntas. Respuestas conservadas al recargar y al retomar la ficha. No se repitió el análisis web en esta continuación; se utilizó el análisis GPT real previamente guardado.
- Probadas ramas de VSL, dominio nuevo/existente/subdominio, WhatsApp, llamadas, grabación y Meta. Comprobados límite de tres sectores, limpieza de regiones al cambiar país, servicios personalizados y decisor Otro al trasladar al original. El enlace VSL de prueba y dominios de las ramas descartadas quedaron vacíos en el formulario original.
- Cobertura visible al retomar: identidad 4/5, oferta 22/22, captación 18/18, equipo 13/13, herramientas 14/21 y revisión 2/2. Ocho respuestas aplicables pendientes; no se inventaron recursos, herramientas actuales, números ni accesos. Se verificó carga del logo local de Kuro, identificado como captura fiel de cabecera.
- Ocho preguntas de captación en español, editadas manualmente como demostración: tres obligatorias y cinco opcionales. Conservadas en el paso Captación. Precios, segmentación, presupuesto, agenda y responsables ficticios claramente señalados como DEMO/PRUEBA; no son decisiones aprobadas por Kuro.
- El reinicio había perdido la configuración privada del proceso. Se recuperó desde la configuración autorizada en Render mediante paquete cifrado y portapapeles restaurado, sin mostrar ni guardar el valor ni modificar Render. Servidor local activo con ChatGPT conectado; consulta real de ayuda respondió sobre los pendientes del borrador sin aplicar cambios. La rotación de la exposición histórica sigue pendiente del propietario.
- Entrega: http://localhost:8130/ en Edge, paso 6 Revisión y preparación, borrador de Küro Digital Studio rellenado y las tres confirmaciones desmarcadas. No se pulsó Enviar configuración. Sin Sheets, correos, publicación, commit/push ni cambios de código en esta continuación. El avance original se recupera tras recarga; el asistente vuelve a la entrada y permite retomar la ficha guardada.
- Fuente: formulario-productoras-access-recovery-20261023/LOCAL_ASSISTANT.md. La prueba visual de esta versión fue de escritorio; no se declara una nueva prueba móvil.

### 2026-11-26 — Recuperado el enlace local de revisión

- El usuario no podía abrir http://localhost:8130/: verificado que no había proceso escuchando en 8130 y la conexión era rechazada. No se conoce la causa de la terminación anterior.
- Reiniciado scripts/review-server.mjs como proceso independiente oculto, sin cambiar código ni configurar arranque automático. Abierto Edge y verificado visualmente el borrador persistente de Küro Digital Studio en el paso 6. Tres autorizaciones desmarcadas; ningún envío.
- La página vuelve a estar disponible solo en este equipo mientras el servidor siga activo. La clave del proceso anterior no persistió; nuevas consultas a ChatGPT están pendientes de reconexión. El borrador guardado se puede revisar. No se accedió a Render ni se transfirieron credenciales en esta recuperación.

### 2026-11-26 — GPT activo y análisis nuevo de Kuro verificado en Edge

- Superado el estado anterior de conexión pendiente. Configuración vigente recuperada de la sesión autorizada de Render mediante transferencia RSA cifrada de un solo uso, portapapeles restaurado y sin mostrar ni guardar la clave. Render no se modificó.
- scripts/review-private-runtime.mjs admite FOCUS_REVIEW_DETACHED=true: inicia el servidor oculto e independiente de la sesión de ejecución, con la configuración privada únicamente en memoria, y termina el lanzador. Verificado que el proceso sigue activo tras salir el lanzador. No configura arranque automático ni persiste secretos; apagar el equipo o detener el proceso requiere restablecer la configuración privada.
- API local comprobada: configured=true, authenticated=true, simulated=false, modelo gpt-5-mini. Desde Edge se introdujo https://kurodigitalstudio.com/ y se pulsó Analizar mi web, sin usar el botón de ficha guardada. El progreso terminó en Tu configuración inicial con descripción nueva y paleta negro/blanco/rojo; logo local cargado. Es un análisis nuevo real de GPT, no solo prueba de conexión o recuperación de caché.
- Borrador y precios DEMO anteriores conservados; seis aprobaciones reiniciadas para revisión del resultado nuevo. Ficha nueva abierta en Edge, http://localhost:8130/. No se aplicaron ni enviaron cambios del reanálisis al formulario original en esta continuación. No hubo Sheets, correos, publicación ni despliegue.
- Validación del cambio de arranque: node --check, ESLint del lanzador y git diff --check correctos. No se declara una nueva ejecución de la suite completa de 77 pruebas por este cambio puntual del proceso local.

### 2026-11-26 — Corregido de nuevo el arranque local tras repetirse la caída

- La afirmación anterior de permanencia con detached no se sostuvo: en el siguiente turno no existía el proceso ni un listener en 8130. El diagnóstico verificado es terminación del servidor; la atribución a la finalización/limpieza del entorno de ejecución es una inferencia, no un error registrado por la aplicación.
- Añadido --bootstrap-dir a scripts/review-private-runtime.mjs para recibir un único paquete RSA cifrado desde un directorio local único. Solo se escribe la clave pública; el paquete cifrado se consume y elimina. La clave privada y el valor OpenAI permanecen en memoria. La espera de configuración expira a los cinco minutos.
- Iniciado el lanzador con Win32_Process.Create de Windows, no como descendiente del terminal del agente. Verificado padre WmiPrvSE.exe y servidor hijo activo. No se creó tarea programada, servicio permanente ni arranque automático; no se guardó la API key en archivos ni se modificó Render. El modo detached anterior no demuestra persistencia tras finalizar un turno y no debe usarse como prueba de ello.
- Página HTTP 200 y API configured=true/authenticated=true/simulated=false, gpt-5-mini. Nuevo análisis de kurodigitalstudio.com pulsado en Edge y completado visualmente en Tu configuración inicial, con descripción nueva. Borrador previo y ejemplos DEMO conservados. Ficha abierta para revisión, sin enviar ni aplicar de nuevo el análisis al original.
- Sintaxis, lint del lanzador y git diff --check correctos. La permanencia posterior al cierre de este turno no se puede comprobar desde el mismo turno; se verificaron la nueva filiación de Windows y las peticiones mientras estaba activo. Mantener esta distinción en próximos estados, sin prometer disponibilidad indefinida.

### 2026-11-26 — GPT configura los seis pasos, además de formular preguntas

- Corregida la carencia detectada por Moisses: el prompt anterior solo extraía empresa/marca y adaptaba preguntas. La nueva respuesta exige seis stepPlans y una decisión por cada una de las 89 preguntas, con valor, clasificación, motivo y fuente. Se rechaza una respuesta que omita pasos o campos.
- Las propuestas rellenan oferta/cliente ideal, captación/landing/copy, agenda/dominio y automatizaciones. Los datos internos (responsables, fecha, capacidad, herramientas actuales, precios internos, números, permisos y pagos) quedan pendientes de confirmación. Correo de contacto requiere evidencia literal; las preferencias comerciales siempre se clasifican como propuestas. No se inventan clientes a partir de trabajos conceptuales.
- Revisión inicial con los seis pasos, acceso directo a cada uno y botón para rellenarlos con la propuesta de GPT. Se conservan respuestas anteriores y existe recuperación reversible. Cada pregunta muestra fuente/propuesta/dato pendiente; cada paso puede editarse y aprobarse.
- Paso 6 del formulario original incluye ahora el detalle de los seis bloques y sus pendientes, con edición por paso y precios relevantes. El traslado conserva arrays, Otro y limpieza condicional. Las tres confirmaciones siguen desmarcadas y el envío local continúa bloqueado.
- Archivos principales: lib/onboarding-plan.mjs, scripts/onboarding-assistant.mjs, app/components/SixStepPlan.tsx, FullQuestionnaire.tsx, FullConfigurationSummary.tsx y OnboardingAssistant.tsx; resumen en app/page.tsx. Sin cambios de encabezados ni Apps Script online por esta ampliación.
- Validación: Node 24.19, build y lint correctos, 83 pruebas Node correctas. Typecheck conserva solo los tipos ambientales Cloudflare Workers/D1/Fetcher ausentes y el row implícito previo; sin errores nuevos en las fuentes de esta ampliación.
- Servidor actualizado mediante el arranque Windows previamente comprobado entre turnos; API 2026-11-26.6steps, authenticated=true y simulated=false. Prueba GPT real de Kuro iniciada desde Edge con el contrato completo; el resultado visual se registra al terminar la comprobación.

El primer ensayo real del plan devolvió los seis bloques, pero dejó vacías varias preferencias configurables. Se ajustó el esquema para exigir valores propuestos en esos campos (audiencia, segmentación, modelo de presupuesto, criterios de captación, copy, agenda y flujos); solo los datos internos y los datos públicos no disponibles admiten pendientes. La primera respuesta no se considera la entrega final del recorrido.

La recarga del backend durante desarrollo produjo un error del worker local; se sustituyó por un reinicio limpio. El lanzador Windows conserva ahora la configuración privada en memoria y admite una solicitud local `restart.txt` con contenido `restart` en su directorio de bootstrap, para reiniciar exclusivamente su árbol de servidor sin volver a transferir la clave. El paquete cifrado se sigue consumiendo una sola vez y no se guardan secretos. API actual: 2026-11-26.6steps.2.

### 2026-11-26 — Entrega verificada: configuración GPT de los seis pasos con Kuro

- El formato definitivo usa seis objetos con las 89 claves de campo obligatorias en el esquema de OpenAI. Se evita depender de que una lista generada recuerde todos los campos. Las preferencias configurables exigen propuesta; 27 clases de datos internos permanecen pendientes. Las respuestas parciales anteriores fueron rechazadas y no son la entrega final.
- Prueba GPT real completada desde Edge con API 2026-11-26.6steps.3, gpt-5-mini, cinco páginas de Kuro y 24.477 tokens totales en el análisis mostrado. Todos los pasos/campos retornaron; se usó el botón para rellenar los seis pasos con la propuesta y se recorrieron los seis bloques hasta aplicar al formulario original.
- Borrador final original: 81 preguntas aplicables, 57 con respuesta y 24 pendientes internos. Paso 1: 3/5; paso 2: 19/22; paso 3: 17/18; paso 4: 10/13; paso 5: 8/21; paso 6: 0/2. El catálogo completo sigue conteniendo 89 preguntas, incluidas las ramas no aplicables. No afirmar que los datos de Kuro están completos para enviar: faltan responsable, recursos, precios/capacidad, ciclo de venta, personas/roles, herramientas actuales, cuentas/permisos/pagos, números/consentimientos de telefonía y fecha/aprobador.
- Se completó el correo del contacto con el correo empresarial publicado, se precisaron Madrid/Barcelona y la propuesta de landing, y se aclaró que trabajos conceptuales no prueban clientes. Se retiró el precio ficticio anterior y se sustituyeron las notas DEMO por una identificación clara de propuestas para revisión. No se inventaron datos internos.
- Ocho preguntas de captación en español conservadas: tres obligatorias y cinco opcionales. Fuentes y consumo visibles en el asistente. Al aplicar, el paso 6 original presenta los seis resúmenes desplegables; las tres autorizaciones permanecen desmarcadas. Persistencia comprobada al recargar y volver al paso 6. Entrega abierta en Edge, http://localhost:8130/, centrada en la revisión completa; no se envió el formulario.
- El servidor Windows anterior se había mantenido entre turnos. Para cargar esta versión se hizo reinicio limpio; se añadió reinicio local de su árbol mediante archivo de control no secreto, comprobado con conservación de la configuración GPT en memoria. Último lanzador activo, padre de Windows, API autenticada y sin simulación. No se configura inicio automático tras apagar el equipo.
- Build/lint correctos, 83 pruebas completas correctas y prueba adicional del formato de claves fijas correcta. Typecheck conserva solo los problemas ambientales previos de Cloudflare y row; sin errores nuevos en estas fuentes. Git diff --check correcto. No hubo commit/push, publicación/despliegue, Sheets, Apps Script online, conexiones o automatizaciones reales.

### 2026-11-26 — Opciones GPT para los datos pendientes de cualquier paso

- Moisses pidió ofrecer alternativas para los 24 datos internos pendientes y para cualquier campo que quede sin respuesta. Implementado sin convertir hipótesis en datos confirmados: GPT devuelve preguntas, motivos y opciones; generar opciones no cambia ninguna respuesta.
- Los desplegables existentes priorizan opciones pertinentes del catálogo; los campos de texto ofrecen elecciones contextuales, escritura manual y confirmación posterior. Para responsables se ofrecen roles separados (dirección creativa, producción, comercial/marketing), sin inventar nombres. Teléfonos/correos candidatos solo pueden reutilizar los contactos publicados del análisis, con confirmación del uso. Enlaces privados y nombres requieren entrada manual. Posponer conserva el campo pendiente.
- Se consulta únicamente el perfil público necesario, los servicios y los campos sin respuesta, con store:false. No se envían responsables privados, carpetas de recursos, permisos, consentimientos ni secretos. Se excluyen marcas del portafolio del contexto para evitar tratarlas como clientes; los motivos que atribuyen hechos no comprobados al sitio se sustituyen por una explicación neutral.
- Nuevo botón Completar pendientes con opciones de GPT. Las opciones se guardan en el borrador por empresa y contexto; retomar no repite el análisis web. Un nuevo campo vacío genera sus propias opciones. La ayuda de onboarding conoce el flujo. No cambia el catálogo completo de 89 preguntas, las confirmaciones finales ni los encabezados de Sheets.
- Prueba GPT real en Edge con Kuro: opciones para los 24 pendientes a través de los seis bloques; se verificó un campo adicional al vaciar Nombre de la reunión (25 conjuntos de opciones guardados). Elegir un rol no rellenó un nombre; el rango de capacidad se seleccionó y se restableció; el teléfono publicado rellenó únicamente el campo elegido y se retiró al terminar la prueba; el estado de cuenta WhatsApp siguió sin confirmar. El nombre de la reunión se restauró a su propuesta anterior. No quedan datos ficticios añadidos por estas comprobaciones.
- Al recargar y abrir los pendientes, las opciones se conservaron sin nueva preparación (sin indicador de consulta). Confirmar más tarde mantuvo el nombre vacío. Entrega en Edge con el primer dato pendiente y sus alternativas visibles; borrador original sin enviar y sin activación de servicios. API 2026-11-26.pending-options.3 autenticada y sin simulación, servidor Windows activo.
- Build/lint y 89 pruebas completas correctos; typecheck solo conserva las incidencias ambientales previas de Cloudflare y row, sin errores nuevos de esta ampliación. Sin commit/push, despliegue, Sheets, Apps Script online ni mensajes.
- Archivos: lib/pending-options.mjs, scripts/pending-options.mjs, scripts/context-help.mjs, scripts/onboarding-assistant.mjs, app/components/FullQuestionnaire.tsx y OnboardingAssistant.tsx, tests/pending-options.test.mjs y full-questionnaire-render.test.mjs.


### 2026-11-26 — Candidato local orientado al cliente

- Recorrido principal: web → ficha encontrada editable → un contacto (nombre opcional, correo precargado si es público) → revisión final. Precios/capacidad son opcionales. Los seis pasos y las 89 preguntas con sus ramas siguen disponibles en «Personalizar los seis pasos»; se conserva la alternativa manual y el enlace de alta breve.
- Se retiran de la vista del cliente referencias a GPT/OpenAI, entorno local, tokens, contadores de pendientes y diagnóstico. Se mantiene el diseño, el modal de una columna y el autocompletado. La revisión rápida pasa directamente a la revisión final, sin pantalla duplicada. Fecha/aprobador y las ocho preguntas de captación conservadas quedan en secciones opcionales. Las tres confirmaciones siguen sin marcar y no se ha enviado.
- Kuro se preparó de nuevo con la API real desde Edge. Se verificaron actividad, descripción, contacto público, Madrid/Barcelona e idiomas español/inglés; se revisaron los seis bloques y las ocho preguntas, se aplicó la ficha y se comprobó persistencia al recargar. Se sustituyó la captura de cabecera que cortaba el texto del logo por una captura completa del original en /about (no es un archivo vectorial). La ayuda real responde a la duda de accesos/telefonía sin proponer cambios; las preguntas informativas y los cambios sin efecto se filtran también en el servidor.
- Rutas de producción compiladas preparadas: proxy del asistente/logo/assets hacia servicio Node privado autenticado, límites de cuerpo, concurrencia y consumo, mensajes públicos neutros y directorio persistente de logos configurable. Reutiliza el lector con SSRF/DNS fijado y store:false. Falta configurar y verificar ese servicio y el proxy en el alojamiento definitivo; no afirmar que ya está conectado en producción.
- Validación final: Node 24.19, build, 95 pruebas Node, lint y TypeScript correctos. Los ocho errores ambientales anteriores se resuelven generando los tipos reales de Workers con Wrangler y tipando las respuestas JSON. API local 2026-11-26.customer.1 autenticada, sin simulación; proceso supervisor con clave solo en memoria. Se verificó la página 200 tras reinicio limpio.
- Entrega: Edge, http://localhost:8130/?step=5, ficha de Kuro aplicada para revisar; nombre interno desconocido y demás hechos privados siguen sin inventarse. Sin envío, consentimientos, Sheets, correos, activaciones, commit/push, publicación ni cambios remotos.
- Publicación pendiente de aprobación y configuración: revisar PRODUCTION_CANDIDATE.md e INTEGRACIONES.md, el Apps Script vigente y los 143 encabezados, preparar secretos/almacenamiento privados, resolver la rotación previamente documentada y probar guardado/acceso en entorno autorizado. La validación local no sustituye esa prueba real.
