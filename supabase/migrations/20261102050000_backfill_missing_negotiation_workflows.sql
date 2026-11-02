-- Repair legacy operations that were created without their workflow row.
-- Only operations still in NEGOCIACION are initialized at stage 1; no commercial
-- or financial stage is inferred or advanced by this migration.
DO $$
DECLARE
  v_workflow_id uuid;
  v_stage_id uuid;
  v_operation record;
BEGIN
  SELECT id INTO v_workflow_id
  FROM public.workflows
  WHERE nombre = 'Operación de granos'
  ORDER BY id
  LIMIT 1;

  IF v_workflow_id IS NULL THEN
    RAISE EXCEPTION 'No existe el workflow Operación de granos.';
  END IF;

  SELECT id INTO v_stage_id
  FROM public.workflow_etapas
  WHERE workflow_id = v_workflow_id AND orden = 1
  LIMIT 1;

  IF v_stage_id IS NULL THEN
    RAISE EXCEPTION 'No existe la etapa inicial del workflow Operación de granos.';
  END IF;

  FOR v_operation IN
    SELECT o.id
    FROM public.operaciones o
    WHERE o.estado = 'NEGOCIACION'
      AND NOT EXISTS (
        SELECT 1 FROM public.operacion_workflow ow
        WHERE ow.operacion_id = o.id
      )
  LOOP
    INSERT INTO public.operacion_workflow (operacion_id, workflow_id, etapa_actual_id, estado)
    VALUES (v_operation.id, v_workflow_id, v_stage_id, 'EN_PROCESO')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.workflow_historial
      (operacion_workflow_id, etapa_id, fecha_inicio, observaciones)
    SELECT ow.id, v_stage_id, now(),
      'Workflow inicializado en etapa 1 durante reparación de operaciones sin workflow.'
    FROM public.operacion_workflow ow
    WHERE ow.operacion_id = v_operation.id
      AND ow.workflow_id = v_workflow_id
      AND NOT EXISTS (
        SELECT 1 FROM public.workflow_historial wh
        WHERE wh.operacion_workflow_id = ow.id
      );
  END LOOP;
END $$;
