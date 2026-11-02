-- Align platform commission payment with the approved merchandise inspection stage.
-- Sequence: preliminary agreement (2) -> merchandise inspection (3) -> commission escrow -> definitive contract (4).

create or replace function public.registrar_comprobante_comision_plataforma(
  p_operacion_id uuid,
  p_empresa_pagadora_id uuid,
  p_referencia_pago text,
  p_comprobante_url text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
  v_active_company uuid;
  v_admin boolean;
  v_orden integer;
  v_amount numeric;
  v_usd_id integer;
  v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select active_company_id into v_active_company from public.profiles where id=v_uid;
  if v_active_company is null or v_active_company<>p_empresa_pagadora_id then raise exception 'ACTIVE_COMPANY_MISMATCH'; end if;
  select exists(
    select 1 from public.company_users
    where profile_id=v_uid and company_id=v_active_company and activo=true
      and lower(rol::text) in ('administrador','admin')
  ) into v_admin;
  if not v_admin then raise exception 'ADMIN_REQUIRED'; end if;
  if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=v_active_company) then
    raise exception 'COMPANY_NOT_OPERATION_PARTICIPANT';
  end if;
  if nullif(trim(p_referencia_pago),'') is null then raise exception 'BANK_TRANSFER_REFERENCE_REQUIRED'; end if;

  select e.orden into v_orden
  from public.operacion_workflow ow
  join public.workflow_etapas e on e.id=ow.etapa_actual_id and e.workflow_id=ow.workflow_id
  where ow.operacion_id=p_operacion_id
  for update of ow;
  if v_orden<>3 then raise exception 'MERCHANDISE_INSPECTION_STAGE_REQUIRED'; end if;
  if not exists(select 1 from public.acuerdos_comerciales where operacion_id=p_operacion_id and estado='CONFIRMADO') then
    raise exception 'CONFIRMED_AGREEMENT_REQUIRED';
  end if;
  if not exists(select 1 from public.operacion_control_comercial where operacion_id=p_operacion_id and visado_resultado='APROBADO') then
    raise exception 'APPROVED_MERCHANDISE_INSPECTION_REQUIRED';
  end if;

  select coalesce(comision_monto,0) into v_amount
  from public.operacion_control_comercial where operacion_id=p_operacion_id for update;
  if v_amount<=0 then raise exception 'PLATFORM_COMMISSION_NOT_CONFIGURED'; end if;
  select id into v_usd_id from public.monedas where upper(codigo)='USD' limit 1;
  if v_usd_id is null then raise exception 'USD_CURRENCY_NOT_CONFIGURED'; end if;

  insert into public.operacion_comision_retenciones(
    operacion_id,empresa_pagadora_id,importe,moneda_id,referencia_pago,comprobante_url,estado,enviado_por
  )
  values(p_operacion_id,v_active_company,v_amount,v_usd_id,trim(p_referencia_pago),
    nullif(trim(coalesce(p_comprobante_url,'')),''),'COMPROBANTE_ENVIADO',v_uid)
  on conflict(operacion_id) do update
    set empresa_pagadora_id=excluded.empresa_pagadora_id,importe=excluded.importe,moneda_id=excluded.moneda_id,
        referencia_pago=excluded.referencia_pago,comprobante_url=excluded.comprobante_url,
        estado='COMPROBANTE_ENVIADO',enviado_por=v_uid,verificado_por=null,verificado_at=null,
        observaciones=null,actualizado_at=now()
    where public.operacion_comision_retenciones.estado in ('RECHAZADA','COMPROBANTE_ENVIADO')
  returning id into v_id;
  if v_id is null then raise exception 'COMMISSION_ESCROW_ALREADY_LOCKED_OR_RELEASED'; end if;

  update public.operacion_control_comercial
  set comision_estado='PENDIENTE_VERIFICACION',comision_medio_pago='TRANSFERENCIA',
      comision_referencia_pago=trim(p_referencia_pago),updated_at=now()
  where operacion_id=p_operacion_id;
  return v_id;
end;
$function$;

