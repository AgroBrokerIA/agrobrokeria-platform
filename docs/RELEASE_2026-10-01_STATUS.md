# AgroBrokerIA — Release 2026-10-01

## Estado técnico verificado — 25/09/2026

### Seguridad / datos
- 104 tablas públicas con RLS habilitado; 0 tablas públicas sin RLS.
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
