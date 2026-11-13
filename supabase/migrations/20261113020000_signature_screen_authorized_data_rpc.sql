CREATE OR REPLACE FUNCTION public.obtener_datos_firma_contrato(p_operacion_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_company uuid;
  v_is_admin boolean := false;
  v_contract public.contratos%rowtype;
  v_roles text[] := ARRAY[]::text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = v_uid
  ) INTO v_is_admin;

  IF NOT v_is_admin AND NOT public.usuario_participa_operacion(p_operacion_id) THEN
    RAISE EXCEPTION 'NOT_OPERATION_PARTICIPANT';
  END IF;

  SELECT p.active_company_id INTO v_company
  FROM public.profiles p WHERE p.id = v_uid;

  IF v_company IS NOT NULL THEN
    SELECT coalesce(array_agg(DISTINCT normalized_role), ARRAY[]::text[])
    INTO v_roles
    FROM (
      SELECT CASE
        WHEN upper(op.rol) IN ('VENDEDOR','PRODUCTOR','SELLER') THEN 'VENDEDOR'
        WHEN upper(op.rol) IN ('COMPRADOR','BUYER') THEN 'COMPRADOR'
        ELSE NULL
      END AS normalized_role
      FROM public.operacion_participantes op
      WHERE op.operacion_id = p_operacion_id
        AND (
          op.empresa_id = v_company
          OR EXISTS (
            SELECT 1 FROM public.company_empresa_map cem
            WHERE cem.company_id = v_company
              AND cem.empresa_id = op.empresa_id
          )
        )
    ) mapped_roles
    WHERE normalized_role IS NOT NULL;
  END IF;

  SELECT * INTO v_contract
  FROM public.contratos c
  WHERE c.operacion_id = p_operacion_id
    AND c.estado = 'CONFIRMADO'
  ORDER BY c.confirmado_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'CONFIRMED_CONTRACT_NOT_FOUND'; END IF;

  RETURN jsonb_build_object(
    'contract_id', v_contract.id,
    'contract_number', v_contract.numero_contrato,
    'contract_content', coalesce(v_contract.contenido, ''),
    'roles', to_jsonb(v_roles),
    'is_admin', v_is_admin
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.obtener_datos_firma_contrato(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_datos_firma_contrato(uuid) TO authenticated;
