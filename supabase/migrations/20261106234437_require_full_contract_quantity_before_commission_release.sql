-- Do not release the full fixed USD 1/TN commission until all contracted tonnes are confirmed.
DO $$
DECLARE v_def text; v_old text; v_new text;
BEGIN
  v_def := pg_get_functiondef('public.intentar_liberar_comision_agrobrokeria(uuid)'::regprocedure);
  v_old := '  v_comm_id uuid;';
  v_new := '  v_comm_id uuid;'||chr(10)||'  v_total_kilos numeric := 0;'||chr(10)||'  v_contract_tn numeric := 0;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'RELEASE_QUANTITY_VARIABLE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_old := '  SELECT id INTO v_comm_id';
  v_new := '  SELECT coalesce(sum(transportista_kilos_entregados),0) INTO v_total_kilos'||
    chr(10)||'  FROM public.viajes WHERE operacion_id=p_operacion_id;'||
    chr(10)||'  SELECT cantidad_tn INTO v_contract_tn FROM public.operaciones WHERE id=p_operacion_id;'||
    chr(10)||'  IF v_contract_tn IS NULL OR v_total_kilos < (v_contract_tn*1000)-1 OR v_total_kilos > (v_contract_tn*1000)+1 THEN'||
    chr(10)||'    RETURN jsonb_build_object(''liberada'',false,''motivo'',''CANTIDAD_CONTRACTUAL_PENDIENTE'',''kilos_confirmados'',v_total_kilos,''kilos_contractuales'',v_contract_tn*1000);'||
    chr(10)||'  END IF;'||chr(10)||v_old;
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'RELEASE_QUANTITY_CHECK_ANCHOR_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);
END $$;