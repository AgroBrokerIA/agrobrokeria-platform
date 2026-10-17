-- AgroBrokerIA: comprobantes de comisiones integrados con operacion_comisiones.
-- Diseñado para ejecutarse en un proyecto Supabase de pruebas aislado. NO ejecutar en producción sin revisión.
begin;

create table if not exists public.comision_pagos (
  id uuid primary key default gen_random_uuid(),
  operacion_comision_id uuid not null references public.operacion_comisiones(id) on delete restrict,
  operacion_id uuid not null references public.operaciones(id) on delete restrict,
  pagador_profile_id uuid not null references public.profiles(id) on delete restrict,
  pagador_empresa_id uuid references public.companies(id) on delete restrict,
  importe_declarado numeric(18,2) not null check (importe_declarado > 0),
  moneda_id integer not null references public.monedas(id) on delete restrict,
  fecha_transferencia date,
  referencia_transferencia text,
  archivo_path text not null unique,
  archivo_nombre text not null,
  archivo_mime text not null check (archivo_mime in ('application/pdf','image/jpeg','image/png','image/webp')),
  archivo_bytes bigint not null check (archivo_bytes > 0 and archivo_bytes <= 10485760),
  archivo_sha256 text,
  estado text not null default 'COMPROBANTE_SUBIDO'
    check (estado in ('COMPROBANTE_SUBIDO','EN_REVISION','RECHAZADO','PAGO_PARCIAL','PAGADO','CANCELADO')),
  importe_confirmado numeric(18,2) not null default 0 check (importe_confirmado >= 0),
  revisor_profile_id uuid references public.profiles(id),
  revisado_en timestamptz,
  motivo_rechazo text,
  ingreso_comision_id uuid references public.ingresos_comisiones(id) on delete restrict,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint comision_pagos_confirmado_no_supera_declarado check (importe_confirmado <= importe_declarado)
);

create index if not exists idx_comision_pagos_comision on public.comision_pagos(operacion_comision_id);
create index if not exists idx_comision_pagos_estado_fecha on public.comision_pagos(estado, creado_en desc);
create index if not exists idx_comision_pagos_pagador on public.comision_pagos(pagador_profile_id, creado_en desc);

create table if not exists public.comision_comprobante_revisores (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  creado_por uuid references public.profiles(id)
);

create table if not exists public.comision_pagos_auditoria (
  id bigint generated always as identity primary key,
  pago_id uuid not null references public.comision_pagos(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id),
  accion text not null,
  estado_anterior text,
  estado_nuevo text,
  importe numeric(18,2),
  moneda_id integer references public.monedas(id),
  motivo text,
  metadatos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);
create index if not exists idx_comision_pagos_auditoria_pago on public.comision_pagos_auditoria(pago_id, creado_en desc);

alter table public.comision_pagos enable row level security;
alter table public.comision_comprobante_revisores enable row level security;
alter table public.comision_pagos_auditoria enable row level security;

drop policy if exists "commission payer reads own proof" on public.comision_pagos;
create policy "commission payer reads own proof" on public.comision_pagos
for select to authenticated
using (pagador_profile_id = auth.uid() or exists (
  select 1 from public.comision_comprobante_revisores r where r.profile_id = auth.uid() and r.activo
));

drop policy if exists "operation participants submit proof" on public.comision_pagos;
create policy "operation participants submit proof" on public.comision_pagos
for insert to authenticated with check (
  pagador_profile_id = auth.uid()
  and estado = 'COMPROBANTE_SUBIDO'
  and importe_confirmado = 0
  and revisor_profile_id is null and revisado_en is null
  and exists (
    select 1
    from public.operacion_comisiones oc
    join public.operacion_participantes op on op.operacion_id = oc.operacion_id
    join public.company_users cu on cu.company_id = op.empresa_id
    where oc.id = operacion_comision_id
      and oc.operacion_id = comision_pagos.operacion_id
      and cu.profile_id = auth.uid() and coalesce(cu.activo, true)
      and (pagador_empresa_id is null or pagador_empresa_id = cu.company_id)
      and importe_declarado <= oc.saldo_pendiente
      and moneda_id = oc.moneda_id
  )
);

-- No direct UPDATE policy: state transitions and balance changes must go through the
-- SECURITY DEFINER RPC so clients cannot mark a payment as received outside the audited flow.
drop policy if exists "active reviewers update proof" on public.comision_pagos;

drop policy if exists "payers and reviewers read proof audit" on public.comision_pagos_auditoria;
create policy "payers and reviewers read proof audit" on public.comision_pagos_auditoria
for select to authenticated
using (
  exists (select 1 from public.comision_pagos p where p.id = pago_id and p.pagador_profile_id = auth.uid())
  or exists (select 1 from public.comision_comprobante_revisores r where r.profile_id = auth.uid() and r.activo)
);

