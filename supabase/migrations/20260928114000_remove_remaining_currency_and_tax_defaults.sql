-- 2026-09-28: remove remaining currency/tax defaults from critical server calculations.
-- Applied to production project hlviozkqskdhdaykgtis before committing this migration.

DO $$
DECLARE v_usd_id integer;
BEGIN
  SELECT id INTO v_usd_id FROM public.monedas WHERE upper(codigo)='USD' LIMIT 1;
  IF v_usd_id IS NULL THEN RAISE EXCEPTION 'USD currency is not configured'; END IF;
  UPDATE public.operacion_comisiones
     SET moneda_id=v_usd_id
   WHERE tipo_comision='PLATAFORMA' OR origen_comision='AGROBROKER_IA';
END $$;

-- The production function definitions are intentionally kept in this migration
-- so the database state is reproducible from Git history.
CREATE OR REPLACE FUNCTION public.confirmar_liquidacion_y_cerrar_operacion(p_operacion_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $function$
DECLARE
  v_liquidacion public.operacion_liquidacion%rowtype;
  v_usuario uuid:=auth.uid(); v_comision_id uuid; v_movimiento_existente boolean;
  v_workflow public.operacion_workflow%rowtype; v_orden integer; v_usd_id integer;
BEGIN
  IF v_usuario IS NULL THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.operacion_participantes op JOIN public.company_users cu ON cu.company_id=op.empresa_id WHERE op.operacion_id=p_operacion_id AND cu.profile_id=v_usuario AND cu.activo=true) THEN RAISE EXCEPTION 'El usuario no participa de esta operación.'; END IF;
  SELECT * INTO v_workflow FROM public.operacion_workflow WHERE operacion_id=p_operacion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La operación no tiene workflow.'; END IF;
  SELECT orden INTO v_orden FROM public.workflow_etapas WHERE id=v_workflow.etapa_actual_id AND workflow_id=v_workflow.workflow_id;
  IF v_orden<>9 THEN RAISE EXCEPTION 'La operación debe estar en la etapa Liquidación para poder cerrarse.'; END IF;
  SELECT * INTO v_liquidacion FROM public.operacion_liquidacion WHERE operacion_id=p_operacion_id ORDER BY creado_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No existe una liquidación para esta operación.'; END IF;
  IF v_liquidacion.estado<>'CONFIRMADA' THEN RAISE EXCEPTION 'La liquidación debe estar CONFIRMADA antes de cerrar la operación.'; END IF;
  IF v_liquidacion.cantidad_entregada_tn<=0 THEN RAISE EXCEPTION 'La liquidación confirmada requiere cantidad entregada mayor a cero.'; END IF;
  SELECT id INTO v_usd_id FROM public.monedas WHERE upper(codigo)='USD' LIMIT 1;
  IF v_usd_id IS NULL THEN RAISE EXCEPTION 'La moneda USD no está configurada en el catálogo.'; END IF;
  v_liquidacion.comision_agrobroker_usd:=v_liquidacion.cantidad_entregada_tn;
  SELECT id INTO v_comision_id FROM public.operacion_comisiones WHERE operacion_id=p_operacion_id AND origen_comision='AGROBROKER_IA' AND tipo_comision='PLATAFORMA' LIMIT 1 FOR UPDATE;
  IF v_comision_id IS NULL THEN
    INSERT INTO public.operacion_comisiones(operacion_id,empresa_id,profile_id,tipo_comision,tipo_ganancia,concepto,modalidad_calculo,cantidad_tn,valor_unitario,porcentaje,valor_base,subtotal,moneda_id,iva_porcentaje,iva_importe,total,estado,factura_estado,saldo_pendiente,saldo_pagado,origen_comision,observaciones,creado_at,actualizado_at)
    VALUES(p_operacion_id,NULL,NULL,'PLATAFORMA','USD_TN','Comisión propia AgroBroker IA','USD_TN',v_liquidacion.cantidad_entregada_tn,1,NULL,NULL,v_liquidacion.cantidad_entregada_tn,v_usd_id,0,0,v_liquidacion.cantidad_entregada_tn,'PENDIENTE','NO_CORRESPONDE',v_liquidacion.cantidad_entregada_tn,0,'AGROBROKER_IA','USD 1 por tonelada entregada. Generada al confirmar la liquidación.',now(),now()) RETURNING id INTO v_comision_id;
  ELSE
    UPDATE public.operacion_comisiones SET cantidad_tn=v_liquidacion.cantidad_entregada_tn,valor_unitario=1,moneda_id=v_usd_id,subtotal=v_liquidacion.cantidad_entregada_tn,total=v_liquidacion.cantidad_entregada_tn,estado='PENDIENTE',saldo_pendiente=v_liquidacion.cantidad_entregada_tn,saldo_pagado=0,actualizado_at=now() WHERE id=v_comision_id;
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.operacion_movimientos_economicos WHERE operacion_id=p_operacion_id AND comision_id=v_comision_id AND tipo_movimiento='COMISION_GENERADA') INTO v_movimiento_existente;
  IF NOT v_movimiento_existente THEN
    INSERT INTO public.operacion_movimientos_economicos(operacion_id,comision_id,empresa_id,profile_id,tipo_movimiento,concepto,moneda_id,importe,signo,estado,referencia,fecha_movimiento,creado_at,actualizado_at)
    VALUES(p_operacion_id,v_comision_id,NULL,NULL,'COMISION_GENERADA','Comisión propia AgroBroker IA — USD 1/TN',v_usd_id,v_liquidacion.cantidad_entregada_tn,1,'PENDIENTE','AGROBROKER-IA-'||p_operacion_id,now(),now(),now());
  END IF;
  UPDATE public.operacion_liquidacion SET comision_agrobroker_usd=v_liquidacion.cantidad_entregada_tn,updated_at=now() WHERE id=v_liquidacion.id;
  UPDATE public.operaciones SET estado='CERRADA',actualizada_en=now() WHERE id=p_operacion_id;
  UPDATE public.operacion_workflow SET estado='CERRADA' WHERE id=v_workflow.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.crear_solicitud_factura(p_operacion_id uuid,p_empresa_receptor_id uuid,p_tipo_comprobante_codigo integer,p_punto_venta integer,p_importe_neto numeric,p_importe_iva numeric,p_fecha_emision date DEFAULT current_date,p_fecha_vencimiento date DEFAULT NULL,p_condicion_iva_receptor integer DEFAULT NULL,p_doc_tipo_receptor integer DEFAULT NULL,p_iva_alicuota numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $function$
DECLARE v_uid uuid:=auth.uid(); v_empresa uuid; v_contrato uuid; v_producto integer; v_cantidad numeric; v_moneda integer; v_total numeric; v_id uuid; v_issuer public.empresas%rowtype; v_receiver public.empresas%rowtype; v_key text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_tipo_comprobante_codigo NOT IN (1,6,11,51) THEN RAISE EXCEPTION 'INVALID_COMPROBANTE_TYPE'; END IF;
  IF p_punto_venta IS NULL OR p_punto_venta<1 THEN RAISE EXCEPTION 'PUNTO_VENTA_REQUIRED'; END IF;
  IF p_importe_neto IS NULL OR p_importe_neto<=0 THEN RAISE EXCEPTION 'NET_AMOUNT_REQUIRED'; END IF;
  IF COALESCE(p_importe_iva,0)<0 THEN RAISE EXCEPTION 'IVA_INVALID'; END IF;
  IF COALESCE(p_importe_iva,0)>0 AND (p_iva_alicuota IS NULL OR p_iva_alicuota<=0) THEN RAISE EXCEPTION 'IVA_RATE_REQUIRED'; END IF;
  IF p_doc_tipo_receptor IS NULL OR p_doc_tipo_receptor<=0 THEN RAISE EXCEPTION 'DOC_TYPE_REQUIRED'; END IF;
  SELECT active_company_id INTO v_empresa FROM public.profiles WHERE id=v_uid;
  IF v_empresa IS NULL OR NOT public.usuario_es_miembro_empresa(v_empresa) THEN RAISE EXCEPTION 'ACTIVE_COMPANY_REQUIRED'; END IF;
  IF NOT public.usuario_participa_operacion(p_operacion_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT id INTO v_contrato FROM public.contratos WHERE operacion_id=p_operacion_id AND estado='CONFIRMADO' LIMIT 1;
  IF v_contrato IS NULL THEN RAISE EXCEPTION 'CONFIRMED_CONTRACT_REQUIRED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.operacion_participantes WHERE operacion_id=p_operacion_id AND empresa_id=v_empresa) THEN RAISE EXCEPTION 'ISSUER_NOT_PARTICIPANT'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.operacion_participantes WHERE operacion_id=p_operacion_id AND empresa_id=p_empresa_receptor_id) THEN RAISE EXCEPTION 'RECEIVER_NOT_PARTICIPANT'; END IF;
  IF p_empresa_receptor_id=v_empresa THEN RAISE EXCEPTION 'RECEIVER_MUST_DIFFER_FROM_ISSUER'; END IF;
  SELECT cantidad_tn,moneda_id INTO v_cantidad,v_moneda FROM public.operaciones WHERE id=p_operacion_id;
  SELECT * INTO v_issuer FROM public.empresas WHERE id=v_empresa; SELECT * INTO v_receiver FROM public.empresas WHERE id=p_empresa_receptor_id;
  SELECT producto_id INTO v_producto FROM public.publicaciones WHERE id IN((SELECT publicacion_venta_id FROM public.operaciones WHERE id=p_operacion_id) UNION ALL(SELECT publicacion_compra_id FROM public.operaciones WHERE id=p_operacion_id)) AND producto_id IS NOT NULL LIMIT 1;
  v_total:=round(p_importe_neto+COALESCE(p_importe_iva,0),2);
  v_key:=encode(digest(concat_ws('|',p_operacion_id::text,v_empresa::text,p_empresa_receptor_id::text,p_tipo_comprobante_codigo::text,p_punto_venta::text,p_importe_neto::text,p_importe_iva::text,p_fecha_emision::text),'sha256'),'hex');
  SELECT id INTO v_id FROM public.facturas WHERE arca_attempt_key=v_key AND estado NOT IN ('ANULADA','RECHAZADA') LIMIT 1; IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  SELECT id INTO v_id FROM public.facturas WHERE operacion_id=p_operacion_id AND empresa_id=v_empresa AND estado IN('PENDIENTE_ARCA','PENDIENTE','PENDIENTE_RECONCILIACION') LIMIT 1; IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO public.facturas(operacion_id,empresa_id,contrato_id,empresa_receptor_id,producto_id,cantidad_tn,tipo_factura,tipo_comprobante_codigo,punto_venta,importe,importe_neto,importe_iva,importe_total,moneda_id,fecha_emision,fecha_vencimiento,estado,cuit_emisor,cuit_receptor,razon_social_emisor,razon_social_receptor,condicion_iva_receptor,doc_tipo_receptor,iva_alicuota,arca_attempt_key,usuario_responsable,creada_en,actualizada_en)
  VALUES(p_operacion_id,v_empresa,v_contrato,p_empresa_receptor_id,v_producto,v_cantidad,CASE p_tipo_comprobante_codigo WHEN 1 THEN 'A' WHEN 6 THEN 'B' WHEN 11 THEN 'C' WHEN 51 THEN 'M' END,p_tipo_comprobante_codigo,p_punto_venta,p_importe_neto,p_importe_neto,p_importe_iva,v_total,v_moneda,p_fecha_emision,p_fecha_vencimiento,'PENDIENTE_ARCA',v_issuer.cuit,v_receiver.cuit,v_issuer.razon_social,v_receiver.razon_social,p_condicion_iva_receptor,p_doc_tipo_receptor,p_iva_alicuota,v_key,v_uid,now(),now()) RETURNING id INTO v_id;
  INSERT INTO public.factura_eventos(factura_id,actor_profile_id,evento,metadata) VALUES(v_id,v_uid,'SOLICITADA_ARCA',jsonb_build_object('tipo_comprobante',p_tipo_comprobante_codigo,'punto_venta',p_punto_venta,'attempt_key',v_key));
  RETURN v_id;
END;
$function$;
