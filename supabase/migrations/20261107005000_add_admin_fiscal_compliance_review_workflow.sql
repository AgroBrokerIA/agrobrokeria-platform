DO $$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.admin_actualizar_mapa_verificacion_empresa(uuid,boolean)'::regprocedure);
  v_old := $old$
    IF EXISTS (
      SELECT required.document_type
      FROM unnest(ARRAY[
        'DNI_FRENTE','DNI_DORSO','ARCA_CONSTANCIA','SISA_CONSTANCIA','PODER_HABILITANTE'
      ]) AS required(document_type)
      WHERE NOT EXISTS (
        SELECT 1
          FROM public.account_onboarding_documents d
         WHERE d.user_id = v_user_id
           AND d.document_type = required.document_type
           AND d.review_status = 'APROBADO'
      )
    ) THEN
      RAISE EXCEPTION 'DOCUMENTACION_KYC_INCOMPLETA';
    END IF;
$old$;
  v_new := $new$
    IF EXISTS (
      SELECT 1
      FROM (VALUES
        ('DNI_FRENTE'),('DNI_DORSO'),('ESTATUTO_CONTRATO_SOCIAL'),('SISA_CONSTANCIA')
      ) AS required(document_type)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.account_onboarding_documents d
        WHERE d.user_id=v_user_id
          AND d.document_type=required.document_type
          AND d.review_status='APROBADO'
      )
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.account_onboarding_documents d
      WHERE d.user_id=v_user_id
        AND d.document_type IN ('CONSTANCIA_ARCA','ARCA_CONSTANCIA')
        AND d.review_status='APROBADO'
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.account_onboarding_documents d
      WHERE d.user_id=v_user_id
        AND d.document_type IN ('PODER_ACTA_AUTORIDADES','PODER_HABILITANTE')
        AND d.review_status='APROBADO'
    ) THEN
      RAISE EXCEPTION 'DOCUMENTACION_KYC_INCOMPLETA';
    END IF;
$new$;
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'KYC_DOCUMENT_TYPES_ANCHOR_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);
END $$;

