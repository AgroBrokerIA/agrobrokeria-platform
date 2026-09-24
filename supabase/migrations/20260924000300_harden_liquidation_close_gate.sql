-- Close only from the Liquidación stage and only after a confirmed,
-- non-empty delivery. The platform commission is taken from the
-- explicit liquidation agreement, never calculated from tonnage.
create or replace function public.confirmar_liquidacion_y_cerrar_operacion(p_operacion_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_liquidacion public.operacion_liquidacion%rowtype;
  v_usuario uuid := auth.uid();
  v_comision_id uuid;
  v_movimiento_existente boolean;
  v_workflow public.operacion_workflow%rowtype;
  v_orden integer;
begin
  if v_usuario is null then raise exception 'No autorizado.'; end if;

  if not exists (
    select 1 from public.operacion_participantes op
    join public.company_users cu on cu.company_id=op.empresa_id
    where op.operacion_id=p_operacion_id
      and cu.profile_id=v_usuario and cu.activo=true
  ) then
    raise exception 'El usuario no participa de esta operación.';
  end if;

  select * into v_workflow from public.operacion_workflow
  where operacion_id=p_operacion_id for update;
  if not found then raise exception 'La operación no tiene workflow.'; end if;

  select orden into v_orden from public.workflow_etapas
  where id=v_workflow.etapa_actual_id and workflow_id=v_workflow.workflow_id;
  if v_orden <> 9 then
    raise exception 'La operación debe estar en la etapa Liquidación para poder cerrarse.';
  end if;

  select * into v_liquidacion from public.operacion_liquidacion
  where operacion_id=p_operacion_id
  order by creado_at desc limit 1 for update;
  if not found then raise exception 'No existe una liquidación para esta operación.'; end if;
  if v_liquidacion.estado <> 'CONFIRMADA' then
    raise exception 'La liquidación debe estar CONFIRMADA antes de cerrar la operación.';
  end if;
  if v_liquidacion.comision_agrobroker_usd < 0 then
    raise exception 'La comisión de AgroBroker IA no puede ser negativa.';
  end if;
  if v_liquidacion.cantidad_entregada_tn <= 0 then
    raise exception 'La liquidación confirmada requiere cantidad entregada mayor a cero.';
  end if;

  select id into v_comision_id from public.operacion_comisiones
  where operacion_id=p_operacion_id
    and origen_comision='AGROBROKER_IA'
    and tipo_comision='PLATAFORMA'
  limit 1 for update;

  if v_comision_id is null then
    insert into public.operacion_comisiones(
      operacion_id,empresa_id,profile_id,tipo_comision,tipo_ganancia,concepto,
      modalidad_calculo,cantidad_tn,valor_unitario,porcentaje,valor_base,subtotal,
      moneda_id,iva_porcentaje,iva_importe,total,estado,factura_estado,
      saldo_pendiente,saldo_pagado,origen_comision,observaciones,creado_at,actualizado_at
    )
    values(
      p_operacion_id,null,null,'PLATAFORMA','USD_TN','Comisión propia AgroBroker IA',
      'USD_TN',v_liquidacion.cantidad_entregada_tn,
      case when v_liquidacion.cantidad_entregada_tn>0
        then v_liquidacion.comision_agrobroker_usd/v_liquidacion.cantidad_entregada_tn else 0 end,
      null,null,v_liquidacion.comision_agrobroker_usd,2,0,0,
      v_liquidacion.comision_agrobroker_usd,
      case when v_liquidacion.comision_agrobroker_usd>0 then 'PENDIENTE' else 'ANULADA' end,
      'NO_CORRESPONDE',
      case when v_liquidacion.comision_agrobroker_usd>0 then v_liquidacion.comision_agrobroker_usd else 0 end,
      0,'AGROBROKER_IA','Generada al confirmar la liquidación.',now(),now()
    )
    returning id into v_comision_id;
  else
    update public.operacion_comisiones
    set cantidad_tn=v_liquidacion.cantidad_entregada_tn,
        valor_unitario=case when v_liquidacion.cantidad_entregada_tn>0
          then v_liquidacion.comision_agrobroker_usd/v_liquidacion.cantidad_entregada_tn else 0 end,
        subtotal=v_liquidacion.comision_agrobroker_usd,
        total=v_liquidacion.comision_agrobroker_usd,
        estado=case when v_liquidacion.comision_agrobroker_usd>0 then 'PENDIENTE' else 'ANULADA' end,
        saldo_pendiente=case when v_liquidacion.comision_agrobroker_usd>0 then v_liquidacion.comision_agrobroker_usd else 0 end,
        saldo_pagado=0, actualizado_at=now()
    where id=v_comision_id;
  end if;

  select exists(
    select 1 from public.operacion_movimientos_economicos
    where operacion_id=p_operacion_id and comision_id=v_comision_id
      and tipo_movimiento='COMISION_GENERADA'
  ) into v_movimiento_existente;

  if not v_movimiento_existente and v_liquidacion.comision_agrobroker_usd>0 then
    insert into public.operacion_movimientos_economicos(
      operacion_id,comision_id,empresa_id,profile_id,tipo_movimiento,concepto,
      moneda_id,importe,signo,estado,referencia,fecha_movimiento,creado_at,actualizado_at
    )
    values(
      p_operacion_id,v_comision_id,null,null,'COMISION_GENERADA',
      'Comisión propia AgroBroker IA',2,v_liquidacion.comision_agrobroker_usd,1,
      'PENDIENTE','AGROBROKER-IA-'||p_operacion_id,now(),now(),now()
    );
  end if;

  update public.operaciones set estado='CERRADA',actualizada_en=now()
  where id=p_operacion_id;

  update public.operacion_workflow set estado='CERRADA'
  where id=v_workflow.id;
end;
$function$;
