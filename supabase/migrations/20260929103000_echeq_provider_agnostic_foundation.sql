create table if not exists public.echeq_operaciones (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid null references public.operaciones(id) on delete set null,
  empresa_emisora_id uuid null references public.empresas(id) on delete set null,
  empresa_beneficiaria_id uuid null references public.empresas(id) on delete set null,
  proveedor text null,
  ambiente text not null default 'SANDBOX' check (ambiente in ('SANDBOX','PRODUCCION')),
  external_id text null,
  numero_echeq text null,
  tipo text not null check (tipo in ('COMUN','PAGO_DIFERIDO')),
  importe numeric not null check (importe > 0),
  moneda_id integer null references public.monedas(id),
  beneficiario_identificador text not null,
  fecha_emision date null,
  fecha_pago date null,
  estado text not null default 'PENDIENTE',
  motivo_estado text null,
  metadata jsonb not null default '{}'::jsonb,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now()
);
create unique index if not exists uq_echeq_provider_external on public.echeq_operaciones (proveedor,ambiente,external_id) where external_id is not null;
create index if not exists idx_echeq_operacion on public.echeq_operaciones(operacion_id);
create index if not exists idx_echeq_beneficiaria on public.echeq_operaciones(empresa_beneficiaria_id);
create index if not exists idx_echeq_estado on public.echeq_operaciones(estado);
create table if not exists public.echeq_eventos (
  id uuid primary key default gen_random_uuid(),
  echeq_id uuid not null references public.echeq_operaciones(id) on delete cascade,
  proveedor text null,
  evento_id text null,
  tipo_evento text not null,
  estado text null,
  payload jsonb not null default '{}'::jsonb,
  firma_valida boolean not null default false,
  procesado boolean not null default false,
  creado_at timestamptz not null default now()
);
create unique index if not exists uq_echeq_event_provider on public.echeq_eventos(proveedor,evento_id) where evento_id is not null;
alter table public.echeq_operaciones enable row level security;
alter table public.echeq_eventos enable row level security;
drop policy if exists "echeq service only" on public.echeq_operaciones;
create policy "echeq service only" on public.echeq_operaciones for all to service_role using (true) with check (true);
drop policy if exists "echeq events service only" on public.echeq_eventos;
create policy "echeq events service only" on public.echeq_eventos for all to service_role using (true) with check (true);
revoke all on public.echeq_operaciones,public.echeq_eventos from anon,authenticated;
grant all on public.echeq_operaciones,public.echeq_eventos to service_role;