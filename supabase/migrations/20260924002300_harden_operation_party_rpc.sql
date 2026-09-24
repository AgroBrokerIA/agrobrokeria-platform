create or replace function public.guardar_parte_operacion(p_operacion_id uuid,p_contacto_id uuid,p_rol text)
returns boolean
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_uid uuid:=auth.uid();
  v_contacto public.contactos_comerciales%rowtype;
begin
  if v_uid is null or not public.usuario_participa_operacion(p_operacion_id) then
    raise exception 'No autorizado';
  end if;

  if upper(trim(p_rol)) not in ('VENDEDOR','COMPRADOR') then
    raise exception 'Rol de parte inválido';
  end if;

  select * into v_contacto
  from public.contactos_comerciales
  where id=p_contacto_id and activo=true;

  if not found then
    raise exception 'El contacto no existe o está inactivo';
  end if;

  insert into public.partes_operacion(
    operacion_id,contacto_id,rol,tipo_persona,nombre_razon_social,dni,cuit,
    domicilio,localidad,provincia
  )
  values(
    p_operacion_id,p_contacto_id,upper(trim(p_rol)),v_contacto.tipo_persona,
    v_contacto.nombre_razon_social,v_contacto.dni,v_contacto.cuit,
    v_contacto.domicilio,v_contacto.localidad,v_contacto.provincia
  )
  on conflict(operacion_id,rol) do update set
    contacto_id=excluded.contacto_id,
    tipo_persona=excluded.tipo_persona,
    nombre_razon_social=excluded.nombre_razon_social,
    dni=excluded.dni,
    cuit=excluded.cuit,
    domicilio=excluded.domicilio,
    localidad=excluded.localidad,
    provincia=excluded.provincia;

  return true;
end;
$function$;

revoke all on function public.guardar_parte_operacion(uuid,uuid,text) from public;
revoke all on function public.guardar_parte_operacion(uuid,uuid,text) from anon;
grant execute on function public.guardar_parte_operacion(uuid,uuid,text) to authenticated;
