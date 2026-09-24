create or replace function public.registrar_pago_comision(
  p_comision_id uuid,p_importe numeric,p_medio_pago text,p_referencia_pago text default null
) returns boolean
language plpgsql security definer set search_path=public
as $function$
declare
  v_comision public.operacion_comisiones%rowtype;
  v_empresa_activa uuid;
  v_admin boolean;
  v_nuevo_saldo numeric;
  v_nuevo_estado text;
begin
  if auth.uid() is null then raise exception 'Usuario no autenticado'; end if;
  if p_importe is null or p_importe<=0 then raise exception 'El importe debe ser mayor a cero'; end if;
  if nullif(trim(coalesce(p_medio_pago,'')),'') is null then raise exception 'El medio de pago es obligatorio'; end if;

  select * into v_comision from public.operacion_comisiones where id=p_comision_id for update;
  if not found then raise exception 'Comisión inexistente'; end if;
  if v_comision.empresa_id is null then raise exception 'La comisión no tiene empresa receptora'; end if;

  select active_company_id into v_empresa_activa from public.profiles where id=auth.uid();
  if v_empresa_activa is null or v_empresa_activa<>v_comision.empresa_id then
    raise exception 'La comisión no pertenece a la empresa activa';
  end if;

  select exists(
    select 1 from public.company_users
    where profile_id=auth.uid() and company_id=v_comision.empresa_id
      and activo=true and lower(rol::text)='administrador'
  ) into v_admin;
  if not v_admin then raise exception 'Se requiere rol administrador para registrar pagos'; end if;

  if p_importe>coalesce(v_comision.saldo_pendiente,0) then
    raise exception 'El pago supera el saldo pendiente';
  end if;

  v_nuevo_saldo:=greatest(coalesce(v_comision.saldo_pendiente,0)-p_importe,0);
  v_nuevo_estado:=case when v_nuevo_saldo=0 then 'ABONADA' else 'A_PAGAR' end;

  update public.operacion_comisiones
  set saldo_pagado=coalesce(saldo_pagado,0)+p_importe,
      saldo_pendiente=v_nuevo_saldo,estado=v_nuevo_estado,
      medio_pago=trim(p_medio_pago),fecha_pago=now(),
      referencia_pago=nullif(trim(coalesce(p_referencia_pago,'')),''),
      actualizado_at=now()
  where id=p_comision_id;

  insert into public.operacion_movimientos_economicos(
    operacion_id,comision_id,empresa_id,profile_id,tipo_movimiento,
    concepto,moneda_id,importe,signo,estado,referencia,
    fecha_movimiento,creado_at,actualizado_at
  ) values (
    v_comision.operacion_id,p_comision_id,v_comision.empresa_id,auth.uid(),
    'PAGO_COMISION','Pago de comisión — '||coalesce(v_comision.concepto,'Comisión'),
    v_comision.moneda_id,p_importe,-1,v_nuevo_estado,
    nullif(trim(coalesce(p_referencia_pago,'')),''),now(),now(),now()
  );
  return true;
end;
$function$;

revoke all on function public.registrar_pago_comision(uuid,numeric,text,text) from public;
revoke all on function public.registrar_pago_comision(uuid,numeric,text,text) from anon;
grant execute on function public.registrar_pago_comision(uuid,numeric,text,text) to authenticated;
