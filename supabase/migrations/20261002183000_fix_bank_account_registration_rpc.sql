create or replace function public.crear_medio_cobro(p_datos jsonb)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_empresa uuid;
  v_id uuid;
  v_moneda integer;
  v_cuit text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select active_company_id into v_empresa from public.profiles where id=v_uid;
  if v_empresa is null then raise exception 'No hay empresa activa'; end if;
  if not exists(select 1 from public.company_users where company_id=v_empresa and profile_id=v_uid and activo=true) then
    raise exception 'El usuario no pertenece a la empresa activa';
  end if;
  select cuit into v_cuit from public.empresas where id=v_empresa;
  v_cuit:=nullif(trim(coalesce(p_datos->>'cuit_cuil',v_cuit)),'');
  if nullif(trim(coalesce(p_datos->>'nombre','')),'') is null
     or nullif(trim(coalesce(p_datos->>'titular','')),'') is null
     or v_cuit is null then raise exception 'Faltan datos obligatorios'; end if;
  v_moneda:=nullif(p_datos->>'moneda_id','')::integer;
  if v_moneda is null or not exists(select 1 from public.monedas where id=v_moneda) then raise exception 'Moneda inválida'; end if;
  if upper(coalesce(p_datos->>'tipo',''))='BANCO'
     and nullif(trim(coalesce(p_datos->>'cbu','')),'') is null
     and nullif(trim(coalesce(p_datos->>'alias','')),'') is null then raise exception 'Ingresá CBU o Alias'; end if;
  insert into public.medios_cobro(
    empresa_id,profile_id,tipo,nombre,titular,cuit_cuil,banco,tipo_cuenta,cbu,alias,
    moneda_id,datos_adicionales,es_predeterminado,estado
  ) values(
    v_empresa,v_uid,p_datos->>'tipo',trim(p_datos->>'nombre'),trim(p_datos->>'titular'),
    v_cuit,nullif(trim(p_datos->>'banco'),''),nullif(trim(p_datos->>'tipo_cuenta'),''),
    nullif(trim(p_datos->>'cbu'),''),nullif(trim(p_datos->>'alias'),''),
    v_moneda,coalesce(p_datos->'datos_adicionales','{}'::jsonb),false,'PENDIENTE'
  ) returning id into v_id;
  return v_id;
end;
$$;
