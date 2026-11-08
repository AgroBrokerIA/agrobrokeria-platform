create or replace function public.registrar_transportista(
 p_nombre text,
 p_dni text,
 p_cuit text default null,
 p_empresa text default null,
 p_telefono text default null,
 p_dni_path text default null,
 p_foto_path text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
 v_uid uuid := auth.uid();
 v_empresa_id uuid;
 v_email text;
 v_id uuid;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if nullif(btrim(p_nombre),'') is null then raise exception 'NOMBRE_REQUERIDO'; end if;
 if nullif(regexp_replace(coalesce(p_dni,''),'[^0-9]','','g'),'') is null then raise exception 'DNI_REQUERIDO'; end if;
 if nullif(btrim(p_foto_path),'') is null then raise exception 'FOTOGRAFIA_REQUERIDA'; end if;
 if p_foto_path not like 'transportistas/'||v_uid::text||'/foto/%' then raise exception 'FOTO_PATH_INVALIDO'; end if;
 if p_dni_path is not null and p_dni_path not like 'transportistas/'||v_uid::text||'/dni/%' then raise exception 'DNI_PATH_INVALIDO'; end if;

 select p.email into v_email from public.profiles p where p.id=v_uid;
 select cem.empresa_id into v_empresa_id
 from public.profiles p
 join public.company_empresa_map cem on cem.company_id=p.active_company_id
 join public.empresas e on e.id=cem.empresa_id and e.activa=true
 where p.id=v_uid
 order by cem.verified desc, cem.created_at asc limit 1;

 insert into public.transportistas(
  profile_id,empresa_id,nombre_completo,contacto,cuit,dni,telefono,email,
  empresa_transporte,dni_documento_path,foto_perfil_path,verificacion_estado,
  verificado_por,verificado_at,activo,actualizado_at
 ) values (
  v_uid,v_empresa_id,btrim(p_nombre),btrim(p_nombre),nullif(btrim(p_cuit),''),regexp_replace(p_dni,'[^0-9]','','g'),
  nullif(btrim(p_telefono),''),v_email,nullif(btrim(p_empresa),''),p_dni_path,p_foto_path,
  'PENDIENTE',null,null,true,now()
 )
 on conflict (profile_id) do update set
  empresa_id=excluded.empresa_id,nombre_completo=excluded.nombre_completo,contacto=excluded.contacto,
  cuit=excluded.cuit,dni=excluded.dni,telefono=excluded.telefono,email=excluded.email,
  empresa_transporte=excluded.empresa_transporte,dni_documento_path=excluded.dni_documento_path,
  foto_perfil_path=excluded.foto_perfil_path,verificacion_estado='PENDIENTE',verificado_por=null,
  verificado_at=null,observaciones_verificacion=null,activo=true,actualizado_at=now()
 where public.transportistas.verificacion_estado <> 'VERIFICADO'
 returning id into v_id;

 if v_id is null then raise exception 'TRANSPORTISTA_YA_VERIFICADO_CONTACTAR_ADMINISTRACION'; end if;
 return v_id;
end;
$$;
revoke all on function public.registrar_transportista(text,text,text,text,text,text,text) from public;
grant execute on function public.registrar_transportista(text,text,text,text,text,text,text) to authenticated;
