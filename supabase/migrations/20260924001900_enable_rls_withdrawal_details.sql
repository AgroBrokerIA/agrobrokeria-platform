-- This detail table is internal to withdrawal settlement RPCs.
-- No authenticated/anon table policies are granted; service_role/postgres remain available.
alter table public.retiros_comisiones_detalle enable row level security;
