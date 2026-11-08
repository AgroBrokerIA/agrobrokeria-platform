-- Administración necesita auditar todos los pagos registrados; los usuarios comunes solo ven operaciones propias.
drop policy if exists pagos_select_platform_admin on public.pagos;
create policy pagos_select_platform_admin on public.pagos
for select to authenticated
using (exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));