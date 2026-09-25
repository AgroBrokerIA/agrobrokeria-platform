create policy "arca_tickets_acceso_deny_authenticated"
on public.arca_tickets_acceso
for all
to authenticated
using (false)
with check (false);

create policy "retiros_comisiones_detalle_deny_authenticated"
on public.retiros_comisiones_detalle
for all
to authenticated
using (false)
with check (false);
