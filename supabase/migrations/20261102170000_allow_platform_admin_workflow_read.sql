-- Platform administrators can inspect workflow stages for every operation they administer.
-- Ordinary users remain restricted to operations in which they are participants.
DROP POLICY IF EXISTS operacion_workflow_select ON public.operacion_workflow;

CREATE POLICY operacion_workflow_select
ON public.operacion_workflow
FOR SELECT
TO authenticated
USING (
  public.usuario_participa_operacion(operacion_id)
  OR public.es_administrador_plataforma()
);
