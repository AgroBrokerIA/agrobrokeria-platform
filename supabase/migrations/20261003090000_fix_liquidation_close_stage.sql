-- Keep liquidation closure atomic with workflow stage 10.
-- The RPC itself closes the operation and therefore must also move the
-- workflow cursor to the "Cerrada" stage; the frontend must not perform
-- a second sequential workflow transition.

create or replace function public.confirmar_liquidacion_y_cerrar_operacion(p_operacion_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_liquidacion public.operacion_liquidacion%rowtype;
  v_usuario uuid:=auth.uid();
  v_comision_id uuid;
  v_movimiento_existente boolean;
  v_workflow public.operacion_workflow%rowtype;
  v_orden integer;
  v_usd_id integer;
  v_etapa_cerrada_id uuid;
begin
  if v_usuario is null then raise exception 'No autorizado.'; end if;
  if not exists (
    select 1 from public.operacion_participantes op
    join public.company_users cu on cu.company_id=op.empresa_id
    where op.operacion_id=p_operacion_id and cu.profile_id=v_usuario and cu.activo=true
  ) then raise exception 'El usuario no participa de esta operación.'; end if;

  select * into v_workflow from public.operacion_workflow
  where operacion_id=p_operacion_id for update;
  if not found then raise exception 'La operación no tiene workflow.'; end if;

  select orden into v_orden from public.workflow_etapas
  where id=v_workflow.etapa_actual_id and workflow_id=v_workflow.workflow_id;
  if v_orden<>9 then
    raise exception 'La operación debe estar en la etapa Liquidación para poder cerrarse.';
  end if;

  select id into v_etapa_cerrada_id
  from public.workflow_etapas
  where workflow_id=v_workflow.workflow_id and orden=10;
  if v_etapa_cerrada_id is null then raise exception 'El workflow no tiene etapa Cerrada.'; end if;

  select * into v_liquidacion from public.operacion_liquidacion
  where operacion_id=p_operacion_id order by creado_at desc limit 1 for update;
  if not found then raise exception 'No existe una liquidación para esta operación.'; end if;
  if v_liquidacion.estado<>'CONFIRMADA' then
    raise exception 'La liquidación debe estar CONFIRMADA antes de cerrar la operación.';
  end if;
  if v_liquidacion.cantidad_entregada_tn<=0 then
    raise exception 'La liquidación confirmada requiere cantidad entregada mayor a cero.';
  end if;

  select id into v_usd_id from public.monedas where upper(codigo)='USD' limit 1;
  if v_usd_id is null then raise exception 'La moneda USD no está configurada en el catálogo.'; end if;

  v_liquidacion.comision_agrobroker_usd:=v_liquidacion.cantidad_entregada_tn;

  select id into v_comision_id from public.operacion_comisiones
  where operacion_id=p_operacion_id and origen_comision='AGROBROKER_IA'
    and tipo_comision='PLATAFORMA' limit 1 for update;

  if v_comision_id is null then
    insert into public.operacion_comisiones(
      operacion_id,empresa_id,profile_id,tipo_comision,tipo_ganancia,concepto,modalidad_calculo,
      cantidad_tn,valor_unitario,porcentaje,valor_base,subtotal,moneda_id,iva_porcentaje,iva_importe,
      total,estado,factura_estado,saldo_pendiente,saldo_pagado,origen_comision,observaciones,creado_at,actualizado_at
    )
    values(
      p_operacion_id,null,null,'PLATAFORMA','USD_TN','Comisión propia AgroBroker IA','USD_TN',
      v_liquidacion.cantidad_entregada_tn,1,null,null,v_liquidacion.cantidad_entregada_tn,v_usd_id,0,0,
      v_liquidacion.cantidad_entregada_tn,'PENDIENTE','NO_CORRESPONDE',
      v_liquidacion.cantidad_entregada_tn,0,'AGROBROKER_IA',
      'USD 1 por tonelada entregada. Generada al confirmar la liquidación.',now(),now()
    ) returning id into v_comision_id;
  else
    update public.operacion_comisiones set
      cantidad_tn=v_liquidacion.cantidad_entregada_tn,
      valor_unitario=1,moneda_id=v_usd_id,
      subtotal=v_liquidacion.cantidad_entregada_tn,
      total=v_liquidacion.cantidad_entregada_tn,
      estado='PENDIENTE',
      saldo_pendiente=v_liquidacion.cantidad_entregada_tn,
      saldo_pagado=0,actualizado_at=now()
    where id=v_comision_id;
  end if;

  select exists(
    select 1 from public.operacion_movimientos_economicos
    where operacion_id=p_operacion_id and comision_id=v_comision_id
      and tipo_movimiento='COMISION_GENERADA'
  ) into v_movimiento_existente;

  if not v_movimiento_existente then
    insert into public.operacion_movimientos_economicos(
      operacion_id,comision_id,empresa_id,profile_id,tipo_movimiento,concepto,
      moneda_id,importe,signo,estado,referencia,fecha_movimiento,creado_at,actualizado_at
    )
    values(
      p_operacion_id,v_comision_id,null,null,'COMISION_GENERADA',
      'Comisión propia AgroBroker IA — USD 1/TN',v_usd_id,
      v_liquidacion.cantidad_entregada_tn,1,'PENDIENTE',
      'AGROBROKER-IA-'||p_operacion_id,now(),now(),now()
    );
  end if;

  update public.operacion_liquidacion
  set comision_agrobroker_usd=v_liquidacion.cantidad_entregada_tn,updated_at=now()
  where id=v_liquidacion.id;

  update public.workflow_historial set fecha_fin=now()
  where operacion_workflow_id=v_workflow.id
    and etapa_id=v_workflow.etapa_actual_id and fecha_fin is null;

  insert into public.workflow_historial(
    operacion_workflow_id,etapa_id,fecha_inicio,usuario_id,observaciones
  ) values(
    v_workflow.id,v_etapa_cerrada_id,now(),v_usuario,
    'Cierre económico de liquidación validado; operación cerrada.'
  );

  update public.operacion_workflow
  set etapa_actual_id=v_etapa_cerrada_id,estado='CERRADA'
  where id=v_workflow.id;

  update public.operaciones set estado='CERRADA',actualizada_en=now()
  where id=p_operacion_id;
end;
$function$;
