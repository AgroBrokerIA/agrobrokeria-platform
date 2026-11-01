-- Conversations can start from an active offer/demand without creating an operation.
create table if not exists public.conversaciones_publicaciones (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  publicador_profile_id uuid not null references public.profiles(id) on delete cascade,
  interesado_profile_id uuid not null references public.profiles(id) on delete cascade,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  constraint conversaciones_publicaciones_no_self check (publicador_profile_id <> interesado_profile_id),
  constraint conversaciones_publicaciones_unica unique (publicacion_id, interesado_profile_id)
);

create table if not exists public.mensajes_publicaciones (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversaciones_publicaciones(id) on delete cascade,
  remitente_profile_id uuid not null references public.profiles(id) on delete cascade,
  mensaje text not null check (length(trim(mensaje)) between 1 and 10000),
  creado_at timestamptz not null default now(),
  leido_at timestamptz
);

alter table public.conversaciones_publicaciones enable row level security;
alter table public.mensajes_publicaciones enable row level security;

drop policy if exists conversaciones_publicaciones_participantes_select on public.conversaciones_publicaciones;
create policy conversaciones_publicaciones_participantes_select on public.conversaciones_publicaciones
for select to authenticated using (auth.uid() in (publicador_profile_id, interesado_profile_id));

drop policy if exists mensajes_publicaciones_participantes_select on public.mensajes_publicaciones;
create policy mensajes_publicaciones_participantes_select on public.mensajes_publicaciones
for select to authenticated using (
  exists (
    select 1 from public.conversaciones_publicaciones c
    where c.id = conversacion_id
      and auth.uid() in (c.publicador_profile_id, c.interesado_profile_id)
  )
);

revoke insert, update, delete on public.conversaciones_publicaciones from anon, authenticated;
revoke insert, update, delete on public.mensajes_publicaciones from anon, authenticated;
grant select on public.conversaciones_publicaciones, public.mensajes_publicaciones to authenticated;

create or replace function public.iniciar_conversacion_publicacion(p_publicacion_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_publicador uuid;
  v_estado text;
  v_conversacion uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select pr.id, p.estado
    into v_publicador, v_estado
  from public.publicaciones p
  join public.empresas e on e.id = p.empresa_id
  join public.cuentas c on c.id = e.cuenta_id
  join public.profiles pr on lower(pr.email) = lower(c.email)
  where p.id = p_publicacion_id and coalesce(e.activa,true) = true
  order by e.creado_en asc
  limit 1;

  if v_publicador is null then raise exception 'PUBLICACION_NO_DISPONIBLE'; end if;
  if upper(coalesce(v_estado,'')) <> 'PUBLICADA' then raise exception 'PUBLICACION_NO_DISPONIBLE'; end if;
  if v_publicador = v_uid then raise exception 'NO_PODES_CONTACTARTE_A_VOS_MISMO'; end if;

  insert into public.conversaciones_publicaciones(publicacion_id, publicador_profile_id, interesado_profile_id)
  values (p_publicacion_id, v_publicador, v_uid)
  on conflict (publicacion_id, interesado_profile_id)
  do update set actualizado_at = now()
  returning id into v_conversacion;

  return v_conversacion;
end;
$$;

create or replace function public.enviar_mensaje_publicacion(p_conversacion_id uuid, p_mensaje text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_mensaje,''))) = 0 or length(p_mensaje) > 10000 then
    raise exception 'MENSAJE_INVALIDO';
  end if;
  if not exists (
    select 1 from public.conversaciones_publicaciones c
    where c.id = p_conversacion_id
      and v_uid in (c.publicador_profile_id, c.interesado_profile_id)
  ) then raise exception 'CONVERSACION_NO_AUTORIZADA'; end if;

  insert into public.mensajes_publicaciones(conversacion_id, remitente_profile_id, mensaje)
  values (p_conversacion_id, v_uid, trim(p_mensaje))
  returning id into v_id;

  update public.conversaciones_publicaciones set actualizado_at = now()
  where id = p_conversacion_id;

  return v_id;
end;
$$;

revoke all on function public.iniciar_conversacion_publicacion(uuid) from public;
revoke all on function public.enviar_mensaje_publicacion(uuid,text) from public;
grant execute on function public.iniciar_conversacion_publicacion(uuid) to authenticated;
grant execute on function public.enviar_mensaje_publicacion(uuid,text) to authenticated;


create or replace function public.publicaciones_propias_ids()
returns setof uuid
language sql
stable
security definer
set search_path=public
as $$
 select p.id from public.publicaciones p
 join public.empresas e on e.id=p.empresa_id
 join public.cuentas c on c.id=e.cuenta_id
 join public.profiles pr on lower(pr.email)=lower(c.email)
 where pr.id=auth.uid();
$$;
revoke all on function public.publicaciones_propias_ids() from public;
grant execute on function public.publicaciones_propias_ids() to authenticated;
