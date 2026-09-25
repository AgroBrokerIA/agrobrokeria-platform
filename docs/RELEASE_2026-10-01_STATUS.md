# AgroBrokerIA — Release 2026-10-01

## Estado técnico verificado — 25/09/2026

### Seguridad / datos
- 123 tablas públicas con RLS habilitado; 0 tablas públicas sin RLS.
- Contact Shield: lectura directa de `contactos_comerciales` retirada para `authenticated`; acceso únicamente mediante RPC autorizado por participación en operaciones.
- Operaciones, contratos, liquidaciones y pagos: escrituras directas desde el rol `authenticated` retiradas; las escrituras críticas pasan por RPC/funciones server-side.
- Contratos CONFIRMADOS: protección DB contra modificación de términos comerciales.
- Comisiones: invariantes de AgroBrokerIA y cálculo server-side reforzados.
- Liquidaciones: cálculos críticos server-side.
- Retiros: máquina de estados y reservas existentes, con validaciones server-side.
- No se detectaron funciones SECURITY DEFINER ejecutables por `anon`.
- Todos los SECURITY DEFINER públicos tienen `search_path` fijado.
- No se encontraron credenciales service-role en el cliente inspeccionado.
- Se eliminó un CUIT hardcodeado del archivo de ejemplo de variables de entorno.

### Documentación / firma
- LOI y SCO existentes.
- FCO agregado de extremo a extremo: tabla, RLS, RPC y frontend.
- Firma electrónica: solicitud con token de alta entropía, hash SHA-256 del documento, consentimiento, declaración, IP, user-agent, evidencia hash y auditoría.
- Las firmas ahora actualizan `contrato_firmantes` y el control de firmas de la operación.
- El contrato solo se marca con fecha de firma cuando se completan todos los firmantes requeridos.
- Se evita crear nuevas solicitudes para un firmante que ya firmó el contrato.

### Mercado / IA
- Smart Match se ejecuta mediante trigger sobre publicaciones.
- Oportunidades y compatibilidad están protegidas por RLS/RPC.
- La portada dejó de usar precios ficticios hardcodeados: utiliza un caché público agregado de publicaciones reales, sin exponer la publicación individual.
- El caché público se mantiene mediante trigger de base de datos.

### Tests
- Se añadió `supabase/tests/production_security.sql` con smoke tests de RLS, grants, invariantes financieras e idempotencia.
- Se verificó manualmente en la base actual: 0 valores financieros inválidos en operaciones y comisiones, 0 tablas públicas sin RLS, 0 SECURITY DEFINER ejecutables por anon y bloqueo de escrituras directas críticas.

## Bloqueos externos actuales

1. **Vercel:** el commit de lanzamiento sigue reportando estado `pending`. La integración devuelve HTTP 403 al intentar consultar logs porque la sesión actual no tiene autorización sobre el scope Vercel `agrobroker`. El repositorio sí tiene integración Vercel configurada y GitHub reporta el check de Vercel.
2. **Supabase Auth:** el Security Advisor mantiene activa la advertencia de *Leaked Password Protection*. Esta configuración debe habilitarse en Auth/Security del proyecto; la integración disponible no expone esa configuración.
3. **Firma:** la implementación actual es firma electrónica con evidencia reforzada. No debe presentarse como firma digital argentina certificada mientras no exista integración con un certificador/licencia de firma digital.

## Regla de release

No considerar el release técnicamente cerrado hasta verificar el build/deployment final de Vercel y ejecutar una prueba E2E autenticada sobre un entorno de producción/preproducción con usuarios de productor, comprador e intermediario.


## Circuito documental/fiscal — 25/09/2026

