drop policy if exists operacion_control_comercial_insert on public.operacion_control_comercial;
drop policy if exists operacion_control_comercial_update on public.operacion_control_comercial;
drop policy if exists operacion_control_comercial_delete on public.operacion_control_comercial;
create policy operacion_control_comercial_deny_direct_mutation
on public.operacion_control_comercial
as restrictive for all to authenticated
using(false) with check(false);

drop policy if exists operacion_workflow_insert on public.operacion_workflow;
drop policy if exists operacion_workflow_update on public.operacion_workflow;
drop policy if exists operacion_workflow_delete on public.operacion_workflow;
create policy operacion_workflow_deny_direct_mutation
on public.operacion_workflow
as restrictive for all to authenticated
using(false) with check(false);

drop policy if exists workflow_historial_insert_participante on public.workflow_historial;
drop policy if exists workflow_historial_delete_none on public.workflow_historial;
drop policy if exists workflow_historial_update_none on public.workflow_historial;
create policy workflow_historial_deny_direct_mutation
on public.workflow_historial
as restrictive for all to authenticated
using(false) with check(false);
