-- Keep operation-message discovery aligned with the actual participant and message schemas.
-- operacion_participantes identifies company participants; individual message access
-- is recorded in mensajes_comerciales, not in operacion_participantes.

CREATE OR REPLACE FUNCTION public.listar_operaciones_mensajes_disponibles()
RETURNS TABLE(id uuid, codigo text, estado text, rol text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_company_id uuid;
  v_empresa_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT p.active_company_id
    INTO v_company_id
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF v_company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.company_users cu
      WHERE cu.profile_id = v_uid
        AND cu.company_id = v_company_id
        AND cu.activo = true
    ) THEN
      v_company_id := NULL;
    ELSE
      SELECT m.empresa_id
        INTO v_empresa_id
      FROM public.company_empresa_map m
      WHERE m.company_id = v_company_id
      ORDER BY m.verified DESC NULLS LAST, m.confidence DESC NULLS LAST
      LIMIT 1;

      IF v_empresa_id IS NULL AND EXISTS (
        SELECT 1
        FROM public.empresas e
        WHERE e.id = v_company_id
          AND e.activa = true
      ) THEN
        v_empresa_id := v_company_id;
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.codigo::text,
    o.estado::text,
    MIN(op.rol::text) AS rol
  FROM public.operaciones o
  LEFT JOIN public.operacion_participantes op
    ON op.operacion_id = o.id
   AND v_empresa_id IS NOT NULL
   AND op.empresa_id = v_empresa_id
  WHERE op.id IS NOT NULL
     OR EXISTS (
       SELECT 1
       FROM public.mensajes_comerciales mc
       WHERE mc.operacion_id = o.id
         AND (
           mc.remitente_profile_id = v_uid
           OR mc.destinatario_profile_id = v_uid
         )
     )
  GROUP BY o.id, o.codigo, o.estado
  ORDER BY o.codigo DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.listar_operaciones_mensajes_disponibles() TO authenticated, service_role;
