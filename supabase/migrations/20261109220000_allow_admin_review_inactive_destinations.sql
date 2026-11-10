-- Administrators can review and reactivate inactive destinations; normal users see active destinations only.
drop policy if exists destinos_homologados_select_active on public.destinos_homologados;
create policy destinos_homologados_select_active on public.destinos_homologados
for select to authenticated
using (activo=true or public.es_administrador_plataforma());
