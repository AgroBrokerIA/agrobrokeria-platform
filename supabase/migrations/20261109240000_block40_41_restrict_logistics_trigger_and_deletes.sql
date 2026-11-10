-- Trigger-only function must not be callable through PostgREST RPC.
revoke all on function public.liberar_camion_tras_descarga_confirmada() from public,anon,authenticated;
-- Keep resource history: deactivate records instead of deleting them.
drop policy if exists logistica_flota_delete_member on public.logistica_flota_camiones;
drop policy if exists logistica_choferes_delete_member on public.logistica_choferes;
revoke delete on table public.logistica_flota_camiones from anon,authenticated;
revoke delete on table public.logistica_choferes from anon,authenticated;
