-- Repair deterministic workflow state for legacy accepted operations.
-- Do not invent participants, agreements or contracts.
-- Every accepted operation must start at stage 1 when no valid workflow exists.
DO $$
DECLARE
  v_workflow_id uuid := '02771a76-52e3-44bb-ad74-134001e2fdee';
  v_stage1_id uuid := '7a26ec65-6243-4ac9-8f0b-de2d9e8f5399';
BEGIN
  INSERT INTO public.operacion_workflow
    (operacion_id, workflow_id, etapa_actual_id, estado)
  SELECT o.id, v_workflow_id, v_stage1_id, 'EN_CURSO'
  FROM public.operaciones o
  WHERE o.estado = 'ACEPTADA'
    AND NOT EXISTS (
      SELECT 1 FROM public.operacion_workflow ow
      WHERE ow.operacion_id = o.id
    );

  INSERT INTO public.workflow_historial
    (operacion_workflow_id, etapa_id, fecha_inicio, usuario_id, observaciones)
  SELECT ow.id, v_stage1_id, COALESCE(ow.creado_en, now()), NULL,
         'Inicialización de workflow para operación aceptada existente.'
  FROM public.operacion_workflow ow
  WHERE ow.workflow_id = v_workflow_id
    AND ow.etapa_actual_id = v_stage1_id
    AND NOT EXISTS (
      SELECT 1 FROM public.workflow_historial wh
      WHERE wh.operacion_workflow_id = ow.id
    );

  UPDATE public.workflow_historial wh
  SET fecha_fin = COALESCE(wh.fecha_fin, now()),
      observaciones = concat_ws(' ', wh.observaciones,
        'Reparación automática: sin acuerdo comercial CONFIRMADO.')
  FROM public.operacion_workflow ow
  JOIN public.workflow_etapas e ON e.id = ow.etapa_actual_id
  WHERE wh.operacion_workflow_id = ow.id
    AND e.orden = 2
    AND NOT EXISTS (
      SELECT 1 FROM public.acuerdos_comerciales a
      WHERE a.operacion_id = ow.operacion_id
        AND upper(coalesce(a.estado,'')) = 'CONFIRMADO'
    )
    AND wh.etapa_id = ow.etapa_actual_id
    AND wh.fecha_fin IS NULL;

  UPDATE public.operacion_workflow ow
  SET etapa_actual_id = v_stage1_id,
      estado = 'EN_CURSO'
  WHERE ow.workflow_id = v_workflow_id
    AND EXISTS (
      SELECT 1
      FROM public.workflow_etapas e
      WHERE e.id = ow.etapa_actual_id
        AND e.orden = 2
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.acuerdos_comerciales a
      WHERE a.operacion_id = ow.operacion_id
        AND upper(coalesce(a.estado,'')) = 'CONFIRMADO'
    );

  INSERT INTO public.workflow_historial
    (operacion_workflow_id, etapa_id, fecha_inicio, usuario_id, observaciones)
  SELECT ow.id, v_stage1_id, now(), NULL,
         'Reingreso a etapa Oferta aceptada por ausencia de acuerdo confirmado.'
  FROM public.operacion_workflow ow
  WHERE ow.workflow_id = v_workflow_id
    AND ow.etapa_actual_id = v_stage1_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.workflow_historial wh
      WHERE wh.operacion_workflow_id = ow.id
        AND wh.etapa_id = v_stage1_id
        AND wh.fecha_fin IS NULL
    );
END $$;
