-- Resolve a participant's legal-entity ID from the active company mapping when uploading signed contract copies.
DO $$
DECLARE v_def text; v_old text; v_new text;
BEGIN
  v_def := pg_get_functiondef('public.registrar_copia_firmada_contrato(uuid,text,text,text,text)'::regprocedure);
  v_old := '  v_company uuid;';
  v_new := '  v_company uuid;'||chr(10)||'  v_empresa uuid;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SIGNED_COPY_COMPANY_VAR_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := E'  IF NOT EXISTS (\n    SELECT 1\n      FROM public.operacion_participantes op\n     WHERE op.operacion_id = v_contract.operacion_id\n       AND op.empresa_id = v_company\n       AND upper(op.rol) = p_rol\n  ) THEN\n    RAISE EXCEPTION ''ROLE_NOT_ASSIGNED_TO_ACTIVE_COMPANY'';\n  END IF;';
  v_new := E'  SELECT op.empresa_id INTO v_empresa\n    FROM public.operacion_participantes op\n   WHERE op.operacion_id = v_contract.operacion_id\n     AND (op.empresa_id = v_company OR EXISTS (\n       SELECT 1 FROM public.company_empresa_map cem\n        WHERE cem.company_id = v_company AND cem.empresa_id = op.empresa_id AND cem.verified = true\n     ))\n     AND CASE\n       WHEN upper(op.rol) IN (''VENDEDOR'',''PRODUCTOR'',''SELLER'') THEN ''VENDEDOR''\n       WHEN upper(op.rol) IN (''COMPRADOR'',''BUYER'') THEN ''COMPRADOR''\n       ELSE upper(op.rol)\n     END = p_rol\n   ORDER BY (op.empresa_id = v_company) DESC\n   LIMIT 1;\n  IF v_empresa IS NULL THEN RAISE EXCEPTION ''ROLE_NOT_ASSIGNED_TO_ACTIVE_COMPANY''; END IF;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SIGNED_COPY_ROLE_CHECK_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_def := replace(v_def,'AND cf.empresa_id = v_company','AND cf.empresa_id = v_empresa');
  v_def := replace(v_def,'v_contract.operacion_id, v_version, v_company, p_rol,','v_contract.operacion_id, v_version, v_empresa, p_rol,');
  EXECUTE v_def;

  v_def := pg_get_functiondef('public.sincronizar_workflow_firmas_contrato(uuid)'::regprocedure);
  v_old := E'  select count(distinct rol) into v_requeridas\n  from public.operacion_participantes\n  where operacion_id=v_contrato.operacion_id\n    and rol in (''VENDEDOR'',''COMPRADOR'');';
  v_new := E'  select count(distinct case\n    when upper(rol) in (''VENDEDOR'',''PRODUCTOR'',''SELLER'') then ''VENDEDOR''\n    when upper(rol) in (''COMPRADOR'',''BUYER'') then ''COMPRADOR''\n    else null end) into v_requeridas\n  from public.operacion_participantes\n  where operacion_id=v_contrato.operacion_id;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SIGNED_COPY_REQUIRED_ROLES_ANCHOR_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);
END $$;