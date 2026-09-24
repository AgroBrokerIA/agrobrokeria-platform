-- Restrict the internal workflow-state synchronization RPC.
-- It is invoked by database triggers, not by anonymous REST callers.
revoke execute on function public.sincronizar_estado_operacion_desde_workflow() from anon;
grant execute on function public.sincronizar_estado_operacion_desde_workflow() to authenticated;
