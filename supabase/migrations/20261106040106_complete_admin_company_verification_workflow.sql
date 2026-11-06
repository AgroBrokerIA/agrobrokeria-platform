-- Allow platform administrators to read verification queues and initiate official ARCA checks.
DROP POLICY IF EXISTS empresas_verificaciones_select_platform_admin ON public.empresas_verificaciones;
CREATE POLICY empresas_verificaciones_select_platform_admin
  ON public.empresas_verificaciones
  FOR SELECT TO authenticated
  USING (public.es_administrador_plataforma());

DROP POLICY IF EXISTS empresas_verificacion_requisitos_select_platform_admin ON public.empresas_verificacion_requisitos;
CREATE POLICY empresas_verificacion_requisitos_select_platform_admin
  ON public.empresas_verificacion_requisitos
  FOR SELECT TO authenticated
  USING (public.es_administrador_plataforma());

-- Preserve the company-member flow, while allowing the platform's admin-only verification console
-- to create an ARCA request for any active company.
CREATE OR REPLACE FUNCTION public.crear_solicitud_verificacion_empresa(
  p_empresa_id uuid,
  p_tipo_consulta text,
  p_organismo text,
  p_observaciones text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_profile_company uuid;
  v_empresa_comercial uuid;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF p_empresa_id IS NULL OR coalesce(trim(p_tipo_consulta), '') = '' THEN
    RAISE EXCEPTION 'INVALID_REQUEST';
  END IF;

  v_is_admin := public.es_administrador_plataforma();

  IF NOT EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = p_empresa_id AND e.activa = true
  ) THEN
    RAISE EXCEPTION 'EMPRESA_NO_DISPONIBLE';
  END IF;

  IF NOT v_is_admin THEN
    SELECT active_company_id INTO v_profile_company
    FROM public.profiles WHERE id = v_uid;

    IF v_profile_company IS NULL THEN
      RAISE EXCEPTION 'ACTIVE_COMPANY_REQUIRED';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.profile_id = v_uid
        AND cu.company_id = v_profile_company
        AND cu.activo IS TRUE
    ) THEN
      RAISE EXCEPTION 'ACTIVE_MEMBERSHIP_REQUIRED';
    END IF;

    SELECT cem.empresa_id INTO v_empresa_comercial
    FROM public.company_empresa_map cem
    JOIN public.empresas e ON e.id = cem.empresa_id AND e.activa IS TRUE
    WHERE cem.company_id = v_profile_company
    LIMIT 1;

    IF v_empresa_comercial IS NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.empresas e
        WHERE e.id = v_profile_company AND e.activa = true
      ) THEN
        v_empresa_comercial := v_profile_company;
      ELSE
        RAISE EXCEPTION 'ACTIVE_COMPANY_MAPPING_MISSING';
      END IF;
    END IF;

    IF v_empresa_comercial <> p_empresa_id THEN
      RAISE EXCEPTION 'NOT_AUTHORIZED_FOR_COMPANY';
    END IF;
  END IF;

  INSERT INTO public.empresas_verificaciones (
    empresa_id, estado, organismo, tipo_consulta, ejecutado_por,
    observaciones, consultado_at, creado_en
  )
  VALUES (
    p_empresa_id, 'PENDIENTE',
    coalesce(nullif(trim(p_organismo), ''), 'REVISION_INTERNA'),
    trim(p_tipo_consulta), v_uid::text, p_observaciones, now(), now()
  )
  RETURNING id INTO v_id;

  INSERT INTO public.auditoria (
    cuenta_id, tabla, registro_id, accion, descripcion, dispositivo
  )
  VALUES (
    NULL, 'empresas_verificaciones', v_id, 'SOLICITUD_VERIFICACION_CREADA',
    'Solicitud de verificación creada: ' || trim(p_tipo_consulta) ||
    CASE WHEN v_is_admin THEN ' por administración de plataforma' ELSE ' por miembro de la empresa' END,
    'server'
  );

  RETURN v_id;
END;
$function$;

