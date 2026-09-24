-- Internal trigger helper: it is not an application RPC.
-- Workflow/operation consistency is maintained by the database trigger.
revoke execute on function public.sincronizar_estado_operacion_desde_workflow() from public;
revoke execute on function public.sincronizar_estado_operacion_desde_workflow() from anon;
revoke execute on function public.sincronizar_estado_operacion_desde_workflow() from authenticated;
