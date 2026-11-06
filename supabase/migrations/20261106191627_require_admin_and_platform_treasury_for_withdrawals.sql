-- Restrict withdrawal requests to company administrators and payout finalization to platform treasury.
CREATE OR REPLACE FUNCTION public.finalizar_retiro_comision(p_retiro_id uuid, p_nuevo_estado text, p_profile_id uuid, p_referencia text DEFAULT NULL::text, p_comprobante_url text DEFAULT NULL::text, p_observaciones text DEFAULT NULL::text, p_motivo_rechazo text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_retiro public.retiros_comisiones%rowtype;
  v_bid uuid;
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
      jsonb_build_object('referencia', p_referencia, 'comprobante_url', p_comprobante_url)
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
$function$


CREATE OR REPLACE FUNCTION public.solicitar_retiro_comision(p_empresa_id uuid, p_profile_id uuid, p_medio_cobro_id uuid, p_moneda_id integer, p_importe numeric, p_cuenta_retiro_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  if p_medio_cobro_id is not null then
    select id into v_medio
    from public.medios_cobro
    where id = p_medio_cobro_id
      and empresa_id = p_empresa_id
      and estado = 'VALIDADO'
      and (moneda_id is null or moneda_id = p_moneda_id)
    for update;

    if v_medio is null then
      raise exception 'WITHDRAWAL_METHOD_NOT_VERIFIED';
    end if;
  else
    select id into v_medio
    from public.medios_cobro
    where empresa_id = p_empresa_id
      and estado = 'VALIDADO'
      and es_predeterminado = true
      and (moneda_id is null or moneda_id = p_moneda_id)
    order by id desc
    limit 1
    for update;

    if v_medio is null then
      raise exception 'NO_VERIFIED_WITHDRAWAL_METHOD';
    end if;
  end if;

  if p_cuenta_retiro_id is not null and not exists (
    select 1
    from public.cuentas_financieras_retiro
    where id = p_cuenta_retiro_id
      and empresa_id = p_empresa_id
      and estado = 'VERIFICADA'
  ) then
    raise exception 'WITHDRAWAL_ACCOUNT_NOT_VERIFIED';
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
    empresa_id, profile_id, cuenta_retiro_id, medio_cobro_id, moneda_id, importe
  )
  values (
    p_empresa_id, p_profile_id, p_cuenta_retiro_id, v_medio, p_moneda_id, p_importe
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
      'medio_cobro_id', v_medio,
      'cuenta_retiro_id', p_cuenta_retiro_id
    )
  );

  return v_id;
end;
$function$


REVOKE EXECUTE ON FUNCTION public.solicitar_retiro_comision(uuid, uuid, uuid, integer, numeric, uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finalizar_retiro_comision(uuid, text, uuid, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solicitar_retiro_comision(uuid, uuid, uuid, integer, numeric, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalizar_retiro_comision(uuid, text, uuid, text, text, text, text)
  TO authenticated, service_role;
