-- Trigger-only functions must not be callable through PostgREST by anonymous or authenticated clients.
revoke all on function public.enforce_arca_production_gate() from public, anon, authenticated;
revoke all on function public.notificar_inicio_logistica_viaje() from public, anon, authenticated;
grant execute on function public.enforce_arca_production_gate() to service_role;
grant execute on function public.notificar_inicio_logistica_viaje() to service_role;

-- Keep the unique constraint index; remove the duplicate unique index.
drop index if exists public.empresa_membretes_empresa_id_uidx;
