-- Commission withdrawals must use the company's existing, validated bank payment method.
-- Do not create a parallel bank-account registry: the application already manages
-- bank details and verification in public.medios_cobro.
create or replace function public.solicitar_retiro_comision(
  p_empresa_id uuid,
  p_profile_id uuid,
  p_medio_cobro_id uuid,
  p_moneda_id integer,
  p_importe numeric,
  p_cuenta_retiro_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_disponible numeric;
  v_bid uuid;
  v_medio uuid;
begin
  if v_uid is null or v_uid <> p_profile_id then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.company_users
    where company_id = p_empresa_id
      and profile_id = v_uid
      and activo = true
      and rol = 'administrador'::public.user_role
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if p_importe is null or p_importe <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  -- p_cuenta_retiro_id remains in the RPC signature for backward compatibility.
  -- The canonical account is the already-validated medio_cobro row.
  if p_cuenta_retiro_id is not null then
    raise exception 'USE_VALIDATED_BANK_PAYMENT_METHOD';
  end if;

  if p_medio_cobro_id is null then
    raise exception 'VALIDATED_BANK_PAYMENT_METHOD_REQUIRED';
  end if;

  select id
    into v_medio
  from public.medios_cobro
  where id = p_medio_cobro_id
    and empresa_id = p_empresa_id
    and tipo = 'BANCO'
    and estado = 'VALIDADO'
    and (moneda_id is null or moneda_id = p_moneda_id)
  for update;

  if not found then
    raise exception 'WITHDRAWAL_METHOD_NOT_VERIFIED_BANK';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('agrobrokeria:wallet_withdrawal:' || p_empresa_id::text || ':' || p_moneda_id::text)
  );

  insert into public.billeteras_comisiones(empresa_id, moneda_id)
  values (p_empresa_id, p_moneda_id)
  on conflict (empresa_id, moneda_id) do nothing;

  select id, saldo_disponible
    into v_bid, v_disponible
  from public.billeteras_comisiones
  where empresa_id = p_empresa_id
    and moneda_id = p_moneda_id
  for update;

  if p_importe > coalesce(v_disponible, 0) then
    raise exception 'INSUFFICIENT_AVAILABLE_BALANCE';
  end if;

  insert into public.retiros_comisiones(
    empresa_id, profile_id, medio_cobro_id, moneda_id, importe
  )
  values (
    p_empresa_id, p_profile_id, v_medio, p_moneda_id, p_importe
  )
  returning id into v_id;

  update public.billeteras_comisiones
  set saldo_disponible = saldo_disponible - p_importe,
      saldo_en_retiro = saldo_en_retiro + p_importe,
      updated_at = now()
  where id = v_bid;

  insert into public.billeteras_comisiones_movimientos(
    billetera_id, empresa_id, profile_id, tipo, importe, moneda_id,
    signo, estado, referencia_interna
  )
  values (
    v_bid, p_empresa_id, p_profile_id, 'RETIRO_SOLICITADO',
    p_importe, p_moneda_id, -1, 'PENDIENTE', v_id::text
  );

  insert into public.finanzas_auditoria(
    empresa_id, profile_id, entidad, entidad_id, accion, datos
  )
  values (
    p_empresa_id, p_profile_id, 'RETIRO_COMISION', v_id, 'SOLICITADO',
    jsonb_build_object(
      'importe', p_importe,
      'medio_cobro_id', v_medio
    )
  );

  return v_id;
end;
$function$;

