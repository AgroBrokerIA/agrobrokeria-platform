-- Enforce the Argentine CUIL checksum in the database, not only in the form.
grant execute on function public.validar_cuit_cuil(text) to authenticated;
alter table public.logistica_choferes drop constraint if exists logistica_choferes_cuil_checksum;
alter table public.logistica_choferes add constraint logistica_choferes_cuil_checksum
 check (public.validar_cuit_cuil(cuil_chofer));