create or replace function public.confirmar_retencion_comision_plataforma(
  p_retencion_id uuid,
  p_observaciones text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
  v_r public.operacion_comision_retenciones%rowtype;
  v_usd_id integer;
  v_comm_id uuid;
  v_orden integer;
begin
  if v_uid is null or not exists(select 1 from public.platform_admins where user_id=v_uid) then
    raise exception 'PLATFORM_ADMIN_REQUIRED';
  end if;
  select * into v_r from public.operacion_comision_retenciones where id=p_retencion_id for update;
  if not found then raise exception 'RETENTION_NOT_FOUND'; end if;
  if v_r.estado<>'COMPROBANTE_ENVIADO' then raise exception 'INVALID_RETENTION_STATE'; end if;

  select e.orden into v_orden
  from public.operacion_workflow ow
  join public.workflow_etapas e on e.id=ow.etapa_actual_id and e.workflow_id=ow.workflow_id
  where ow.operacion_id=v_r.operacion_id
  for update of ow;
  if v_orden<>3 then raise exception 'MERCHANDISE_INSPECTION_STAGE_REQUIRED'; end if;
  if not exists(select 1 from public.operacion_control_comercial where operacion_id=v_r.operacion_id and visado_resultado='APROBADO') then
    raise exception 'APPROVED_MERCHANDISE_INSPECTION_REQUIRED';
  end if;

  select id into v_usd_id from public.monedas where upper(codigo)='USD' limit 1;
  select id into v_comm_id from public.operacion_comisiones
  where operacion_id=v_r.operacion_id and tipo_comision='PLATAFORMA' and origen_comision='AGROBROKER_IA'
  order by creado_at desc limit 1 for update;
  if v_comm_id is null then
    insert into public.operacion_comisiones(
      operacion_id,empresa_id,profile_id,tipo_comision,tipo_ganancia,concepto,modalidad_calculo,
      cantidad_tn,valor_unitario,subtotal,moneda_id,iva_porcentaje,iva_importe,total,estado,
      factura_estado,saldo_pendiente,saldo_pagado,saldo_reservado,origen_comision,observaciones
    )
    select v_r.operacion_id,null,null,'PLATAFORMA','USD_TN','Comisión propia AgroBrokerIA','USD_TN',
      o.cantidad_tn,1,v_r.importe,v_usd_id,0,0,v_r.importe,'RETENIDA','NO_CORRESPONDE',0,0,v_r.importe,
      'AGROBROKER_IA','Transferencia verificada y retenida hasta el cierre contractual.'
    from public.operaciones o where o.id=v_r.operacion_id
    returning id into v_comm_id;
  else
    update public.operacion_comisiones set total=v_r.importe,subtotal=v_r.importe,estado='RETENIDA',
      saldo_pendiente=0,saldo_pagado=0,saldo_reservado=v_r.importe,medio_pago='TRANSFERENCIA',
      fecha_pago=now(),referencia_pago=v_r.referencia_pago,actualizado_at=now()
    where id=v_comm_id;
  end if;
  update public.operacion_comision_retenciones set estado='RETENIDA',verificado_por=v_uid,verificado_at=now(),
    observaciones=coalesce(p_observaciones,observaciones),actualizado_at=now() where id=p_retencion_id;
  update public.operacion_control_comercial set comision_estado='RETENIDA',comision_fecha_pago=now(),
    comision_fecha_retencion=now(),comision_medio_pago='TRANSFERENCIA',
    comision_referencia_pago=v_r.referencia_pago,updated_at=now()
  where operacion_id=v_r.operacion_id;
  insert into public.operacion_movimientos_economicos(
    operacion_id,comision_id,tipo_movimiento,concepto,moneda_id,importe,signo,estado,referencia,
    fecha_movimiento,creado_at,actualizado_at
  ) values(v_r.operacion_id,v_comm_id,'COMISION_RETENIDA',
    'Comisión AgroBrokerIA retenida hasta cierre contractual',v_r.moneda_id,v_r.importe,1,
    'RETENIDA',v_r.referencia_pago,now(),now(),now());
  return jsonb_build_object('retencion_id',p_retencion_id,'estado','RETENIDA','importe',v_r.importe,'moneda_id',v_r.moneda_id);
end;
$function$;
