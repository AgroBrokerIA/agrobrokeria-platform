create unique index if not exists ux_vehiculos_patente_normalizada on public.vehiculos(upper(regexp_replace(patente,'[^A-Z0-9]','','g'))) where patente is not null;
create or replace function public.registrar_vehiculo_transportista(p_patente text,p_tipo text,p_capacidad_tn numeric default null)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_transportista_id uuid; v_id uuid; v_tipo text:=upper(trim(coalesce(p_tipo,''))); v_patente text:=upper(regexp_replace(coalesce(p_patente,''),'[^A-Z0-9]','','g'));
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if v_tipo not in ('CAMION','ACOPLADO') then raise exception 'TIPO_VEHICULO_INVALIDO'; end if;
 if length(v_patente)<6 or length(v_patente)>8 then raise exception 'PATENTE_INVALIDA'; end if;
 if p_capacidad_tn is not null and p_capacidad_tn<=0 then raise exception 'CAPACIDAD_INVALIDA'; end if;
 select id into v_transportista_id from public.transportistas where profile_id=v_uid and activo=true;
 if v_transportista_id is null then raise exception 'TRANSPORTISTA_PROFILE_REQUIRED'; end if;
 insert into public.vehiculos(transportista_id,patente,tipo,capacidad_tn,habilitado) values(v_transportista_id,v_patente,v_tipo,p_capacidad_tn,true) on conflict do nothing returning id into v_id;
 if v_id is null then
  select id into v_id from public.vehiculos where upper(regexp_replace(patente,'[^A-Z0-9]','','g'))=v_patente and transportista_id=v_transportista_id limit 1;
  if v_id is null then raise exception 'PATENTE_YA_REGISTRADA_POR_OTRO_TRANSPORTISTA'; end if;
 end if;
 return v_id;
end $$;
revoke all on function public.registrar_vehiculo_transportista(text,text,numeric) from public,anon;
grant execute on function public.registrar_vehiculo_transportista(text,text,numeric) to authenticated;