-- Role-aware SISA gate and safe publication persistence for intermediaries.
-- SISA is not a universal prerequisite for an intermediary's own account.
-- The represented grain owner remains subject to the applicable fiscal/sectoral checks.

DO $migration$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  -- Exempt only authenticated active members of a company whose commercial
  -- classification is explicitly INTERMEDIARIO. This is not an admin bypass
  -- and does not grant ownership of a represented seller's goods.
  v_def := pg_get_functiondef('public.perfil_habilitado_sisa(uuid)'::regprocedure);
  v_old := $anchor$
  select active_company_id into v_company
  from public.profiles
  where id=p_profile_id;
$anchor$;
  v_new := v_old || $patch$
  IF v_company IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.company_empresa_map cem ON cem.company_id=cu.company_id
    JOIN public.empresas e ON e.id=cem.empresa_id
    WHERE cu.company_id=v_company
      AND cu.profile_id=p_profile_id
      AND cu.activo=true
      AND e.activa=true
      AND upper(trim(coalesce(e.tipo_empresa,'')))='INTERMEDIARIO'
  ) THEN
    RETURN true;
  END IF;

$patch$;
  IF position(v_old in v_def)=0 THEN
    RAISE EXCEPTION 'SISA_PROFILE_COMPANY_ANCHOR_NOT_FOUND';
  END IF;
  EXECUTE replace(v_def,v_old,v_new);

  -- Legacy platform intermediary profiles may have a null tipo_usuario.
  -- Infer the role only from an active company membership and the linked
  -- commercial company type; never from user-editable metadata.
  v_def := pg_get_functiondef('public.guardar_publicacion(uuid,jsonb)'::regprocedure);
  v_old := $anchor$
 select active_company_id,email,lower(coalesce(tipo_usuario,'')) into v_company,v_email,v_tipo_usuario from public.profiles where id=v_uid;
$anchor$;
  v_new := v_old || $patch$
 IF coalesce(v_tipo_usuario,'')='' AND v_company IS NOT NULL AND EXISTS (
   SELECT 1
   FROM public.company_users cu
   JOIN public.company_empresa_map cem ON cem.company_id=cu.company_id
   JOIN public.empresas e ON e.id=cem.empresa_id
   WHERE cu.company_id=v_company
     AND cu.profile_id=v_uid
     AND cu.activo=true
     AND e.activa=true
     AND upper(trim(coalesce(e.tipo_empresa,'')))='INTERMEDIARIO'
 ) THEN
   v_tipo_usuario := 'intermediario';
 END IF;
$patch$;
  IF position(v_old in v_def)=0 THEN
    RAISE EXCEPTION 'PUBLICATION_PROFILE_ROLE_ANCHOR_NOT_FOUND';
  END IF;
  v_def := replace(v_def,v_old,v_new);

  -- Persist all COMEX/quality fields already collected by the publication form.
  v_old := $anchor$v_puertos,v_lugares)$anchor$;
  v_new := $patch$v_puertos,v_lugares,
    coalesce(nullif(p_datos->>'base_precio_cbot','')::boolean,false),
    nullif(p_datos->>'premium_cbot','')::numeric,
    nullif(p_datos->>'humedad_maxima','')::numeric,
    nullif(p_datos->>'materia_extrana_maxima','')::numeric,
    nullif(p_datos->>'aflatoxinas_max_ppb','')::numeric,
    nullif(p_datos->>'proteina_minima','')::numeric,
    nullif(p_datos->>'granos_danados_maximos','')::numeric,
    nullif(p_datos->>'granos_quebrados_maximos','')::numeric,
    ARRAY(SELECT jsonb_array_elements_text(coalesce(p_datos->'instrumentos_pago_internacional','[]'::jsonb))),
    nullif(p_datos->>'tipo_buque',''),
    nullif(p_datos->>'cantidad_envios','')::integer,
    nullif(p_datos->>'toneladas_por_envio','')::numeric,
    nullif(p_datos->>'puerto_origen_destino',''),
    nullif(p_datos->>'pais_destino',''))$patch$;
  IF position(v_old in v_def)=0 THEN
    RAISE EXCEPTION 'PUBLICATION_INSERT_VALUES_ANCHOR_NOT_FOUND';
  END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := $anchor$puertos,lugares_recepcion)$anchor$;
  v_new := $patch$puertos,lugares_recepcion,base_precio_cbot,premium_cbot,humedad_maxima,materia_extrana_maxima,aflatoxinas_max_ppb,proteina_minima,granos_danados_maximos,granos_quebrados_maximos,instrumentos_pago_internacional,tipo_buque,cantidad_envios,toneladas_por_envio,puerto_origen_destino,pais_destino)$patch$;
  IF position(v_old in v_def)=0 THEN
    RAISE EXCEPTION 'PUBLICATION_INSERT_COLUMNS_ANCHOR_NOT_FOUND';
  END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := $anchor$puertos=v_puertos,lugares_recepcion=v_lugares,actualizada_en=now()$anchor$;
  v_new := $patch$puertos=v_puertos,
    lugares_recepcion=v_lugares,
    base_precio_cbot=coalesce(nullif(p_datos->>'base_precio_cbot','')::boolean,false),
    premium_cbot=nullif(p_datos->>'premium_cbot','')::numeric,
    humedad_maxima=nullif(p_datos->>'humedad_maxima','')::numeric,
    materia_extrana_maxima=nullif(p_datos->>'materia_extrana_maxima','')::numeric,
    aflatoxinas_max_ppb=nullif(p_datos->>'aflatoxinas_max_ppb','')::numeric,
    proteina_minima=nullif(p_datos->>'proteina_minima','')::numeric,
    granos_danados_maximos=nullif(p_datos->>'granos_danados_maximos','')::numeric,
    granos_quebrados_maximos=nullif(p_datos->>'granos_quebrados_maximos','')::numeric,
    instrumentos_pago_internacional=ARRAY(SELECT jsonb_array_elements_text(coalesce(p_datos->'instrumentos_pago_internacional','[]'::jsonb))),
    tipo_buque=nullif(p_datos->>'tipo_buque',''),
    cantidad_envios=nullif(p_datos->>'cantidad_envios','')::integer,
    toneladas_por_envio=nullif(p_datos->>'toneladas_por_envio','')::numeric,
    puerto_origen_destino=nullif(p_datos->>'puerto_origen_destino',''),
    pais_destino=nullif(p_datos->>'pais_destino',''),
    actualizada_en=now()$patch$;
  IF position(v_old in v_def)=0 THEN
    RAISE EXCEPTION 'PUBLICATION_UPDATE_FIELDS_ANCHOR_NOT_FOUND';
  END IF;
  v_def := replace(v_def,v_old,v_new);

  EXECUTE v_def;
END
$migration$;
