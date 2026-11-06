-- Restrict manual external-signature confirmation to platform administrators.
-- This function marks all operation parties as signed after review of one
-- combined external document, so it must not be callable as an operational
-- override by an ordinary participant.

CREATE OR REPLACE FUNCTION public.confirmar_firma_externa(
  p_contrato_id uuid,
  p_documento_id uuid,
  p_sha256 text,
  p_nombre_archivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_contrato public.contratos%rowtype;
  v_doc public.documentos_operacion%rowtype;
  v_required integer;
  v_updated integer;
BEGIN
  IF v_uid IS NULL OR NOT public.es_administrador_plataforma() THEN
    RAISE EXCEPTION 'PLATFORM_ADMIN_REQUIRED';
  END IF;

  SELECT * INTO v_contrato
    FROM public.contratos
   WHERE id = p_contrato_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_NOT_FOUND'; END IF;

  IF coalesce(length(trim(p_sha256)), 0) <> 64
     OR p_sha256 !~ '^[0-9a-fA-F]{64}$' THEN
    RAISE EXCEPTION 'INVALID_SHA256';
  END IF;

  SELECT * INTO v_doc
    FROM public.documentos_operacion
   WHERE id = p_documento_id
     AND operacion_id = v_contrato.operacion_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SIGNED_DOCUMENT_NOT_IN_OPERATION'; END IF;

  IF coalesce(v_doc.aprobado, false) IS NOT TRUE
     OR coalesce(v_doc.url_archivo, '') = '' THEN
    RAISE EXCEPTION 'SIGNED_DOCUMENT_MUST_BE_APPROVED_AND_UPLOADED';
  END IF;

  IF coalesce(v_doc.firmado_externamente, false)
     AND lower(coalesce(v_doc.sha256, '')) <> lower(trim(p_sha256)) THEN
    RAISE EXCEPTION 'SIGNED_DOCUMENT_ALREADY_CONFIRMED_WITH_DIFFERENT_HASH';
  END IF;

  SELECT count(*) INTO v_required
    FROM public.operacion_participantes
   WHERE operacion_id = v_contrato.operacion_id
     AND rol IN ('VENDEDOR', 'COMPRADOR', 'INTERMEDIARIO');
  IF v_required < 2 THEN RAISE EXCEPTION 'OPERATION_MUST_HAVE_BUYER_AND_SELLER'; END IF;

  IF EXISTS (
    SELECT 1
      FROM public.operacion_participantes op
     WHERE op.operacion_id = v_contrato.operacion_id
       AND op.rol IN ('VENDEDOR', 'COMPRADOR', 'INTERMEDIARIO')
       AND NOT EXISTS (
         SELECT 1 FROM public.contrato_firmantes cf
          WHERE cf.contrato_id = p_contrato_id
            AND cf.rol = op.rol
            AND cf.empresa_id = op.empresa_id
       )
  ) THEN
    RAISE EXCEPTION 'CONTRACT_SIGNERS_MISSING_FOR_OPERATION_PARTIES';
  END IF;

  UPDATE public.documentos_operacion
     SET sha256 = lower(trim(p_sha256)),
         nombre_archivo = coalesce(nullif(trim(p_nombre_archivo), ''), nombre_archivo),
         firmado_externamente = true,
         firmado_externamente_at = coalesce(firmado_externamente_at, now()),
         cargado_por = coalesce(cargado_por, v_uid),
         evidencia_firma = jsonb_build_object(
           'metodo', 'EXTERNA_MANUAL',
           'confirmado_por', v_uid,
           'confirmado_at', now(),
           'documento_id', id,
           'contrato_id', p_contrato_id,
           'sha256', lower(trim(p_sha256))
         )
   WHERE id = p_documento_id;

  UPDATE public.contrato_firmantes cf
     SET firmado = true,
         fecha_firma = coalesce(fecha_firma, now()),
         metodo_firma = 'EXTERNA_MANUAL'
   WHERE cf.contrato_id = p_contrato_id
     AND EXISTS (
       SELECT 1 FROM public.operacion_participantes op
        WHERE op.operacion_id = v_contrato.operacion_id
          AND op.rol = cf.rol
          AND op.empresa_id = cf.empresa_id
          AND op.rol IN ('VENDEDOR', 'COMPRADOR', 'INTERMEDIARIO')
     );

  SELECT count(*) INTO v_updated
    FROM (
      SELECT DISTINCT op.empresa_id, op.rol
        FROM public.operacion_participantes op
       WHERE op.operacion_id = v_contrato.operacion_id
         AND op.rol IN ('VENDEDOR', 'COMPRADOR', 'INTERMEDIARIO')
         AND EXISTS (
           SELECT 1 FROM public.contrato_firmantes cf
            WHERE cf.contrato_id = p_contrato_id
              AND cf.empresa_id = op.empresa_id
              AND cf.rol = op.rol
              AND cf.firmado = true
         )
    ) signed_parties;

  IF v_updated < v_required THEN RAISE EXCEPTION 'NOT_ALL_OPERATION_PARTIES_SIGNED'; END IF;

  UPDATE public.contratos
     SET estado = 'CONFIRMADO',
         fecha_firma = coalesce(fecha_firma, current_date),
         confirmado_at = coalesce(confirmado_at, now()),
         firma_externa_estado = 'CONFIRMADO',
         firma_externa_documento_id = p_documento_id,
         firma_externa_confirmada_at = now(),
         firma_externa_confirmada_por = v_uid,
         actualizado_en = now(),
         updated_at = now()
   WHERE id = p_contrato_id;

  RETURN jsonb_build_object(
    'ok', true,
    'contrato_id', p_contrato_id,
    'documento_id', p_documento_id,
    'metodo', 'EXTERNA_MANUAL',
    'firmantes_confirmados', v_updated,
    'firmantes_requeridos', v_required,
    'confirmado_at', now()
  );
END;
$function$;