- Módulo FACTURAS agregado al frontend.
- `facturas` ampliada con receptor, contrato, producto, cantidad, datos fiscales, CAE/CAEA, respuesta ARCA, auditoría y responsable.
- Escritura directa de facturas bloqueada; creación mediante `crear_solicitud_factura`.
- Edge Function `arca-facturacion` desplegada y protegida con JWT.
- Adaptador WSAA/WSFEv1 preparado para homologación y producción. No genera CAE localmente.
- CAE, número de comprobante y resultado se guardan solamente desde la respuesta de ARCA.
- Bucket privado `agrobroker-private` creado con RLS por operación.
- Módulo CONTRATOS agregado con versionado y hash.
- Catálogo estructurado de 6 plantillas contractuales: abastecimiento, F1, F2, compraventa, intermediación y acuerdo comercial.
- Generador DOCX profesional implementado en Next.js; usa el contenido contractual existente y no inventa cláusulas jurídicas.
- Adaptador externo de firma y webhook HMAC desplegados. El proveedor real queda desacoplado mediante variables server-side.
- Workflow de cierre reforzado: la última etapa exige validación documental.
- Tests documentales/fiscales agregados.

### Integraciones externas pendientes de activación

**ARCA:** para emitir realmente en homologación/producción deben configurarse en Supabase Secrets `ARCA_ENVIRONMENT`, `ARCA_CUIT`, `ARCA_CERT_PEM` y `ARCA_PRIVATE_KEY_PEM`, y el certificado debe estar asociado al WSFEv1 según ARCA. ARCA documenta que WSAA requiere certificado X.509 y autorización/asociación al web service. 

**Firma externa:** falta seleccionar/configurar un proveedor concreto y sus credenciales. El sistema ya dispone del adaptador `firma-proveedor`, webhook HMAC y campos de trazabilidad; no se marca una firma como realizada por la plataforma sin evidencia del proceso externo.

**Vercel:** el check continúa `pending` y la sesión conectada no tiene acceso al scope del equipo Vercel, por lo que el deployment final todavía no puede certificarse desde esta integración.

**Supabase Auth:** Security Advisor mantiene *Leaked Password Protection* deshabilitado.


## Avance integral adicional — 25/09/2026

### Mercado centralizado
- Se incorporó el modelo inmutable `market_quotes` para conservar cada observación de mercado sin sobrescribir históricos.
- Se incorporó `market_sync_runs` para auditar cada actualización, resultado, cantidad de registros y error.
- Se desplegó `market-data-sync` como servicio central.
- El servicio consulta las páginas oficiales de cotizaciones locales BCR/CAC y FOB/FAS, normaliza observaciones y registra fuente, fecha, posición, puerto, precio, moneda y payload original.
- Se agregó `/mercado` al frontend con estados de carga, vacío, error y actualización manual.
- Se agregó endpoint de cron y programación laboral en Vercel; requiere `CRON_SECRET` configurado en Vercel para activar la ejecución automática.
- La base actual de `market_quotes` permanece en 0 registros hasta ejecutar una sincronización autenticada; no se insertaron precios ficticios.

### Facturación reforzada
- `crear_solicitud_factura` ahora exige tipo de comprobante válido, punto de venta, tipo documental del receptor y alícuota cuando corresponde.
- Se agregó clave de idempotencia fiscal, número solicitado, tipo documental y alícuota IVA.
- Se eliminó el overload legado de la RPC y se confirmó que `anon` no tiene EXECUTE.
- WSFEv1 dejó de asumir moneda, DocTipo e IVA 21%: utiliza los datos fiscales registrados en la factura y rechaza configuraciones incompletas/no soportadas.

### Calidad de entrega
- Se incorporó GitHub Actions CI para ejecutar `npm ci`, typecheck, lint y build en `apps/web`.
- GitHub Actions verificó exitosamente los commits `9307dbbf` y `b5c7066`: npm ci, lint, typecheck y build completaron correctamente.
- Vercel continúa sin scope accesible desde la integración actual; no se certifica deployment de producción.

