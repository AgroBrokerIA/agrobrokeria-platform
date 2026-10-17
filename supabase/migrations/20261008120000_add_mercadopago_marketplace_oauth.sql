-- Mercado Pago Marketplace / OAuth connection for sellers.
-- Tokens are encrypted at application level; this table is service-role only.
create table if not exists public.mercadopago_conexiones (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  empresa_id uuid null references public.empresas(id) on delete set null,
  profile_id uuid null references public.profiles(id) on delete set null,
  mp_user_id text not null,
  public_key text,
  access_token_enc text not null,
  refresh_token_enc text not null,
  token_expires_at timestamptz,
  scope text,
  live_mode boolean not null default false,
  estado text not null default 'CONECTADA'
    check (estado in ('CONECTADA','EXPIRADA','REVOCADA','ERROR')),
  metadata jsonb not null default '{}'::jsonb,
  conectado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  unique(company_id),
  unique(mp_user_id)
);

create index if not exists idx_mp_conexiones_empresa on public.mercadopago_conexiones(empresa_id);
create index if not exists idx_mp_conexiones_estado on public.mercadopago_conexiones(estado);

alter table public.mercadopago_conexiones enable row level security;
drop policy if exists "mercadopago connections service only" on public.mercadopago_conexiones;
create policy "mercadopago connections service only"
  on public.mercadopago_conexiones for all to service_role
  using (true) with check (true);

revoke all on public.mercadopago_conexiones from anon, authenticated;
grant all on public.mercadopago_conexiones to service_role;

-- Fix the existing provider integration enum mismatch used by the UI.
-- The provider gateway migration defines SANDBOX/PRODUCCION, not production.
