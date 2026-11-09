-- BLOQUE 43: map every contracted truck commission to one real trip.
-- The 1% ARS commission is booked per truck at closure, but becomes dispatchable
-- only after that truck has a validated CPE and confirmed unloading.

CREATE TABLE IF NOT EXISTS public.cierres_logistica_camiones (
  id uuid PRIMARY KEY,
  cierre_logistica_id uuid NOT NULL REFERENCES public.cierres_logistica(id) ON DELETE RESTRICT,
  numero_camion integer NOT NULL CHECK (numero_camion > 0),
  operacion_id uuid NOT NULL REFERENCES public.operaciones(id) ON DELETE RESTRICT,
  valor_flete_ars numeric(20,2) NOT NULL CHECK (valor_flete_ars > 0),
  comision_ars numeric(20,2) NOT NULL CHECK (comision_ars >= 0),
  viaje_id uuid UNIQUE REFERENCES public.viajes(id) ON DELETE RESTRICT,
  estado text NOT NULL DEFAULT 'CONTRATADO' CHECK (estado IN (
    'CONTRATADO','VIAJE_ASIGNADO','CPE_VALIDADA','DESCARGA_CONFIRMADA','CANCELADO'
  )),
  creado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cierre_logistica_id, numero_camion)
);

CREATE INDEX IF NOT EXISTS cierres_logistica_camiones_pending_idx
  ON public.cierres_logistica_camiones (cierre_logistica_id, estado, numero_camion);

ALTER TABLE public.cierres_logistica_camiones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cierres_logistica_camiones FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cierres_logistica_camiones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cierres_logistica_camiones TO service_role;

DROP POLICY IF EXISTS cierres_logistica_camiones_participant_read
  ON public.cierres_logistica_camiones;
