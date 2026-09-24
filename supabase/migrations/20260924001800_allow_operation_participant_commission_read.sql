-- Platform commission rows have no customer company/profile owner.
-- Participants must still be able to read the ledger entry for their operation.
drop policy if exists "operacion_comisiones_select" on public.operacion_comisiones;

create policy "operacion_comisiones_select"
on public.operacion_comisiones
for select
to authenticated
using (
  profile_id = auth.uid()
  or empresa_id in (
    select cu.company_id
    from public.company_users cu
    where cu.profile_id = auth.uid()
      and cu.activo = true
  )
  or (
    operacion_id is not null
    and public.usuario_participa_operacion(operacion_id)
  )
);
