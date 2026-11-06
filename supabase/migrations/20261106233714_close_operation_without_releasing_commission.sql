-- Closing a deal must never be the mechanism that releases the platform commission.
-- The commission release is performed only by intentar_liberar_comision_agrobrokeria.
CREATE OR REPLACE FUNCTION public.confirmar_liquidacion_y_cerrar_operacion(p_operacion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_workflow public.operacion_workflow%rowtype;
  v_liquidacion public.operacion_liquidacion%rowtype;
  v_retencion public.operacion_comision_retenciones%rowtype;
  v_etapa_cerrada_id uuid;
  v_orden integer;
  v_trip_count integer;
  v_confirmed_count integer;
  v_gate jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT (public.usuario_participa_operacion(p_operacion_id) OR public.es_administrador_plataforma()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_workflow
  FROM public.operacion_workflow
  WHERE operacion_id=p_operacion_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WORKFLOW_NOT_FOUND'; END IF;
  IF v_workflow.estado='CERRADA' THEN RETURN; END IF;

  SELECT orden INTO v_orden
  FROM public.workflow_etapas
  WHERE id=v_workflow.etapa_actual_id AND workflow_id=v_workflow.workflow_id;
  IF v_orden<>8 THEN RAISE EXCEPTION 'LIQUIDATION_STAGE_REQUIRED'; END IF;

  SELECT id INTO v_etapa_cerrada_id
  FROM public.workflow_etapas
  WHERE workflow_id=v_workflow.workflow_id AND orden=9;
  IF v_etapa_cerrada_id IS NULL THEN RAISE EXCEPTION 'CLOSED_STAGE_NOT_CONFIGURED'; END IF;

  SELECT * INTO v_liquidacion
  FROM public.operacion_liquidacion
  WHERE operacion_id=p_operacion_id
  ORDER BY creado_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND OR v_liquidacion.estado<>'CONFIRMADA' THEN
    RAISE EXCEPTION 'CONFIRMED_LIQUIDATION_REQUIRED';
  END IF;
  IF coalesce(v_liquidacion.cantidad_entregada_tn,0)<=0 THEN
    RAISE EXCEPTION 'DELIVERED_QUANTITY_REQUIRED';
  END IF;

  SELECT count(*),
         count(*) FILTER (
           WHERE transportista_entrega_confirmada_at IS NOT NULL
             AND productor_recepcion_confirmada_at IS NOT NULL
             AND estado='ENTREGADO_CONFIRMADO'
             AND productor_recepcion_observada_at IS NULL
             AND transportista_kilos_entregados IS NOT NULL
             AND productor_kilos_recibidos=transportista_kilos_entregados
         )
  INTO v_trip_count,v_confirmed_count
  FROM public.viajes
  WHERE operacion_id=p_operacion_id;
  IF v_trip_count=0 OR v_trip_count<>v_confirmed_count THEN
    RAISE EXCEPTION 'DUAL_DELIVERY_CONFIRMATION_REQUIRED';
  END IF;

  v_gate := public.intentar_liberar_comision_agrobrokeria(p_operacion_id);
  SELECT * INTO v_retencion
  FROM public.operacion_comision_retenciones
  WHERE operacion_id=p_operacion_id
  FOR UPDATE;
  IF NOT FOUND OR v_retencion.estado<>'LIBERADA' OR v_retencion.verificado_at IS NULL
     OR v_retencion.liberado_at IS NULL THEN
    RAISE EXCEPTION 'VERIFIED_AND_RELEASED_PLATFORM_COMMISSION_REQUIRED';
  END IF;

  UPDATE public.operacion_liquidacion
  SET comision_agrobroker_usd=cantidad_entregada_tn,updated_at=now()
  WHERE id=v_liquidacion.id;

  UPDATE public.workflow_historial
  SET fecha_fin=now()
  WHERE operacion_workflow_id=v_workflow.id
    AND etapa_id=v_workflow.etapa_actual_id
    AND fecha_fin IS NULL;
  INSERT INTO public.workflow_historial(
    operacion_workflow_id,etapa_id,fecha_inicio,usuario_id,observaciones
  ) VALUES (
    v_workflow.id,v_etapa_cerrada_id,now(),v_uid,
    'Liquidación confirmada. Operación cerrada después de doble conformidad y liberación contable de la comisión AgroBrokerIA.'
  );
  UPDATE public.operacion_workflow
  SET etapa_actual_id=v_etapa_cerrada_id,estado='CERRADA'
  WHERE id=v_workflow.id;
  UPDATE public.operaciones
  SET estado='CERRADA',actualizada_en=now()
  WHERE id=p_operacion_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_liquidacion_y_cerrar_operacion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_liquidacion_y_cerrar_operacion(uuid) TO authenticated;