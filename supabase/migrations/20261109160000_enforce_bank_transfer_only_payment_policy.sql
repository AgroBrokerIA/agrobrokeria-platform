-- Enforce the user's payment policy at the database boundary:
-- only bank accounts may be configured and only bank transfers may be registered.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='medios_cobro_tipo_banco_only'
      and conrelid='public.medios_cobro'::regclass
  ) then
    alter table public.medios_cobro
      add constraint medios_cobro_tipo_banco_only check (tipo='BANCO');
  end if;
end
$$;

create or replace function public.crear_medio_cobro(p_datos jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public', pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_id uuid;
  v_moneda integer;
  v_cuit text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if upper(coalesce(p_datos->>'tipo','')) <> 'BANCO' then
    raise exception 'SOLO_TRANSFERENCIA_BANCARIA_HABILITADA';
  end if;
  select active_company_id into v_empresa from public.profiles where id = v_uid;
  if v_empresa is null then raise exception 'No hay empresa activa'; end if;
  if not exists (
    select 1 from public.company_users
    where company_id = v_empresa and profile_id = v_uid and activo = true
  ) then raise exception 'El usuario no pertenece a la empresa activa'; end if;
  select cuit into v_cuit from public.empresas where id = v_empresa;
  v_cuit := nullif(trim(coalesce(p_datos->>'cuit_cuil', v_cuit)), '');
  if nullif(trim(coalesce(p_datos->>'nombre','')), '') is null
     or nullif(trim(coalesce(p_datos->>'titular','')), '') is null then
    raise exception 'Completá banco y titular de la cuenta';
  end if;
  v_moneda := nullif(p_datos->>'moneda_id','')::integer;
  if v_moneda is null or not exists(select 1 from public.monedas where id = v_moneda) then
    raise exception 'Moneda inválida';
  end if;
  if nullif(trim(coalesce(p_datos->>'cbu','')), '') is null
     and nullif(trim(coalesce(p_datos->>'alias','')), '') is null then
    raise exception 'Ingresá CBU o Alias';
  end if;
  insert into public.medios_cobro(
    empresa_id, profile_id, tipo, nombre, titular, cuit_cuil, banco,
    tipo_cuenta, cbu, alias, moneda_id, datos_adicionales,
    es_predeterminado, estado
  ) values (
    v_empresa, v_uid, 'BANCO',
    trim(p_datos->>'nombre'), trim(p_datos->>'titular'),
    v_cuit, nullif(trim(p_datos->>'banco'), ''),
    nullif(trim(p_datos->>'tipo_cuenta'), ''),
    nullif(trim(p_datos->>'cbu'), ''),
    nullif(trim(p_datos->>'alias'), ''),
    v_moneda, coalesce(p_datos->'datos_adicionales', '{}'::jsonb),
    false, 'PENDIENTE'
  ) returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.registrar_pago_operacion(
  p_operacion_id uuid,p_empresa_pagadora uuid,p_empresa_cobradora uuid,
  p_importe numeric,p_moneda_id integer,p_metodo_pago text,
  p_referencia text default null,p_comprobante text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', pg_temp
as $function$
declare
  v_uid uuid:=auth.uid(); v_company_id uuid; v_empresa_activa uuid;
  v_total numeric; v_pagado numeric; v_id uuid; v_moneda integer;
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;
  if p_importe is null or p_importe<=0 then raise exception 'El importe debe ser mayor a cero'; end if;
  if p_moneda_id is null then raise exception 'La moneda es obligatoria'; end if;
  if upper(trim(coalesce(p_metodo_pago,''))) <> 'TRANSFERENCIA' then
    raise exception 'SOLO_TRANSFERENCIA_BANCARIA_HABILITADA';
  end if;
  select active_company_id into v_company_id from public.profiles where id=v_uid;
  if v_company_id is null then raise exception 'No hay una empresa activa'; end if;
  if not exists(select 1 from public.company_users where profile_id=v_uid and company_id=v_company_id and activo=true) then
    raise exception 'MEMBRESIA_EMPRESA_REQUERIDA';
  end if;
  select cem.empresa_id into v_empresa_activa from public.company_empresa_map cem
  join public.empresas e on e.id=cem.empresa_id and e.activa=true
  where cem.company_id=v_company_id order by cem.verified desc,cem.created_at asc limit 1;
  if v_empresa_activa is null and exists(select 1 from public.empresas where id=v_company_id and activa=true) then v_empresa_activa:=v_company_id; end if;
  if v_empresa_activa is null then raise exception 'EMPRESA_COMERCIAL_NO_VINCULADA'; end if;
  if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para esta operación'; end if;
  if v_empresa_activa not in (p_empresa_pagadora,p_empresa_cobradora) then raise exception 'La empresa activa no participa del pago'; end if;
  if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_pagadora and upper(rol) in ('COMPRADOR','BUYER')) then
    raise exception 'La empresa pagadora debe ser el comprador de la operación';
  end if;
  if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_cobradora and upper(rol) in ('VENDEDOR','SELLER')) then
    raise exception 'La empresa cobradora debe ser el vendedor de la operación';
  end if;
  select importe_total,moneda_id into v_total,v_moneda from public.operaciones where id=p_operacion_id for update;
  if v_total is null or v_total<=0 then raise exception 'Operación sin importe contractual válido'; end if;
  if v_moneda is null or p_moneda_id<>v_moneda then raise exception 'La moneda del pago no coincide con la moneda contractual'; end if;
  select coalesce(sum(importe),0) into v_pagado from public.pagos
  where operacion_id=p_operacion_id and moneda_id=p_moneda_id and estado not in ('RECHAZADO','CANCELADO','ANULADO');
  if v_pagado+p_importe>v_total then raise exception 'El pago acumulado supera el importe contractual'; end if;
  if nullif(trim(coalesce(p_referencia,'')),'') is not null and exists(
    select 1 from public.pagos where operacion_id=p_operacion_id and comprobante=trim(p_referencia)
  ) then
    select id into v_id from public.pagos where operacion_id=p_operacion_id and comprobante=trim(p_referencia) limit 1;
    return v_id;
  end if;
  insert into public.pagos(operacion_id,empresa_pagadora,empresa_cobradora,importe,moneda_id,metodo_pago,estado,comprobante,creado_en)
  values(p_operacion_id,p_empresa_pagadora,p_empresa_cobradora,p_importe,p_moneda_id,'TRANSFERENCIA','PENDIENTE',
    coalesce(nullif(trim(p_comprobante),''),nullif(trim(p_referencia),'')),now()) returning id into v_id;
  insert into public.auditoria(cuenta_id,tabla,registro_id,accion,descripcion,dispositivo)
  values(null,'pagos',v_id,'PAGO_OPERACION_REGISTRADO',
    'Pago informado por una parte de la operación. Pendiente de conciliación.','server');
  return v_id;
end;
$function$;
