create table if not exists public.mercadopago_oauth_states (
  nonce text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  code_verifier_enc text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_mercadopago_oauth_states_expires_at
  on public.mercadopago_oauth_states (expires_at);

alter table public.mercadopago_oauth_states enable row level security;
revoke all on public.mercadopago_oauth_states from anon, authenticated;
grant all on public.mercadopago_oauth_states to service_role;

drop policy if exists "Service role manages Mercado Pago OAuth states"
  on public.mercadopago_oauth_states;
create policy "Service role manages Mercado Pago OAuth states"
  on public.mercadopago_oauth_states
  for all
  to service_role
  using (true)
  with check (true);
