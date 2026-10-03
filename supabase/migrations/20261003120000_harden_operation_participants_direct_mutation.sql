drop policy if exists operacion_participantes_insert on public.operacion_participantes;
drop policy if exists operacion_participantes_update on public.operacion_participantes;
drop policy if exists operacion_participantes_delete on public.operacion_participantes;

create policy operacion_participantes_deny_direct_mutation
on public.operacion_participantes
as restrictive
for all
to authenticated
using(false)
with check(false);
