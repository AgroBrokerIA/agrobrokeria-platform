DO $migration$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.registrar_onboarding_alta_usuario()'::regprocedure);
  v_old := 'user_id,account_type,role,document_type,document_number,cuil_cuit,';
  v_new := 'user_id,account_type,role,tipo_operador,document_type,document_number,cuil_cuit,';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'ONBOARDING_COLUMN_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_old := E'CASE WHEN v_type=''EMPRESA'' THEN ''EMPRESA'' ELSE ''PERSONA'' END,\n    v_role,';
  v_new := E'CASE WHEN v_type=''EMPRESA'' THEN ''EMPRESA'' ELSE ''PERSONA'' END,\n    v_role,nullif(m->>''tipo_operador'',''''),';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'ONBOARDING_VALUE_ANCHOR_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);

  v_def := pg_get_functiondef('public.sincronizar_empresa_desde_onboarding()'::regprocedure);
  v_old := E'  v_role text;';
  v_new := E'  v_role text;\n  v_operator_type text;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'COMPANY_SYNC_ROLE_VAR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := '  v_role := lower(trim(coalesce(v_onboarding.role, ''comprador'')));';
  v_new := v_old || E'\n  v_operator_type := coalesce(nullif(trim(v_onboarding.tipo_operador), ''''), CASE\n    WHEN v_role = ''productor'' THEN ''productor''\n    WHEN v_role = ''acopio'' THEN ''acopio''\n    WHEN v_role = ''cooperativa'' THEN ''cooperativa''\n    WHEN v_role = ''corredor'' THEN ''corredor_oficial''\n    WHEN v_role IN (''comisionista'',''intermediario'') THEN ''comisionista_intermediario''\n    WHEN v_role = ''exportador'' THEN ''exportador''\n    WHEN v_role = ''transportista'' THEN ''transportista''\n    ELSE NULL END);';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'COMPANY_SYNC_OPERATOR_TYPE_ASSIGNMENT_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := E'cuenta_id, razon_social, nombre_comercial, cuit, tipo_empresa,\n        condicion_iva';
  v_new := E'cuenta_id, razon_social, nombre_comercial, cuit, tipo_empresa, tipo_operador,\n        condicion_iva';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'COMPANY_SYNC_INSERT_COLUMNS_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := E'v_user_id, v_legal_name, v_trade_name, v_cuit, v_role,\n        nullif';
  v_new := E'v_user_id, v_legal_name, v_trade_name, v_cuit, v_role, v_operator_type,\n        nullif';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'COMPANY_SYNC_INSERT_VALUES_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := E'  SELECT c.id\n    INTO v_company_id';
  v_new := E'  IF v_legacy_id IS NOT NULL AND v_operator_type IS NOT NULL THEN\n    UPDATE public.empresas SET tipo_operador=v_operator_type, actualizado_en=now() WHERE id=v_legacy_id;\n  END IF;\n\n  SELECT c.id\n    INTO v_company_id';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'COMPANY_SYNC_EXISTING_UPDATE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  EXECUTE v_def;
END
$migration$;
