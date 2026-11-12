CREATE OR REPLACE FUNCTION public.revisar_copia_firmada_contrato(p_copia_id uuid,p_resultado text,p_observaciones text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE v_uid uuid:=auth.uid(); v_copy public.contrato_copias_firmadas%rowtype;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=v_uid) THEN RAISE EXCEPTION 'PLATFORM_ADMIN_REQUIRED'; END IF;
 IF p_resultado NOT IN ('APROBADA','RECHAZADA') THEN RAISE EXCEPTION 'INVALID_RESULT'; END IF;
 SELECT * INTO v_copy FROM public.contrato_copias_firmadas WHERE id=p_copia_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'COPY_NOT_FOUND'; END IF;
 IF v_copy.estado<>'PENDIENTE' THEN RAISE EXCEPTION 'COPY_ALREADY_REVIEWED'; END IF;
 IF v_copy.rol NOT IN ('VENDEDOR','COMPRADOR') THEN RAISE EXCEPTION 'INVALID_SIGNATURE_ROLE'; END IF;
 IF p_resultado='RECHAZADA' AND nullif(trim(coalesce(p_observaciones,'')),'') IS NULL THEN RAISE EXCEPTION 'REJECTION_REASON_REQUIRED'; END IF;
 UPDATE public.contrato_copias_firmadas SET estado=p_resultado,observaciones=nullif(trim(coalesce(p_observaciones,'')),''),revisado_por=v_uid,revisado_at=now() WHERE id=p_copia_id;
 IF p_resultado='APROBADA' THEN
  UPDATE public.contrato_firmantes SET firmado=true,fecha_firma=coalesce(fecha_firma,now()),metodo_firma='COPIA_FIRMADA_VALIDADA',
   evidencia=jsonb_build_object('copia_id',p_copia_id,'version',v_copy.version_contrato,'sha256',v_copy.sha256,'validado_por',v_uid,'validado_at',now())
  WHERE contrato_id=v_copy.contrato_id AND empresa_id=v_copy.empresa_id AND rol=v_copy.rol;
  UPDATE public.operacion_control_comercial
  SET vendedor_firma_estado=CASE WHEN v_copy.rol='VENDEDOR' THEN 'FIRMADO' ELSE vendedor_firma_estado END,
      comprador_firma_estado=CASE WHEN v_copy.rol='COMPRADOR' THEN 'FIRMADO' ELSE comprador_firma_estado END,
      fecha_firma_vendedor=CASE WHEN v_copy.rol='VENDEDOR' THEN coalesce(fecha_firma_vendedor,v_copy.subido_at,now()) ELSE fecha_firma_vendedor END,
      fecha_firma_comprador=CASE WHEN v_copy.rol='COMPRADOR' THEN coalesce(fecha_firma_comprador,v_copy.subido_at,now()) ELSE fecha_firma_comprador END,
      updated_at=now()
  WHERE operacion_id=v_copy.operacion_id;
 END IF;
 RETURN jsonb_build_object('ok',true,'estado',p_resultado,'contrato_id',v_copy.contrato_id,'operacion_id',v_copy.operacion_id,'rol',v_copy.rol);
END; $function$;

WITH approved AS (
 SELECT operacion_id,bool_or(rol='VENDEDOR') AS vendedor_ok,bool_or(rol='COMPRADOR') AS comprador_ok,
 max(subido_at) FILTER(WHERE rol='VENDEDOR') AS vendedor_at,max(subido_at) FILTER(WHERE rol='COMPRADOR') AS comprador_at
 FROM public.contrato_copias_firmadas WHERE estado='APROBADA' AND rol IN ('VENDEDOR','COMPRADOR') GROUP BY operacion_id
)
UPDATE public.operacion_control_comercial cc
SET vendedor_firma_estado=CASE WHEN a.vendedor_ok THEN 'FIRMADO' ELSE cc.vendedor_firma_estado END,
 comprador_firma_estado=CASE WHEN a.comprador_ok THEN 'FIRMADO' ELSE cc.comprador_firma_estado END,
 fecha_firma_vendedor=CASE WHEN a.vendedor_ok THEN coalesce(cc.fecha_firma_vendedor,a.vendedor_at) ELSE cc.fecha_firma_vendedor END,
 fecha_firma_comprador=CASE WHEN a.comprador_ok THEN coalesce(cc.fecha_firma_comprador,a.comprador_at) ELSE cc.fecha_firma_comprador END,
 updated_at=now()
FROM approved a WHERE cc.operacion_id=a.operacion_id AND (a.vendedor_ok OR a.comprador_ok);