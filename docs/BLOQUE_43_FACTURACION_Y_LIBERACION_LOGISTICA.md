# Bloque 43 — Facturación y liberación logística

## Alcance incorporado

- Cola transaccional e idempotente `facturacion_eventos_outbox`.
- Registro inmutable de rechazos y fallos ARCA en `factura_arca_incidentes`.
- Comisión de granos en USD 1/TN, generada por cada asignación de comisión de viaje que llega a `LIBERADA`.
- Comisión logística del 1% en ARS por camión contratado, calculada sobre el flete unitario pactado.
- Asociación de cada slot de camión contratado con un único registro de `viajes`.
- Liberación de elegibilidad de facturación logística únicamente cuando se cumplen todos estos requisitos:
  1. CTG de ARCA consultado y coincidente.
  2. Estado WSCPE `DD` (descargado en destino), persistido desde la consulta oficial.
  3. PDF de la CPE adjunto y validado.
  4. Confirmación de entrega del transportista.
  5. Confirmación de recepción del productor.
  6. Sin incidencia de recepción pendiente.
- La disponibilidad física de la flota se libera al confirmar DD en ARCA; la comisión continúa retenida hasta la doble conformidad.
- El PDF de factura y la autorización WSFEv1 permanecen sujetos a configuración fiscal válida.

## Migraciones de este bloque

Aplicar en orden cronológico desde la última migración ya registrada en Supabase:

- `20261109123000_add_fiscal_billing_outbox_for_released_grain_commissions.sql`
- `20261109124500_add_wsfe_service_description_and_exchange_rate.sql`
- `20261109131000_add_immutable_arca_billing_incident_log.sql`
- `20261109133000_queue_logistics_billing_per_contracted_truck.sql`
- `20261109134000_queue_grain_billing_per_confirmed_trip.sql`
- `20261109135000_allow_platform_admin_read_of_billing_queue_and_incidents.sql`
- `20261109136000_distinguish_contracted_logistics_billing_event.sql`
- `20261109137000_grant_admin_read_billing_queue_and_incidents.sql`
- `20261109138000_link_logistics_billing_to_real_truck_trip_and_discharge.sql`
- `20261109139000_backfill_logistics_truck_slots_and_existing_billing_events.sql`
- `20261109140000_persist_cpe_type_and_branch_for_official_status_queries.sql`

Antes de aplicar, verificar que el historial de migraciones de producción no tenga versiones posteriores o divergentes. Las migraciones de este PR no deben aplicarse a producción antes de aprobar el PR y completar CI.

## Operación WSCPE

La página `/carta-porte` ofrece consulta explícita del estado oficial de la CPE por viaje. La Edge Function `carta-porte-arca` usa `ConsultarCPEAutomotorReq`, comprueba que el CTG devuelto coincida con el registrado y persiste estado y fecha de consulta.

Estados elegibles para validar el documento: `AC`, `CF`, `CN`, `DD`. Solo `DD` confirma descarga. Si ARCA confirma DD pero falta el PDF oficial, se persiste el estado de ARCA y se libera la disponibilidad del camión, pero no se valida la evidencia ni se libera la comisión.

## WSFEv1 y límites de emisión

WSFEv1 no admite un campo libre `DetDesc` para describir ítems. La descripción comercial se conserva en el registro de factura y en el PDF generado por AgroBrokerIA; no se agrega un elemento XML no soportado por el esquema de ARCA.

No se debe emitir automáticamente hasta que estén verificados: emisor, receptor, CUIT, condición frente al IVA, punto de venta, tipo de comprobante, moneda y cotización (si corresponde), certificados y habilitación del ambiente. La cola mantiene esos eventos en `REQUIERE_CONFIGURACION` hasta que exista un flujo fiscal aprobado.

## Validación obligatoria antes de habilitar usuarios

1. GitHub Actions: audit, lint, typecheck y build en verde para el último commit del PR.
2. Despliegue Preview Vercel READY y prueba de acceso a `/carta-porte` y `/facturas`.
3. Aplicación de migraciones en entorno de prueba y verificación de RLS.
4. Pruebas WSCPE en homologación con certificados y CPE de prueba de ARCA.
5. Prueba del circuito por camión: emisión → consulta CTG → PDF → DD → confirmación transportista → confirmación productor → comisión.
6. Prueba WSFEv1 en homologación y conciliación del CAE.
7. Solo después, aprobación explícita del despliegue productivo y migraciones.

## Restricción operativa

No se generan datos de prueba en producción, no se inventan CTG/CAE ni cotizaciones y no se liberan fondos automáticamente. La comisión contable no equivale a una transferencia bancaria.
