-- Backfill existing closed freight agreements so pre-existing trips can be linked safely.
WITH slots AS (
  SELECT c.id AS cierre_id, c.operacion_id, c.cantidad_camiones,
         c.valor_flete_por_camion_ars, c.comision_logistica_por_camion_ars,
         g.n AS numero_camion,
         md5(c.id::text || ':truck:' || g.n::text)::uuid AS slot_id
  FROM public.cierres_logistica c
  CROSS JOIN LATERAL generate_series(1, c.cantidad_camiones) AS g(n)
  WHERE c.estado_cierre = 'cerrado_formal'
    AND c.cantidad_camiones > 0
    AND c.valor_flete_por_camion_ars > 0
)
INSERT INTO public.cierres_logistica_camiones (
  id, cierre_logistica_id, numero_camion, operacion_id,
  valor_flete_ars, comision_ars
)
SELECT slot_id, cierre_id, numero_camion, operacion_id,
       valor_flete_por_camion_ars, COALESCE(comision_logistica_por_camion_ars, 0)
FROM slots
ON CONFLICT (cierre_logistica_id, numero_camion) DO NOTHING;

WITH ranked_trips AS (
  SELECT v.id AS viaje_id, v.cierre_logistica_id,
         row_number() OVER (
           PARTITION BY v.cierre_logistica_id
           ORDER BY v.creado_en NULLS LAST, v.id
         ) AS numero_camion
  FROM public.viajes v
  WHERE v.cierre_logistica_id IS NOT NULL
),
linked AS (
  UPDATE public.cierres_logistica_camiones s
  SET viaje_id = t.viaje_id,
      estado = CASE
        WHEN v.carta_porte_estado = 'DESCARGADA_CONFIRMADA' THEN 'DESCARGA_CONFIRMADA'
        WHEN v.carta_porte_estado IS NOT NULL
             AND v.carta_porte_estado NOT IN ('PENDIENTE','NO_EMITIDA') THEN 'CPE_VALIDADA'
        ELSE 'VIAJE_ASIGNADO'
      END,
      actualizado_at = now()
  FROM ranked_trips t
  JOIN public.viajes v ON v.id = t.viaje_id
  WHERE s.cierre_logistica_id = t.cierre_logistica_id
    AND s.numero_camion = t.numero_camion
    AND s.viaje_id IS NULL
  RETURNING s.id, s.cierre_logistica_id, s.numero_camion, s.viaje_id
)
SELECT count(*) FROM linked;

-- Normalize old singular source identifiers and guarantee one durable event per contracted truck.
UPDATE public.facturacion_eventos_outbox e
SET tabla_origen = 'cierres_logistica_camiones',
    registro_origen_id = s.id,
    tipo_evento = 'COMISION_LOGISTICA_CONTRATADA',
    payload = e.payload || jsonb_build_object(
      'camion_cierre_id', s.id,
      'viaje_id', s.viaje_id,
      'numero_camion_contratado', s.numero_camion,
      'flete_por_camion_ars', s.valor_flete_ars,
      'comision_por_camion_ars', s.comision_ars,
      'viaje_asociado', (s.viaje_id IS NOT NULL),
      'descarga_confirmada', (s.estado = 'DESCARGA_CONFIRMADA')
    ),
    actualizado_at = now()
FROM public.cierres_logistica_camiones s
WHERE e.clave_idempotencia =
      'logistics-close:' || s.cierre_logistica_id::text || ':truck:' || s.numero_camion;

INSERT INTO public.facturacion_eventos_outbox (
  tipo_evento, tabla_origen, registro_origen_id, operacion_id,
  clave_idempotencia, estado, moneda_origen, importe_origen, payload
)
SELECT
  'COMISION_LOGISTICA_CONTRATADA',
  'cierres_logistica_camiones',
  s.id,
  s.operacion_id,
  'logistics-close:' || s.cierre_logistica_id::text || ':truck:' || s.numero_camion,
  'REQUIERE_CONFIGURACION',
  'ARS',
  s.comision_ars,
  jsonb_build_object(
    'cierre_logistica_id', s.cierre_logistica_id,
    'camion_cierre_id', s.id,
    'numero_camion_contratado', s.numero_camion,
    'operacion_id', s.operacion_id,
    'flete_por_camion_ars', s.valor_flete_ars,
    'comision_por_camion_ars', s.comision_ars,
    'viaje_id', s.viaje_id,
    'viaje_asociado', (s.viaje_id IS NOT NULL),
    'descarga_confirmada', (s.estado = 'DESCARGA_CONFIRMADA'),
    'requiere_cpe_validada', true,
    'requiere_descarga_confirmada', true,
    'requiere_emisor_y_receptor_fiscal', true
  )
FROM public.cierres_logistica_camiones s
ON CONFLICT (clave_idempotencia) DO NOTHING;
