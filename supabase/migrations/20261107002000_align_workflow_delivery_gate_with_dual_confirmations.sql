DO $$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.avanzar_operacion_workflow(uuid,uuid,text)'::regprocedure);

  v_old := ' v_firmantes_firmados integer;';
  v_new := v_old || E'\n v_total_viajes integer;\n v_viajes_confirmados integer;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'WORKFLOW_DECLARATION_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := $old$
 if v_destino_orden=8 and not exists(
   select 1 from public.operacion_logistica where operacion_id=v_workflow.operacion_id and estado='ENTREGADA'
 ) then raise exception 'No se puede pasar a Liquidación: la entrega no está confirmada como ENTREGADA.'; end if;
$old$;
  v_new := $new$
 if v_destino_orden=8 then
   select count(*),
          count(*) filter (
            where transportista_entrega_confirmada_at is not null
              and productor_recepcion_confirmada_at is not null
              and estado='ENTREGADO_CONFIRMADO'
              and productor_recepcion_observada_at is null
              and transportista_kilos_entregados is not null
              and productor_kilos_recibidos=transportista_kilos_entregados
          )
     into v_total_viajes,v_viajes_confirmados
   from public.viajes
   where operacion_id=v_workflow.operacion_id;

   if v_total_viajes=0 or v_total_viajes<>v_viajes_confirmados then
     raise exception 'No se puede pasar a Liquidación: todos los viajes deben tener doble conformidad de transportista y productor.';
   end if;
 end if;
$new$;
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'WORKFLOW_DELIVERY_GATE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := ' if auth.uid() is null then raise exception ''Autenticación requerida.''; end if;';
  v_new := v_old || E'\n if p_estado=''QA_SIN_PAGO'' and not public.es_administrador_plataforma() then raise exception ''PLATFORM_ADMIN_REQUIRED_FOR_QA_BYPASS''; end if;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'WORKFLOW_AUTH_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  EXECUTE v_def;
END $$;