CREATE OR REPLACE FUNCTION public.admin_registrar_revision_fiscal_empresa(
  p_user_id uuid,
  p_sisa_status text,
  p_sisa_categoria text,
  p_actividad_agro_validada boolean,
  p_arca_verificada boolean,
  p_arca_vencimiento timestamptz,
  p_observaciones text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_onboarding public.account_onboarding%rowtype;
  v_cuit text;
  v_empresa_id uuid;
  v_company_id uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.es_administrador_plataforma() THEN
    RAISE EXCEPTION 'PLATFORM_ADMIN_REQUIRED';
  END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'USER_REQUIRED'; END IF;
  IF upper(coalesce(p_sisa_status,'')) NOT IN ('PENDIENTE','ACTIVO','SUSPENDIDO','EXCLUIDO','INACTIVO') THEN
    RAISE EXCEPTION 'INVALID_SISA_STATUS';
  END IF;
  IF p_sisa_status='ACTIVO' AND coalesce(p_sisa_categoria,'') NOT IN ('1','2','3') THEN
    RAISE EXCEPTION 'ACTIVE_SISA_REQUIRES_VALID_CATEGORY';
  END IF;
  IF p_arca_verificada AND (p_arca_vencimiento IS NULL OR p_arca_vencimiento<=now()) THEN
    RAISE EXCEPTION 'ARCA_REVIEW_EXPIRY_REQUIRED';
  END IF;
  IF p_arca_verificada AND nullif(trim(coalesce(p_observaciones,'')),'') IS NULL THEN
    RAISE EXCEPTION 'ARCA_REVIEW_EVIDENCE_NOTE_REQUIRED';
  END IF;

  SELECT * INTO v_onboarding
  FROM public.account_onboarding
  WHERE user_id=p_user_id AND upper(account_type)='EMPRESA'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CORPORATE_ONBOARDING_NOT_FOUND'; END IF;

  v_cuit:=regexp_replace(coalesce(v_onboarding.cuil_cuit,''),'[^0-9]','','g');
  IF length(v_cuit)<>11 THEN RAISE EXCEPTION 'INVALID_COMPANY_CUIT'; END IF;

  SELECT e.id INTO v_empresa_id
  FROM public.empresas e
  WHERE regexp_replace(coalesce(e.cuit,''),'[^0-9]','','g')=v_cuit
  ORDER BY e.creado_en DESC
  LIMIT 1
  FOR UPDATE;
  IF v_empresa_id IS NULL THEN RAISE EXCEPTION 'LEGACY_COMPANY_NOT_SYNCHRONIZED'; END IF;

  SELECT m.company_id INTO v_company_id
  FROM public.company_empresa_map m
  WHERE m.empresa_id=v_empresa_id
  LIMIT 1;

  UPDATE public.account_onboarding
  SET sisa_status=upper(p_sisa_status),
      sisa_categoria=CASE WHEN upper(p_sisa_status)='ACTIVO' THEN p_sisa_categoria ELSE NULL END,
      actividad_agro_validada=coalesce(p_actividad_agro_validada,false),
      updated_at=now()
  WHERE user_id=p_user_id;

  UPDATE public.empresas_verificaciones
  SET estado='ARCA_REVOCADA',vencimiento_at=now(),
      observaciones=concat_ws(E'\n',nullif(observaciones,''),'Verificación ARCA revocada/expirada por revisión administrativa.')
  WHERE empresa_id=v_empresa_id AND organismo='ARCA'
    AND estado='ARCA_VERIFICADA' AND vencimiento_at>now();

  IF p_arca_verificada THEN
    INSERT INTO public.empresas_verificaciones(
      empresa_id,estado,verificado_por,fecha_verificacion,observaciones,
      organismo,tipo_consulta,fuente_oficial,identificador_consulta,resultado,
      vencimiento_at,ejecutado_por,consultado_at
    ) VALUES (
      v_empresa_id,'ARCA_VERIFICADA',v_uid,now(),trim(p_observaciones),
      'ARCA','REVISION_MANUAL','https://www.arca.gob.ar/',v_cuit,
      jsonb_build_object('metodo','REVISION_MANUAL_ADMIN','cuit',v_cuit,
        'sisa_status',upper(p_sisa_status),'sisa_categoria',p_sisa_categoria,
        'actividad_agro_validada',coalesce(p_actividad_agro_validada,false),
        'revisado_por',v_uid),
      p_arca_vencimiento,'ADMINISTRACION',now()
    );
  END IF;

  IF NOT p_arca_verificada OR upper(p_sisa_status)<>'ACTIVO'
     OR coalesce(p_actividad_agro_validada,false) IS NOT TRUE THEN
    IF v_company_id IS NOT NULL THEN
      PERFORM public.admin_actualizar_mapa_verificacion_empresa(v_empresa_id,false);
    END IF;
    RETURN jsonb_build_object('ok',true,'empresa_id',v_empresa_id,
      'sisa_status',upper(p_sisa_status),'arca_verificada',false,
      'mapa_verificado',false,'motivo','REVISION_FISCAL_INCOMPLETA');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.account_onboarding o
    JOIN public.profiles p ON p.id=o.user_id
    WHERE o.user_id=p_user_id AND o.review_status='VERIFICADO'
      AND o.is_verified=true AND p.is_verified=true
      AND p.verification_status='VERIFICADO'
  ) THEN RAISE EXCEPTION 'KYC_ACCOUNT_NOT_APPROVED'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id=v_company_id AND c.estado='verificada'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id=v_empresa_id AND e.verificada=true AND e.activa=true
  ) THEN RAISE EXCEPTION 'COMPANY_STATUS_NOT_APPROVED'; END IF;

  PERFORM public.admin_actualizar_mapa_verificacion_empresa(v_empresa_id,true);
  RETURN jsonb_build_object('ok',true,'empresa_id',v_empresa_id,
    'company_id',v_company_id,'sisa_status','ACTIVO',
    'sisa_categoria',p_sisa_categoria,'arca_verificada',true,
    'mapa_verificado',true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_registrar_revision_fiscal_empresa(uuid,text,text,boolean,boolean,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_registrar_revision_fiscal_empresa(uuid,text,text,boolean,boolean,timestamptz,text) TO authenticated;