create or replace function public.finalizar_retiro_comision(
  p_retiro_id uuid,
  p_nuevo_estado text,
  p_profile_id uuid,
  p_referencia text default null,
  p_comprobante_url text default null,
  p_observaciones text default null,
  p_motivo_rechazo text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_retiro public.retiros_comisiones%rowtype;
  v_bid uuid;
  v_medio uuid;
begin
  if auth.uid() is null
     or auth.uid() <> p_profile_id
     or not exists (
       select 1 from public.platform_admins
       where user_id = auth.uid()
     ) then
    raise exception 'PLATFORM_ADMIN_REQUIRED';
  end if;

  select *
    into v_retiro
  from public.retiros_comisiones
  where id = p_retiro_id
  for update;

  if not found then
    raise exception 'No existe el retiro solicitado';
  end if;

  if p_nuevo_estado not in ('EN_REVISION','APROBADO','PAGADO','RECHAZADO') then
    raise exception 'Estado no permitido: %', p_nuevo_estado;
  end if;

  if p_nuevo_estado = 'EN_REVISION' then
    if v_retiro.estado <> 'SOLICITADO' then
      raise exception 'Transición inválida: % -> EN_REVISION', v_retiro.estado;
    end if;
    update public.retiros_comisiones
    set estado = 'EN_REVISION',
        observaciones = coalesce(p_observaciones, observaciones),
        actualizado_at = now()
    where id = p_retiro_id;
    return true;
  end if;

  if p_nuevo_estado = 'APROBADO' then
    if v_retiro.estado <> 'EN_REVISION' then
      raise exception 'Transición inválida: % -> APROBADO', v_retiro.estado;
    end if;
    update public.retiros_comisiones
    set estado = 'APROBADO',
        referencia = coalesce(p_referencia, referencia),
        comprobante_url = coalesce(p_comprobante_url, comprobante_url),
        observaciones = coalesce(p_observaciones, observaciones),
        fecha_aprobacion = now(),
        aprobado_por = p_profile_id,
        actualizado_at = now()
    where id = p_retiro_id;
    return true;
  end if;

  if p_nuevo_estado = 'PAGADO' then
    if v_retiro.estado <> 'APROBADO' then
      raise exception 'Transición inválida: % -> PAGADO', v_retiro.estado;
    end if;

    select id into v_medio
    from public.medios_cobro
    where id = v_retiro.medio_cobro_id
      and empresa_id = v_retiro.empresa_id
      and tipo = 'BANCO'
      and estado = 'VALIDADO'
      and (moneda_id is null or moneda_id = v_retiro.moneda_id)
    for update;

    if not found then
      raise exception 'WITHDRAWAL_BANK_METHOD_NO_LONGER_VERIFIED';
    end if;

    select id into v_bid
    from public.billeteras_comisiones
    where empresa_id = v_retiro.empresa_id
      and moneda_id = v_retiro.moneda_id
    for update;

    if v_bid is null then
      raise exception 'No existe billetera para el retiro';
    end if;

    update public.billeteras_comisiones
    set saldo_en_retiro = greatest(saldo_en_retiro - v_retiro.importe, 0),
        saldo_retirado = saldo_retirado + v_retiro.importe,
        updated_at = now()
    where id = v_bid;

    insert into public.billeteras_comisiones_movimientos(
      billetera_id, empresa_id, profile_id, tipo, importe, moneda_id,
      signo, estado, referencia_interna, metadata
    )
    values (
      v_bid, v_retiro.empresa_id, p_profile_id, 'RETIRO_PAGADO',
      v_retiro.importe, v_retiro.moneda_id, -1, 'CONFIRMADO',
      p_retiro_id::text,
      jsonb_build_object(
        'referencia', p_referencia,
        'comprobante_url', p_comprobante_url,
        'medio_cobro_id', v_retiro.medio_cobro_id
      )
    );

    update public.retiros_comisiones
    set estado = 'PAGADO',
        referencia = coalesce(p_referencia, referencia),
        comprobante_url = coalesce(p_comprobante_url, comprobante_url),
        observaciones = coalesce(p_observaciones, observaciones),
        fecha_pago = now(),
        pagado_por = p_profile_id,
        actualizado_at = now()
    where id = p_retiro_id;

    update public.operacion_movimientos_economicos
    set estado = 'CONFIRMADO',
        referencia = coalesce(p_referencia, referencia),
        actualizado_at = now()
    where tipo_movimiento = 'RETIRO_COMISION'
      and referencia = p_retiro_id::text;

    return true;
  end if;

  if v_retiro.estado not in ('SOLICITADO','EN_REVISION') then
    raise exception 'Transición inválida: % -> RECHAZADO', v_retiro.estado;
  end if;

  if nullif(trim(p_motivo_rechazo), '') is null then
    raise exception 'El motivo de rechazo es obligatorio';
  end if;

  select id into v_bid
  from public.billeteras_comisiones
  where empresa_id = v_retiro.empresa_id
    and moneda_id = v_retiro.moneda_id
  for update;

  if v_bid is null then
    raise exception 'No existe billetera para el retiro';
  end if;

  update public.billeteras_comisiones
  set saldo_disponible = saldo_disponible + v_retiro.importe,
      saldo_en_retiro = greatest(saldo_en_retiro - v_retiro.importe, 0),
      updated_at = now()
  where id = v_bid;

  insert into public.billeteras_comisiones_movimientos(
    billetera_id, empresa_id, profile_id, tipo, importe, moneda_id,
    signo, estado, referencia_interna, metadata
  )
  values (
    v_bid, v_retiro.empresa_id, p_profile_id, 'RETIRO_RECHAZADO',
    v_retiro.importe, v_retiro.moneda_id, 1, 'CONFIRMADO',
    p_retiro_id::text, jsonb_build_object('motivo', p_motivo_rechazo)
  );

  update public.retiros_comisiones
  set estado = 'RECHAZADO',
      motivo_rechazo = p_motivo_rechazo,
      observaciones = coalesce(p_observaciones, observaciones),
      fecha_rechazo = now(),
      actualizado_at = now()
  where id = p_retiro_id;

  update public.operacion_movimientos_economicos
  set estado = 'ANULADO',
      actualizado_at = now()
  where tipo_movimiento = 'RETIRO_COMISION'
    and referencia = p_retiro_id::text;

  return true;
end;
$function$;

revoke all on function public.solicitar_retiro_comision(uuid,uuid,uuid,integer,numeric,uuid) from public;
grant execute on function public.solicitar_retiro_comision(uuid,uuid,uuid,integer,numeric,uuid) to authenticated, service_role;
revoke all on function public.finalizar_retiro_comision(uuid,text,uuid,text,text,text,text) from public;
grant execute on function public.finalizar_retiro_comision(uuid,text,uuid,text,text,text,text) to authenticated, service_role;
