-- Move the AgroBrokerIA platform commission gate to after merchandise inspection.
-- Visado can be completed without prepaying the platform commission.
-- Contract Definitivo remains blocked until the inspection is approved and the transfer is verified/retained.

CREATE OR REPLACE FUNCTION public.avanzar_operacion_workflow(p_workflow_id uuid, p_etapa_destino_id uuid, p_estado text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_workflow public.operacion_workflow%rowtype;
 v_actual_orden integer;
 v_destino_orden integer;
 v_max_orden integer;
 v_uid uuid;
 v_gate jsonb;
 v_control public.operacion_control_comercial%rowtype;
 v_firmantes_requeridos integer;
 v_firmantes_firmados integer;
begin
 if auth.uid() is null then raise exception 'Autenticación requerida.'; end if;

 -- workflow_historial.usuario_id references cuentas.id, not auth.users/profiles.id.
 select c.id into v_uid
 from public.profiles p
 join public.cuentas c on lower(trim(c.email))=lower(trim(p.email))
 where p.id=auth.uid()
 limit 1;
 if v_uid is null then
   raise exception 'La cuenta del usuario autenticado no está vinculada a una cuenta operativa.';
 end if;

 select * into v_workflow from public.operacion_workflow where id=p_workflow_id for update;
 if not found then raise exception 'Workflow de operación inexistente.'; end if;
 if not public.usuario_participa_operacion(v_workflow.operacion_id) then raise exception 'No autorizado para esta operación.'; end if;

 select orden into v_actual_orden from public.workflow_etapas where id=v_workflow.etapa_actual_id and workflow_id=v_workflow.workflow_id;
 select orden into v_destino_orden from public.workflow_etapas where id=p_etapa_destino_id and workflow_id=v_workflow.workflow_id;
 if v_actual_orden is null or v_destino_orden is null then raise exception 'Las etapas no pertenecen al workflow de la operación.'; end if;
 if v_destino_orden<>v_actual_orden+1 then raise exception 'La operación solo puede avanzar a la siguiente etapa.'; end if;

 if v_destino_orden=4 then
   if not exists(select 1 from public.operacion_control_comercial c where c.operacion_id=v_workflow.operacion_id and c.visado_resultado='APROBADO') then
     raise exception 'No se puede habilitar el Contrato Definitivo: el Visado de mercadería debe estar APROBADO.';
   end if;
   if not exists(select 1 from public.operacion_comision_retenciones r where r.operacion_id=v_workflow.operacion_id and r.estado='RETENIDA') then
     raise exception 'No se puede habilitar el Contrato Definitivo: la comisión de AgroBrokerIA debe estar acreditada y RETENIDA.';
   end if;
 end if;

 if v_destino_orden=5 then
   if not exists(select 1 from public.contratos where operacion_id=v_workflow.operacion_id and estado='CONFIRMADO') then
     raise exception 'El contrato debe estar confirmado antes de pasar a Firmas.';
   end if;
 end if;

 if v_destino_orden=6 then
   select count(distinct rol) into v_firmantes_requeridos
   from public.operacion_participantes
   where operacion_id=v_workflow.operacion_id and rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO');
   select count(distinct cf.rol) into v_firmantes_firmados
   from public.contrato_firmantes cf
   join public.contratos c on c.id=cf.contrato_id
   where c.operacion_id=v_workflow.operacion_id and c.estado='CONFIRMADO'
     and cf.rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO') and cf.firmado=true;
   if v_firmantes_requeridos<2 or v_firmantes_firmados<v_firmantes_requeridos then
     raise exception 'No se puede pasar a Fondos: faltan firmas requeridas.';
   end if;
 end if;

 if v_destino_orden=7 then
   select * into v_control from public.operacion_control_comercial where operacion_id=v_workflow.operacion_id for update;
   if not found then raise exception 'No existe el control comercial de la operación.'; end if;
   if v_control.fondos_estado<>'LIBERADOS' then raise exception 'No se puede liberar operativamente: los fondos no están LIBERADOS.'; end if;
   if v_control.comision_estado not in ('RETENIDA','LIBERADA') then raise exception 'No se puede liberar operativamente: la comisión AgroBrokerIA no está RETENIDA.'; end if;
   if v_control.no_elusion_aceptada is not true then raise exception 'No se puede liberar operativamente: falta aceptar la no elusión.'; end if;
 end if;

 if v_destino_orden=8 then
   select * into v_control from public.operacion_control_comercial where operacion_id=v_workflow.operacion_id for update;
   if not found or v_control.datos_operativos_estado<>'HABILITADOS' then
     raise exception 'No se puede iniciar Logística / Entrega: los datos operativos no están HABILITADOS.';
   end if;
 end if;

 if v_destino_orden=9 then
   if not exists(select 1 from public.operacion_logistica where operacion_id=v_workflow.operacion_id and estado='ENTREGADA') then
     raise exception 'No se puede pasar a Liquidación: la entrega no está confirmada como ENTREGADA.';
   end if;
 end if;

 if p_estado is not null then
   select max(orden) into v_max_orden from public.workflow_etapas where workflow_id=v_workflow.workflow_id;
   if v_destino_orden<>v_max_orden then raise exception 'El estado de cierre solo puede establecerse en la última etapa.'; end if;
 end if;

 if v_destino_orden=(select max(orden) from public.workflow_etapas where workflow_id=v_workflow.workflow_id) then
   v_gate:=public.validar_cierre_documental_operacion(v_workflow.operacion_id);
   if coalesce((v_gate->>'ok')::boolean,false)=false then raise exception 'CIERRE_DOCUMENTAL_INCOMPLETO:%',v_gate->'faltantes'; end if;
 end if;

 update public.workflow_historial set fecha_fin=now()
 where operacion_workflow_id=p_workflow_id and etapa_id=v_workflow.etapa_actual_id and fecha_fin is null;
 update public.operacion_workflow set etapa_actual_id=p_etapa_destino_id,estado=coalesce(p_estado,estado) where id=p_workflow_id;
 insert into public.workflow_historial(operacion_workflow_id,etapa_id,fecha_inicio,usuario_id,observaciones)
 values(p_workflow_id,p_etapa_destino_id,now(),v_uid,'Avance del workflow validado por reglas de etapa.');
 if v_destino_orden=(select max(orden) from public.workflow_etapas where workflow_id=v_workflow.workflow_id)
 then update public.operaciones set estado=coalesce(p_estado,'CERRADA'),actualizada_en=now() where id=v_workflow.operacion_id; end if;
 return jsonb_build_object('workflow_id',p_workflow_id,'etapa_destino_id',p_etapa_destino_id,'orden',v_destino_orden,'estado',coalesce(p_estado,v_workflow.estado));
end;
$function$


CREATE OR REPLACE FUNCTION public.registrar_comprobante_comision_plataforma(p_operacion_id uuid, p_empresa_pagadora_id uuid, p_referencia_pago text, p_comprobante_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_active_company uuid;
  v_admin boolean;
  v_orden integer;
  v_amount numeric;
  v_qty numeric;
  v_usd_id integer;
  v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select active_company_id into v_active_company from public.profiles where id=v_uid;
  if v_active_company is null or v_active_company<>p_empresa_pagadora_id then raise exception 'ACTIVE_COMPANY_MISMATCH'; end if;
  select exists(select 1 from public.company_users where profile_id=v_uid and company_id=v_active_company and activo=true and lower(rol::text) in ('administrador','admin')) into v_admin;
  if not v_admin then raise exception 'ADMIN_REQUIRED'; end if;
  if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=v_active_company) then raise exception 'COMPANY_NOT_OPERATION_PARTICIPANT'; end if;
  if nullif(trim(p_referencia_pago),'') is null then raise exception 'BANK_TRANSFER_REFERENCE_REQUIRED'; end if;
  select e.orden into v_orden
  from public.operacion_workflow ow
  join public.workflow_etapas e on e.id=ow.etapa_actual_id and e.workflow_id=ow.workflow_id
  where ow.operacion_id=p_operacion_id
  for update of ow;
  if v_orden<>3 then raise exception 'MERCHANDISE_INSPECTION_STAGE_REQUIRED'; end if;
  if not exists(select 1 from public.operacion_control_comercial where operacion_id=p_operacion_id and visado_resultado='APROBADO') then
    raise exception 'APPROVED_MERCHANDISE_INSPECTION_REQUIRED';
  end if;
  if not exists(select 1 from public.acuerdos_comerciales where operacion_id=p_operacion_id and estado='CONFIRMADO') then
    raise exception 'CONFIRMED_AGREEMENT_REQUIRED';
  end if;
  select coalesce(comision_monto,0) into v_amount from public.operacion_control_comercial where operacion_id=p_operacion_id for update;
  select cantidad_tn into v_qty from public.operaciones where id=p_operacion_id;
  if v_amount<=0 or v_qty is null or v_amount<>v_qty then
    raise exception 'PLATFORM_COMMISSION_MUST_EQUAL_USD_1_PER_TONNE';
  end if;
  select id into v_usd_id from public.monedas where upper(codigo)='USD' limit 1;
  if v_usd_id is null then raise exception 'USD_CURRENCY_NOT_CONFIGURED'; end if;
  insert into public.operacion_comision_retenciones(operacion_id,empresa_pagadora_id,importe,moneda_id,referencia_pago,comprobante_url,estado,enviado_por)
  values(p_operacion_id,v_active_company,v_amount,v_usd_id,trim(p_referencia_pago),nullif(trim(coalesce(p_comprobante_url,'')),''),'COMPROBANTE_ENVIADO',v_uid)
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
$function$


CREATE OR REPLACE FUNCTION public.confirmar_retencion_comision_plataforma(p_retencion_id uuid, p_observaciones text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_r public.operacion_comision_retenciones%rowtype;
  v_usd_id integer;
  v_comm_id uuid;
  v_order integer;
begin
  if v_uid is null or not exists(select 1 from public.platform_admins where user_id=v_uid) then raise exception 'PLATFORM_ADMIN_REQUIRED'; end if;
  select * into v_r from public.operacion_comision_retenciones where id=p_retencion_id for update;
  if not found then raise exception 'RETENTION_NOT_FOUND'; end if;
  if v_r.estado<>'COMPROBANTE_ENVIADO' then raise exception 'INVALID_RETENTION_STATE'; end if;
  select e.orden into v_order
  from public.operacion_workflow ow
  join public.workflow_etapas e on e.id=ow.etapa_actual_id and e.workflow_id=ow.workflow_id
  where ow.operacion_id=v_r.operacion_id
  for update of ow;
  if v_order<>3 then raise exception 'MERCHANDISE_INSPECTION_STAGE_REQUIRED'; end if;
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
  update public.operacion_control_comercial set comision_estado='RETENIDA',
    comision_fecha_pago=now(),comision_fecha_retencion=now(),comision_medio_pago='TRANSFERENCIA',
    comision_referencia_pago=v_r.referencia_pago,updated_at=now()
  where operacion_id=v_r.operacion_id;
  insert into public.operacion_movimientos_economicos(
    operacion_id,comision_id,tipo_movimiento,concepto,moneda_id,importe,signo,estado,referencia,fecha_movimiento,creado_at,actualizado_at
  ) values(v_r.operacion_id,v_comm_id,'COMISION_RETENIDA','Comisión AgroBrokerIA retenida hasta cierre contractual',
    v_r.moneda_id,v_r.importe,1,'RETENIDA',v_r.referencia_pago,now(),now(),now());
  return jsonb_build_object('retencion_id',p_retencion_id,'estado','RETENIDA','importe',v_r.importe,'moneda_id',v_r.moneda_id);
end;
$function$

