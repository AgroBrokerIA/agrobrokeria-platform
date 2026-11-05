CREATE OR REPLACE FUNCTION public.obtener_workflows_operaciones_usuario(p_operacion_ids uuid[])
RETURNS TABLE (
  id uuid,
  operacion_id uuid,
  workflow_id uuid,
  etapa_actual_id uuid,
  estado text,
  orden integer,
  nombre_etapa text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida.';
  END IF;

  RETURN QUERY
  SELECT
    ow.id,
    ow.operacion_id,
    ow.workflow_id,
    ow.etapa_actual_id,
    ow.estado::text,
    we.orden,
    we.nombre::text
  FROM public.operacion_workflow ow
  JOIN public.workflow_etapas we
    ON we.id = ow.etapa_actual_id
   AND we.workflow_id = ow.workflow_id
  WHERE ow.operacion_id = ANY(COALESCE(p_operacion_ids, ARRAY[]::uuid[]))
    AND (
      public.usuario_participa_operacion(ow.operacion_id)
      OR public.es_administrador_plataforma()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_workflows_operaciones_usuario(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_workflows_operaciones_usuario(uuid[]) TO authenticated;
