create table if not exists public.integraciones_pago (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid null references public.empresas(id) on delete cascade,
  proveedor text not null,
  ambiente text not null default 'SANDBOX' check (ambiente in ('SANDBOX','PRODUCCION')),
  habilitado boolean not null default false,
  credencial_secret_ref text null,
  webhook_secret_ref text null,
  metadata jsonb not null default '{}'::jsonb,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now()
);

create unique index if not exists uq_integraciones_pago_empresa_proveedor_ambiente
  on public.integraciones_pago (coalesce(empresa_id,'00000000-0000-0000-0000-000000000000'::uuid), proveedor, ambiente);

create index if not exists idx_integraciones_pago_empresa
  on public.integraciones_pago (empresa_id);

create table if not exists public.transacciones_pago_externo (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid null references public.pagos(id) on delete set null,
  operacion_id uuid null references public.operaciones(id) on delete set null,
  empresa_id uuid null references public.empresas(id) on delete set null,
  integracion_id uuid null references public.integraciones_pago(id) on delete set null,
  proveedor text not null,
  ambiente text not null default 'SANDBOX' check (ambiente in ('SANDBOX','PRODUCCION')),
  idempotency_key text not null,
  external_payment_id text null,
  external_order_id text null,
  estado text not null default 'PENDIENTE',
  importe numeric not null check (importe > 0),
  moneda_id integer null references public.monedas(id),
  checkout_url text null,
  provider_status text null,
  provider_response jsonb not null default '{}'::jsonb,
  error_code text null,
  error_message text null,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  unique (proveedor, ambiente, idempotency_key)
);

create index if not exists idx_transacciones_pago_externo_pago
  on public.transacciones_pago_externo (pago_id);
create index if not exists idx_transacciones_pago_externo_operacion
  on public.transacciones_pago_externo (operacion_id);
create index if not exists idx_transacciones_pago_externo_external
  on public.transacciones_pago_externo (proveedor, external_payment_id);

create table if not exists public.eventos_pago_externo (
  id uuid primary key default gen_random_uuid(),
  transaccion_id uuid null references public.transacciones_pago_externo(id) on delete cascade,
  proveedor text not null,
  evento_id text null,
  tipo_evento text not null,
  payload jsonb not null default '{}'::jsonb,
  firma_valida boolean not null default false,
  procesado boolean not null default false,
  error_message text null,
  creado_at timestamptz not null default now()
);

create index if not exists idx_eventos_pago_externo_transaccion
  on public.eventos_pago_externo (transaccion_id);
create unique index if not exists uq_eventos_pago_externo_proveedor_evento
  on public.eventos_pago_externo (proveedor, evento_id)
  where evento_id is not null;

alter table public.integraciones_pago enable row level security;
alter table public.transacciones_pago_externo enable row level security;
alter table public.eventos_pago_externo enable row level security;

drop policy if exists "payment integrations service only" on public.integraciones_pago;
create policy "payment integrations service only"
  on public.integraciones_pago for all to service_role
  using (true) with check (true);

drop policy if exists "external payment transactions service only" on public.transacciones_pago_externo;
create policy "external payment transactions service only"
  on public.transacciones_pago_externo for all to service_role
  using (true) with check (true);

drop policy if exists "external payment events service only" on public.eventos_pago_externo;
create policy "external payment events service only"
  on public.eventos_pago_externo for all to service_role
  using (true) with check (true);

revoke all on public.integraciones_pago from anon, authenticated;
revoke all on public.transacciones_pago_externo from anon, authenticated;
revoke all on public.eventos_pago_externo from anon, authenticated;
grant all on public.integraciones_pago, public.transacciones_pago_externo, public.eventos_pago_externo to service_role;