drop policy if exists "read own reviewer status" on public.comision_comprobante_revisores;
create policy "read own reviewer status" on public.comision_comprobante_revisores
for select to authenticated using (profile_id = auth.uid());
-- No client INSERT/UPDATE/DELETE policy for reviewer assignments; provision reviewers with trusted SQL.

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
      and p.archivo_path = name
  )
);

drop policy if exists "payer and reviewer read authorized commission proof" on storage.objects;
create policy "payer and reviewer read authorized commission proof" on storage.objects
for select to authenticated using (
  bucket_id = 'comprobantes-comisiones'
  and (
    exists (select 1 from public.comision_pagos p
      where p.id::text = (storage.foldername(name))[1]
        and p.pagador_profile_id = auth.uid()
        and (storage.foldername(name))[2] = auth.uid()::text
        and p.archivo_path = name)
    or exists (select 1 from public.comision_comprobante_revisores r where r.profile_id = auth.uid() and r.activo)
  )
);

create or replace function public.audit_comision_pago_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.comision_pagos_auditoria
      (pago_id, actor_profile_id, accion, estado_nuevo, importe, moneda_id, metadatos)
    values (NEW.id, auth.uid(), 'COMPROBANTE_CREADO', NEW.estado, NEW.importe_declarado, NEW.moneda_id,
      jsonb_build_object('archivo_nombre', NEW.archivo_nombre, 'archivo_sha256', NEW.archivo_sha256));
    return NEW;
  end if;
  if NEW.estado is distinct from OLD.estado
     or NEW.importe_confirmado is distinct from OLD.importe_confirmado
     or NEW.motivo_rechazo is distinct from OLD.motivo_rechazo
     or NEW.ingreso_comision_id is distinct from OLD.ingreso_comision_id then
    insert into public.comision_pagos_auditoria
      (pago_id, actor_profile_id, accion, estado_anterior, estado_nuevo, importe, moneda_id, motivo, metadatos)
    values (NEW.id, auth.uid(), 'REVISION_ACTUALIZADA', OLD.estado, NEW.estado,
      NEW.importe_confirmado, NEW.moneda_id, NEW.motivo_rechazo,
      jsonb_build_object('ingreso_comision_id', NEW.ingreso_comision_id));
  end if;
  NEW.actualizado_en = now();
  return NEW;
end;
$$;

drop trigger if exists trg_audit_comision_pago_change on public.comision_pagos;
create trigger trg_audit_comision_pago_change
before insert or update on public.comision_pagos
for each row execute function public.audit_comision_pago_change();

create or replace function public.notificar_comprobante_comision()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_codigo text;
begin
  if NEW.estado = 'EN_REVISION' and (TG_OP = 'INSERT' or OLD.estado is distinct from NEW.estado) then
    select codigo into v_codigo from public.operaciones where id = NEW.operacion_id;
    insert into public.notificaciones (profile_id, operacion_id, titulo, mensaje, tipo, leida)
    select r.profile_id, NEW.operacion_id,
      'Nuevo comprobante de comisión',
      'Se subió un comprobante para la operación ' || coalesce(v_codigo, left(NEW.operacion_id::text,8)) ||
      '. Verificá el ingreso bancario antes de confirmar el pago.',
      'COMISION_COMPROBANTE', false
    from public.comision_comprobante_revisores r where r.activo;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notificar_comprobante_comision on public.comision_pagos;
create trigger trg_notificar_comprobante_comision
after insert or update of estado on public.comision_pagos
for each row execute function public.notificar_comprobante_comision();

