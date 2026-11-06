-- Require a recorded transport trip and dual delivery confirmation before a liquidation can be confirmed.
DO $$
DECLARE v_def text; v_old text; v_new text;
BEGIN
  v_def := pg_get_functiondef('public.guardar_liquidacion_operacion(uuid,jsonb)'::regprocedure);
  v_old := E' ELSE\n   v_kilos:=coalesce((p_datos->>''kilos_entregados'')::numeric,0);\n END IF;';
  v_new := E' ELSE\n   RAISE EXCEPTION ''DELIVERY_TRIP_REQUIRED'';\n END IF;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'LIQUIDATION_NO_TRIP_GUARD_ANCHOR_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);
END $$;

-- One idempotent release gate. It changes only accounting state: it does not move money.
CREATE OR REPLACE FUNCTION public.intentar_liberar_comision_agrobrokeria(p_operacion_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_r public.operacion_comision_retenciones%rowtype;
  v_trip_count integer;
  v_confirmed_count integer;
  v_comm_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.usuario_participa_operacion(p_operacion_id)
     AND NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id=v_uid) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_r
  FROM public.operacion_comision_retenciones
  WHERE operacion_id=p_operacion_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN jsonb_build_object('liberada',false,'motivo','COMISION_NO_REGISTRADA'); END IF;
  IF v_r.estado='LIBERADA' OR v_r.liberado_at IS NOT NULL THEN
    RETURN jsonb_build_object('liberada',true,'idempotente',true,'retencion_id',v_r.id);
  END IF;
  IF v_r.estado<>'RETENIDA' OR v_r.verificado_at IS NULL OR v_r.verificado_por IS NULL THEN
    RETURN jsonb_build_object('liberada',false,'motivo','PAGO_BANCARIO_NO_VALIDADO');
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
    RETURN jsonb_build_object('liberada',false,'motivo','DOBLE_CONFORMIDAD_PENDIENTE',
      'viajes_confirmados',v_confirmed_count,'viajes_totales',v_trip_count);
  END IF;

  SELECT id INTO v_comm_id
  FROM public.operacion_comisiones
  WHERE operacion_id=p_operacion_id
    AND tipo_comision='PLATAFORMA'
    AND origen_comision='AGROBROKER_IA'
  ORDER BY creado_at DESC
  LIMIT 1
  FOR UPDATE;

  UPDATE public.operacion_comision_retenciones
  SET estado='LIBERADA',liberado_at=now(),actualizado_at=now(),
      observaciones=concat_ws(E'\n',nullif(observaciones,''),'Liberación contable automática: pago bancario validado y doble conformidad de entrega confirmada.')
  WHERE id=v_r.id AND estado='RETENIDA' AND liberado_at IS NULL;

  IF v_comm_id IS NOT NULL THEN
    UPDATE public.operacion_comisiones
    SET estado='LIBERADA',saldo_reservado=0,actualizado_at=now(),
        observaciones=concat_ws(E'\n',nullif(observaciones,''),'Comisión liberada contablemente tras doble conformidad.')
    WHERE id=v_comm_id AND estado='RETENIDA';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.operacion_movimientos_economicos
    WHERE operacion_id=p_operacion_id AND tipo_movimiento='COMISION_LIBERADA'
      AND referencia='RETENCION:'||v_r.id::text
  ) THEN
    INSERT INTO public.operacion_movimientos_economicos(
      operacion_id,comision_id,tipo_movimiento,concepto,moneda_id,importe,signo,estado,
      referencia,fecha_movimiento,creado_at,actualizado_at
    ) VALUES (
      p_operacion_id,v_comm_id,'COMISION_LIBERADA',
      'Liberación contable de comisión AgroBrokerIA tras doble conformidad',
      v_r.moneda_id,v_r.importe,1,'LIBERADA','RETENCION:'||v_r.id::text,now(),now(),now()
    );
  END IF;

  UPDATE public.operacion_control_comercial
  SET comision_estado='LIBERADA',updated_at=now()
  WHERE operacion_id=p_operacion_id;

  RETURN jsonb_build_object('liberada',true,'retencion_id',v_r.id,'importe',v_r.importe,
    'moneda_id',v_r.moneda_id,'es_movimiento_bancario_automatico',false);
END;
$$;

REVOKE ALL ON FUNCTION public.intentar_liberar_comision_agrobrokeria(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.intentar_liberar_comision_agrobrokeria(uuid) TO authenticated;

-- Run the gate after the last missing event: payment verification or producer receipt.
DO $$
DECLARE v_def text; v_old text; v_new text;
BEGIN
  v_def := pg_get_functiondef('public.confirmar_retencion_comision_plataforma(uuid,text)'::regprocedure);
  v_old := 'return jsonb_build_object(''retencion_id'',p_retencion_id,''estado'',''RETENIDA'',''importe'',v_r.importe,''moneda_id'',v_r.moneda_id);';
  v_new := 'perform public.intentar_liberar_comision_agrobrokeria(v_r.operacion_id); '||v_old;
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'BANK_CONFIRM_RELEASE_HOOK_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);

  v_def := pg_get_functiondef('public.confirmar_recepcion_productor(uuid,numeric,boolean,text)'::regprocedure);
  v_old := '  RETURN jsonb_build_object('||E'\n    ''viaje_id'',p_viaje_id,''estado'',''ENTREGADO_CONFIRMADO'',';
  v_new := '  PERFORM public.intentar_liberar_comision_agrobrokeria(v_v.operacion_id);'||E'\n'||v_old;
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'PRODUCER_CONFIRM_RELEASE_HOOK_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);
END $$;