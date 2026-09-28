create table if not exists public.arca_company_config (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  environment text not null default 'production' check (environment in ('production','homologacion')),
  punto_venta integer not null check (punto_venta between 1 and 99998),
  enabled boolean not null default false,
  cert_secret_name text not null,
  private_key_secret_name text not null,
  cuit_secret_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id)
);

alter table public.arca_company_config enable row level security;

drop policy if exists "arca_company_config_select_member" on public.arca_company_config;
create policy "arca_company_config_select_member" on public.arca_company_config
for select to authenticated using (exists (
  select 1 from public.company_users cu
  where cu.company_id=arca_company_config.company_id
    and cu.profile_id=auth.uid()
    and cu.activo=true
));

drop policy if exists "arca_company_config_insert_admin" on public.arca_company_config;
create policy "arca_company_config_insert_admin" on public.arca_company_config
for insert to authenticated with check (exists (
  select 1 from public.company_users cu
  where cu.company_id=arca_company_config.company_id
    and cu.profile_id=auth.uid()
    and cu.activo=true
    and lower(cu.rol::text)='administrador'
));

drop policy if exists "arca_company_config_update_admin" on public.arca_company_config;
create policy "arca_company_config_update_admin" on public.arca_company_config
for update to authenticated
using (exists (
  select 1 from public.company_users cu
  where cu.company_id=arca_company_config.company_id
    and cu.profile_id=auth.uid()
    and cu.activo=true
    and lower(cu.rol::text)='administrador'
))
with check (exists (
  select 1 from public.company_users cu
  where cu.company_id=arca_company_config.company_id
    and cu.profile_id=auth.uid()
    and cu.activo=true
    and lower(cu.rol::text)='administrador'
));

revoke all on public.arca_company_config from anon;
grant select,insert,update on public.arca_company_config to authenticated;