create or replace function public.revisar_pago_comision(
  p_pago_id uuid,
  p_accion text,
  p_importe_confirmado numeric default null,
  p_motivo text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_pago public.comision_pagos%rowtype;
  v_comision public.operacion_comisiones%rowtype;
  v_ingreso uuid;
  v_importe numeric(18,2);
begin
  if auth.uid() is null or not exists (
    select 1 from public.comision_comprobante_revisores r
    where r.profile_id = auth.uid() and r.activo
  ) then raise exception 'No autorizado para revisar comprobantes'; end if;

  select * into v_pago from public.comision_pagos where id = p_pago_id for update;
  if not found then raise exception 'Comprobante inexistente'; end if;
  if v_pago.estado not in ('COMPROBANTE_SUBIDO','EN_REVISION') then
    raise exception 'El comprobante ya no admite revisión desde este estado';
  end if;

  if p_accion = 'RECHAZADO' then
    if length(trim(coalesce(p_motivo,''))) < 3 then raise exception 'El rechazo requiere un motivo'; end if;
    update public.comision_pagos set estado='RECHAZADO', motivo_rechazo=left(trim(p_motivo),500),
      revisor_profile_id=auth.uid(), revisado_en=now()
      where id=p_pago_id;
    return jsonb_build_object('ok',true,'estado','RECHAZADO');
  elsif p_accion = 'EN_REVISION' then
    update public.comision_pagos set estado='EN_REVISION', revisor_profile_id=auth.uid(),
      revisado_en=now(), motivo_rechazo=null where id=p_pago_id;
    return jsonb_build_object('ok',true,'estado','EN_REVISION');
  elsif p_accion not in ('PAGADO','PAGO_PARCIAL') then
    raise exception 'Acción de revisión no válida';
  end if;

  v_importe := coalesce(p_importe_confirmado, v_pago.importe_declarado);
  if v_importe <= 0 or v_importe > v_pago.importe_declarado then raise exception 'Importe confirmado inválido'; end if;
  if p_accion = 'PAGO_PARCIAL' and v_importe >= v_pago.importe_declarado then
    raise exception 'El pago parcial debe ser menor que el importe declarado';
  end if;
  if p_accion = 'PAGADO' and v_importe <> v_pago.importe_declarado then
    raise exception 'El pago completo debe coincidir con el importe declarado';
  end if;

  select * into v_comision from public.operacion_comisiones
  where id=v_pago.operacion_comision_id for update;
  if not found then raise exception 'Comisión de operación inexistente'; end if;
  if v_importe > v_comision.saldo_pendiente then raise exception 'El importe excede el saldo pendiente actual'; end if;

  insert into public.ingresos_comisiones (
    empresa_receptora_id, profile_id, operacion_id, operacion_comision_id,
    moneda_id, importe, medio_pago, proveedor_pago, referencia_pago,
    referencia_operacion, estado, fecha_instruccion, fecha_confirmacion, metadata
  ) values (
    v_comision.empresa_id, v_comision.profile_id, v_comision.operacion_id, v_comision.id,
    v_comision.moneda_id, v_importe, 'TRANSFERENCIA_BANCARIA', 'NARANJA_X',
    v_pago.referencia_transferencia, v_pago.id::text, 'CONCILIADO',
    coalesce(v_pago.creado_en,now()), now(),
    jsonb_build_object('comprobante_pago_id',v_pago.id,'confirmado_manualmente_por',auth.uid())
  ) returning id into v_ingreso;

  update public.operacion_comisiones
  set saldo_pagado = saldo_pagado + v_importe,
      saldo_pendiente = greatest(0, saldo_pendiente - v_importe),
      medio_pago = 'TRANSFERENCIA_BANCARIA',
      fecha_pago = now(),
      referencia_pago = coalesce(v_pago.referencia_transferencia, v_pago.id::text),
      estado = case when greatest(0, saldo_pendiente - v_importe) = 0 then 'PAGADA' else 'PARCIAL' end,
      actualizado_at = now()
  where id=v_comision.id;

  update public.comision_pagos set estado=p_accion, importe_confirmado=v_importe,
    revisor_profile_id=auth.uid(), revisado_en=now(), motivo_rechazo=null,
    ingreso_comision_id=v_ingreso where id=p_pago_id;

  return jsonb_build_object('ok',true,'estado',p_accion,'importe_confirmado',v_importe,'ingreso_comision_id',v_ingreso);
end;
$$;

revoke all on function public.revisar_pago_comision(uuid,text,numeric,text) from public;
grant execute on function public.revisar_pago_comision(uuid,text,numeric,text) to authenticated;


create or replace function public.confirmar_subida_comprobante(p_pago_id uuid)
returns jsonb language plpgsql security definer set search_path = public, storage
as $$
declare v_pago public.comision_pagos%rowtype;
begin
  if auth.uid() is null then raise exception 'Iniciá sesión para confirmar la carga'; end if;
  select * into v_pago from public.comision_pagos
  where id=p_pago_id and pagador_profile_id=auth.uid() for update;
  if not found then raise exception 'Comprobante no encontrado o sin permisos'; end if;
  if v_pago.estado <> 'COMPROBANTE_SUBIDO' then raise exception 'El comprobante no está en estado de carga'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id='comprobantes-comisiones' and o.name=v_pago.archivo_path
  ) then raise exception 'No se encontró el archivo privado cargado'; end if;
  update public.comision_pagos set estado='EN_REVISION' where id=p_pago_id;
  return jsonb_build_object('ok',true,'estado','EN_REVISION');
end;
$$;
revoke all on function public.confirmar_subida_comprobante(uuid) from public;
grant execute on function public.confirmar_subida_comprobante(uuid) to authenticated;

commit;
