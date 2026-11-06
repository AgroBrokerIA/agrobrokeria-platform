-- Create the legacy and current company records for an authenticated corporate KYC account.
-- This links account_onboarding -> cuentas/empresas -> companies/company_users/company_empresa_map.
-- The new records remain pending/unverified until the ARCA, SISA and document review gates pass.

CREATE OR REPLACE FUNCTION public.sincronizar_empresa_desde_onboarding()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_onboarding public.account_onboarding%ROWTYPE;
  v_cuit text;
  v_email text;
  v_phone text;
  v_role text;
  v_company_role public.user_role;
  v_legal_name text;
  v_trade_name text;
  v_country text;
  v_province text;
  v_city text;
  v_address text;
  v_legacy_id uuid;
  v_legacy_account_id uuid;
  v_legacy_cuit text;
  v_company_id uuid;
  v_member_company_id uuid;
  v_mapped_company_id uuid;
  v_mapped_empresa_id uuid;
  v_active_company_id uuid;
  v_weights integer[] := ARRAY[5,4,3,2,7,6,5,4,3,2];
  v_sum integer := 0;
  v_remainder integer;
  v_expected_digit integer;
  v_i integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT *
    INTO v_onboarding
    FROM public.account_onboarding
   WHERE user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND OR upper(coalesce(v_onboarding.account_type, 'PERSONA')) <> 'EMPRESA' THEN
    RAISE EXCEPTION 'KYC_EMPRESARIAL_NO_ENCONTRADO';
  END IF;

  v_cuit := regexp_replace(coalesce(v_onboarding.cuil_cuit, ''), '[^0-9]', '', 'g');
  v_legal_name := nullif(trim(coalesce(v_onboarding.legal_name, '')), '');
  v_trade_name := nullif(trim(coalesce(v_onboarding.trade_name, '')), '');
  v_role := lower(trim(coalesce(v_onboarding.role, 'comprador')));
  v_email := lower(trim(coalesce(v_onboarding.email, '')));
  v_phone := nullif(trim(coalesce(v_onboarding.phone, '')), '');
  v_country := coalesce(nullif(trim(v_onboarding.country), ''), 'Argentina');
  v_province := nullif(trim(coalesce(v_onboarding.province, '')), '');
  v_city := nullif(trim(coalesce(v_onboarding.city, '')), '');
  v_address := nullif(trim(concat_ws(' ',
    nullif(trim(coalesce(v_onboarding.street, '')), ''),
    nullif(trim(coalesce(v_onboarding.street_number, '')), ''),
    nullif(trim(coalesce(v_onboarding.floor, '')), ''),
    nullif(trim(coalesce(v_onboarding.apartment, '')), '')
  )), '');

  IF v_email = '' THEN
    SELECT lower(trim(coalesce(email, '')))
      INTO v_email
      FROM public.profiles
     WHERE id = v_user_id;
  END IF;

  IF v_legal_name IS NULL OR v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'RAZON_SOCIAL_Y_CORREO_OBLIGATORIOS';
  END IF;

  IF length(v_cuit) <> 11 THEN
    RAISE EXCEPTION 'CUIT_INVALIDO: debe contener 11 dígitos';
  END IF;

  FOR v_i IN 1..10 LOOP
    v_sum := v_sum + substring(v_cuit FROM v_i FOR 1)::integer * v_weights[v_i];
  END LOOP;
  v_remainder := v_sum % 11;
  v_expected_digit := CASE
    WHEN v_remainder = 0 THEN 0
    WHEN v_remainder = 1 THEN 9
    ELSE 11 - v_remainder
  END;
  IF substring(v_cuit FROM 11 FOR 1)::integer <> v_expected_digit THEN
    RAISE EXCEPTION 'CUIT_INVALIDO: dígito verificador incorrecto';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cuentas c
     WHERE lower(c.email) = v_email AND c.id <> v_user_id
  ) THEN
    RAISE EXCEPTION 'CORREO_YA_VINCULADO_A_OTRA_CUENTA';
  END IF;

  INSERT INTO public.cuentas (id, codigo, email, telefono)
  VALUES (
    v_user_id,
    'AGB-' || upper(substr(replace(v_user_id::text, '-', ''), 1, 12)),
    v_email,
    v_phone
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        telefono = coalesce(EXCLUDED.telefono, public.cuentas.telefono),
        actualizado_en = now();

  SELECT e.id, e.cuenta_id, regexp_replace(coalesce(e.cuit, ''), '[^0-9]', '', 'g')
    INTO v_legacy_id, v_legacy_account_id, v_legacy_cuit
    FROM public.empresas e
   WHERE regexp_replace(coalesce(e.cuit, ''), '[^0-9]', '', 'g') = v_cuit
   LIMIT 1
   FOR UPDATE;

  IF v_legacy_id IS NOT NULL AND v_legacy_account_id <> v_user_id THEN
    RAISE EXCEPTION 'CUIT_EMPRESA_YA_REGISTRADO: solicitá la vinculación a Administración';
  END IF;

  IF v_legacy_id IS NULL THEN
    SELECT e.id, regexp_replace(coalesce(e.cuit, ''), '[^0-9]', '', 'g')
      INTO v_legacy_id, v_legacy_cuit
      FROM public.empresas e
     WHERE e.cuenta_id = v_user_id
     ORDER BY e.creado_en
     LIMIT 1
     FOR UPDATE;

    IF v_legacy_id IS NOT NULL AND v_legacy_cuit <> v_cuit THEN
      RAISE EXCEPTION 'CUENTA_VINCULADA_A_OTRA_EMPRESA';
    END IF;

    IF v_legacy_id IS NULL THEN
      INSERT INTO public.empresas (
        cuenta_id, razon_social, nombre_comercial, cuit, tipo_empresa,
        condicion_iva, pais, provincia, localidad, direccion, codigo_postal,
        sitio_web, verificada, activa
      )
      VALUES (
        v_user_id, v_legal_name, v_trade_name, v_cuit, v_role,
        nullif(trim(coalesce(v_onboarding.vat_status, '')), ''),
        v_country, v_province, v_city, v_address,
        nullif(trim(coalesce(v_onboarding.postal_code, '')), ''),
        NULL,
        false, true
      )
      RETURNING id INTO v_legacy_id;
    END IF;
  END IF;

  SELECT c.id
    INTO v_company_id
    FROM public.companies c
   WHERE regexp_replace(coalesce(c.cuit, ''), '[^0-9]', '', 'g') = v_cuit
   LIMIT 1
   FOR UPDATE;

  SELECT cu.company_id
    INTO v_member_company_id
    FROM public.company_users cu
   WHERE cu.profile_id = v_user_id
   LIMIT 1
   FOR UPDATE;

  IF v_company_id IS NULL THEN
    IF v_member_company_id IS NOT NULL THEN
      RAISE EXCEPTION 'USUARIO_VINCULADO_A_OTRA_EMPRESA';
    END IF;

    INSERT INTO public.companies (
      razon_social, nombre_comercial, cuit, email, telefono, pais,
      provincia, ciudad, direccion, condicion_iva, estado
    )
    VALUES (
      v_legal_name, v_trade_name, v_cuit, v_email, v_phone, v_country,
      v_province, v_city, v_address,
      nullif(trim(coalesce(v_onboarding.vat_status, '')), ''),
      'pendiente'
    )
    RETURNING id INTO v_company_id;
  END IF;

  IF v_member_company_id IS NOT NULL AND v_member_company_id <> v_company_id THEN
    RAISE EXCEPTION 'USUARIO_VINCULADO_A_OTRA_EMPRESA';
  END IF;

  SELECT m.company_id, m.empresa_id
    INTO v_mapped_company_id, v_mapped_empresa_id
    FROM public.company_empresa_map m
   WHERE m.company_id = v_company_id OR m.empresa_id = v_legacy_id
   LIMIT 1
   FOR UPDATE;

  IF v_mapped_company_id IS NOT NULL
     AND (v_mapped_company_id <> v_company_id OR v_mapped_empresa_id <> v_legacy_id) THEN
    RAISE EXCEPTION 'VINCULO_EMPRESARIAL_INCONSISTENTE: requiere revisión administrativa';
  END IF;

  IF v_mapped_company_id IS NULL THEN
    INSERT INTO public.company_empresa_map (
      empresa_id, company_id, match_method, confidence, verified
    )
    VALUES (v_legacy_id, v_company_id, 'REGISTRO_CUIT', 100, false);
  END IF;

  v_company_role := CASE v_role
    WHEN 'productor' THEN 'vendedor'::public.user_role
    WHEN 'cooperativa' THEN 'acopio'::public.user_role
    WHEN 'comisionista' THEN 'intermediario'::public.user_role
    WHEN 'vendedor' THEN 'vendedor'::public.user_role
    WHEN 'comprador' THEN 'comprador'::public.user_role
    WHEN 'corredor' THEN 'corredor'::public.user_role
    WHEN 'exportador' THEN 'exportador'::public.user_role
    WHEN 'acopio' THEN 'acopio'::public.user_role
    WHEN 'industria' THEN 'industria'::public.user_role
    WHEN 'intermediario' THEN 'intermediario'::public.user_role
    WHEN 'transportista' THEN 'transportista'::public.user_role
    ELSE 'comprador'::public.user_role
  END;

  IF v_member_company_id IS NULL THEN
    INSERT INTO public.company_users (company_id, profile_id, rol, activo)
    VALUES (v_company_id, v_user_id, v_company_role, true);
  END IF;

  SELECT p.active_company_id
    INTO v_active_company_id
    FROM public.profiles p
   WHERE p.id = v_user_id
   FOR UPDATE;

  IF v_active_company_id IS NOT NULL AND v_active_company_id <> v_company_id THEN
    RAISE EXCEPTION 'PERFIL_YA_VINCULADO_A_OTRA_EMPRESA';
  END IF;

  UPDATE public.profiles
     SET active_company_id = v_company_id,
         empresa = coalesce(nullif(empresa, ''), v_legal_name),
         cuit = coalesce(nullif(cuit, ''), v_cuit)
   WHERE id = v_user_id;

  RETURN v_company_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sincronizar_empresa_desde_onboarding()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sincronizar_empresa_desde_onboarding()
  TO authenticated;