CREATE POLICY cierres_logistica_camiones_participant_read
  ON public.cierres_logistica_camiones FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cierres_logistica c
      WHERE c.id = cierre_logistica_id
        AND (
          public.usuario_es_miembro_empresa(c.empresa_transportista_id)
          OR public.usuario_es_miembro_empresa(c.empresa_dadora_id)
          OR public.es_administrador_plataforma()
        )
    )
  );

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
     OR COALESCE(NEW.comision_logistica_por_camion_ars, 0) < 0 THEN
    RETURN NEW;
  END IF;

  FOR v_truck IN 1..NEW.cantidad_camiones LOOP
    v_source_id := md5(NEW.id::text || ':truck:' || v_truck::text)::uuid;
    v_freight := NEW.valor_flete_por_camion_ars;
    v_commission := NEW.comision_logistica_por_camion_ars;

    INSERT INTO public.cierres_logistica_camiones (
      id, cierre_logistica_id, numero_camion, operacion_id,
      valor_flete_ars, comision_ars
    )
    VALUES (
      v_source_id, NEW.id, v_truck, NEW.operacion_id, v_freight, v_commission
    )
    ON CONFLICT (cierre_logistica_id, numero_camion) DO NOTHING;

    INSERT INTO public.facturacion_eventos_outbox (
      tipo_evento, tabla_origen, registro_origen_id, operacion_id,
      clave_idempotencia, estado, moneda_origen, importe_origen, payload
    )
    VALUES (
      'COMISION_LOGISTICA_CONTRATADA',
      'cierres_logistica_camiones',
      v_source_id,
      NEW.operacion_id,
      'logistics-close:' || NEW.id::text || ':truck:' || v_truck::text,
      'REQUIERE_CONFIGURACION',
      'ARS',
      v_commission,
      jsonb_build_object(
        'cierre_logistica_id', NEW.id,
        'camion_cierre_id', v_source_id,
        'codigo_operacion_logistica', NEW.codigo_operacion,
        'operacion_id', NEW.operacion_id,
        'numero_camion_contratado', v_truck,
        'empresa_transportista_id', NEW.empresa_transportista_id,
        'empresa_dadora_id', NEW.empresa_dadora_id,
        'flete_por_camion_ars', v_freight,
        'comision_por_camion_ars', v_commission,
        'porcentaje_comision', NEW.comision_logistica_pct,
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

DROP TRIGGER IF EXISTS trg_encolar_factura_logistica_por_camion
  ON public.cierres_logistica;
CREATE TRIGGER trg_encolar_factura_logistica_por_camion
AFTER INSERT ON public.cierres_logistica
FOR EACH ROW
WHEN (NEW.estado_cierre = 'cerrado_formal')
EXECUTE FUNCTION public.encolar_factura_logistica_por_camion();

CREATE OR REPLACE FUNCTION public.vincular_viaje_a_camion_contratado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_slot public.cierres_logistica_camiones%rowtype;
BEGIN
  IF NEW.cierre_logistica_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_slot
  FROM public.cierres_logistica_camiones
  WHERE cierre_logistica_id = NEW.cierre_logistica_id
    AND viaje_id IS NULL
    AND estado = 'CONTRATADO'
  ORDER BY numero_camion
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_HAY_CAMIONES_CONTRATADOS_DISPONIBLES_EN_CIERRE';
  END IF;

  UPDATE public.cierres_logistica_camiones
  SET viaje_id = NEW.id, estado = 'VIAJE_ASIGNADO', actualizado_at = now()
  WHERE id = v_slot.id;

  UPDATE public.facturacion_eventos_outbox
  SET payload = payload || jsonb_build_object(
        'viaje_id', NEW.id,
        'patente_camion', NEW.patente_camion,
        'cierre_camion_id', v_slot.id
      ),
      actualizado_at = now()
  WHERE tabla_origen = 'cierres_logistica_camiones'
    AND registro_origen_id = v_slot.id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.vincular_viaje_a_camion_contratado()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_vincular_viaje_a_camion_contratado ON public.viajes;
CREATE TRIGGER trg_vincular_viaje_a_camion_contratado
AFTER INSERT ON public.viajes
FOR EACH ROW
EXECUTE FUNCTION public.vincular_viaje_a_camion_contratado();

CREATE OR REPLACE FUNCTION public.actualizar_estado_facturacion_logistica_por_descarga()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_slot public.cierres_logistica_camiones%rowtype;
BEGIN
  IF NEW.carta_porte_estado = 'DESCARGADA_CONFIRMADA'
     AND OLD.carta_porte_estado IS DISTINCT FROM NEW.carta_porte_estado THEN
    IF NULLIF(trim(COALESCE(NEW.carta_porte_ctg, '')), '') IS NULL
       OR NEW.carta_porte_nro_orden IS NULL
       OR COALESCE(NEW.carta_porte_environment, '') NOT IN ('PRODUCCION','HOMOLOGACION') THEN
      RAISE EXCEPTION 'CPE_VALIDADA_REQUERIDA_ANTES_DE_CONFIRMAR_DESCARGA';
    END IF;

    UPDATE public.cierres_logistica_camiones
    SET estado = 'DESCARGA_CONFIRMADA', actualizado_at = now()
    WHERE viaje_id = NEW.id
    RETURNING * INTO v_slot;

    IF FOUND THEN
      UPDATE public.facturacion_eventos_outbox
      SET payload = payload || jsonb_build_object(
            'cpe_ctg', NEW.carta_porte_ctg,
            'cpe_nro_orden', NEW.carta_porte_nro_orden,
            'cpe_environment', NEW.carta_porte_environment,
            'descarga_confirmada_at', now()
          ),
          actualizado_at = now()
      WHERE tabla_origen = 'cierres_logistica_camiones'
        AND registro_origen_id = v_slot.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.actualizar_estado_facturacion_logistica_por_descarga()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_actualizar_estado_facturacion_logistica_por_descarga
  ON public.viajes;
CREATE TRIGGER trg_actualizar_estado_facturacion_logistica_por_descarga
AFTER UPDATE OF carta_porte_estado ON public.viajes
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_estado_facturacion_logistica_por_descarga();

COMMENT ON TABLE public.cierres_logistica_camiones IS
  'Vincula cada camión contratado con un único viaje real. La comisión logística se vuelve elegible para facturación solo tras CPE y descarga confirmadas.';
