DROP POLICY IF EXISTS reprogramacion_insert_carrier ON public.solicitudes_reprogramacion_puerto;
CREATE POLICY reprogramacion_insert_carrier ON public.solicitudes_reprogramacion_puerto FOR INSERT TO authenticated
 WITH CHECK(solicitado_por=auth.uid() AND estado='PENDIENTE'
  AND EXISTS(SELECT 1 FROM public.viajes v WHERE v.id=solicitudes_reprogramacion_puerto.viaje_id AND v.transportista_profile_id=auth.uid() AND v.estado NOT IN ('ENTREGADO_CONFIRMADO','CANCELADO'))
  AND EXISTS(SELECT 1 FROM public.congestion_puertos cp WHERE cp.terminal_id=solicitudes_reprogramacion_puerto.terminal_id AND cp.nivel IN ('ALTA','CRITICA')));
