-- Queue one logistics billing event per contracted truck, preserving the 1% ARS rule.
-- Dispatch remains blocked until the corresponding trip, validated CPE and confirmed delivery
-- can be matched to this closure. This migration never invoices at contract-closure time.

CREATE OR REPLACE FUNCTION public.encolar_factura_logistica_por_camion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_truck integer;
  v_source_id uuid;
  v_freight numeric(20,2);
  v_commission numeric(20,2);
BEGIN
  IF NEW.estado_cierre <> 'cerrado_formal'
     OR COALESCE(NEW.cantidad_camiones, 0) <= 0
     OR COALESCE(NEW.valor_flete_por_camion_ars, 0) <= 0
     OR COALESCE(NEW.comision_logistica_por_camion_ars, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  FOR v_truck IN 1..NEW.cantidad_camiones LOOP
    v_source_id := md5(NEW.id::text || ':truck:' || v_truck::text)::uuid;
    v_freight := NEW.valor_flete_por_camion_ars;
    v_commission := NEW.comision_logistica_por_camion_ars;

    INSERT INTO public.facturacion_eventos_outbox (
      tipo_evento, tabla_origen, registro_origen_id, operacion_id,
      clave_idempotencia, estado, moneda_origen, importe_origen, payload
    )
    VALUES (
      'COMISION_LOGISTICA_LIBERADA',
      'cierres_logistica_camion',
      v_source_id,
      NEW.operacion_id,
      'logistics-close:' || NEW.id::text || ':truck:' || v_truck::text,
      'REQUIERE_CONFIGURACION',
      'ARS',
      v_commission,
      jsonb_build_object(
        'cierre_logistica_id', NEW.id,
        'codigo_operacion_logistica', NEW.codigo_operacion,
        'operacion_id', NEW.operacion_id,
        'numero_camion_contratado', v_truck,
        'empresa_transportista_id', NEW.empresa_transportista_id,
        'empresa_dadora_id', NEW.empresa_dadora_id,
        'flete_por_camion_ars', v_freight,
        'comision_por_camion_ars', v_commission,
        'porcentaje_comision', NEW.comision_logistica_pct,
        'concepto_template',
          'Servicios de gestión de infraestructura AgTech y auditoría logística de fletes - Operación Logística N° {{id_cierre_flete}} vinculada al Contrato {{codigo_operacion}}. Transporte Patente: {{patente_camion}} - CPE N° {{cpe_numero}}.',
        'requiere_viaje_asociado', true,
        'requiere_cpe_validada', true,
        'requiere_descarga_confirmada', true,
        'requiere_emisor_y_receptor_fiscal', true
      )
    )
    ON CONFLICT (clave_idempotencia) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.encolar_factura_logistica_por_camion()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_encolar_factura_logistica_por_camion
  ON public.cierres_logistica;

CREATE TRIGGER trg_encolar_factura_logistica_por_camion
AFTER INSERT ON public.cierres_logistica
FOR EACH ROW
WHEN (NEW.estado_cierre = 'cerrado_formal')
EXECUTE FUNCTION public.encolar_factura_logistica_por_camion();
