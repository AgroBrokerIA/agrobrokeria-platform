CREATE TABLE IF NOT EXISTS public.solicitudes_reprogramacion_puerto (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),viaje_id uuid NOT NULL REFERENCES public.viajes(id) ON DELETE RESTRICT,
 terminal_id uuid NOT NULL REFERENCES public.terminales_puerto(id) ON DELETE RESTRICT,
 terminal_alternativa_id uuid REFERENCES public.terminales_puerto(id) ON DELETE RESTRICT,
 tipo_solicitud text NOT NULL CHECK(tipo_solicitud IN ('REPROGRAMAR_12H','DESVIO_TERMINAL')),
 motivo text NOT NULL CHECK(length(trim(motivo)) BETWEEN 5 AND 2000),
 estado text NOT NULL DEFAULT 'PENDIENTE' CHECK(estado IN ('PENDIENTE','APROBADA','RECHAZADA','CANCELADA','COMPLETADA')),
 solicitado_por uuid NOT NULL REFERENCES auth.users(id),revisado_por uuid REFERENCES auth.users(id),revisado_at timestamptz,
 observaciones_revision text,creado_at timestamptz NOT NULL DEFAULT now(),actualizado_at timestamptz NOT NULL DEFAULT now(),
 CHECK((tipo_solicitud='REPROGRAMAR_12H' AND terminal_alternativa_id IS NULL) OR (tipo_solicitud='DESVIO_TERMINAL' AND terminal_alternativa_id IS NOT NULL AND terminal_alternativa_id<>terminal_id))
);
CREATE INDEX IF NOT EXISTS solicitudes_reprogramacion_viaje_idx ON public.solicitudes_reprogramacion_puerto(viaje_id,estado,creado_at DESC);
ALTER TABLE public.solicitudes_reprogramacion_puerto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reprogramacion_select_parties ON public.solicitudes_reprogramacion_puerto;
CREATE POLICY reprogramacion_select_parties ON public.solicitudes_reprogramacion_puerto FOR SELECT TO authenticated
 USING(public.es_administrador_plataforma() OR EXISTS(SELECT 1 FROM public.viajes v WHERE v.id=solicitudes_reprogramacion_puerto.viaje_id AND (v.transportista_profile_id=auth.uid() OR public.usuario_participa_operacion(v.operacion_id))));
DROP POLICY IF EXISTS reprogramacion_insert_carrier ON public.solicitudes_reprogramacion_puerto;
CREATE POLICY reprogramacion_insert_carrier ON public.solicitudes_reprogramacion_puerto FOR INSERT TO authenticated
 WITH CHECK(solicitado_por=auth.uid() AND estado='PENDIENTE' AND EXISTS(SELECT 1 FROM public.viajes v WHERE v.id=solicitudes_reprogramacion_puerto.viaje_id AND v.transportista_profile_id=auth.uid() AND v.estado NOT IN ('ENTREGADO_CONFIRMADO','CANCELADO')) AND EXISTS(SELECT 1 FROM public.congestion_puertos cp WHERE cp.terminal_id=solicitudes_reprogramacion_puerto.terminal_id AND cp.nivel IN ('ALTA','CRITICA')));
DROP POLICY IF EXISTS reprogramacion_update_admin ON public.solicitudes_reprogramacion_puerto;
CREATE POLICY reprogramacion_update_admin ON public.solicitudes_reprogramacion_puerto FOR UPDATE TO authenticated USING(public.es_administrador_plataforma()) WITH CHECK(public.es_administrador_plataforma());
DROP POLICY IF EXISTS reprogramacion_cancel_owner ON public.solicitudes_reprogramacion_puerto;
CREATE POLICY reprogramacion_cancel_owner ON public.solicitudes_reprogramacion_puerto FOR UPDATE TO authenticated USING(solicitado_por=auth.uid() AND estado='PENDIENTE') WITH CHECK(solicitado_por=auth.uid() AND estado='CANCELADA');
