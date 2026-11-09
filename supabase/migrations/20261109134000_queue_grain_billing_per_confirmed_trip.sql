-- Grain billing is queued per released truck allocation, after the existing dual-delivery gate.
-- Avoid a second aggregate invoice when the parent operation commission reaches LIBERADA.

DROP TRIGGER IF EXISTS trg_encolar_factura_comision_granos_liberada
  ON public.operacion_comisiones;

CREATE OR REPLACE FUNCTION public.encolar_factura_granos_por_viaje_liberado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trip record;
BEGIN
  IF NEW.estado <> 'LIBERADA'
     OR OLD.estado IS NOT DISTINCT FROM NEW.estado THEN
    RETURN NEW;
  END IF;

  SELECT
    v.operacion_id,
    COALESCE(NULLIF(v.carta_porte_tn, 0), NULLIF(v.kilos_cargados, 0) / 1000.0, 0) AS toneladas,
    v.patente_camion,
    v.carta_porte_ctg,
    v.carta_porte_nro_orden
  INTO v_trip
  FROM public.viajes v
  WHERE v.id = NEW.viaje_id;

  IF NOT FOUND OR COALESCE(v_trip.toneladas, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.facturacion_eventos_outbox (
    tipo_evento, tabla_origen, registro_origen_id, operacion_id,
    clave_idempotencia, estado, moneda_origen, importe_origen,
    cantidad_tn, payload
  )
  VALUES (
    'COMISION_GRANOS_LIBERADA',
    'operacion_comision_viajes',
    NEW.id,
    NEW.operacion_id,
    'grain-trip-commission-release:' || NEW.id::text,
    'REQUIERE_CONFIGURACION',
    'USD',
    NEW.importe_asignado,
    v_trip.toneladas,
    jsonb_build_object(
      'comision_viaje_id', NEW.id,
      'retencion_id', NEW.retencion_id,
      'viaje_id', NEW.viaje_id,
      'operacion_id', NEW.operacion_id,
      'toneladas', v_trip.toneladas,
      'comision_usd', NEW.importe_asignado,
      'tarifa_usd_tn', 1,
      'patente_camion', v_trip.patente_camion,
      'cpe_numero', concat_ws('-', v_trip.carta_porte_ctg, v_trip.carta_porte_nro_orden),
      'concepto_template',
        'Servicios tecnológicos de intermediación y corretaje digital de granos - Operación N° {{codigo_operacion}} - Contrato Formal F1 de fecha {{fecha_contrato}}. Volumen: {{toneladas}} TN de {{producto_nombre}}.',
      'requiere_emisor_y_receptor_fiscal', true,
      'requiere_tipo_cambio_ars', true,
      'requiere_punto_venta_fiscal', true
    )
  )
  ON CONFLICT (clave_idempotencia) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.encolar_factura_granos_por_viaje_liberado()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_encolar_factura_granos_por_viaje_liberado
  ON public.operacion_comision_viajes;

CREATE TRIGGER trg_encolar_factura_granos_por_viaje_liberado
AFTER UPDATE OF estado ON public.operacion_comision_viajes
FOR EACH ROW
WHEN (NEW.estado = 'LIBERADA' AND OLD.estado IS DISTINCT FROM NEW.estado)
EXECUTE FUNCTION public.encolar_factura_granos_por_viaje_liberado();
