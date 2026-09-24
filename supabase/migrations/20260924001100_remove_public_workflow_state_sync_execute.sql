-- Remove the implicit PUBLIC execute grant from the internal workflow sync RPC.
revoke execute on function public.sincronizar_estado_operacion_desde_workflow() from public;
grant execute on function public.sincronizar_estado_operacion_desde_workflow() to authenticated;
