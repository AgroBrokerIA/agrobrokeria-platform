-- Harden signed-contract copy registration.
-- The authenticated company participant must reference a PDF actually uploaded
-- by that same user to the operation/contract/role folder. Approved copies
-- cannot be silently replaced by another upload for the same contract version.

CREATE OR REPLACE FUNCTION public.registrar_copia_firmada_contrato(
  p_contrato_id uuid,
  p_rol text,
  p_storage_path text,
  p_nombre_archivo text,
  p_sha256 text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_company uuid;
  v_contract public.contratos%rowtype;
  v_version integer;
  v_id uuid;
  v_prefix text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  p_rol := upper(trim(coalesce(p_rol, '')));
  IF p_rol NOT IN ('VENDEDOR', 'COMPRADOR') THEN
    RAISE EXCEPTION 'INVALID_ROLE';
  END IF;

  IF nullif(trim(p_storage_path), '') IS NULL
     OR nullif(trim(p_nombre_archivo), '') IS NULL THEN
    RAISE EXCEPTION 'FILE_REQUIRED';
  END IF;

  IF coalesce(p_sha256, '') !~ '^[0-9a-fA-F]{64}$' THEN
    RAISE EXCEPTION 'INVALID_SHA256';
  END IF;

  SELECT p.active_company_id
    INTO v_company
    FROM public.profiles p
   WHERE p.id = v_uid;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'ACTIVE_COMPANY_REQUIRED';
  END IF;

  SELECT *
    INTO v_contract
    FROM public.contratos c
   WHERE c.id = p_contrato_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONTRACT_NOT_FOUND';
  END IF;

  IF NOT public.usuario_participa_operacion(v_contract.operacion_id) THEN
    RAISE EXCEPTION 'NOT_OPERATION_PARTICIPANT';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.operacion_participantes op
     WHERE op.operacion_id = v_contract.operacion_id
       AND op.empresa_id = v_company
       AND upper(op.rol) = p_rol
  ) THEN
    RAISE EXCEPTION 'ROLE_NOT_ASSIGNED_TO_ACTIVE_COMPANY';
  END IF;

  v_prefix := v_contract.operacion_id::text
    || '/contratos/' || p_contrato_id::text || '/' || p_rol || '/';

  IF left(p_storage_path, length(v_prefix)) <> v_prefix
     OR p_storage_path !~ '\\.pdf$'
     OR p_storage_path LIKE '%..%'
     OR position('/' IN substring(p_storage_path FROM length(v_prefix) + 1)) > 0 THEN
    RAISE EXCEPTION 'INVALID_SIGNED_COPY_STORAGE_PATH';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM storage.objects o
     WHERE o.bucket_id = 'documentos-operacion'
       AND o.name = p_storage_path
       AND o.owner = v_uid
  ) THEN
    RAISE EXCEPTION 'SIGNED_COPY_FILE_NOT_OWNED_OR_NOT_FOUND';
  END IF;

  SELECT coalesce(max(cv.version), 1)
    INTO v_version
    FROM public.contrato_versiones cv
   WHERE cv.contrato_id = p_contrato_id;

  IF EXISTS (
    SELECT 1
      FROM public.contrato_copias_firmadas cf
     WHERE cf.contrato_id = p_contrato_id
       AND cf.version_contrato = v_version
       AND cf.empresa_id = v_company
       AND cf.rol = p_rol
       AND cf.estado = 'APROBADA'
  ) THEN
    RAISE EXCEPTION 'APPROVED_SIGNED_COPY_IMMUTABLE';
  END IF;

  INSERT INTO public.contrato_copias_firmadas(
    contrato_id, operacion_id, version_contrato, empresa_id, rol,
    storage_path, nombre_archivo, sha256, subido_por
  )
  VALUES (
    p_contrato_id, v_contract.operacion_id, v_version, v_company, p_rol,
    p_storage_path, p_nombre_archivo, lower(p_sha256), v_uid
  )
  ON CONFLICT (contrato_id, version_contrato, empresa_id, rol)
  DO UPDATE SET
    storage_path = excluded.storage_path,
    nombre_archivo = excluded.nombre_archivo,
    sha256 = excluded.sha256,
    estado = 'PENDIENTE',
    observaciones = NULL,
    subido_por = v_uid,
    subido_at = now(),
    revisado_por = NULL,
    revisado_at = NULL
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;
