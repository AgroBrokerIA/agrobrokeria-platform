-- Avoid double-counting an operation when one company appears in multiple participant roles.
CREATE OR REPLACE FUNCTION public.recalcular_reputacion_empresa(p_empresa_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_realizadas integer; v_exitosas integer; v_canceladas integer; v_tn numeric; v_last timestamptz; v_score integer;
BEGIN
  WITH company_operations AS (
    SELECT DISTINCT o.id,o.estado,o.cantidad_tn,o.actualizada_en
    FROM public.operaciones o
    JOIN public.operacion_participantes op ON op.operacion_id=o.id
    WHERE op.empresa_id=p_empresa_id
  )
  SELECT count(*) FILTER(WHERE estado='CERRADA'),
    count(*) FILTER(WHERE estado IN ('ANULADA','CANCELADA')),
    coalesce(sum(CASE WHEN estado='CERRADA' THEN cantidad_tn ELSE 0 END),0),
    max(actualizada_en)
  INTO v_exitosas,v_canceladas,v_tn,v_last
  FROM company_operations;
  v_realizadas:=v_exitosas+v_canceladas;
  IF v_realizadas=0 THEN v_score:=0;
  ELSE v_score:=greatest(0,least(100,round(
    (v_exitosas::numeric/nullif(v_realizadas,0))*70 + least(30,v_exitosas*3) - least(20,v_canceladas*5)
  )::integer)); END IF;
  UPDATE public.empresas SET reputacion_score=v_score,operaciones_realizadas=v_realizadas,
    operaciones_exitosas=v_exitosas,operaciones_canceladas=v_canceladas,toneladas_operadas=v_tn,
    ultima_operacion_at=v_last,agrobroker_score=v_score,actualizado_en=now() WHERE id=p_empresa_id;
  DELETE FROM public.empresas_calificaciones WHERE empresa_id=p_empresa_id;
  INSERT INTO public.empresas_calificaciones(empresa_id,agrobroker_score,operaciones_exitosas,operaciones_canceladas,tiempo_promedio_respuesta,actualizado_en)
  VALUES(p_empresa_id,v_score,v_exitosas,v_canceladas,NULL,now());
END;
$$;
REVOKE ALL ON FUNCTION public.recalcular_reputacion_empresa(uuid) FROM PUBLIC,anon,authenticated;
