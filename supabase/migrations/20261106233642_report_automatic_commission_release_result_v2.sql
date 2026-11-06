-- Return the real result of the automatic release gate to both callers.
DO $$
DECLARE v_def text; v_old text; v_new text;
BEGIN
  v_def := pg_get_functiondef('public.confirmar_recepcion_productor(uuid,numeric,boolean,text)'::regprocedure);
  v_old := '  v_productor boolean;';
  v_new := '  v_productor boolean;' || chr(10) || '  v_release jsonb;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'PRODUCER_RELEASE_VAR_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_old := '  PERFORM public.intentar_liberar_comision_agrobrokeria(v_v.operacion_id);';
  v_new := '  v_release := public.intentar_liberar_comision_agrobrokeria(v_v.operacion_id);';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'PRODUCER_RELEASE_CALL_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_old := '''comision_liberada'',false,''comision_retenida'',true';
  v_new := '''comision_liberada'',coalesce((v_release->>''liberada'')::boolean,false),''comision_retenida'',NOT coalesce((v_release->>''liberada'')::boolean,false),''liberacion'',v_release';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'PRODUCER_RELEASE_RESPONSE_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);

  v_def := pg_get_functiondef('public.confirmar_retencion_comision_plataforma(uuid,text)'::regprocedure);
  v_old := '  v_orden integer;';
  v_new := '  v_orden integer;' || chr(10) || '  v_release jsonb;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'PAYMENT_RELEASE_VAR_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_old := 'perform public.intentar_liberar_comision_agrobrokeria(v_r.operacion_id); return jsonb_build_object(''retencion_id'',p_retencion_id,''estado'',''RETENIDA'',''importe'',v_r.importe,''moneda_id'',v_r.moneda_id);';
  v_new := 'v_release := public.intentar_liberar_comision_agrobrokeria(v_r.operacion_id); return jsonb_build_object(''retencion_id'',p_retencion_id,''estado'',CASE WHEN coalesce((v_release->>''liberada'')::boolean,false) THEN ''LIBERADA'' ELSE ''RETENIDA'' END,''importe'',v_r.importe,''moneda_id'',v_r.moneda_id,''liberacion'',v_release);';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'PAYMENT_RELEASE_RESPONSE_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);
END $$;