# AgroBrokerIA — Auditoría autónoma 2026-09-28

## Alcance
Auditoría sobre `main`, Supabase `hlviozkqskdhdaykgtis`, GitHub Actions y configuración Vercel disponible.

## Hallazgos corregidos

### Frontend / datos
- Se corrigió un error TypeScript en `/ofertas-recibidas`: `moneda_id` estaba declarado dos veces.
- `/ofertas-recibidas` ahora conserva y muestra por separado la moneda de la oferta y la moneda de la publicación, ambas desde base de datos.
- `/dashboard` dejó de asumir USD para publicaciones y mercado; utiliza monedas persistidas y la moneda real de las cotizaciones.
- `/documentos` dejó de generar cláusulas jurídicas inventadas para LOI/SCO/FCO; el PDF contiene únicamente datos registrados y una indicación explícita de que no agrega condiciones jurídicas.
- `/documentos` utiliza la moneda persistida de la operación para precio e importe.
- `/operaciones` utiliza `moneda_id` de la operación para precio e importe; la única excepción deliberada es la comisión fija de AgroBrokerIA: USD 1/TN.
- `/medios-cobro` dejó de usar un catálogo de monedas hardcodeado y carga el catálogo `monedas` desde Supabase.
- Se eliminaron imports/variables sin uso detectados en la pasada de lint.

### Seguridad financiera
- `public.comisiones` tenía privilegios de escritura para `authenticated` aunque RLS impedía las escrituras. Se revocaron INSERT/UPDATE/DELETE como defensa en profundidad.
- Se detectó y corrigió un error en `guardar_liquidacion_operacion`: el neto no descontaba la comisión AgroBrokerIA. La fórmula canónica queda:
  bruto - ajustes - deducciones - comisión AgroBrokerIA.
- Los registros existentes de `operacion_liquidacion` afectados por esa inconsistencia fueron reconciliados mediante la fórmula anterior, sin introducir datos nuevos.
- Verificación posterior: los registros auditados cumplen `importe_neto_usd = bruto - ajustes - deducciones - comisión`.

## Verificaciones Supabase
- 126/126 tablas públicas con RLS.
- 0 SECURITY DEFINER ejecutables por `anon`.
- Escrituras directas de `authenticated` bloqueadas en operaciones, contratos, liquidaciones, pagos, facturas, pricing y ahora también en la tabla legacy `comisiones`.
- `market_quotes`: 0 registros actuales; esto es correcto mientras no exista una ejecución real del sincronizador BCR/CAC.
- Edge Functions desplegadas y activas: firma, ARCA, proveedor de firma/webhook, market-data-sync, traducción y verificaciones.

## CI
El pipeline de GitHub Actions ejecuta npm ci, lint, typecheck y build. Los commits previos a esta última corrección pasaron lint/typecheck/build correctamente. La validación del commit final de esta auditoría debe quedar observada antes de declarar el código cerrado.

## Integraciones externas
No se inventan resultados ni enlaces:
- ARCA queda pendiente de certificado/CUIT y configuración WSAA/WSFEv1.
- Firma externa queda pendiente de proveedor y credenciales.
- Google Meet queda pendiente de OAuth/credenciales; sin ellas la API devuelve estado pendiente.
- Traducción automática queda pendiente de proveedor/API.
- Verificaciones SISA/SENASA/INASE y demás organismos quedan pendientes de mecanismos oficiales/autorización.
- Vercel: el check del commit actual puede quedar pendiente y la conexión disponible devuelve 403 por falta de autorización al scope `agrobroker`; no se certifica el deployment desde esta conexión.
- Supabase Auth: Leaked Password Protection continúa como configuración pendiente de activación manual.

## Conclusión técnica
No se detectaron bloqueos de código que requieran credenciales para continuar con las correcciones anteriores. Los únicos pendientes de activación identificados son externos y/o de configuración de cuenta.


## Correcciones adicionales verificadas

### Moneda de comisión
- El cierre de operación resuelve el ID de USD mediante el catálogo `monedas`; no depende de `moneda_id=2`.
- Las comisiones de plataforma existentes fueron reconciliadas contra el USD real del catálogo.
- Resultado verificado: 0 registros de comisión AgroBrokerIA con moneda distinta de USD.

### Liquidación
- La UI obtiene la moneda de la operación desde Supabase y dejó de mostrar USD para los importes comerciales cuando la operación utiliza otra moneda.
- La UI y la RPC `guardar_liquidacion_operacion` coinciden en el cálculo del neto: bruto menos ajustes, deducciones y comisión fija de AgroBrokerIA de USD 1/TN.

### Fiscal
- La RPC `crear_solicitud_factura` conserva como únicos defaults fiscales `NULL` para DocTipo, condición y alícuota; ya no presupone DocTipo 80 ni IVA 21%.
- La pantalla de Facturas dejó de precargar esos valores.
- La autorización fiscal continúa exclusivamente delegada en ARCA.

### Cierre de calidad
- Último CI observado: npm ci, lint, typecheck y build SUCCESS.
- Último check Vercel observado: SUCCESS.
- La conexión Vercel disponible sigue sin permitir inspeccionar el proyecto mediante la API conectada; el estado de deployment se certifica por el check oficial reportado por GitHub.
