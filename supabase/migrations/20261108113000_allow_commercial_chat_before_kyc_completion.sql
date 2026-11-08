-- El chat no queda bloqueado por KYC/SISA. Publicar, negociar y formalizar operaciones siguen sujetos a sus controles.
create or replace function public.listar_conversaciones_publicaciones()
returns table(conversacion_id uuid,publicacion_id uuid,tipo_publicacion text,producto text,cantidad_tn numeric,publicador_profile_id uuid,interesado_profile_id uuid,otro_usuario_nombre text,ultimo_mensaje text,ultimo_mensaje_at timestamptz,no_leidos bigint)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 return query
 select c.id,p.id,upper(coalesce(p.tipo,'')::text),coalesce(pr.nombre,'Producto')::text,p.cantidad_tn,c.publicador_profile_id,c.interesado_profile_id,
 coalesce(other_profile.nombre::text,other_profile.email::text,'Usuario AgroBrokerIA'),coalesce(last_msg.mensaje::text,'Conversación iniciada'),
 coalesce(last_msg.creado_at,c.actualizado_at),
 (select count(*) from public.mensajes_publicaciones unread where unread.conversacion_id=c.id and unread.remitente_profile_id<>v_uid and unread.leido_at is null)
 from public.conversaciones_publicaciones c join public.publicaciones p on p.id=c.publicacion_id
 left join public.productos pr on pr.id=p.producto_id
 left join public.profiles other_profile on other_profile.id=case when c.publicador_profile_id=v_uid then c.interesado_profile_id else c.publicador_profile_id end
 left join lateral(select m.mensaje,m.creado_at from public.mensajes_publicaciones m where m.conversacion_id=c.id order by m.creado_at desc limit 1) last_msg on true
 where v_uid in(c.publicador_profile_id,c.interesado_profile_id) order by coalesce(last_msg.creado_at,c.actualizado_at) desc;
end $$;
create or replace function public.iniciar_conversacion_publicacion(p_publicacion_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_publicador uuid;v_estado text;v_conversacion uuid;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select c.id into v_conversacion from public.conversaciones_publicaciones c where c.publicacion_id=p_publicacion_id and v_uid in(c.publicador_profile_id,c.interesado_profile_id) order by c.actualizado_at desc limit 1;
 if v_conversacion is not null then return v_conversacion; end if;
 select coalesce(p.publicador_profile_id,pr.id),p.estado into v_publicador,v_estado from public.publicaciones p
 left join public.empresas e on e.id=p.empresa_id left join public.cuentas c on c.id=e.cuenta_id left join public.profiles pr on lower(pr.email)=lower(c.email)
 where p.id=p_publicacion_id and (p.empresa_id is null or coalesce(e.activa,true)=true) and coalesce(c.estado,'') not in('BLOQUEADA','ELIMINADA');
 if v_publicador is null or upper(coalesce(v_estado,''))<>'PUBLICADA' then raise exception 'PUBLICACION_NO_DISPONIBLE'; end if;
 if v_publicador=v_uid then raise exception 'NO_HAY_CONVERSACION_PENDIENTE'; end if;
 insert into public.conversaciones_publicaciones(publicacion_id,publicador_profile_id,interesado_profile_id) values(p_publicacion_id,v_publicador,v_uid)
 on conflict(publicacion_id,interesado_profile_id) do update set actualizado_at=now() returning id into v_conversacion;
 return v_conversacion;
end $$;
create or replace function public.enviar_mensaje_publicacion(p_conversacion_id uuid,p_mensaje text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_id uuid;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if length(trim(coalesce(p_mensaje,'')))=0 or length(p_mensaje)>10000 then raise exception 'MENSAJE_INVALIDO'; end if;
 if public.texto_indica_operatoria_no_declarada(p_mensaje) then raise exception 'CONTENIDO_NO_PERMITIDO: la Plataforma solo admite operatorias reales, declaradas y documentadas.'; end if;
 if not exists(select 1 from public.conversaciones_publicaciones c where c.id=p_conversacion_id and v_uid in(c.publicador_profile_id,c.interesado_profile_id)) then raise exception 'CONVERSACION_NO_AUTORIZADA'; end if;
 insert into public.mensajes_publicaciones(conversacion_id,remitente_profile_id,mensaje) values(p_conversacion_id,v_uid,trim(p_mensaje)) returning id into v_id;
 update public.conversaciones_publicaciones set actualizado_at=now() where id=p_conversacion_id; return v_id;
end $$;
create or replace function public.marcar_mensajes_publicacion_leidos(p_conversacion_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_count integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.conversaciones_publicaciones c where c.id=p_conversacion_id and v_uid in(c.publicador_profile_id,c.interesado_profile_id)) then raise exception 'CONVERSACION_NO_AUTORIZADA'; end if;
 update public.mensajes_publicaciones set leido_at=now() where conversacion_id=p_conversacion_id and remitente_profile_id<>v_uid and leido_at is null;
 get diagnostics v_count=row_count; return v_count;
end $$;
drop policy if exists conversaciones_publicaciones_participantes_select on public.conversaciones_publicaciones;
create policy conversaciones_publicaciones_participantes_select on public.conversaciones_publicaciones for select to authenticated using(auth.uid()=publicador_profile_id or auth.uid()=interesado_profile_id);
drop policy if exists mensajes_publicaciones_participantes_select on public.mensajes_publicaciones;
create policy mensajes_publicaciones_participantes_select on public.mensajes_publicaciones for select to authenticated using(exists(select 1 from public.conversaciones_publicaciones c where c.id=mensajes_publicaciones.conversacion_id and auth.uid() in(c.publicador_profile_id,c.interesado_profile_id)));
drop policy if exists mensajes_select_participantes on public.mensajes_comerciales;
create policy mensajes_select_participantes on public.mensajes_comerciales for select to authenticated using(remitente_profile_id=auth.uid() or destinatario_profile_id=auth.uid());
drop policy if exists mensajes_update_destinatario on public.mensajes_comerciales;
create policy mensajes_update_destinatario on public.mensajes_comerciales for update to authenticated using(destinatario_profile_id=auth.uid()) with check(destinatario_profile_id=auth.uid());
drop policy if exists mensajes_insert_participante on public.mensajes_comerciales;
create policy mensajes_insert_participante on public.mensajes_comerciales for insert to authenticated with check(
 remitente_profile_id=auth.uid()
 and exists(select 1 from public.operacion_participantes op join public.company_users cu on cu.company_id=op.empresa_id where op.operacion_id=mensajes_comerciales.operacion_id and cu.profile_id=auth.uid() and cu.activo=true)
 and (destinatario_profile_id is null or exists(select 1 from public.operacion_participantes op2 join public.company_users cu2 on cu2.company_id=op2.empresa_id where op2.operacion_id=mensajes_comerciales.operacion_id and cu2.profile_id=mensajes_comerciales.destinatario_profile_id and cu2.activo=true))
);
revoke all on function public.listar_conversaciones_publicaciones() from public,anon; grant execute on function public.listar_conversaciones_publicaciones() to authenticated;
revoke all on function public.iniciar_conversacion_publicacion(uuid) from public,anon; grant execute on function public.iniciar_conversacion_publicacion(uuid) to authenticated;
revoke all on function public.enviar_mensaje_publicacion(uuid,text) from public,anon; grant execute on function public.enviar_mensaje_publicacion(uuid,text) to authenticated;
revoke all on function public.marcar_mensajes_publicacion_leidos(uuid) from public,anon; grant execute on function public.marcar_mensajes_publicacion_leidos(uuid) to authenticated;