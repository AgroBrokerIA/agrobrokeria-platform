-- Bloque 19: matching bidireccional para publicaciones directas y de intermediarios verificados.
CREATE OR REPLACE FUNCTION public.guardar_compatibilidad_ia(
  p_publicacion_id uuid,p_empresa_id uuid,p_puntaje_total numeric,
  p_puntaje_producto numeric,p_puntaje_zona numeric,p_puntaje_cantidad numeric,
  p_puntaje_precio numeric,p_puntaje_historial numeric,
  p_puntaje_documentacion numeric,p_recomendada boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_id uuid;
  v_owner uuid;
  v_publisher uuid;
  v_intermediary uuid;
  v_active_company uuid;
  v_mapped_empresa uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT empresa_id,publicador_profile_id,intermediario_empresa_id
    INTO v_owner,v_publisher,v_intermediary
  FROM public.publicaciones WHERE id=p_publicacion_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PUBLICATION_NOT_FOUND'; END IF;

  SELECT active_company_id INTO v_active_company
  FROM public.profiles WHERE id=auth.uid();
  IF v_active_company IS NOT NULL THEN
    SELECT empresa_id INTO v_mapped_empresa
    FROM public.company_empresa_map
    WHERE company_id=v_active_company AND verified=true
    LIMIT 1;
  END IF;

  IF v_publisher=auth.uid() THEN
    IF v_owner IS NULL AND (v_intermediary IS NULL OR v_mapped_empresa IS DISTINCT FROM v_intermediary) THEN
      RAISE EXCEPTION 'INTERMEDIARY_LEGACY_NOT_VERIFIED';
    ELSIF v_owner IS NOT NULL AND v_mapped_empresa IS DISTINCT FROM v_owner THEN
      RAISE EXCEPTION 'PUBLICATION_COMPANY_NOT_VERIFIED';
    END IF;
  ELSIF v_owner IS NULL OR v_mapped_empresa IS DISTINCT FROM v_owner THEN
    RAISE EXCEPTION 'PUBLICATION_NOT_OWNED_BY_USER';
  END IF;

  IF p_empresa_id IS NULL OR p_empresa_id IN (v_owner,v_intermediary) THEN
    RAISE EXCEPTION 'INVALID_MATCH_CANDIDATE';
  END IF;

  INSERT INTO public.motor_compatibilidad(
    publicacion_id,empresa_id,puntaje_total,puntaje_producto,puntaje_zona,
    puntaje_cantidad,puntaje_precio,puntaje_historial,puntaje_documentacion,recomendada
  ) VALUES (
    p_publicacion_id,p_empresa_id,p_puntaje_total,p_puntaje_producto,p_puntaje_zona,
    p_puntaje_cantidad,p_puntaje_precio,p_puntaje_historial,p_puntaje_documentacion,p_recomendada
  )
  ON CONFLICT(publicacion_id,empresa_id) DO UPDATE SET
    puntaje_total=EXCLUDED.puntaje_total,
    puntaje_producto=EXCLUDED.puntaje_producto,
    puntaje_zona=EXCLUDED.puntaje_zona,
    puntaje_cantidad=EXCLUDED.puntaje_cantidad,
    puntaje_precio=EXCLUDED.puntaje_precio,
    puntaje_historial=EXCLUDED.puntaje_historial,
    puntaje_documentacion=EXCLUDED.puntaje_documentacion,
    recomendada=EXCLUDED.recomendada;

  SELECT id INTO v_id FROM public.motor_compatibilidad
  WHERE publicacion_id=p_publicacion_id AND empresa_id=p_empresa_id LIMIT 1;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.crear_oportunidad_ia(
  p_publicacion_id uuid,p_empresa_id uuid,p_indice_compatibilidad numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_id uuid;
  v_owner uuid;
  v_publisher uuid;
  v_intermediary uuid;
  v_active_company uuid;
  v_mapped_empresa uuid;
  v_score numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT empresa_id,publicador_profile_id,intermediario_empresa_id
    INTO v_owner,v_publisher,v_intermediary
  FROM public.publicaciones WHERE id=p_publicacion_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PUBLICATION_NOT_FOUND'; END IF;

  SELECT active_company_id INTO v_active_company
  FROM public.profiles WHERE id=auth.uid();
  IF v_active_company IS NOT NULL THEN
    SELECT empresa_id INTO v_mapped_empresa
    FROM public.company_empresa_map
    WHERE company_id=v_active_company AND verified=true
    LIMIT 1;
  END IF;

  IF v_publisher=auth.uid() THEN
    IF v_owner IS NULL AND (v_intermediary IS NULL OR v_mapped_empresa IS DISTINCT FROM v_intermediary) THEN
      RAISE EXCEPTION 'INTERMEDIARY_LEGACY_NOT_VERIFIED';
    ELSIF v_owner IS NOT NULL AND v_mapped_empresa IS DISTINCT FROM v_owner THEN
      RAISE EXCEPTION 'PUBLICATION_COMPANY_NOT_VERIFIED';
    END IF;
  ELSIF v_owner IS NULL OR v_mapped_empresa IS DISTINCT FROM v_owner THEN
    RAISE EXCEPTION 'PUBLICATION_NOT_OWNED_BY_USER';
  END IF;

  IF p_empresa_id IS NULL OR p_empresa_id IN (v_owner,v_intermediary) THEN
    RAISE EXCEPTION 'INVALID_MATCH_CANDIDATE';
  END IF;

  SELECT mc.puntaje_total INTO v_score
  FROM public.motor_compatibilidad mc
  WHERE mc.publicacion_id=p_publicacion_id AND mc.empresa_id=p_empresa_id AND mc.recomendada=true
  ORDER BY mc.puntaje_total DESC LIMIT 1;
  IF v_score IS NULL THEN RAISE EXCEPTION 'NO_RECOMMENDED_MATCH'; END IF;

  SELECT id INTO v_id FROM public.oportunidades
  WHERE publicacion_id=p_publicacion_id AND empresa_id=p_empresa_id LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.oportunidades(publicacion_id,empresa_id,indice_compatibilidad,estado)
  VALUES(p_publicacion_id,p_empresa_id,v_score,'NUEVA')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

DO $migration$
DECLARE
  v_def text := pg_get_functiondef('public.calcular_smart_matches(uuid)'::regprocedure);
  v_old text;
  v_new text;
BEGIN
  v_old := 'and cem.empresa_id=v_publicacion.empresa_id';
  v_new := 'and ((v_publicacion.empresa_id is not null and cem.empresa_id=v_publicacion.empresa_id) or (v_publicacion.empresa_id is null and v_publicacion.publicador_profile_id=auth.uid() and cem.empresa_id=v_publicacion.intermediario_empresa_id))';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SMART_MATCH_AUTH_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_def := replace(v_def,'where e.id<>v_publicacion.empresa_id',
    'where e.id<>coalesce(v_publicacion.intermediario_empresa_id,v_publicacion.empresa_id)');
  v_def := replace(v_def,'and ep.compra=true',
    'and (case when v_publicacion.tipo=''VENTA'' then ep.compra else ep.venta end)=true');
  v_def := replace(v_def,'op.rol=''COMPRADOR''',
    'op.rol=case when v_publicacion.tipo=''VENTA'' then ''COMPRADOR'' else ''VENDEDOR'' end');
  IF position('v_publicacion.intermediario_empresa_id' in v_def)=0
     OR position('case when v_publicacion.tipo=' in v_def)=0 THEN
    RAISE EXCEPTION 'SMART_MATCH_MULTI_ACTOR_PATCH_FAILED';
  END IF;
  EXECUTE v_def;
END
$migration$;

REVOKE ALL ON FUNCTION public.guardar_compatibilidad_ia(uuid,uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.guardar_compatibilidad_ia(uuid,uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.crear_oportunidad_ia(uuid,uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crear_oportunidad_ia(uuid,uuid,numeric) TO authenticated;
