-- Harden intermediary commission mutation paths.
-- Only active company administrators may mutate intermediary commissions.
-- The synchronization RPC additionally requires the intermediary company to
-- be an actual INTERMEDIARIO participant of the operation.

create or replace function public.guardar_comision_intermediario(p_operacion_id uuid, p_datos jsonb)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
 v_uid uuid:=auth.uid(); v_row public.comisiones_intermediarios; v_id uuid; v_valor numeric; v_admin boolean;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'FORBIDDEN'; end if;

 select exists(
   select 1 from public.operacion_participantes op
   join public.company_users cu on cu.company_id=op.empresa_id
   where op.operacion_id=p_operacion_id and cu.profile_id=v_uid and cu.activo=true
     and lower(cu.rol::text) in ('administrador','admin')
 ) into v_admin;
 if not v_admin then raise exception 'ADMIN_REQUIRED'; end if;

 v_id:=nullif(p_datos->>'id','')::uuid;
 v_valor:=coalesce((p_datos->>'valor_comision')::numeric,0);
 if v_valor<0 then raise exception 'INVALID_COMMISSION_VALUE'; end if;
 if nullif(trim(p_datos->>'tipo_comision'),'') is null then raise exception 'INVALID_COMMISSION_TYPE'; end if;
 if nullif(trim(p_datos->>'estado'),'') is not null
    and (p_datos->>'estado') not in ('PENDIENTE','RETENIDA','ABONADA','DEVUELTA','ANULADA') then
   raise exception 'INVALID_COMMISSION_STATE';
 end if;

 if v_id is not null then
   update public.comisiones_intermediarios
   set contacto_id=nullif(p_datos->>'contacto_id','')::uuid,
       parte_operacion_id=nullif(p_datos->>'parte_operacion_id','')::uuid,
       lado=coalesce(nullif(p_datos->>'lado',''),lado),
       tipo_comision=coalesce(nullif(p_datos->>'tipo_comision',''),tipo_comision),
       valor_comision=v_valor, moneda=nullif(p_datos->>'moneda',''),
       quien_abona=coalesce(nullif(p_datos->>'quien_abona',''),quien_abona),
       acuerdo_previo=coalesce((p_datos->>'acuerdo_previo')::boolean,acuerdo_previo),
       acuerdo_previo_detalle=p_datos->>'acuerdo_previo_detalle',
       estado=coalesce(nullif(p_datos->>'estado',''),estado),
       medio_pago=p_datos->>'medio_pago', entidad_financiera=p_datos->>'entidad_financiera',
       titular_pago=p_datos->>'titular_pago', cuit_titular_pago=p_datos->>'cuit_titular_pago',
       banco=p_datos->>'banco', cbu=p_datos->>'cbu', alias=p_datos->>'alias',
       referencia_pago=p_datos->>'referencia_pago',
       fecha_acuerdo=nullif(p_datos->>'fecha_acuerdo','')::timestamptz,
       fecha_retencion=nullif(p_datos->>'fecha_retencion','')::timestamptz,
       fecha_pago=nullif(p_datos->>'fecha_pago','')::timestamptz,
       fecha_devolucion=nullif(p_datos->>'fecha_devolucion','')::timestamptz,
       observaciones=p_datos->>'observaciones', updated_at=now()
   where id=v_id and operacion_id=p_operacion_id returning * into v_row;
 else
   insert into public.comisiones_intermediarios(
     operacion_id,contacto_id,parte_operacion_id,lado,tipo_comision,valor_comision,moneda,
     quien_abona,acuerdo_previo,acuerdo_previo_detalle,estado,medio_pago,entidad_financiera,
     titular_pago,cuit_titular_pago,banco,cbu,alias,referencia_pago,fecha_acuerdo,
     fecha_retencion,fecha_pago,fecha_devolucion,observaciones,created_at,updated_at
   ) values (
     p_operacion_id,nullif(p_datos->>'contacto_id','')::uuid,nullif(p_datos->>'parte_operacion_id','')::uuid,
     coalesce(nullif(p_datos->>'lado',''),'INTERMEDIARIO'),
     coalesce(nullif(p_datos->>'tipo_comision',''),'FIJA'),v_valor,nullif(p_datos->>'moneda',''),
     coalesce(nullif(p_datos->>'quien_abona',''),'OPERACION'),
     coalesce((p_datos->>'acuerdo_previo')::boolean,false),p_datos->>'acuerdo_previo_detalle',
     coalesce(nullif(p_datos->>'estado',''),'PENDIENTE'),p_datos->>'medio_pago',
     p_datos->>'entidad_financiera',p_datos->>'titular_pago',p_datos->>'cuit_titular_pago',
     p_datos->>'banco',p_datos->>'cbu',p_datos->>'alias',p_datos->>'referencia_pago',
     nullif(p_datos->>'fecha_acuerdo','')::timestamptz,nullif(p_datos->>'fecha_retencion','')::timestamptz,
     nullif(p_datos->>'fecha_pago','')::timestamptz,nullif(p_datos->>'fecha_devolucion','')::timestamptz,
     p_datos->>'observaciones',now(),now()
   ) returning * into v_row;
 end if;

 if v_row.id is null then raise exception 'COMMISSION_NOT_FOUND'; end if;
 return to_jsonb(v_row);
