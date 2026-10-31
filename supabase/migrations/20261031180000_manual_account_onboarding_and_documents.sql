-- Manual onboarding and document review. Registration is never gated by verification.
create table if not exists public.account_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_type text not null default 'PERSONA' check (account_type in ('PERSONA','EMPRESA')),
  role text not null default 'comprador',
  document_type text,
  document_number text,
  cuil_cuit text,
  first_name text,
  middle_name text,
  last_name text,
  birth_date date,
  gender text,
  nationality text,
  country_of_birth text,
  marital_status text,
  legal_name text,
  trade_name text,
  ruca_number text,
  email text,
  phone text,
  phone_alt text,
  country text,
  province text,
  city text,
  street text,
  street_number text,
  floor text,
  apartment text,
  postal_code text,
  economic_activity text,
  income_tax_status text,
  vat_status text,
  employment_status text,
  politically_exposed boolean,
  obliged_subject boolean,
  lawful_funds boolean,
  us_tax_resident boolean,
  terms_accepted_at timestamptz,
  registration_completed boolean not null default false,
  review_status text not null default 'NO_VERIFICADO'
    check (review_status in ('NO_VERIFICADO','PENDIENTE','EN_REVISION','OBSERVADO','VERIFICADO')),
  is_verified boolean not null default false,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.account_onboarding_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  review_status text not null default 'PENDIENTE'
    check (review_status in ('PENDIENTE','APROBADO','OBSERVADO')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.user_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_name text not null,
  account_type text not null,
  currency text not null,
  account_holder text not null,
  cbu_cvu text not null,
  alias text,
  created_at timestamptz not null default now(),
  unique(user_id,cbu_cvu)
);
create index if not exists account_onboarding_review_idx on public.account_onboarding(review_status,created_at desc);
create index if not exists account_onboarding_docs_user_idx on public.account_onboarding_documents(user_id,created_at desc);
alter table public.account_onboarding enable row level security;
alter table public.account_onboarding_documents enable row level security;
alter table public.user_bank_accounts enable row level security;
drop policy if exists account_onboarding_owner_select on public.account_onboarding;
create policy account_onboarding_owner_select on public.account_onboarding for select to authenticated using (user_id=auth.uid() or exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));
drop policy if exists account_onboarding_owner_insert on public.account_onboarding;
create policy account_onboarding_owner_insert on public.account_onboarding for insert to authenticated with check (user_id=auth.uid() and is_verified=false and review_status in ('NO_VERIFICADO','PENDIENTE'));
drop policy if exists account_onboarding_owner_update on public.account_onboarding;
create policy account_onboarding_owner_update on public.account_onboarding for update to authenticated using (user_id=auth.uid() or exists(select 1 from public.platform_admins a where a.user_id=auth.uid())) with check ((user_id=auth.uid() and is_verified=false and review_status in ('NO_VERIFICADO','PENDIENTE')) or exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));
drop policy if exists account_onboarding_admin_select on public.account_onboarding;
create policy account_onboarding_admin_select on public.account_onboarding for select to authenticated using (exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));
drop policy if exists account_onboarding_docs_owner_select on public.account_onboarding_documents;
create policy account_onboarding_docs_owner_select on public.account_onboarding_documents for select to authenticated using (user_id=auth.uid() or exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));
drop policy if exists account_onboarding_docs_owner_insert on public.account_onboarding_documents;
create policy account_onboarding_docs_owner_insert on public.account_onboarding_documents for insert to authenticated with check (user_id=auth.uid() and review_status='PENDIENTE');
drop policy if exists account_onboarding_docs_admin_update on public.account_onboarding_documents;
create policy account_onboarding_docs_admin_update on public.account_onboarding_documents for update to authenticated using (exists(select 1 from public.platform_admins a where a.user_id=auth.uid())) with check (exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));
drop policy if exists user_bank_accounts_owner_all on public.user_bank_accounts;
create policy user_bank_accounts_owner_all on public.user_bank_accounts for all to authenticated using (user_id=auth.uid() or exists(select 1 from public.platform_admins a where a.user_id=auth.uid())) with check (user_id=auth.uid() or exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));
-- Private identity documents remain in the existing private bucket.
drop policy if exists onboarding_docs_owner_insert on storage.objects;
create policy onboarding_docs_owner_insert on storage.objects for insert to authenticated with check (bucket_id='agrobroker-private' and (storage.foldername(name))[1]='onboarding' and (storage.foldername(name))[2]=auth.uid()::text);
drop policy if exists onboarding_docs_owner_read on storage.objects;
create policy onboarding_docs_owner_read on storage.objects for select to authenticated using (bucket_id='agrobroker-private' and ((storage.foldername(name))[1]='onboarding' and (storage.foldername(name))[2]=auth.uid()::text or exists(select 1 from public.platform_admins a where a.user_id=auth.uid())));
drop policy if exists onboarding_docs_owner_delete on storage.objects;
create policy onboarding_docs_owner_delete on storage.objects for delete to authenticated using (bucket_id='agrobroker-private' and (storage.foldername(name))[1]='onboarding' and (storage.foldername(name))[2]=auth.uid()::text);
