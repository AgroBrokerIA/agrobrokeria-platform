drop policy if exists contrato_firmantes_insert on public.contrato_firmantes;
drop policy if exists contrato_firmantes_update on public.contrato_firmantes;
drop policy if exists contrato_firmantes_delete on public.contrato_firmantes;

drop policy if exists contrato_firmantes_deny_direct_mutation on public.contrato_firmantes;
create policy contrato_firmantes_deny_direct_mutation
on public.contrato_firmantes
as restrictive
for all
to authenticated
using (false)
with check (false);
