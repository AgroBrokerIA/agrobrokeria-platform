-- Initialize the fixed USD 1/MT AgroBrokerIA fee from the operation volume
-- as part of saving the commercial agreement. This is a fee definition only;
-- payment remains gated until after approved merchandise inspection.

CREATE OR REPLACE FUNCTION public.guardar_acuerdo_comercial(p_operacion_id uuid, p_datos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v jsonb; v_uid uuid:=auth.uid(); v_workflow public.operacion_workflow%rowtype; v_orden integer; v_estado text;
begin
 if v_uid is null or not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para esta operación.'; end if;
 select * into v_workflow from public.operacion_workflow where operacion_id=p_operacion_id for update;
 if not found then raise exception 'La operación no tiene workflow.'; end if;
 select orden into v_orden from public.workflow_etapas where id=v_workflow.etapa_actual_id and workflow_id=v_workflow.workflow_id;
 if v_orden<>2 then raise exception 'El Acuerdo Comercial solo puede gestionarse en la etapa 2.'; end if;
 v_estado:=coalesce(nullif(p_datos->>'estado',''),'BORRADOR'); if v_estado not in('BORRADOR','CONFIRMADO') then raise exception 'Estado de acuerdo inválido.'; end if;
 v:=jsonb_build_object('lugar_carga',nullif(p_datos->>'lugar_carga',''),'destino',nullif(p_datos->>'destino',''),'condicion_entrega',nullif(p_datos->>'condicion_entrega',''),'forma_pago',nullif(p_datos->>'forma_pago',''),'plazo_pago',nullif(p_datos->>'plazo_pago',''),'flete',nullif(p_datos->>'flete',''),'calidad',nullif(p_datos->>'calidad',''),'observaciones',nullif(p_datos->>'observaciones',''),'estado',v_estado,'confirmado_at',case when v_estado='CONFIRMADO' then now() else null end,'updated_at',now());
 insert into public.acuerdos_comerciales(operacion_id,lugar_carga,destino,condicion_entrega,forma_pago,plazo_pago,flete,calidad,observaciones,estado,confirmado_at,updated_at)
 values(p_operacion_id,v->>'lugar_carga',v->>'destino',v->>'condicion_entrega',v->>'forma_pago',v->>'plazo_pago',v->>'flete',v->>'calidad',v->>'observaciones',v->>'estado',(v->>'confirmado_at')::timestamptz,(v->>'updated_at')::timestamptz)
 on conflict(operacion_id) do update set lugar_carga=excluded.lugar_carga,destino=excluded.destino,condicion_entrega=excluded.condicion_entrega,forma_pago=excluded.forma_pago,plazo_pago=excluded.plazo_pago,flete=excluded.flete,calidad=excluded.calidad,observaciones=excluded.observaciones,estado=excluded.estado,confirmado_at=excluded.confirmado_at,updated_at=excluded.updated_at returning id into v_id;
 -- Define the fixed platform fee when the commercial agreement is created/updated.
 -- The amount is USD 1 per metric tonne; this records the fee but does not request or confirm payment.
 insert into public.operacion_control_comercial(operacion_id,comision_monto,comision_moneda,comision_estado,updated_at)
 select p_operacion_id, o.cantidad_tn, 'USD', 'PENDIENTE', now()
 from public.operaciones o where o.id=p_operacion_id
 on conflict(operacion_id) do update
 set comision_monto=excluded.comision_monto,
     comision_moneda='USD',
     updated_at=now()
 where public.operacion_control_comercial.comision_estado in ('PENDIENTE','NO_INICIADA')
   and not exists (
     select 1 from public.operacion_comision_retenciones r
     where r.operacion_id=p_operacion_id
       and r.estado in ('COMPROBANTE_ENVIADO','RETENIDA')
   );
 return (select to_jsonb(a) from public.acuerdos_comerciales a where a.id=v_id);
end;$function$

