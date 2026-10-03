create table if not exists public.prorrogas_contrato (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.operaciones(id) on delete cascade,
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  solicitada_por uuid not null,
  motivo text not null,
  justificativo text not null,
  dias_solicitados integer not null check (dias_solicitados between 1 and 30),
  vencimiento_solicitado_at timestamptz not null,
  evidencia_url text,
  datos_adicionales jsonb not null default '{}'::jsonb,
  estado_revision text not null default 'PENDIENTE' check (estado_revision in ('PENDIENTE','APROBADA','RECHAZADA','CANCELADA')),
  revisada_por uuid,
  revisada_at timestamptz,
  observaciones_revision text,
  dias_aprobados integer,
  vencimiento_aprobado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prorrogas_justificativo_min check (length(trim(justificativo)) >= 10)
);
create index if not exists idx_prorrogas_operacion on public.prorrogas_contrato(operacion_id);
create index if not exists idx_prorrogas_contrato on public.prorrogas_contrato(contrato_id);
create index if not exists idx_prorrogas_estado on public.prorrogas_contrato(estado_revision);
alter table public.prorrogas_contrato enable row level security;
drop policy if exists "prorrogas_select_participantes" on public.prorrogas_contrato;
create policy "prorrogas_select_participantes" on public.prorrogas_contrato for select to authenticated using (public.usuario_participa_operacion(operacion_id));

create or replace function public.solicitar_prorroga_contrato(p_operacion_id uuid,p_dias_solicitados integer,p_motivo text,p_justificativo text,p_evidencia_url text default null,p_datos_adicionales jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_contrato contratos%rowtype; v_id uuid; v_solicitado timestamptz;
begin
 if v_uid is null or not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para esta operación'; end if;
 if p_dias_solicitados is null or p_dias_solicitados<1 or p_dias_solicitados>30 then raise exception 'La prórroga debe solicitar entre 1 y 30 días'; end if;
 if nullif(trim(p_motivo),'') is null then raise exception 'El motivo de la prórroga es obligatorio'; end if;
 if nullif(trim(p_justificativo),'') is null or length(trim(p_justificativo))<10 then raise exception 'El justificativo debe explicar suficientemente por qué se necesita más tiempo'; end if;
 select * into v_contrato from public.contratos where operacion_id=p_operacion_id for update;
 if not found then raise exception 'La operación no tiene contrato'; end if;
 if v_contrato.estado in ('CONFIRMADO','CANCELADO') then raise exception 'El contrato no admite prórrogas en su estado actual'; end if;
 if exists(select 1 from public.prorrogas_contrato where operacion_id=p_operacion_id and estado_revision='PENDIENTE') then raise exception 'Ya existe una solicitud de prórroga pendiente'; end if;
 v_solicitado:=greatest(coalesce(v_contrato.vencimiento_at,now()),now())+make_interval(days=>p_dias_solicitados);
 insert into public.prorrogas_contrato(operacion_id,contrato_id,solicitada_por,motivo,justificativo,dias_solicitados,vencimiento_solicitado_at,evidencia_url,datos_adicionales)
 values(p_operacion_id,v_contrato.id,v_uid,trim(p_motivo),trim(p_justificativo),p_dias_solicitados,v_solicitado,nullif(trim(p_evidencia_url),''),coalesce(p_datos_adicionales,'{}'::jsonb))
 returning id into v_id;
 return jsonb_build_object('id',v_id,'estado','PENDIENTE','dias_solicitados',p_dias_solicitados,'vencimiento_solicitado_at',v_solicitado);
end $$;

create or replace function public.revisar_prorroga_contrato(p_prorroga_id uuid,p_resultado text,p_dias_aprobados integer default null,p_observaciones text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_p public.prorrogas_contrato%rowtype; v_admin boolean; v_contrato public.contratos%rowtype; v_nuevo_vencimiento timestamptz;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_p from public.prorrogas_contrato where id=p_prorroga_id for update;
 if not found then raise exception 'Solicitud de prórroga inexistente'; end if;
 select exists(select 1 from public.company_users cu join public.operaciones o on o.empresa_id=cu.company_id where o.id=v_p.operacion_id and cu.profile_id=v_uid and cu.activo=true and lower(cu.rol::text) in ('administrador','admin')) into v_admin;
 if not v_admin then raise exception 'ADMIN_REQUIRED'; end if;
 if p_resultado not in ('APROBADA','RECHAZADA') or v_p.estado_revision<>'PENDIENTE' then raise exception 'Revisión inválida'; end if;
 select * into v_contrato from public.contratos where id=v_p.contrato_id for update;
 if p_resultado='APROBADA' then
   if v_contrato.estado in ('CONFIRMADO','CANCELADO') then raise exception 'El contrato ya no admite una prórroga'; end if;
   if p_dias_aprobados is null or p_dias_aprobados<1 or p_dias_aprobados>v_p.dias_solicitados then raise exception 'Los días aprobados deben estar entre 1 y los días solicitados'; end if;
   v_nuevo_vencimiento:=greatest(coalesce(v_contrato.vencimiento_at,now()),now())+make_interval(days=>p_dias_aprobados);
   update public.contratos set vencimiento_at=v_nuevo_vencimiento,cancelado_por_vencimiento_at=null,updated_at=now() where id=v_p.contrato_id;
   update public.prorrogas_contrato set estado_revision='APROBADA',revisada_por=v_uid,revisada_at=now(),observaciones_revision=p_observaciones,dias_aprobados=p_dias_aprobados,vencimiento_aprobado_at=v_nuevo_vencimiento,updated_at=now() where id=p_prorroga_id;
   return jsonb_build_object('prorroga_id',p_prorroga_id,'resultado','APROBADA','dias_aprobados',p_dias_aprobados,'vencimiento_aprobado_at',v_nuevo_vencimiento);
 end if;
 update public.prorrogas_contrato set estado_revision='RECHAZADA',revisada_por=v_uid,revisada_at=now(),observaciones_revision=p_observaciones,updated_at=now() where id=p_prorroga_id;
 return jsonb_build_object('prorroga_id',p_prorroga_id,'resultado','RECHAZADA');
end $$;
revoke all on function public.solicitar_prorroga_contrato(uuid,integer,text,text,text,jsonb) from public,anon;
grant execute on function public.solicitar_prorroga_contrato(uuid,integer,text,text,text,jsonb) to authenticated;
revoke all on function public.revisar_prorroga_contrato(uuid,text,integer,text) from public,anon;
grant execute on function public.revisar_prorroga_contrato(uuid,text,integer,text) to authenticated;