end; $$;

create or replace function public.sincronizar_comision_intermediario(
 p_operacion_id uuid,p_empresa_intermediaria_id uuid,p_tipo_comision text,p_valor_comision numeric,
 p_quien_abona text,p_estado text default 'PENDIENTE',p_acuerdo_previo boolean default false,p_detalle text default null)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid(); v_exist uuid; v_qty numeric; v_sub numeric; v_total numeric;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'OPERATION_FORBIDDEN'; end if;
 if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_intermediaria_id and rol='INTERMEDIARIO') then
   raise exception 'INTERMEDIARY_NOT_PARTICIPANT';
 end if;
 if not exists(select 1 from public.company_users where company_id=p_empresa_intermediaria_id and profile_id=v_uid and activo=true and lower(rol::text) in ('administrador','admin')) then
   raise exception 'ADMIN_REQUIRED';
 end if;
 if p_tipo_comision not in ('USD_TN','PORCENTAJE','FIJA') then raise exception 'INVALID_COMMISSION_TYPE'; end if;
 if p_valor_comision is null or p_valor_comision<=0 then raise exception 'INVALID_COMMISSION_VALUE'; end if;
 if p_estado not in ('PENDIENTE','ABONADA','ANULADA','DEVUELTA') then raise exception 'INVALID_COMMISSION_STATE'; end if;

 select cantidad_tn, coalesce(total,0) into v_qty,v_total
 from public.operaciones where id=p_operacion_id;
 if v_qty is null or v_qty<=0 then raise exception 'INVALID_OPERATION_QUANTITY'; end if;

 v_sub:=case
   when p_tipo_comision='USD_TN' then p_valor_comision*v_qty
   when p_tipo_comision='PORCENTAJE' then (p_valor_comision/100.0)*v_total
   else p_valor_comision
 end;

 select id into v_exist from public.operacion_comisiones
 where operacion_id=p_operacion_id and empresa_id=p_empresa_intermediaria_id
   and tipo_comision='INTERMEDIARIO'
   and tipo_ganancia=case when p_tipo_comision='USD_TN' then 'USD_TN' else 'FIJA' end
   and valor_unitario=p_valor_comision
 limit 1 for update;

 if v_exist is null then
   insert into public.operacion_comisiones(
    operacion_id,empresa_id,tipo_comision,tipo_ganancia,concepto,modalidad_calculo,cantidad_tn,
    valor_unitario,porcentaje,subtotal,moneda_id,iva_porcentaje,iva_importe,total,estado,
    factura_estado,saldo_pendiente,saldo_pagado,observaciones,actualizado_at)
   values(
    p_operacion_id,p_empresa_intermediaria_id,'INTERMEDIARIO',
    case when p_tipo_comision='USD_TN' then 'USD_TN' else 'FIJA' end,
    'Comisión intermediario — '||p_tipo_comision,p_tipo_comision,
    case when p_tipo_comision='USD_TN' then v_qty else null end,p_valor_comision,
    case when p_tipo_comision='PORCENTAJE' then p_valor_comision else null end,
    v_sub,2,0,v_sub,v_sub,
    case when p_estado in ('ABONADA','ANULADA','DEVUELTA') then p_estado else 'PENDIENTE' end,
    'NO_CORRESPONDE',case when p_estado='ABONADA' then 0 else v_sub end,
    case when p_estado='ABONADA' then v_sub else 0 end,coalesce(p_detalle,''),now())
   returning id into v_exist;
 end if;

 return jsonb_build_object('id',v_exist,'subtotal',v_sub);
end; $$;

revoke execute on function public.guardar_comision_intermediario(uuid,jsonb) from public,anon;
grant execute on function public.guardar_comision_intermediario(uuid,jsonb) to authenticated;

revoke execute on function public.sincronizar_comision_intermediario(uuid,uuid,text,numeric,text,text,boolean,text) from public,anon;
grant execute on function public.sincronizar_comision_intermediario(uuid,uuid,text,numeric,text,text,boolean,text) to authenticated;
