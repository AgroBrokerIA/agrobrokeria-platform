-- Contract confirmation must reference a confirmed agreement and match operation economics.
create or replace function public.guardar_contrato_comercial(p_operacion_id uuid,p_datos jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_id uuid; v_uid uuid:=auth.uid(); v_workflow public.operacion_workflow%rowtype; v_orden integer; v_estado text; v_qty numeric; v_price numeric; v_total numeric; v_agreement_id uuid;
begin
 if v_uid is null or not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para esta operación.'; end if;
 select * into v_workflow from public.operacion_workflow where operacion_id=p_operacion_id for update; if not found then raise exception 'La operación no tiene workflow.'; end if;
 select orden into v_orden from public.workflow_etapas where id=v_workflow.etapa_actual_id and workflow_id=v_workflow.workflow_id; if v_orden<>4 then raise exception 'El contrato definitivo solo puede gestionarse en la etapa 4.'; end if;
 v_estado:=coalesce(nullif(p_datos->>'estado',''),'BORRADOR'); if v_estado not in ('BORRADOR','CONFIRMADO') then raise exception 'Estado de contrato inválido.'; end if;
 select cantidad_tn,precio_tn,importe_total into v_qty,v_price,v_total from public.operaciones where id=p_operacion_id for update; if not found then raise exception 'Operación inexistente.'; end if;
 if nullif(p_datos->>'numero_contrato','') is null then raise exception 'El número de contrato es obligatorio.'; end if;
 if (p_datos->>'cantidad_tn')::numeric is distinct from v_qty then raise exception 'La cantidad contractual no coincide con la operación.'; end if;
 if (p_datos->>'precio_tn')::numeric is distinct from v_price then raise exception 'El precio contractual no coincide con la operación.'; end if;
 if (p_datos->>'importe_total')::numeric is distinct from v_total then raise exception 'El importe contractual no coincide con la operación.'; end if;
 if v_estado='CONFIRMADO' then
   v_agreement_id:=nullif(p_datos->>'acuerdo_id','')::uuid;
   if v_agreement_id is null then raise exception 'El contrato confirmado requiere Acuerdo Comercial.'; end if;
   if not exists(select 1 from public.acuerdos_comerciales where id=v_agreement_id and operacion_id=p_operacion_id and estado='CONFIRMADO') then raise exception 'El Acuerdo Comercial debe estar confirmado antes del contrato.'; end if;
   if nullif(p_datos->>'contenido','') is null then raise exception 'El contrato confirmado requiere contenido.'; end if;
 end if;
 insert into public.contratos(operacion_id,acuerdo_id,numero_contrato,tipo_contrato,estado,cantidad_tn,precio_tn,importe_total,lugar_carga,destino,condicion_entrega,forma_pago,plazo_pago,flete,calidad,observaciones,contenido,confirmado_at,updated_at)
 select p_operacion_id,nullif(p_datos->>'acuerdo_id','')::uuid,nullif(p_datos->>'numero_contrato',''),nullif(p_datos->>'tipo_contrato',''),v_estado,(p_datos->>'cantidad_tn')::numeric,(p_datos->>'precio_tn')::numeric,(p_datos->>'importe_total')::numeric,nullif(p_datos->>'lugar_carga',''),nullif(p_datos->>'destino',''),nullif(p_datos->>'condicion_entrega',''),nullif(p_datos->>'forma_pago',''),nullif(p_datos->>'plazo_pago',''),nullif(p_datos->>'flete',''),nullif(p_datos->>'calidad',''),nullif(p_datos->>'observaciones',''),p_datos->>'contenido',case when v_estado='CONFIRMADO' then now() else null end,now()
 on conflict(operacion_id) do update set acuerdo_id=excluded.acuerdo_id,numero_contrato=excluded.numero_contrato,tipo_contrato=excluded.tipo_contrato,estado=excluded.estado,cantidad_tn=excluded.cantidad_tn,precio_tn=excluded.precio_tn,importe_total=excluded.importe_total,lugar_carga=excluded.lugar_carga,destino=excluded.destino,condicion_entrega=excluded.condicion_entrega,forma_pago=excluded.forma_pago,plazo_pago=excluded.plazo_pago,flete=excluded.flete,calidad=excluded.calidad,observaciones=excluded.observaciones,contenido=excluded.contenido,confirmado_at=excluded.confirmado_at,updated_at=excluded.updated_at returning id into v_id;
 return (select to_jsonb(c) from public.contratos c where c.id=v_id);
end;$function$;