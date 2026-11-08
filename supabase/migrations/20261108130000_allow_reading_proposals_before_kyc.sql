-- El historial de propuestas es parte del chat y puede leerse con KYC pendiente.
-- Crear, contraofertar y aceptar/rechazar propuestas sigue sujeto a KYC/SISA.
create or replace function public.listar_propuestas_publicacion(p_conversacion_id uuid)
returns table(id uuid,propuesta_anterior_id uuid,emisor_profile_id uuid,emisor_nombre text,precio_tn numeric,cantidad_tn numeric,moneda_id integer,observaciones text,estado text,operacion_id uuid,creada_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.conversaciones_publicaciones c where c.id=p_conversacion_id and auth.uid() in(c.publicador_profile_id,c.interesado_profile_id)) then
  raise exception 'CONVERSACION_NO_AUTORIZADA';
 end if;
 return query
 select p.id,p.propuesta_anterior_id,p.emisor_profile_id,coalesce(pr.nombre,pr.email,'Usuario'),
 p.precio_tn,p.cantidad_tn,p.moneda_id,p.observaciones,p.estado,p.operacion_id,p.creada_at
 from public.propuestas_publicacion p left join public.profiles pr on pr.id=p.emisor_profile_id
 where p.conversacion_id=p_conversacion_id order by p.creada_at asc;
end $$;
revoke all on function public.listar_propuestas_publicacion(uuid) from public,anon;
grant execute on function public.listar_propuestas_publicacion(uuid) to authenticated;