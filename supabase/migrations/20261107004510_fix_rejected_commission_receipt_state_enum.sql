CREATE OR REPLACE FUNCTION public.rechazar_comprobante_comision_plataforma(p_retencion_id uuid,p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid();v_r public.operacion_comision_retenciones%rowtype;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=v_uid) THEN RAISE EXCEPTION 'PLATFORM_ADMIN_REQUIRED';END IF;
 IF nullif(trim(p_motivo),'') IS NULL THEN RAISE EXCEPTION 'REJECTION_REASON_REQUIRED';END IF;
 SELECT * INTO v_r FROM public.operacion_comision_retenciones WHERE id=p_retencion_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RETENTION_NOT_FOUND';END IF;
 IF v_r.estado<>'COMPROBANTE_ENVIADO' THEN RAISE EXCEPTION 'INVALID_RETENTION_STATE';END IF;
 UPDATE public.operacion_comision_retenciones SET estado='RECHAZADA',verificado_por=v_uid,verificado_at=now(),observaciones=trim(p_motivo),referencia_bancaria_validada=NULL,fecha_validacion_manual=NULL,actualizado_at=now() WHERE id=p_retencion_id;
 RETURN jsonb_build_object('retencion_id',p_retencion_id,'estado','RECHAZADA');
END $$;