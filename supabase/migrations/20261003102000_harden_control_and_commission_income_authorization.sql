-- Harden financial income integrity and commercial control authorization.
create or replace function public.registrar_ingreso_comision(
  p_empresa_id uuid,
  p_operacion_id uuid,
  p_operacion_comision_id uuid,
  p_moneda_id integer,
  p_importe numeric,
  p_medio_pago text,
  p_proveedor_pago text default null,
  p_referencia_pago text default null,
  p_referencia_operacion text default null,
  p_estado text default 'RECIBIDO'
) returns uuid
language plpgsql security definer set search_path=public
as $function$
declare
  v_uid uuid:=auth.uid(); v_id uuid; v_bid uuid; v_comm public.operacion_comisiones%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.company_users where company_id=p_empresa_id and profile_id=v_uid and activo=true and lower(rol::text) in ('administrador','admin')) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_importe is null or p_importe<=0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_estado not in ('PENDIENTE','INICIADO','RECIBIDO','CONCILIADO','RECHAZADO','DEVUELTO') then raise exception 'INVALID_STATE'; end if;
  select * into v_comm from public.operacion_comisiones where id=p_operacion_comision_id for update;
  if not found then raise exception 'COMMISSION_NOT_FOUND'; end if;
  if v_comm.operacion_id is distinct from p_operacion_id then raise exception 'COMMISSION_OPERATION_MISMATCH'; end if;
  if v_comm.empresa_id is distinct from p_empresa_id then raise exception 'COMMISSION_COMPANY_MISMATCH'; end if;
  if v_comm.moneda_id is distinct from p_moneda_id then raise exception 'COMMISSION_CURRENCY_MISMATCH'; end if;
  if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_id) then raise exception 'COMPANY_NOT_OPERATION_PARTICIPANT'; end if;
  insert into public.ingresos_comisiones(empresa_receptora_id,profile_id,operacion_id,operacion_comision_id,moneda_id,importe,medio_pago,proveedor_pago,referencia_pago,referencia_operacion,estado,fecha_confirmacion)
  values(p_empresa_id,v_uid,p_operacion_id,p_operacion_comision_id,p_moneda_id,p_importe,p_medio_pago,p_proveedor_pago,p_referencia_pago,p_referencia_operacion,p_estado,case when p_estado in ('RECIBIDO','CONCILIADO') then now() end)
  returning id into v_id;
  insert into public.billeteras_comisiones(empresa_id,moneda_id) values(p_empresa_id,p_moneda_id) on conflict(empresa_id,moneda_id) do nothing;
  select id into v_bid from public.billeteras_comisiones where empresa_id=p_empresa_id and moneda_id=p_moneda_id;
  if p_estado in ('RECIBIDO','CONCILIADO') then
    update public.billeteras_comisiones set saldo_disponible=saldo_disponible+p_importe,updated_at=now() where id=v_bid;
    insert into public.billeteras_comisiones_movimientos(billetera_id,empresa_id,profile_id,operacion_id,operacion_comision_id,tipo,importe,moneda_id,signo,referencia_externa,referencia_interna,proveedor_pago)
    values(v_bid,p_empresa_id,v_uid,p_operacion_id,p_operacion_comision_id,'PAGO_COMISION_RECIBIDO',p_importe,p_moneda_id,1,p_referencia_pago,p_referencia_operacion,p_proveedor_pago);
  end if;
  insert into public.finanzas_auditoria(empresa_id,profile_id,entidad,entidad_id,accion,datos)
  values(p_empresa_id,v_uid,'INGRESO_COMISION',v_id,'CREADO',jsonb_build_object('importe',p_importe,'estado',p_estado));
  return v_id;
end
$function$;

