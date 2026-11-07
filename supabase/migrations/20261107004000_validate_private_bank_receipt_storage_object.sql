DO $$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.registrar_comprobante_comision_plataforma(uuid,uuid,text,text)'::regprocedure);
  v_old := $old$
  IF NULLIF(TRIM(p_referencia_pago), '') IS NULL THEN RAISE EXCEPTION 'BANK_TRANSFER_REFERENCE_REQUIRED'; END IF;
$old$;
  v_new := $new$
  IF NULLIF(TRIM(p_referencia_pago), '') IS NULL THEN RAISE EXCEPTION 'BANK_TRANSFER_REFERENCE_REQUIRED'; END IF;

  IF NULLIF(TRIM(COALESCE(p_comprobante_url,'')),'') IS NULL
     OR p_comprobante_url NOT LIKE p_operacion_id::text||'/comisiones/'||v_uid::text||'-%'
     OR NOT EXISTS (
       SELECT 1
       FROM storage.objects so
       WHERE so.bucket_id='documentos-operacion'
         AND so.name=p_comprobante_url
         AND so.owner_id::text=v_uid::text
         AND coalesce(so.metadata->>'mimetype','') IN ('application/pdf','image/jpeg','image/png')
         AND coalesce((so.metadata->>'size')::bigint,0) BETWEEN 1 AND 10485760
     ) THEN
    RAISE EXCEPTION 'INVALID_PRIVATE_BANK_RECEIPT';
  END IF;
$ new$;
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'BANK_RECEIPT_VALIDATION_ANCHOR_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);
END $$;