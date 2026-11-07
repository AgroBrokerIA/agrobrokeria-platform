CREATE OR REPLACE FUNCTION public.confirmar_retencion_comision_plataforma(p_retencion_id uuid,p_observaciones text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid();v_r public.operacion_comision_retenciones%rowtype;v_usd_id integer;v_comm_id uuid;v_orden integer;v_release jsonb;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=v_uid) THEN RAISE EXCEPTION 'PLATFORM_ADMIN_REQUIRED';END IF;
 SELECT * INTO v_r FROM public.operacion_comision_retenciones WHERE id=p_retencion_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RETENTION_NOT_FOUND';END IF;
 IF v_r.estado<>'COMPROBANTE_ENVIADO' THEN RAISE EXCEPTION 'INVALID_RETENTION_STATE';END IF;
 IF nullif(trim(v_r.referencia_bancaria_validada),'') IS NULL OR v_r.fecha_validacion_manual IS NULL THEN RAISE EXCEPTION 'MANUAL_BANK_VALIDATION_REQUIRED';END IF;
 SELECT e.orden INTO v_orden FROM public.operacion_workflow ow JOIN public.workflow_etapas e ON e.id=ow.etapa_actual_id AND e.workflow_id=ow.workflow_id WHERE ow.operacion_id=v_r.operacion_id FOR UPDATE OF ow;
 IF v_orden<>4 THEN RAISE EXCEPTION 'FUNDS_STAGE_REQUIRED';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.operacion_control_comercial WHERE operacion_id=v_r.operacion_id AND visado_resultado='APROBADO') THEN RAISE EXCEPTION 'APPROVED_MERCHANDISE_INSPECTION_REQUIRED';END IF;
 SELECT id INTO v_usd_id FROM public.monedas WHERE upper(codigo)='USD' LIMIT 1;
 SELECT id INTO v_comm_id FROM public.operacion_comisiones WHERE operacion_id=v_r.operacion_id AND tipo_comision='PLATAFORMA' AND origen_comision='AGROBROKER_IA' ORDER BY creado_at DESC LIMIT 1 FOR UPDATE;
 IF v_comm_id IS NULL THEN
  INSERT INTO public.operacion_comisiones(operacion_id,empresa_id,profile_id,tipo_comision,tipo_ganancia,concepto,modalidad_calculo,cantidad_tn,valor_unitario,subtotal,moneda_id,iva_porcentaje,iva_importe,total,estado,factura_estado,saldo_pendiente,saldo_pagado,saldo_reservado,origen_comision,observaciones)
  SELECT v_r.operacion_id,null,null,'PLATAFORMA','USD_TN','Comisión propia AgroBrokerIA','USD_TN',o.cantidad_tn,1,v_r.importe,v_usd_id,0,0,v_r.importe,'RETENIDA','NO_CORRESPONDE',0,0,v_r.importe,'AGROBROKER_IA','Transferencia verificada y retenida contablemente hasta la entrega de cada viaje.' FROM public.operaciones o WHERE o.id=v_r.operacion_id RETURNING id INTO v_comm_id;
 ELSE
  UPDATE public.operacion_comisiones SET total=v_r.importe,subtotal=v_r.importe,estado='RETENIDA',saldo_pendiente=0,saldo_pagado=0,saldo_reservado=v_r.importe,medio_pago='TRANSFERENCIA',fecha_pago=now(),referencia_pago=v_r.referencia_pago,actualizado_at=now() WHERE id=v_comm_id;
 END IF;
 UPDATE public.operacion_comision_retenciones SET estado='RETENIDA',verificado_por=v_uid,verificado_at=now(),observaciones=coalesce(p_observaciones,observaciones),actualizado_at=now() WHERE id=p_retencion_id;
 UPDATE public.operacion_control_comercial SET comision_estado='RETENIDA',comision_fecha_pago=now(),comision_fecha_retencion=now(),comision_medio_pago='TRANSFERENCIA',comision_referencia_pago=v_r.referencia_pago,updated_at=now() WHERE operacion_id=v_r.operacion_id;
 INSERT INTO public.operacion_movimientos_economicos(operacion_id,comision_id,tipo_movimiento,concepto,moneda_id,importe,signo,estado,referencia,fecha_movimiento,creado_at,actualizado_at)
 VALUES(v_r.operacion_id,v_comm_id,'COMISION_RETENIDA','Comisión AgroBrokerIA: ingreso bancario verificado y saldo asignado por viaje',v_r.moneda_id,v_r.importe,1,'RETENIDA',v_r.referencia_pago,now(),now(),now());
 v_release:=public.intentar_liberar_comision_agrobrokeria(v_r.operacion_id);
 RETURN jsonb_build_object('retencion_id',p_retencion_id,'estado',CASE WHEN coalesce((v_release->>'liberada')::boolean,false) THEN 'LIBERADA' ELSE 'RETENIDA' END,'importe',v_r.importe,'moneda_id',v_r.moneda_id,'liberacion',v_release);
END $$;