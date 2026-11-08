create or replace function public.listar_mis_vehiculos_transportista()
returns table(id uuid,patente text,tipo text,capacidad_tn numeric,habilitado boolean)
language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare v_transportista_id uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select t.id into v_transportista_id from public.transportistas t where t.profile_id=auth.uid() and t.activo=true;
 if v_transportista_id is null then raise exception 'TRANSPORTISTA_PROFILE_REQUIRED'; end if;
 return query select v.id,v.patente::text,v.tipo::text,v.capacidad_tn,v.habilitado from public.vehiculos v where v.transportista_id=v_transportista_id order by v.tipo,v.patente;
end $$;
revoke all on function public.listar_mis_vehiculos_transportista() from public,anon;
grant execute on function public.listar_mis_vehiculos_transportista() to authenticated;
notify pgrst,'reload schema';