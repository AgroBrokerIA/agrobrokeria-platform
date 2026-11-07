DO $$
DECLARE
  v_def text;
  v_old text := 'AND d.review_status=''APROBADO''';
  v_new text := 'AND d.review_status=''APROBADO'' AND d.id=(SELECT d2.id FROM public.account_onboarding_documents d2 WHERE d2.user_id=d.user_id AND d2.document_type=d.document_type ORDER BY d2.created_at DESC,d2.id DESC LIMIT 1)';
BEGIN
  v_def := pg_get_functiondef('public.admin_actualizar_mapa_verificacion_empresa(uuid,boolean)'::regprocedure);
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'MAP_LATEST_DOCUMENT_ANCHOR_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);

  v_def := pg_get_functiondef('public.admin_aprobar_empresa_compliance(uuid,text,text,text,text,boolean,boolean,timestamptz,text)'::regprocedure);
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'APPROVAL_LATEST_DOCUMENT_ANCHOR_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);
END $$;