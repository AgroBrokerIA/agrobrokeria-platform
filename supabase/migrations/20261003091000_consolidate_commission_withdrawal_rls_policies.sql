-- Consolidate overlapping withdrawal RLS policies.
-- The own/admin SELECT policy already covers the narrower "retiros propios"
-- condition. The deny-all policy on withdrawal detail remains intentional,
-- but is restrictive so it cannot become an additional permissive policy.

drop policy if exists "retiros propios" on public.retiros_comisiones;

drop policy if exists "retiros_comisiones_detalle_deny_authenticated"
on public.retiros_comisiones_detalle;

create policy "retiros_comisiones_detalle_deny_authenticated"
on public.retiros_comisiones_detalle
as restrictive
for all
to authenticated
using (false)
with check (false);
