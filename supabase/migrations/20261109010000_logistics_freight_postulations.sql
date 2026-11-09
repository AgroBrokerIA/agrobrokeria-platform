create table if not exists public.postulaciones_logistica(
 id uuid primary key default gen_random_uuid(),
 id_demanda_flete uuid not null references public.demandas_logistica(id) on delete cascade,
 id_oferta_flete uuid not null references public.ofertas_logistica(id) on delete cascade,
 empresa_transportista_id uuid not null references public.empresas(id),
 estado text not null default 'PENDIENTE' check(estado in ('PENDIENTE','ACEPTADA','RECHAZADA','RETIRADA')),
 creado_por uuid not null references auth.users(id),
 creado_at timestamptz not null default now(),
 unique(id_demanda_flete,id_oferta_flete)
);
alter table public.postulaciones_logistica enable row level security;
drop policy if exists postulaciones_logistica_read on public.postulaciones_logistica;
create policy postulaciones_logistica_read on public.postulaciones_logistica for select to authenticated using(
 public.usuario_es_miembro_empresa(empresa_transportista_id) or exists(select 1 from public.demandas_logistica d where d.id=id_demanda_flete and public.usuario_es_miembro_empresa(d.empresa_dadora_id)) or exists(select 1 from public.platform_admins a where a.user_id=auth.uid())
);
create or replace function public.postular_camiones_logistica(p_demanda_id uuid,p_oferta_id uuid)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare o public.ofertas_logistica%rowtype; d public.demandas_logistica%rowtype; rid uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into o from public.ofertas_logistica where id=p_oferta_id and estado='PUBLICADA';
 select * into d from public.demandas_logistica where id=p_demanda_id and estado in ('PUBLICADA','PARCIAL');
 if o.id is null or d.id is null then raise exception 'OFERTA_O_DEMANDA_NO_DISPONIBLE'; end if;
 if not public.usuario_es_miembro_empresa(o.empresa_transportista_id) or not exists(select 1 from public.transportistas t where t.id=o.transportista_id and t.profile_id=auth.uid() and t.verificacion_estado='VERIFICADO') then raise exception 'TRANSPORTISTA_VERIFICADO_REQUERIDO'; end if;
 insert into public.postulaciones_logistica(id_demanda_flete,id_oferta_flete,empresa_transportista_id,creado_por)
 values(d.id,o.id,o.empresa_transportista_id,auth.uid())
 on conflict(id_demanda_flete,id_oferta_flete) do update set estado='PENDIENTE',creado_por=auth.uid(),creado_at=now()
 returning id into rid;
 return rid;
end $$;
revoke all on function public.postular_camiones_logistica(uuid,uuid) from public,anon;
grant execute on function public.postular_camiones_logistica(uuid,uuid) to authenticated;