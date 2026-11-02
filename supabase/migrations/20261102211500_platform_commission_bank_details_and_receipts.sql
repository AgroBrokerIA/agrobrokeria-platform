create table if not exists public.platform_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_holder text not null,
  holder_tax_id text,
  account_type text,
  currency text not null default 'USD',
  cbu text not null,
  alias text,
  active boolean not null default true,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_payment_accounts_cbu_nonempty check (length(trim(cbu)) >= 10),
  constraint platform_payment_accounts_alias_nonempty check (alias is null or length(trim(alias)) > 0)
);

create unique index if not exists platform_payment_accounts_one_active_idx
  on public.platform_payment_accounts (active) where active = true;

alter table public.platform_payment_accounts enable row level security;

drop policy if exists platform_payment_accounts_authenticated_read on public.platform_payment_accounts;
create policy platform_payment_accounts_authenticated_read
  on public.platform_payment_accounts for select to authenticated
  using (auth.uid() is not null);

drop policy if exists platform_payment_accounts_admin_insert on public.platform_payment_accounts;
create policy platform_payment_accounts_admin_insert
  on public.platform_payment_accounts for insert to authenticated
  with check (exists (select 1 from public.platform_admins a where a.user_id = auth.uid()));

drop policy if exists platform_payment_accounts_admin_update on public.platform_payment_accounts;
create policy platform_payment_accounts_admin_update
  on public.platform_payment_accounts for update to authenticated
  using (exists (select 1 from public.platform_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.platform_admins a where a.user_id = auth.uid()));

drop policy if exists platform_payment_accounts_admin_delete on public.platform_payment_accounts;
create policy platform_payment_accounts_admin_delete
  on public.platform_payment_accounts for delete to authenticated
  using (exists (select 1 from public.platform_admins a where a.user_id = auth.uid()));

drop policy if exists platform_commission_receipt_admin_read on storage.objects;
create policy platform_commission_receipt_admin_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documentos-operacion'
    and (storage.foldername(name))[2] = 'comisiones'
    and exists (select 1 from public.platform_admins a where a.user_id = auth.uid())
  );