### Estado de datos oficiales
- BCR publica actualmente las cotizaciones locales y referencias FOB/FAS; AgroBrokerIA utiliza esas páginas como fuente del adaptador y conserva el origen en cada observación.
- No se presentan valores de BCR en la aplicación hasta que el servicio de sincronización los obtenga realmente.


## 2026-09-25 — Autonomous hardening

- Added authorized short-lived signed URLs for private operation documents (`/api/storage/signed-url`).
- Added canonical `unit_conversion_rules` and `normalizar_unidad(...)`; mass normalization uses tonnes as the base and refuses unsupported technical conversions.
- Added unit normalization smoke tests.
- Removed duplicate GitHub Web CI workflow so lint/typecheck/build are executed by a single workflow.
- Vercel production deployments currently display build errors in the project UI. The available Vercel connection exposes no teams/projects and therefore cannot retrieve the exact build log. A prior commit status explicitly reported the Vercel build-rate-limit target; current failures must be rechecked once Vercel project access is available. No claim of production verification is made while this remains unresolved.


## 2026-09-25 — Final autonomous pass

### Matching IA
- Se corrigió el motor Smart Match para dejar de asignar producto=100 de forma incondicional.
- La compatibilidad ahora exige producto compatible por catálogo o historial real y penaliza incompatibilidades explícitas de volumen.
- El cálculo utiliza datos reales de cantidad, moneda/precio cuando son comparables, historial, condiciones y preferencias logísticas disponibles.
- Se incorporaron explicación y puntajes adicionales de condición/logística.
- Se endurecieron las RPC de procesamiento de Smart Match y generación de oportunidades para exigir autenticación y pertenencia a la empresa propietaria de la publicación.
- Las oportunidades ya no aceptan un score enviado por el cliente: el puntaje se toma del motor calculado.

### Unidades
- Se consolidó el servicio sobre la estructura existente unit_conversion_rules para evitar duplicar catálogos.
- Se soportan conversiones dimensionales de masa, volumen y superficie con factores técnicos explícitos.
- Se agregó persistencia de cantidad/unidad original y factor de normalización en publicaciones, ofertas y operaciones.
- Las conversiones masa/volumen incompatibles son rechazadas.

### Expediente y UI
- El detalle de operación ahora consulta documentos_operacion (estructura real) y Pricing Engine, evitando la tabla inexistente documentos.
- Se agregó endpoint de URLs firmadas con autorización por operación y expiración de 5 minutos.
- Dashboard y Oportunidades dejaron de asumir USD como moneda de toda publicación.

### Verificaciones actuales
- RLS deshabilitadas en tablas públicas: 0.
- SECURITY DEFINER ejecutables por anon: 0.
- Escritura directa authenticated bloqueada en operaciones, contratos, liquidaciones, pagos, facturas, comisiones y pricing.
- Plantillas contractuales activas: 6.
- Cotizaciones oficiales almacenadas actualmente: 0; por diseño no se muestran precios inventados.
- Las páginas oficiales BCR/FAS fueron inspeccionadas el 25/09/2026; la sincronización de producción todavía requiere una ejecución real del Edge Function.
- pgTAP no está habilitado en el proyecto actual, por lo que los archivos de pruebas SQL quedan como suite para el runner; los smoke checks críticos se ejecutaron mediante consultas SQL directas.

### Pendientes que no bloquean el desarrollo
- El build/production de Vercel no puede certificarse desde la conexión actual porque el scope Vercel no está autorizado.
- CI GitHub quedó configurado, pero no se declara un build exitoso hasta observar una ejecución real.
- ARCA y firma externa siguen preparados pero dependen de credenciales/proveedor reales.

- Se agregaron vistas navegables de Pagos y Reportes basadas únicamente en registros reales y respetando RLS.


## 2026-09-25 — Continuación autónoma

