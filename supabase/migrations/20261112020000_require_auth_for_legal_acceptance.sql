-- Require a real authenticated user before recording legal acceptance.
-- SECURITY DEFINER must not permit a null auth.uid() to create an acceptance row.
CREATE OR REPLACE FUNCTION public.aceptar_documento_legal(
  p_documento_id uuid,
  p_ip text,
  p_user_agent text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  d public.documentos_legales;
  a uuid;
  cid uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT *
    INTO d
    FROM public.documentos_legales
   WHERE id = p_documento_id
     AND estado = 'VIGENTE';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DOCUMENTO_LEGAL_NO_VIGENTE';
  END IF;

  SELECT active_company_id
    INTO cid
    FROM public.profiles
   WHERE id = v_uid;

  INSERT INTO public.aceptaciones_legales(
    profile_id,
    company_id,
    documento_legal_id,
    version,
    hash_sha256,
    ip,
    user_agent
  )
  VALUES (
    v_uid,
    cid,
    d.id,
    d.version,
    d.hash_sha256,
    p_ip,
    p_user_agent
  )
  ON CONFLICT(profile_id, documento_legal_id)
  DO UPDATE SET
    version = EXCLUDED.version,
    hash_sha256 = EXCLUDED.hash_sha256,
    aceptado_at = now(),
    ip = EXCLUDED.ip,
    user_agent = EXCLUDED.user_agent
  RETURNING id INTO a;

  INSERT INTO public.auditoria(
    tabla,
    registro_id,
    accion,
    descripcion,
    dispositivo
  )
  VALUES (
    'aceptaciones_legales',
    a,
    'ACEPTACION_LEGAL',
    'Aceptación de versión ' || d.version,
    'server'
  );

  RETURN a;
END
$function$;