create or replace function public.guardar_control_comercial(p_operacion_id uuid,p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path=public
as $function$
declare
  v_id uuid; x jsonb:=coalesce(p_cambios,'{}'::jsonb); outrow jsonb; v_qty numeric;
  v_uid uuid:=auth.uid(); v_active_company uuid; v_is_admin boolean; v_sensitive boolean;
begin
  if v_uid is null or not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para esta operación.'; end if;
  select active_company_id into v_active_company from public.profiles where id=v_uid;
  if v_active_company is null or not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=v_active_company) then raise exception 'La empresa activa no participa de la operación.'; end if;
  select exists(select 1 from public.company_users where profile_id=v_uid and company_id=v_active_company and activo=true and lower(rol::text) in ('administrador','admin')) into v_is_admin;
  v_sensitive:=x ? 'comision_estado' or x ? 'fondos_estado' or x ? 'visado_estado' or x ? 'visado_resultado' or x ? 'visado_motivo_rechazo' or x ? 'visado_observaciones' or x ? 'visado_responsable' or x ? 'visado_calidad' or x ? 'visado_humedad' or x ? 'visado_proteina' or x ? 'datos_operativos_estado' or x ? 'datos_operativos_liberados_at' or x ? 'cancelacion_estado';
  if v_sensitive and not v_is_admin then raise exception 'Se requiere rol administrador para modificar estados de control comercial.'; end if;
  if x ? 'no_elusion_aceptada' and not v_is_admin and coalesce((x->>'no_elusion_aceptada')::boolean,false) is not true then raise exception 'La no elusión solo puede ser aceptada, no revertida, por un usuario no administrador.'; end if;
  if x ? 'comision_estado' and x->>'comision_estado' not in ('PENDIENTE','ABONADA','DEVUELTA') then raise exception 'Estado de comisión inválido.'; end if;
  if x ? 'fondos_estado' and x->>'fondos_estado' not in ('PENDIENTES','LIBERADOS','BLOQUEADOS') then raise exception 'Estado de fondos inválido.'; end if;
  if x ? 'visado_estado' and x->>'visado_estado' not in ('PENDIENTE','APROBADO','RECHAZADO') then raise exception 'Estado de visado inválido.'; end if;
  if x ? 'datos_operativos_estado' and x->>'datos_operativos_estado' not in ('PROTEGIDOS','HABILITADOS') then raise exception 'Estado de datos operativos inválido.'; end if;
  if x ? 'cancelacion_estado' and x->>'cancelacion_estado' not in ('NO_CANCELADA','SOLICITADA','CANCELADA','CANCELACION_RECHAZADA','CANCELADA_POR_VENCIMIENTO') then raise exception 'Estado de cancelación inválido.'; end if;
  select cantidad_tn into v_qty from public.operaciones where id=p_operacion_id for update;
  if v_qty is null or v_qty<0 then raise exception 'Operación sin cantidad válida.'; end if;
  select id into v_id from public.operacion_control_comercial where operacion_id=p_operacion_id for update;
  if v_id is null then
    insert into public.operacion_control_comercial(operacion_id,comision_monto,comision_moneda,comision_estado,fondos_estado,visado_estado,vendedor_firma_estado,comprador_firma_estado,intermediario_firma_estado,datos_operativos_estado,no_elusion_aceptada,cancelacion_estado)
    values(p_operacion_id,v_qty,'USD','PENDIENTE','PENDIENTES','PENDIENTE','PENDIENTE','PENDIENTE','NO_CORRESPONDE','PROTEGIDOS',false,'NO_CANCELADA') returning id into v_id;
  end if;
  update public.operacion_control_comercial set
    comision_monto=v_qty,comision_moneda='USD',
    comision_estado=case when x ? 'comision_estado' then x->>'comision_estado' else comision_estado end,
    fondos_estado=case when x ? 'fondos_estado' then x->>'fondos_estado' else fondos_estado end,
    visado_estado=case when x ? 'visado_estado' then x->>'visado_estado' else visado_estado end,
    visado_resultado=case when x ? 'visado_resultado' then x->>'visado_resultado' else visado_resultado end,
    visado_motivo_rechazo=case when x ? 'visado_motivo_rechazo' then x->>'visado_motivo_rechazo' else visado_motivo_rechazo end,
    visado_observaciones=case when x ? 'visado_observaciones' then x->>'visado_observaciones' else visado_observaciones end,
    visado_responsable=case when x ? 'visado_responsable' then x->>'visado_responsable' else visado_responsable end,
    visado_calidad=case when x ? 'visado_calidad' then x->>'visado_calidad' else visado_calidad end,
    visado_humedad=case when x ? 'visado_humedad' then (x->>'visado_humedad')::numeric else visado_humedad end,
    visado_proteina=case when x ? 'visado_proteina' then (x->>'visado_proteina')::numeric else visado_proteina end,
    no_elusion_aceptada=case when x ? 'no_elusion_aceptada' then (x->>'no_elusion_aceptada')::boolean else no_elusion_aceptada end,
    datos_operativos_estado=case when x ? 'datos_operativos_estado' then x->>'datos_operativos_estado' else datos_operativos_estado end,
    datos_operativos_liberados_at=case when x ? 'datos_operativos_liberados_at' then (x->>'datos_operativos_liberados_at')::timestamptz else datos_operativos_liberados_at end,
    cancelacion_estado=case when x ? 'cancelacion_estado' then x->>'cancelacion_estado' else cancelacion_estado end,
    updated_at=now()
  where id=v_id
  returning to_jsonb(operacion_control_comercial.*) into outrow;
  return outrow;
end
$function$;

revoke all on function public.registrar_ingreso_comision(uuid,uuid,uuid,integer,numeric,text,text,text,text,text) from public,anon;
grant execute on function public.registrar_ingreso_comision(uuid,uuid,uuid,integer,numeric,text,text,text,text,text) to authenticated;
revoke all on function public.guardar_control_comercial(uuid,jsonb) from public,anon;
grant execute on function public.guardar_control_comercial(uuid,jsonb) to authenticated;
