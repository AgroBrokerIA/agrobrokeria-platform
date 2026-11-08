create or replace function public.listar_transportistas_asignados_operacion(p_operacion_id uuid)
returns table(profile_id uuid,cuit text,nombre_completo text,verificacion_estado text)
language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
begin
 if auth.uid() is null or not public.usuario_puede_ver_logistica_operacion(p_operacion_id) then raise exception 'FORBIDDEN'; end if;
 return query
 select distinct t.profile_id,t.cuit,t.nombre_completo,t.verificacion_estado
 from public.viajes v join public.transportistas t on t.profile_id=v.transportista_profile_id
 where v.operacion_id=p_operacion_id and v.transportista_profile_id is not null;
end $$;
revoke all on function public.listar_transportistas_asignados_operacion(uuid) from public,anon;
grant execute on function public.listar_transportistas_asignados_operacion(uuid) to authenticated;
notify pgrst,'reload schema';