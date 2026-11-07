ALTER TABLE public.operacion_comision_retenciones ADD COLUMN IF NOT EXISTS referencia_bancaria_validada text, ADD COLUMN IF NOT EXISTS fecha_validacion_manual timestamptz;
CREATE OR REPLACE FUNCTION public.validar_comprobante_comision_bancaria(p_retencion_id uuid,p_numero_operacion_bancaria text,p_observaciones text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid();v_state text;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=v_uid) THEN RAISE EXCEPTION 'PLATFORM_ADMIN_REQUIRED';END IF;
 IF nullif(trim(p_numero_operacion_bancaria),'') IS NULL OR length(trim(p_numero_operacion_bancaria))>80 THEN RAISE EXCEPTION 'BANK_OPERATION_REFERENCE_REQUIRED';END IF;
 SELECT estado INTO v_state FROM public.operacion_comision_retenciones WHERE id=p_retencion_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RETENTION_NOT_FOUND';END IF;
 IF v_state<>'COMPROBANTE_ENVIADO' THEN RAISE EXCEPTION 'INVALID_RETENTION_STATE';END IF;
 UPDATE public.operacion_comision_retenciones SET referencia_bancaria_validada=trim(p_numero_operacion_bancaria),fecha_validacion_manual=now(),actualizado_at=now() WHERE id=p_retencion_id;
 RETURN public.confirmar_retencion_comision_plataforma(p_retencion_id,p_observaciones);
END $$;
REVOKE ALL ON FUNCTION public.validar_comprobante_comision_bancaria(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.validar_comprobante_comision_bancaria(uuid,text,text) TO authenticated;