-- AgroBrokerIA platform commission is fixed and automatic at USD 1 per ton.
-- Intermediary commissions remain independent and manually configurable.

update public.operacion_control_comercial occ
set comision_monto = o.cantidad_tn,
    comision_moneda = 'USD',
    updated_at = now()
from public.operaciones o
where o.id = occ.operacion_id
  and coalesce(o.cantidad_tn, 0) >= 0;

insert into public.operacion_control_comercial(operacion_id,comision_monto,comision_moneda,updated_at)
select o.id,o.cantidad_tn,'USD',now()
from public.operaciones o
left join public.operacion_control_comercial c on c.operacion_id=o.id
where c.id is null and coalesce(o.cantidad_tn,0)>=0
on conflict (operacion_id) do update
set comision_monto=excluded.comision_monto,comision_moneda='USD',updated_at=now();

update public.operacion_liquidacion ol
set comision_agrobroker_usd = greatest(coalesce(ol.cantidad_entregada_tn, 0), 0), updated_at=now();

update public.operacion_comisiones oc
set cantidad_tn=ol.cantidad_entregada_tn,valor_unitario=1,subtotal=ol.cantidad_entregada_tn,total=ol.cantidad_entregada_tn,
    saldo_pendiente=case when ol.cantidad_entregada_tn>0 then ol.cantidad_entregada_tn else 0 end,saldo_pagado=0,
    estado=case when ol.cantidad_entregada_tn>0 then 'PENDIENTE' else 'ANULADA' end,actualizado_at=now()
from public.operacion_liquidacion ol
where oc.operacion_id=ol.operacion_id and oc.origen_comision='AGROBROKER_IA' and oc.tipo_comision='PLATAFORMA';

