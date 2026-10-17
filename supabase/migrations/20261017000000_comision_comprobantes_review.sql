-- AgroBrokerIA: comprobantes privados y revisión manual de comisiones.
-- Ejecutar primero en un proyecto Supabase de pruebas aislado. No ejecutar en producción sin revisión.
begin;

create table if not exists public.comision_pagos (
  id uuid primary key default gen_random_uuid(),
  comision_id uuid not null references public.comisiones(id) on delete restrict,
  operacion_id uuid not null,
  pagador_profile_id uuid not null references auth.users(id) on delete restrict,
  pagador_empresa_id uuid,
  importe_declarado numeric(18,2) not null check (importe_declarado > 0),
  moneda text not null check (moneda in ('ARS','USD')),
  fecha_transferencia date,
  referencia_transferencia text,
  archivo_path text not null,
  archivo_nombre text not null,
  archivo_mime text not null check (archivo_mime in ('application/pdf','image/jpeg','image/png','image/webp')),
  archivo_bytes bigint not null check (archivo_bytes > 0 and archivo_bytes <= 10485760),
  archivo_sha256 text,
  estado text not null default 'COMPROBANTE_SUBIDO'
    check (estado in ('COMPROBANTE_SUBIDO','EN_REVISION','RECHAZADO','PAGO_PARCIAL','PAGADO','CANCELADO')),
  importe_confirmado numeric(18,2) not null default 0 check (importe_confirmado >= 0),
  revisor_profile_id uuid references auth.users(id),
  revisado_en timestamptz,
  motivo_rechazo text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint comision_pagos_confirmado_no_supera_declarado check (importe_confirmado <= importe_declarado)
);

create index if not exists idx_comision_pagos_comision on public.comision_pagos(comision_id);
create index if not exists idx_comision_pagos_estado_fecha on public.comision_pagos(estado, creado_en desc);
create index if not exists idx_comision_pagos_pagador on public.comision_pagos(pagador_profile_id, creado_en desc);

create table if not exists public.comision_comprobante_revisores (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id)
);

create table if not exists public.comision_pagos_auditoria (
  id bigint generated always as identity primary key,
  pago_id uuid not null references public.comision_pagos(id) on delete restrict,
  actor_profile_id uuid references auth.users(id),
  accion text not null,
  estado_anterior text,
  estado_nuevo text,
  importe numeric(18,2),
  moneda text,
  motivo text,
  metadatos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists idx_comision_pagos_auditoria_pago on public.comision_pagos_auditoria(pago_id, creado_en desc);

alter table public.comision_pagos enable row level security;
alter table public.comision_comprobante_revisores enable row level security;
alter table public.comision_pagos_auditoria enable row level security;

drop policy if exists "payer reads own commission payments" on public.comision_pagos;
create policy "payer reads own commission payments" on public.comision_pagos
for select to authenticated
using (pagador_profile_id = auth.uid() or exists (
  select 1 from public.comision_comprobante_revisores r
  where r.profile_id = auth.uid() and r.activo
));

drop policy if exists "payer submits own commission proof" on public.comision_pagos;
create policy "payer submits own commission proof" on public.comision_pagos
for insert to authenticated
with check (
  pagador_profile_id = auth.uid()
  and estado = 'COMPROBANTE_SUBIDO'
  and importe_confirmado = 0
  and revisor_profile_id is null
  and revisado_en is null
  and exists (
    select 1 from public.comisiones c
    where c.id = comision_id
      and c.profile_id = auth.uid()
      and c.operacion_id = comision_pagos.operacion_id
  )
);

drop policy if exists "reviewers update commission payments" on public.comision_pagos;
create policy "reviewers update commission payments" on public.comision_pagos
for update to authenticated
using (exists (select 1 from public.comision_comprobante_revisores r where r.profile_id = auth.uid() and r.activo))
with check (exists (select 1 from public.comision_comprobante_revisores r where r.profile_id = auth.uid() and r.activo));

drop policy if exists "reviewers read payment audit" on public.comision_pagos_auditoria;
create policy "reviewers read payment audit" on public.comision_pagos_auditoria
for select to authenticated
using (exists (select 1 from public.comision_comprobante_revisores r where r.profile_id = auth.uid() and r.activo));

-- No update/delete policies for audit: ordinary users cannot rewrite history.
drop policy if exists "reviewers read reviewer assignments" on public.comision_comprobante_revisores;
create policy "reviewers read reviewer assignments" on public.comision_comprobante_revisores
for select to authenticated
using (profile_id = auth.uid() or exists (
  select 1 from public.comision_comprobante_revisores r
  where r.profile_id = auth.uid() and r.activo
));

-- Private storage: each object path must be <payment UUID>/<uploader UUID>/<filename>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes-comisiones', 'comprobantes-comisiones', false, 10485760,
  array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp'];

drop policy if exists "payer uploads own commission proof" on storage.objects;
create policy "payer uploads own commission proof" on storage.objects
for insert to authenticated with check (
  bucket_id = 'comprobantes-comisiones'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1 from public.comision_pagos p
    where p.id::text = (storage.foldername(name))[1]
      and p.pagador_profile_id = auth.uid()
  )
);

drop policy if exists "payer and reviewer read authorized commission proof" on storage.objects;
create policy "payer and reviewer read authorized commission proof" on storage.objects
for select to authenticated using (
  bucket_id = 'comprobantes-comisiones'
  and (
    exists (
      select 1 from public.comision_pagos p
      where p.id::text = (storage.foldername(name))[1]
        and p.pagador_profile_id = auth.uid()
        and (storage.foldername(name))[2] = auth.uid()::text
    )
    or exists (
      select 1 from public.comision_comprobante_revisores r
      where r.profile_id = auth.uid() and r.activo
    )
  )
);

-- Reviewer actions are recorded server-side by the application; this trigger records every row transition.
create or replace function public.audit_comision_pago_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.comision_pagos_auditoria
      (pago_id, actor_profile_id, accion, estado_nuevo, importe, moneda, metadatos)
    values (NEW.id, auth.uid(), 'COMPROBANTE_SUBIDO', NEW.estado, NEW.importe_declarado, NEW.moneda,
      jsonb_build_object('archivo_nombre', NEW.archivo_nombre, 'archivo_sha256', NEW.archivo_sha256));
    return NEW;
  end if;
  if NEW.estado is distinct from OLD.estado
     or NEW.importe_confirmado is distinct from OLD.importe_confirmado
     or NEW.motivo_rechazo is distinct from OLD.motivo_rechazo then
    insert into public.comision_pagos_auditoria
      (pago_id, actor_profile_id, accion, estado_anterior, estado_nuevo, importe, moneda, motivo, metadatos)
    values (NEW.id, auth.uid(), 'ESTADO_O_IMPORTE_ACTUALIZADO', OLD.estado, NEW.estado,
      NEW.importe_confirmado, NEW.moneda, NEW.motivo_rechazo,
      jsonb_build_object('importe_declarado', NEW.importe_declarado));
  end if;
  NEW.actualizado_en = now();
  return NEW;
end;
$$;

drop trigger if exists trg_audit_comision_pago_change on public.comision_pagos;
create trigger trg_audit_comision_pago_change
before insert or update on public.comision_pagos
for each row execute function public.audit_comision_pago_change();

commit;
