DO $$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.admin_registrar_revision_fiscal_empresa(uuid,text,text,boolean,boolean,timestamptz,text)'::regprocedure);
  v_old := $old$
  IF NOT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id=v_company_id AND c.estado='verificada'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id=v_empresa_id AND e.verificada=true AND e.activa=true
  ) THEN RAISE EXCEPTION 'COMPANY_STATUS_NOT_APPROVED'; END IF;

  PERFORM public.admin_actualizar_mapa_verificacion_empresa(v_empresa_id,true);
$old$;
  v_new := $new$
  UPDATE public.companies SET estado='verificada',updated_at=now()
  WHERE id=v_company_id;
  UPDATE public.empresas SET verificada=true,activa=true,actualizado_en=now()
  WHERE id=v_empresa_id;

  PERFORM public.admin_actualizar_mapa_verificacion_empresa(v_empresa_id,true);
$new$;
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'COMPANY_APPROVAL_ANCHOR_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);
END $$;