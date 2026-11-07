CREATE OR REPLACE FUNCTION public.admin_aprobar_empresa_compliance(
  p_user_id uuid,
  p_review_status text,
  p_review_notes text,
  p_sisa_status text,
  p_sisa_categoria text,
  p_actividad_agro_validada boolean,
  p_arca_verificada boolean,
  p_arca_vencimiento timestamptz,
  p_arca_observaciones text
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
  v_verified boolean := upper(coalesce(p_review_status,''))='VERIFICADO';
BEGIN
  IF v_uid IS NULL OR NOT public.es_administrador_plataforma() THEN
    RAISE EXCEPTION 'PLATFORM_ADMIN_REQUIRED';
  END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'USER_REQUIRED'; END IF;
  IF upper(coalesce(p_review_status,'')) NOT IN ('NO_VERIFICADO','PENDIENTE','EN_REVISION','OBSERVADO','FALTA_DOCUMENTACION','VERIFICADO') THEN
    RAISE EXCEPTION 'INVALID_REVIEW_STATUS';
  END IF;
  IF upper(coalesce(p_sisa_status,'')) NOT IN ('PENDIENTE','ACTIVO','SUSPENDIDO','EXCLUIDO','INACTIVO') THEN
    RAISE EXCEPTION 'INVALID_SISA_STATUS';
  END IF;
  IF upper(p_sisa_status)='ACTIVO' AND coalesce(p_sisa_categoria,'') NOT IN ('1','2','3') THEN
    RAISE EXCEPTION 'ACTIVE_SISA_REQUIRES_VALID_CATEGORY';
  END IF;

  PERFORM public.admin_sincronizar_empresa_desde_onboarding(p_user_id);

  SELECT * INTO v_onboarding
  FROM public.account_onboarding
  WHERE user_id=p_user_id AND upper(account_type)='EMPRESA'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CORPORATE_ONBOARDING_NOT_FOUND'; END IF;

  v_cuit:=regexp_replace(coalesce(v_onboarding.cuil_cuit,''),'[^0-9]','','g');
  SELECT e.id INTO v_empresa_id
  FROM public.empresas e
  WHERE regexp_replace(coalesce(e.cuit,''),'[^0-9]','','g')=v_cuit
  ORDER BY e.creado_en DESC
  LIMIT 1 FOR UPDATE;
  IF v_empresa_id IS NULL THEN RAISE EXCEPTION 'LEGACY_COMPANY_NOT_SYNCHRONIZED'; END IF;

  SELECT m.company_id INTO v_company_id
  FROM public.company_empresa_map m
  WHERE m.empresa_id=v_empresa_id
  LIMIT 1;

  IF v_verified THEN
    IF nullif(trim(coalesce(v_onboarding.representative_position,'')),'') IS NULL
       OR nullif(regexp_replace(coalesce(v_onboarding.representative_cuil,''),'[^0-9]','','g'),'') IS NULL THEN
      RAISE EXCEPTION 'REPRESENTATIVE_AUTHORITY_DATA_REQUIRED';
    END IF;
    IF upper(p_sisa_status)<>'ACTIVO'
       OR coalesce(p_actividad_agro_validada,false) IS NOT TRUE
       OR coalesce(p_arca_verificada,false) IS NOT TRUE
       OR p_arca_vencimiento IS NULL OR p_arca_vencimiento<=now()
       OR nullif(trim(coalesce(p_arca_observaciones,'')),'') IS NULL THEN
      RAISE EXCEPTION 'FISCAL_COMPLIANCE_NOT_COMPLETE';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM (VALUES ('DNI_FRENTE'),('DNI_DORSO'),('ESTATUTO_CONTRATO_SOCIAL'),('SISA_CONSTANCIA')) r(document_type)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.account_onboarding_documents d
        WHERE d.user_id=p_user_id AND d.document_type=r.document_type AND d.review_status='APROBADO'
      )
    ) OR NOT EXISTS (
      SELECT 1 FROM public.account_onboarding_documents d
      WHERE d.user_id=p_user_id AND d.document_type IN ('CONSTANCIA_ARCA','ARCA_CONSTANCIA') AND d.review_status='APROBADO'
    ) OR NOT EXISTS (
      SELECT 1 FROM public.account_onboarding_documents d
      WHERE d.user_id=p_user_id AND d.document_type IN ('PODER_ACTA_AUTORIDADES','PODER_HABILITANTE') AND d.review_status='APROBADO'
    ) THEN
      RAISE EXCEPTION 'DOCUMENTACION_KYC_INCOMPLETA';
    END IF;
  END IF;

  UPDATE public.account_onboarding
  SET review_status=upper(p_review_status),
      is_verified=v_verified,
      review_notes=nullif(trim(coalesce(p_review_notes,'')),''),
      reviewed_by=v_uid,
      reviewed_at=now(),
      sisa_status=upper(p_sisa_status),
      sisa_categoria=CASE WHEN upper(p_sisa_status)='ACTIVO' THEN p_sisa_categoria ELSE NULL END,
      actividad_agro_validada=coalesce(p_actividad_agro_validada,false),
      updated_at=now()
  WHERE user_id=p_user_id;

  UPDATE public.profiles
  SET verification_status=upper(p_review_status),
      is_verified=v_verified,
      verification_notes=nullif(trim(coalesce(p_review_notes,'')),''),
      verified_at=CASE WHEN v_verified THEN now() ELSE NULL END,
      verified_by=CASE WHEN v_verified THEN v_uid ELSE NULL END
  WHERE id=p_user_id;

  UPDATE public.empresas_verificaciones
  SET estado='ARCA_REVOCADA',vencimiento_at=now(),
      observaciones=concat_ws(E'\n',nullif(observaciones,''),'Revisión ARCA anterior revocada por nueva decisión administrativa.')
  WHERE empresa_id=v_empresa_id AND organismo='ARCA'
    AND estado='ARCA_VERIFICADA' AND vencimiento_at>now();

  IF v_verified THEN
    INSERT INTO public.empresas_verificaciones(
      empresa_id,estado,verificado_por,fecha_verificacion,observaciones,
      organismo,tipo_consulta,fuente_oficial,identificador_consulta,resultado,
      vencimiento_at,ejecutado_por,consultado_at
    ) VALUES (
      v_empresa_id,'ARCA_VERIFICADA',v_uid,now(),trim(p_arca_observaciones),
      'ARCA','REVISION_MANUAL','https://www.arca.gob.ar/',v_cuit,
      jsonb_build_object('metodo','REVISION_MANUAL_ADMIN','cuit',v_cuit,
        'sisa_status',upper(p_sisa_status),'sisa_categoria',p_sisa_categoria,
        'actividad_agro_validada',coalesce(p_actividad_agro_validada,false),
        'revisado_por',v_uid),
      p_arca_vencimiento,'ADMINISTRACION',now()
    );
    UPDATE public.companies SET estado='verificada',updated_at=now() WHERE id=v_company_id;
    UPDATE public.empresas SET verificada=true,activa=true,actualizado_en=now() WHERE id=v_empresa_id;
    PERFORM public.admin_actualizar_mapa_verificacion_empresa(v_empresa_id,true);
  ELSE
    UPDATE public.companies SET estado='pendiente',updated_at=now() WHERE id=v_company_id;
    UPDATE public.empresas SET verificada=false,activa=true,actualizado_en=now() WHERE id=v_empresa_id;
    PERFORM public.admin_actualizar_mapa_verificacion_empresa(v_empresa_id,false);
  END IF;

  RETURN jsonb_build_object('ok',true,'user_id',p_user_id,'empresa_id',v_empresa_id,
    'company_id',v_company_id,'review_status',upper(p_review_status),
    'is_verified',v_verified,'sisa_status',upper(p_sisa_status),
    'arca_verificada',v_verified,'mapa_verificado',v_verified);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_aprobar_empresa_compliance(uuid,text,text,text,text,boolean,boolean,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_aprobar_empresa_compliance(uuid,text,text,text,text,boolean,boolean,timestamptz,text) TO authenticated;