-- The KYC admin page is the only caller allowed to release a company mapping into Smart Match.
-- This function checks the persisted KYC and ARCA evidence instead of trusting the browser.
CREATE OR REPLACE FUNCTION public.admin_actualizar_mapa_verificacion_empresa(
  p_empresa_id uuid,
  p_verificada boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_admin uuid := auth.uid();
  v_cuit text;
  v_user_id uuid;
  v_map_id uuid;
  v_company_id uuid;
BEGIN
  IF v_admin IS NULL OR NOT public.es_administrador_plataforma() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;
  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'EMPRESA_REQUIRED';
  END IF;

  SELECT regexp_replace(coalesce(e.cuit, ''), '[^0-9]', '', 'g')
    INTO v_cuit
    FROM public.empresas e
   WHERE e.id = p_empresa_id AND e.activa = true
   FOR UPDATE;

  IF v_cuit IS NULL OR length(v_cuit) <> 11 THEN
    RAISE EXCEPTION 'EMPRESA_CUIT_INVALIDO';
  END IF;

  SELECT m.id, m.company_id
    INTO v_map_id, v_company_id
    FROM public.company_empresa_map m
   WHERE m.empresa_id = p_empresa_id
   LIMIT 1
   FOR UPDATE;

  IF v_map_id IS NULL THEN
    SELECT cu.company_id
      INTO v_company_id
      FROM public.account_onboarding o
      JOIN public.company_users cu
        ON cu.profile_id = o.user_id AND cu.activo = true
     WHERE regexp_replace(coalesce(o.cuil_cuit, ''), '[^0-9]', '', 'g') = v_cuit
       AND upper(coalesce(o.account_type, '')) = 'EMPRESA'
     ORDER BY o.created_at DESC
     LIMIT 1;

    IF v_company_id IS NULL THEN
      RAISE EXCEPTION 'COMPANY_MAPPING_MISSING';
    END IF;

    INSERT INTO public.company_empresa_map (
      empresa_id, company_id, match_method, confidence, verified
    )
    VALUES (p_empresa_id, v_company_id, 'REGISTRO_CUIT', 100, false)
    RETURNING id INTO v_map_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = v_company_id
  ) THEN
    RAISE EXCEPTION 'COMPANY_DIRECTORY_RECORD_MISSING';
  END IF;

  IF p_verificada THEN
    SELECT o.user_id
      INTO v_user_id
      FROM public.account_onboarding o
     WHERE regexp_replace(coalesce(o.cuil_cuit, ''), '[^0-9]', '', 'g') = v_cuit
       AND upper(coalesce(o.account_type, '')) = 'EMPRESA'
     ORDER BY o.created_at DESC
     LIMIT 1;

    IF v_user_id IS NULL OR NOT EXISTS (
      SELECT 1
        FROM public.account_onboarding o
        JOIN public.profiles p ON p.id = o.user_id
       WHERE o.user_id = v_user_id
         AND o.review_status = 'VERIFICADO'
         AND o.is_verified = true
         AND o.sisa_status = 'ACTIVO'
         AND o.sisa_categoria IN ('1','2','3')
         AND o.actividad_agro_validada = true
         AND p.is_verified = true
         AND p.verification_status = 'VERIFICADO'
    ) THEN
      RAISE EXCEPTION 'KYC_EMPRESARIAL_INCOMPLETO';
    END IF;

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

    IF NOT EXISTS (
      SELECT 1
        FROM public.empresas_verificaciones ev
       WHERE ev.empresa_id = p_empresa_id
         AND ev.organismo = 'ARCA'
         AND ev.estado = 'ARCA_VERIFICADA'
         AND ev.vencimiento_at > now()
    ) THEN
      RAISE EXCEPTION 'CONSULTA_ARCA_VENCIDA_O_PENDIENTE';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = p_empresa_id AND e.verificada = true AND e.activa = true
    ) OR NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = v_company_id AND c.estado = 'verificada'
    ) THEN
      RAISE EXCEPTION 'ESTADO_EMPRESA_NO_VERIFICADO';
    END IF;
  END IF;

  UPDATE public.company_empresa_map
     SET verified = p_verificada,
         match_method = CASE WHEN p_verificada THEN 'KYC_ARCA_SISA' ELSE 'REGISTRO_CUIT' END,
         updated_at = now()
   WHERE id = v_map_id;

  INSERT INTO public.auditoria (
    cuenta_id, tabla, registro_id, accion, descripcion, dispositivo
  )
  VALUES (
    NULL, 'company_empresa_map', v_map_id,
    CASE WHEN p_verificada THEN 'MAPA_EMPRESARIAL_VERIFICADO' ELSE 'MAPA_EMPRESARIAL_REVOCADO' END,
    'Actualización de vínculo empresarial por administrador ' || v_admin::text ||
    '; empresa_id=' || p_empresa_id::text,
    'server'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_actualizar_mapa_verificacion_empresa(uuid, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_mapa_verificacion_empresa(uuid, boolean)
  TO authenticated;