- Se persistió la aceptación legal al registrarse mediante trigger sobre `auth.users` cuando el alta contiene `legal_accepted=true`; se conserva versión, hash, user-agent y fecha.
- Se cargó el catálogo inicial de traducciones de interfaz para español, inglés, portugués, italiano, francés y alemán.
- El menú lateral ahora consume el catálogo multilingüe real desde `traducciones_ui`.
- Se desplegó `translate-document`: traduce contenido contractual mediante proveedor externo configurado, conserva idioma origen/destino, versión, proveedor y SHA-256, y guarda el artefacto traducido en el Storage privado de la operación. Sin proveedor configurado devuelve estado pendiente, nunca una traducción inventada.
- Contratos incorporó selector de idioma y acción de traducción.
- La traducción automática de mensajes comerciales ya dispone de acción en la conversación y conserva el original.
- Verificación actual de base: 123/123 tablas públicas con RLS y 0 SECURITY DEFINER ejecutables por `anon`.
- Las integraciones que requieren secretos externos continúan explícitamente marcadas como pendientes: ARCA, proveedor de firma, Google OAuth/Meet, proveedor de traducción, CRON_SECRET de Vercel y acceso al scope Vercel.


## 2026-09-25 — Cierre técnico adicional

- CI de GitHub Actions del commit `8ef5210dcbeb126df3fb70347eaf4cfc47577e54` completó correctamente: npm ci, lint, typecheck y build.
- La preferencia de idioma ahora propaga el cambio al Sidebar sin recargar la aplicación; catálogo UI activo: 150 traducciones para ES/EN/PT/IT/FR/DE.
- Se reforzó `verificaciones-sync`: no procesa solicitudes si `CRON_SECRET` no está configurado y exige secreto correcto para ejecutar consultas programadas. La función continúa registrando PENDIENTE cuando no existe integración oficial externa; no inventa verificaciones.
- `market-data-sync` fue actualizado a v3: parser BCR/CAC más estricto, conserva histórico/fuente/payload, identifica cotización local actual y múltiples observaciones FOB/FAS, y falla explícitamente si no logra extraer ninguna cotización en vez de declarar éxito vacío.
- Supabase: se añadieron índices para las claves foráneas nuevas sin cobertura y se optimizaron dos políticas RLS para evaluar `auth.uid()` una sola vez por consulta.
- Verificación actual: 123/123 tablas públicas con RLS; 0 SECURITY DEFINER ejecutables por `anon`; 150 traducciones UI; 7 documentos legales vigentes; 22 artículos de ayuda.
- `market_quotes` permanece en 0 hasta una ejecución real de sincronización; esto es intencional y evita datos ficticios.

### Pendientes que requieren intervención externa

- Acceso al scope/proyecto de Vercel para certificar deployment y configurar `CRON_SECRET`.
- Configuración de Auth > Security de Supabase para activar Leaked Password Protection.
- Credenciales/certificado ARCA para WSAA/WSFEv1.
- Proveedor y credenciales de firma electrónica externa.
- OAuth de Google/Google Calendar para Meet.
- Proveedor/API key de traducción automática.
- Mecanismos oficiales/credenciales para SISA, SENASA, INASE u otras verificaciones externas.
- Ejecución de E2E autenticado con usuarios de prueba de productor/comprador/intermediario una vez habilitado el entorno de preproducción/producción.


## 2026-09-25 — Estado de cierre verificado

- El commit actual de `main` es `7227595` (`docs: record final autonomous hardening pass`).
- GitHub reporta el check **Vercel: success** para `7227595`.
- El commit anterior `8ef5210` también tiene **Vercel: success**.
- Los estados `failure` de `55ec33e`, `d58bc0e` y `8098a89` corresponden a deployments históricos afectados por el límite de builds y no representan el estado del `main` actual.
- El deployment actual no puede inspeccionarse mediante la API de Vercel conectada porque el token disponible no tiene autorización sobre el scope `agrobroker`; por ello la certificación se basa en el check de Vercel reportado por GitHub y en la evidencia visible del proyecto.
- La certificación funcional completa todavía requiere E2E autenticado y las credenciales externas enumeradas abajo.
