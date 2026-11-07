DO $$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.sincronizar_empresa_desde_onboarding()'::regprocedure);
  v_def := replace(v_def,
    'FUNCTION public.sincronizar_empresa_desde_onboarding()',
    'FUNCTION public.admin_sincronizar_empresa_desde_onboarding(p_user_id uuid)');
  v_def := replace(v_def,
    'v_user_id uuid := auth.uid();',
    'v_user_id uuid := p_user_id;');
  v_old := 'IF v_user_id IS NULL THEN' || E'\n    RAISE EXCEPTION ''AUTH_REQUIRED'';' || E'\n  END IF;';
  v_new := 'IF auth.uid() IS NULL OR NOT public.es_administrador_plataforma() THEN' || E'\n    RAISE EXCEPTION ''PLATFORM_ADMIN_REQUIRED'';' || E'\n  END IF;' ||
    E'\n  IF v_user_id IS NULL THEN RAISE EXCEPTION ''USER_REQUIRED''; END IF;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SYNC_AUTH_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  EXECUTE v_def;
END $$;

REVOKE ALL ON FUNCTION public.admin_sincronizar_empresa_desde_onboarding(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_sincronizar_empresa_desde_onboarding(uuid) TO authenticated;

DO $$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.admin_registrar_revision_fiscal_empresa(uuid,text,text,boolean,boolean,timestamptz,text)'::regprocedure);
  v_old := $old$
  SELECT * INTO v_onboarding
  FROM public.account_onboarding
  WHERE user_id=p_user_id AND upper(account_type)='EMPRESA'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CORPORATE_ONBOARDING_NOT_FOUND'; END IF;

  v_cuit:=regexp_replace(coalesce(v_onboarding.cuil_cuit,''),'[^0-9]','','g');
$old$;
  v_new := $new$
  SELECT * INTO v_onboarding
  FROM public.account_onboarding
  WHERE user_id=p_user_id AND upper(account_type)='EMPRESA'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CORPORATE_ONBOARDING_NOT_FOUND'; END IF;

  PERFORM public.admin_sincronizar_empresa_desde_onboarding(p_user_id);

  SELECT * INTO v_onboarding
  FROM public.account_onboarding
  WHERE user_id=p_user_id AND upper(account_type)='EMPRESA'
  FOR UPDATE;

  v_cuit:=regexp_replace(coalesce(v_onboarding.cuil_cuit,''),'[^0-9]','','g');
$new$;
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'FISCAL_SYNC_INSERT_ANCHOR_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);
END $$;