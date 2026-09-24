-- Complete the withdrawal state machine used by the admin UI:
-- SOLICITADO -> EN_REVISION -> APROBADO -> PAGADO
-- SOLICITADO/EN_REVISION -> RECHAZADO
create or replace function public.finalizar_retiro_comision(
  p_retiro_id uuid,p_nuevo_estado text,p_profile_id uuid,
  p_referencia text default null,p_comprobante_url text default null,
  p_observaciones text default null,p_motivo_rechazo text default null
) returns boolean
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_retiro public.retiros_comisiones%rowtype;
  v_es_admin boolean;
  v_restante numeric;
  v_detalle record;
  v_liberar numeric;
begin
  if auth.uid() is null or auth.uid()<>p_profile_id then raise exception 'Usuario no autorizado'; end if;
  select * into v_retiro from public.retiros_comisiones where id=p_retiro_id for update;
  if not found then raise exception 'No existe el retiro solicitado'; end if;

  select exists(
    select 1 from public.company_users cu
    where cu.profile_id=auth.uid() and cu.company_id=v_retiro.empresa_id
      and cu.activo=true and lower(cu.rol::text) in ('administrador','admin')
  ) into v_es_admin;
  if not v_es_admin then raise exception 'Se requiere rol administrador de la empresa del retiro'; end if;

  if p_nuevo_estado not in ('EN_REVISION','APROBADO','PAGADO','RECHAZADO') then raise exception 'Estado no permitido: %',p_nuevo_estado; end if;

  if p_nuevo_estado='EN_REVISION' then
    if v_retiro.estado<>'SOLICITADO' then raise exception 'Transición inválida: % -> EN_REVISION',v_retiro.estado; end if;
    update public.retiros_comisiones set estado='EN_REVISION',observaciones=coalesce(p_observaciones,observaciones),actualizado_at=now() where id=p_retiro_id;
    return true;
  end if;

  if p_nuevo_estado='APROBADO' then
    if v_retiro.estado<>'EN_REVISION' then raise exception 'Transición inválida: % -> APROBADO',v_retiro.estado; end if;
    update public.retiros_comisiones set estado='APROBADO',referencia=coalesce(p_referencia,referencia),comprobante_url=coalesce(p_comprobante_url,comprobante_url),observaciones=coalesce(p_observaciones,observaciones),fecha_aprobacion=now(),aprobado_por=p_profile_id,actualizado_at=now() where id=p_retiro_id;
    return true;
  end if;

  if p_nuevo_estado='PAGADO' then
    if v_retiro.estado<>'APROBADO' then raise exception 'Transición inválida: % -> PAGADO',v_retiro.estado; end if;
    v_restante:=v_retiro.importe;
    for v_detalle in
      select d.id detalle_id,d.comision_id,greatest(d.importe_reservado-d.importe_pagado,0) pendiente,coalesce(oc.saldo_reservado,0) saldo_reservado
      from public.retiros_comisiones_detalle d join public.operacion_comisiones oc on oc.id=d.comision_id
      where d.retiro_id=p_retiro_id and d.importe_pagado<d.importe_reservado
      order by d.id for update of d,oc
    loop
      exit when v_restante<=0;
      v_liberar:=least(v_detalle.pendiente,v_restante);
      if v_detalle.saldo_reservado<v_liberar then raise exception 'Saldo reservado inconsistente para la comisión %',v_detalle.comision_id; end if;
      update public.operacion_comisiones set saldo_reservado=saldo_reservado-v_liberar,saldo_pagado=greatest(saldo_pagado-v_liberar,0),actualizado_at=now() where id=v_detalle.comision_id;
      update public.retiros_comisiones_detalle set importe_pagado=importe_pagado+v_liberar where id=v_detalle.detalle_id;
      v_restante:=v_restante-v_liberar;
    end loop;
    if v_restante>0 then raise exception 'No existe suficiente saldo reservado para completar el pago de este retiro'; end if;
    update public.retiros_comisiones set estado='PAGADO',referencia=coalesce(p_referencia,referencia),comprobante_url=coalesce(p_comprobante_url,comprobante_url),observaciones=coalesce(p_observaciones,observaciones),fecha_pago=now(),pagado_por=p_profile_id,actualizado_at=now() where id=p_retiro_id;
    update public.operacion_movimientos_economicos set estado='CONFIRMADO',referencia=coalesce(p_referencia,referencia),actualizado_at=now() where tipo_movimiento='RETIRO_COMISION' and referencia=p_retiro_id::text;
    return true;
  end if;

  if v_retiro.estado not in ('SOLICITADO','EN_REVISION') then raise exception 'Transición inválida: % -> RECHAZADO',v_retiro.estado; end if;
  if nullif(trim(p_motivo_rechazo),'') is null then raise exception 'El motivo de rechazo es obligatorio'; end if;
  for v_detalle in
    select d.id detalle_id,d.comision_id,greatest(d.importe_reservado-d.importe_pagado,0) pendiente,coalesce(oc.saldo_reservado,0) saldo_reservado
    from public.retiros_comisiones_detalle d join public.operacion_comisiones oc on oc.id=d.comision_id
    where d.retiro_id=p_retiro_id and d.importe_pagado<d.importe_reservado
    order by d.id for update of d,oc
  loop
    v_liberar:=v_detalle.pendiente;
    if v_detalle.saldo_reservado<v_liberar then raise exception 'Saldo reservado inconsistente para la comisión %',v_detalle.comision_id; end if;
    update public.operacion_comisiones set saldo_reservado=saldo_reservado-v_liberar,actualizado_at=now() where id=v_detalle.comision_id;
    update public.retiros_comisiones_detalle set importe_pagado=importe_reservado where id=v_detalle.detalle_id;
  end loop;
  update public.retiros_comisiones set estado='RECHAZADO',motivo_rechazo=p_motivo_rechazo,observaciones=coalesce(p_observaciones,observaciones),fecha_rechazo=now(),actualizado_at=now() where id=p_retiro_id;
  update public.operacion_movimientos_economicos set estado='ANULADO',actualizado_at=now() where tipo_movimiento='RETIRO_COMISION' and referencia=p_retiro_id::text;
  return true;
end;
$function$;
