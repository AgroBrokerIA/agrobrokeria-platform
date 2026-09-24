-- Tie every commission balance reservation to the exact withdrawal.
-- This prevents one withdrawal from consuming another withdrawal's reservation.
create table if not exists public.retiros_comisiones_detalle (
  id uuid primary key default gen_random_uuid(),
  retiro_id uuid not null references public.retiros_comisiones(id) on delete cascade,
  comision_id uuid not null references public.operacion_comisiones(id) on delete restrict,
  importe_reservado numeric not null check (importe_reservado > 0),
  importe_pagado numeric not null default 0 check (importe_pagado >= 0 and importe_pagado <= importe_reservado),
  creado_at timestamptz not null default now(),
  unique (retiro_id, comision_id)
);

create index if not exists idx_retiros_comisiones_detalle_retiro_id
  on public.retiros_comisiones_detalle(retiro_id);
create index if not exists idx_retiros_comisiones_detalle_comision_id
  on public.retiros_comisiones_detalle(comision_id);

revoke all on public.retiros_comisiones_detalle from public;
revoke all on public.retiros_comisiones_detalle from anon;
revoke all on public.retiros_comisiones_detalle from authenticated;

create or replace function public.solicitar_retiro_comision(
  p_empresa_id uuid,
  p_profile_id uuid,
  p_medio_cobro_id uuid,
  p_moneda_id integer,
  p_importe numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_retiro_id uuid;
  v_disponible numeric;
  v_empresa_medio uuid;
  v_empresa_activa uuid;
begin
  if auth.uid() is null or auth.uid() <> p_profile_id then
    raise exception 'Usuario no autorizado';
  end if;
  select active_company_id into v_empresa_activa from public.profiles where id=auth.uid();
  if v_empresa_activa is null or v_empresa_activa <> p_empresa_id then
    raise exception 'La empresa indicada no es la empresa activa del usuario';
  end if;
  if not exists (select 1 from public.company_users where profile_id=auth.uid() and company_id=p_empresa_id and activo=true) then
    raise exception 'El usuario no pertenece a la empresa activa';
  end if;
  if p_importe is null or p_importe <= 0 then
    raise exception 'El importe del retiro debe ser mayor a cero';
  end if;

  perform pg_advisory_xact_lock(hashtext('agrobrokeria:retiro:'||p_empresa_id::text||':'||p_moneda_id::text));

  select id into v_empresa_medio
  from public.medios_cobro
  where id=p_medio_cobro_id and empresa_id=p_empresa_id and estado='VALIDADO'
    and (moneda_id is null or moneda_id=p_moneda_id)
  for update;
  if v_empresa_medio is null then
    raise exception 'El medio de cobro no está validado o no pertenece a la empresa';
  end if;

  select coalesce(sum(greatest(coalesce(saldo_pagado,0)-coalesce(saldo_reservado,0),0)),0)
  into v_disponible
  from public.operacion_comisiones
  where empresa_id=p_empresa_id and moneda_id=p_moneda_id and estado='ABONADA';
  if p_importe > v_disponible then
    raise exception 'Saldo insuficiente. Disponible: %', v_disponible;
  end if;

  insert into public.retiros_comisiones (
    empresa_id,profile_id,medio_cobro_id,moneda_id,importe,
    estado,fecha_solicitud,creado_at,actualizado_at
  ) values (
    p_empresa_id,p_profile_id,p_medio_cobro_id,p_moneda_id,p_importe,
    'SOLICITADO',now(),now(),now()
  ) returning id into v_retiro_id;

  with comisiones as (
    select id,creado_at,
      greatest(coalesce(saldo_pagado,0)-coalesce(saldo_reservado,0),0) as disponible
    from public.operacion_comisiones
    where empresa_id=p_empresa_id and moneda_id=p_moneda_id and estado='ABONADA'
      and (coalesce(saldo_pagado,0)-coalesce(saldo_reservado,0))>0
    order by creado_at,id
    for update
  ),
  reservas as (
    select id,disponible,
      least(disponible,greatest(
        p_importe-coalesce(sum(disponible) over (
          order by creado_at,id rows between unbounded preceding and 1 preceding
        ),0),0
      )) as importe_reserva
    from comisiones
  ),
  aplicadas as (
    select id,importe_reserva from reservas where importe_reserva>0
  ),
  actualizadas as (
    update public.operacion_comisiones oc
    set saldo_reservado=coalesce(oc.saldo_reservado,0)+aplicadas.importe_reserva,
        actualizado_at=now()
    from aplicadas
    where oc.id=aplicadas.id
    returning oc.id
  )
  insert into public.retiros_comisiones_detalle (retiro_id,comision_id,importe_reservado)
  select v_retiro_id,aplicadas.id,aplicadas.importe_reserva
  from aplicadas join actualizadas on actualizadas.id=aplicadas.id;

  insert into public.operacion_movimientos_economicos (
    operacion_id,comision_id,empresa_id,profile_id,tipo_movimiento,
    concepto,moneda_id,importe,signo,estado,referencia,
    fecha_movimiento,creado_at,actualizado_at
  ) values (
    null,null,p_empresa_id,p_profile_id,'RETIRO_COMISION',
    'Solicitud de retiro de comisión',p_moneda_id,p_importe,-1,'PENDIENTE',
    v_retiro_id::text,now(),now()
  );

  return v_retiro_id;
end;
$function$;

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
      and cu.activo=true and lower(cu.rol::text)='administrador'
  ) into v_es_admin;
  if not v_es_admin then raise exception 'Se requiere rol administrador de la empresa del retiro'; end if;

  if p_nuevo_estado not in ('APROBADO','PAGADO','RECHAZADO') then
    raise exception 'Estado no permitido: %',p_nuevo_estado;
  end if;

  if p_nuevo_estado='APROBADO' then
    if v_retiro.estado<>'EN_REVISION' then raise exception 'Transición inválida: % -> APROBADO',v_retiro.estado; end if;
    update public.retiros_comisiones
    set estado='APROBADO',referencia=coalesce(p_referencia,referencia),
        comprobante_url=coalesce(p_comprobante_url,comprobante_url),
        observaciones=coalesce(p_observaciones,observaciones),
        fecha_aprobacion=now(),aprobado_por=p_profile_id,actualizado_at=now()
    where id=p_retiro_id;
    return true;
  end if;

  if p_nuevo_estado='PAGADO' then
    if v_retiro.estado<>'APROBADO' then raise exception 'Transición inválida: % -> PAGADO',v_retiro.estado; end if;
    v_restante:=v_retiro.importe;

    for v_detalle in
      select d.id detalle_id,d.comision_id,
             greatest(d.importe_reservado-d.importe_pagado,0) pendiente,
             coalesce(oc.saldo_reservado,0) saldo_reservado
      from public.retiros_comisiones_detalle d
      join public.operacion_comisiones oc on oc.id=d.comision_id
      where d.retiro_id=p_retiro_id and d.importe_pagado<d.importe_reservado
      order by d.id
      for update of d,oc
    loop
      exit when v_restante<=0;
      v_liberar:=least(v_detalle.pendiente,v_restante);
      if v_detalle.saldo_reservado<v_liberar then
        raise exception 'Saldo reservado inconsistente para la comisión %',v_detalle.comision_id;
      end if;

      update public.operacion_comisiones
      set saldo_reservado=saldo_reservado-v_liberar,
          saldo_pagado=greatest(saldo_pagado-v_liberar,0),
          actualizado_at=now()
      where id=v_detalle.comision_id;

      update public.retiros_comisiones_detalle
      set importe_pagado=importe_pagado+v_liberar
      where id=v_detalle.detalle_id;

      v_restante:=v_restante-v_liberar;
    end loop;

    if v_restante>0 then raise exception 'No existe suficiente saldo reservado para completar el pago de este retiro'; end if;

    update public.retiros_comisiones
    set estado='PAGADO',referencia=coalesce(p_referencia,referencia),
        comprobante_url=coalesce(p_comprobante_url,comprobante_url),
        observaciones=coalesce(p_observaciones,observaciones),
        fecha_pago=now(),pagado_por=p_profile_id,actualizado_at=now()
    where id=p_retiro_id;

    update public.operacion_movimientos_economicos
    set estado='CONFIRMADO',referencia=coalesce(p_referencia,referencia),actualizado_at=now()
    where tipo_movimiento='RETIRO_COMISION' and referencia=p_retiro_id::text;
    return true;
  end if;

  if v_retiro.estado not in ('SOLICITADO','EN_REVISION') then
    raise exception 'Transición inválida: % -> RECHAZADO',v_retiro.estado;
  end if;
  if nullif(trim(p_motivo_rechazo),'') is null then raise exception 'El motivo de rechazo es obligatorio'; end if;

  for v_detalle in
    select d.id detalle_id,d.comision_id,
           greatest(d.importe_reservado-d.importe_pagado,0) pendiente,
           coalesce(oc.saldo_reservado,0) saldo_reservado
    from public.retiros_comisiones_detalle d
    join public.operacion_comisiones oc on oc.id=d.comision_id
    where d.retiro_id=p_retiro_id and d.importe_pagado<d.importe_reservado
    order by d.id
    for update of d,oc
  loop
    v_liberar:=v_detalle.pendiente;
    if v_detalle.saldo_reservado<v_liberar then
      raise exception 'Saldo reservado inconsistente para la comisión %',v_detalle.comision_id;
    end if;

    update public.operacion_comisiones
    set saldo_reservado=saldo_reservado-v_liberar,actualizado_at=now()
    where id=v_detalle.comision_id;

    update public.retiros_comisiones_detalle
    set importe_pagado=importe_reservado
    where id=v_detalle.detalle_id;
  end loop;

  update public.retiros_comisiones
  set estado='RECHAZADO',motivo_rechazo=p_motivo_rechazo,
      observaciones=coalesce(p_observaciones,observaciones),
      fecha_rechazo=now(),actualizado_at=now()
  where id=p_retiro_id;

  update public.operacion_movimientos_economicos
  set estado='ANULADO',actualizado_at=now()
  where tipo_movimiento='RETIRO_COMISION' and referencia=p_retiro_id::text;
  return true;
end;
$function$;