create or replace function public.procesar_aceptacion_oferta(p_oferta_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_uid uuid:=auth.uid(); v_of record; v_workflow record; v_stage record; v_ow uuid; v_control uuid; v_qty numeric;
begin
 if v_uid is null then raise exception 'No autenticado'; end if;
 select o.*,p.empresa_id as vendedor_empresa,p.id as pub_id into v_of from ofertas_negociacion o join publicaciones p on p.id=o.publicacion_id where o.id=p_oferta_id for update;
 if not found then raise exception 'Oferta inexistente'; end if;
 if not exists(select 1 from company_users where company_id=v_of.vendedor_empresa and profile_id=v_uid and activo=true) then raise exception 'No autorizado para aceptar esta oferta'; end if;
 if v_of.vendedor_empresa=v_of.empresa_id then raise exception 'Comprador y vendedor no pueden ser la misma empresa'; end if;
 select cantidad_tn into v_qty from operaciones where id=v_of.operacion_id for update;
 if v_qty is null or v_qty<=0 then raise exception 'Operación sin cantidad válida'; end if;
 update ofertas_negociacion set estado='ACEPTADA' where id=p_oferta_id; update operaciones set estado='ACEPTADA' where id=v_of.operacion_id;
 insert into operacion_participantes(operacion_id,empresa_id,rol,porcentaje_comision,monto_comision,factura_presentada,factura_aprobada) values(v_of.operacion_id,v_of.vendedor_empresa,'VENDEDOR',null,null,false,false) on conflict(operacion_id,empresa_id,rol) do nothing;
 insert into operacion_participantes(operacion_id,empresa_id,rol,porcentaje_comision,monto_comision,factura_presentada,factura_aprobada) values(v_of.operacion_id,v_of.empresa_id,'COMPRADOR',null,null,false,false) on conflict(operacion_id,empresa_id,rol) do nothing;
 insert into operacion_control_comercial(operacion_id,comision_monto,comision_moneda,updated_at) values(v_of.operacion_id,v_qty,'USD',now()) on conflict(operacion_id) do update set comision_monto=v_qty,comision_moneda='USD',updated_at=now() returning id into v_control;
 select id into v_workflow from workflows where nombre='Operación de granos' and activo=true limit 1; if v_workflow.id is null then raise exception 'No existe workflow activo de Operación de granos'; end if;
 select id into v_stage from workflow_etapas where workflow_id=v_workflow.id and orden=1 limit 1; if v_stage.id is null then raise exception 'El workflow no tiene etapa inicial'; end if;
 select id into v_ow from operacion_workflow where operacion_id=v_of.operacion_id limit 1 for update;
 if v_ow is null then insert into operacion_workflow(operacion_id,workflow_id,etapa_actual_id,estado) values(v_of.operacion_id,v_workflow.id,v_stage.id,'EN_CURSO') returning id into v_ow; insert into workflow_historial(operacion_workflow_id,etapa_id,fecha_inicio,usuario_id,observaciones) values(v_ow,v_stage.id,now(),v_uid,'La oferta fue aceptada y se inició el workflow de la operación.'); end if;
 return jsonb_build_object('oferta_id',p_oferta_id,'operacion_id',v_of.operacion_id,'estado','ACEPTADA','control_id',v_control,'workflow_id',v_ow,'comision_agrobroker_usd',v_qty,'comision_agrobroker_usd_tn',1);
end;$function$;

create or replace function public.guardar_liquidacion_operacion(p_operacion_id uuid,p_datos jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_uid uuid:=auth.uid(); v_row public.operacion_liquidacion; v_id uuid; v_estado text; v_entregada_tn numeric; v_comision numeric;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if; if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'FORBIDDEN'; end if;
 v_estado:=coalesce(nullif(trim(p_datos->>'estado'),''),'PRELIQUIDADA'); if v_estado not in('PRELIQUIDADA','CONFIRMADA') then raise exception 'INVALID_LIQUIDATION_STATE'; end if;
 if coalesce((p_datos->>'cantidad_contractual_tn')::numeric,0)<0 or coalesce((p_datos->>'kilos_entregados')::numeric,0)<0 or coalesce((p_datos->>'precio_tn')::numeric,0)<0 then raise exception 'INVALID_LIQUIDATION_VALUES'; end if;
 v_entregada_tn:=coalesce((p_datos->>'cantidad_entregada_tn')::numeric,0); if v_entregada_tn<0 then raise exception 'INVALID_DELIVERED_QUANTITY'; end if; v_comision:=v_entregada_tn; v_id:=nullif(p_datos->>'id','')::uuid;
 if v_id is not null then
  update public.operacion_liquidacion set estado=v_estado,cantidad_contractual_tn=coalesce((p_datos->>'cantidad_contractual_tn')::numeric,cantidad_contractual_tn),kilos_entregados=coalesce((p_datos->>'kilos_entregados')::numeric,kilos_entregados),cantidad_entregada_tn=v_entregada_tn,diferencia_tn=coalesce((p_datos->>'diferencia_tn')::numeric,diferencia_tn),precio_tn=coalesce((p_datos->>'precio_tn')::numeric,precio_tn),importe_bruto_usd=coalesce((p_datos->>'importe_bruto_usd')::numeric,importe_bruto_usd),ajustes_usd=coalesce((p_datos->>'ajustes_usd')::numeric,ajustes_usd),deducciones_usd=coalesce((p_datos->>'deducciones_usd')::numeric,deducciones_usd),comision_agrobroker_usd=v_comision,importe_neto_usd=coalesce((p_datos->>'importe_neto_usd')::numeric,importe_neto_usd),fecha_liquidacion=nullif(p_datos->>'fecha_liquidacion','')::timestamptz,referencia_comprobante=p_datos->>'referencia_comprobante',observaciones=p_datos->>'observaciones',updated_at=now() where id=v_id and operacion_id=p_operacion_id returning * into v_row;
 else
  insert into public.operacion_liquidacion(operacion_id,estado,cantidad_contractual_tn,kilos_entregados,cantidad_entregada_tn,diferencia_tn,precio_tn,importe_bruto_usd,ajustes_usd,deducciones_usd,comision_agrobroker_usd,importe_neto_usd,fecha_liquidacion,referencia_comprobante,observaciones,creado_por,creado_at,updated_at) values(p_operacion_id,v_estado,coalesce((p_datos->>'cantidad_contractual_tn')::numeric,0),coalesce((p_datos->>'kilos_entregados')::numeric,0),v_entregada_tn,coalesce((p_datos->>'diferencia_tn')::numeric,0),coalesce((p_datos->>'precio_tn')::numeric,0),coalesce((p_datos->>'importe_bruto_usd')::numeric,0),coalesce((p_datos->>'ajustes_usd')::numeric,0),coalesce((p_datos->>'deducciones_usd')::numeric,0),v_comision,coalesce((p_datos->>'importe_neto_usd')::numeric,0),nullif(p_datos->>'fecha_liquidacion','')::timestamptz,p_datos->>'referencia_comprobante',p_datos->>'observaciones',v_uid,now(),now()) returning * into v_row;
 end if;
 if v_row.id is null then raise exception 'LIQUIDATION_NOT_FOUND'; end if; return to_jsonb(v_row);
end;$function$;

create or replace function public.confirmar_liquidacion_y_cerrar_operacion(p_operacion_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_liquidacion public.operacion_liquidacion%rowtype; v_usuario uuid:=auth.uid(); v_comision_id uuid; v_movimiento_existente boolean; v_workflow public.operacion_workflow%rowtype; v_orden integer;
begin
 if v_usuario is null then raise exception 'No autorizado.'; end if;
 if not exists(select 1 from public.operacion_participantes op join public.company_users cu on cu.company_id=op.empresa_id where op.operacion_id=p_operacion_id and cu.profile_id=v_usuario and cu.activo=true) then raise exception 'El usuario no participa de esta operación.'; end if;
 select * into v_workflow from public.operacion_workflow where operacion_id=p_operacion_id for update; if not found then raise exception 'La operación no tiene workflow.'; end if;
 select orden into v_orden from public.workflow_etapas where id=v_workflow.etapa_actual_id and workflow_id=v_workflow.workflow_id; if v_orden<>9 then raise exception 'La operación debe estar en la etapa Liquidación para poder cerrarse.'; end if;
 select * into v_liquidacion from public.operacion_liquidacion where operacion_id=p_operacion_id order by creado_at desc limit 1 for update; if not found then raise exception 'No existe una liquidación para esta operación.'; end if;
 if v_liquidacion.estado<>'CONFIRMADA' then raise exception 'La liquidación debe estar CONFIRMADA antes de cerrar la operación.'; end if; if v_liquidacion.cantidad_entregada_tn<=0 then raise exception 'La liquidación confirmada requiere cantidad entregada mayor a cero.'; end if;
 v_liquidacion.comision_agrobroker_usd:=v_liquidacion.cantidad_entregada_tn;
 select id into v_comision_id from public.operacion_comisiones where operacion_id=p_operacion_id and origen_comision='AGROBROKER_IA' and tipo_comision='PLATAFORMA' limit 1 for update;
 if v_comision_id is null then insert into public.operacion_comisiones(operacion_id,empresa_id,profile_id,tipo_comision,tipo_ganancia,concepto,modalidad_calculo,cantidad_tn,valor_unitario,porcentaje,valor_base,subtotal,moneda_id,iva_porcentaje,iva_importe,total,estado,factura_estado,saldo_pendiente,saldo_pagado,origen_comision,observaciones,creado_at,actualizado_at) values(p_operacion_id,null,null,'PLATAFORMA','USD_TN','Comisión propia AgroBroker IA','USD_TN',v_liquidacion.cantidad_entregada_tn,1,null,null,v_liquidacion.cantidad_entregada_tn,2,0,0,v_liquidacion.cantidad_entregada_tn,'PENDIENTE','NO_CORRESPONDE',v_liquidacion.cantidad_entregada_tn,0,'AGROBROKER_IA','USD 1 por tonelada entregada. Generada al confirmar la liquidación.',now(),now()) returning id into v_comision_id;
 else update public.operacion_comisiones set cantidad_tn=v_liquidacion.cantidad_entregada_tn,valor_unitario=1,subtotal=v_liquidacion.cantidad_entregada_tn,total=v_liquidacion.cantidad_entregada_tn,estado='PENDIENTE',saldo_pendiente=v_liquidacion.cantidad_entregada_tn,saldo_pagado=0,actualizado_at=now() where id=v_comision_id; end if;
 select exists(select 1 from public.operacion_movimientos_economicos where operacion_id=p_operacion_id and comision_id=v_comision_id and tipo_movimiento='COMISION_GENERADA') into v_movimiento_existente;
 if not v_movimiento_existente then insert into public.operacion_movimientos_economicos(operacion_id,comision_id,empresa_id,profile_id,tipo_movimiento,concepto,moneda_id,importe,signo,estado,referencia,fecha_movimiento,creado_at,actualizado_at) values(p_operacion_id,v_comision_id,null,null,'COMISION_GENERADA','Comisión propia AgroBroker IA — USD 1/TN',2,v_liquidacion.cantidad_entregada_tn,1,'PENDIENTE','AGROBROKER-IA-'||p_operacion_id,now(),now(),now()); end if;
 update public.operacion_liquidacion set comision_agrobroker_usd=v_liquidacion.cantidad_entregada_tn,updated_at=now() where id=v_liquidacion.id;
 update public.operaciones set estado='CERRADA',actualizada_en=now() where id=p_operacion_id; update public.operacion_workflow set estado='CERRADA' where id=v_workflow.id;
end;$function$;