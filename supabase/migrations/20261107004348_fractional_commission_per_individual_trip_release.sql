CREATE TABLE IF NOT EXISTS public.operacion_comision_viajes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 retencion_id uuid NOT NULL REFERENCES public.operacion_comision_retenciones(id) ON DELETE RESTRICT,
 operacion_id uuid NOT NULL REFERENCES public.operaciones(id) ON DELETE RESTRICT,
 viaje_id uuid NOT NULL UNIQUE REFERENCES public.viajes(id) ON DELETE RESTRICT,
 importe_asignado numeric(18,2) NOT NULL CHECK(importe_asignado>=0),
 moneda_id integer NOT NULL REFERENCES public.monedas(id),
 estado text NOT NULL DEFAULT 'RETENIDA' CHECK(estado IN ('RETENIDA','LIBERADA','OBSERVADA','BLOQUEADA')),
 liberado_at timestamptz, creado_at timestamptz NOT NULL DEFAULT now(), actualizado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operacion_comision_viajes_operacion_idx ON public.operacion_comision_viajes(operacion_id,estado);
ALTER TABLE public.operacion_comision_viajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY operacion_comision_viajes_participant_select ON public.operacion_comision_viajes FOR SELECT TO authenticated
 USING(public.usuario_participa_operacion(operacion_id) OR EXISTS(SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=auth.uid()));
CREATE POLICY operacion_comision_viajes_admin_write ON public.operacion_comision_viajes FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=auth.uid()))
 WITH CHECK(EXISTS(SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.asignar_comision_por_viaje()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_total numeric; v_count integer;
BEGIN
 IF NEW.estado<>'RETENIDA' OR (TG_OP='UPDATE' AND OLD.estado='RETENIDA') THEN RETURN NEW; END IF;
 SELECT count(*),coalesce(sum(coalesce(nullif(v.carta_porte_tn,0),nullif(v.kilos_cargados,0)/1000.0)),0)
 INTO v_count,v_total FROM public.viajes v WHERE v.operacion_id=NEW.operacion_id;
 IF v_count=0 OR v_total<=0 THEN RAISE EXCEPTION 'TRIPS_WITH_POSITIVE_DECLARED_TONNAGE_REQUIRED'; END IF;
 INSERT INTO public.operacion_comision_viajes(retencion_id,operacion_id,viaje_id,importe_asignado,moneda_id)
 SELECT NEW.id,NEW.operacion_id,x.id,
 CASE WHEN x.rn=x.cnt THEN round(NEW.importe-coalesce(sum(round(NEW.importe*x.toneladas/v_total,2)) OVER(ORDER BY x.rn ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0),2)
 ELSE round(NEW.importe*x.toneladas/v_total,2) END,NEW.moneda_id
 FROM(SELECT v.id,coalesce(nullif(v.carta_porte_tn,0),nullif(v.kilos_cargados,0)/1000.0) toneladas,row_number() over(order by v.creado_en,v.id) rn,count(*) over() cnt FROM public.viajes v WHERE v.operacion_id=NEW.operacion_id)x;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_asignar_comision_por_viaje AFTER UPDATE OF estado ON public.operacion_comision_retenciones
 FOR EACH ROW WHEN(NEW.estado='RETENIDA' AND OLD.estado IS DISTINCT FROM NEW.estado) EXECUTE FUNCTION public.asignar_comision_por_viaje();
CREATE OR REPLACE FUNCTION public.bloquear_nuevo_viaje_despues_retencion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.operacion_comision_retenciones r WHERE r.operacion_id=NEW.operacion_id AND r.estado IN('RETENIDA','LIBERADA')) THEN RAISE EXCEPTION 'TRIP_MANIFEST_LOCKED_AFTER_COMMISSION_PAYMENT_VERIFICATION'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_bloquear_nuevo_viaje_despues_retencion BEFORE INSERT ON public.viajes FOR EACH ROW EXECUTE FUNCTION public.bloquear_nuevo_viaje_despues_retencion();
CREATE OR REPLACE FUNCTION public.intentar_liberar_comision_agrobrokeria(p_operacion_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid();v_r public.operacion_comision_retenciones%rowtype;v_comm_id uuid;v_released_count integer:=0;v_total_count integer:=0;v_released_amount numeric:=0;v_pending_amount numeric:=0;v_row record;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 IF NOT public.usuario_participa_operacion(p_operacion_id) AND NOT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=v_uid) THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 SELECT * INTO v_r FROM public.operacion_comision_retenciones WHERE operacion_id=p_operacion_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('liberada',false,'motivo','COMISION_NO_REGISTRADA');END IF;
 IF v_r.estado NOT IN('RETENIDA','LIBERADA') OR v_r.verificado_at IS NULL OR v_r.verificado_por IS NULL THEN RETURN jsonb_build_object('liberada',false,'motivo','PAGO_BANCARIO_NO_VALIDADO');END IF;
 IF NOT EXISTS(SELECT 1 FROM public.operacion_comision_viajes WHERE retencion_id=v_r.id) THEN RETURN jsonb_build_object('liberada',false,'motivo','ASIGNACION_POR_VIAJE_NO_DISPONIBLE');END IF;
 FOR v_row IN SELECT a.id,a.viaje_id,a.importe_asignado,v.transportista_entrega_confirmada_at,v.productor_recepcion_confirmada_at,v.estado,v.productor_recepcion_observada_at,v.transportista_kilos_entregados,v.productor_kilos_recibidos FROM public.operacion_comision_viajes a JOIN public.viajes v ON v.id=a.viaje_id WHERE a.retencion_id=v_r.id AND a.estado='RETENIDA' FOR UPDATE OF a LOOP
  IF v_row.transportista_entrega_confirmada_at IS NOT NULL AND v_row.productor_recepcion_confirmada_at IS NOT NULL AND v_row.estado='ENTREGADO_CONFIRMADO' AND v_row.productor_recepcion_observada_at IS NULL AND v_row.transportista_kilos_entregados IS NOT NULL AND v_row.productor_kilos_recibidos=v_row.transportista_kilos_entregados AND EXISTS(SELECT 1 FROM public.viaje_cartas_porte cp WHERE cp.viaje_id=v_row.viaje_id AND cp.estado_verificacion='VALIDADA') THEN
   UPDATE public.operacion_comision_viajes SET estado='LIBERADA',liberado_at=now(),actualizado_at=now() WHERE id=v_row.id AND estado='RETENIDA';
   IF FOUND AND NOT EXISTS(SELECT 1 FROM public.operacion_movimientos_economicos WHERE operacion_id=p_operacion_id AND tipo_movimiento='COMISION_LIBERADA' AND referencia='VIAJE:'||v_row.viaje_id::text) THEN
    INSERT INTO public.operacion_movimientos_economicos(operacion_id,comision_id,tipo_movimiento,concepto,moneda_id,importe,signo,estado,referencia,fecha_movimiento,creado_at,actualizado_at)
    SELECT p_operacion_id,c.id,'COMISION_LIBERADA','Liberación contable proporcional por entrega individual confirmada',v_r.moneda_id,v_row.importe_asignado,1,'LIBERADA','VIAJE:'||v_row.viaje_id::text,now(),now(),now() FROM public.operacion_comisiones c WHERE c.operacion_id=p_operacion_id AND c.tipo_comision='PLATAFORMA' AND c.origen_comision='AGROBROKER_IA' ORDER BY c.creado_at DESC LIMIT 1;
   END IF;
  END IF;
 END LOOP;
 SELECT count(*),coalesce(sum(importe_asignado) FILTER(WHERE estado='LIBERADA'),0),coalesce(sum(importe_asignado) FILTER(WHERE estado<>'LIBERADA'),0) INTO v_total_count,v_released_amount,v_pending_amount FROM public.operacion_comision_viajes WHERE retencion_id=v_r.id;
 SELECT id INTO v_comm_id FROM public.operacion_comisiones WHERE operacion_id=p_operacion_id AND tipo_comision='PLATAFORMA' AND origen_comision='AGROBROKER_IA' ORDER BY creado_at DESC LIMIT 1 FOR UPDATE;
 IF v_total_count>0 AND v_pending_amount=0 THEN
  UPDATE public.operacion_comision_retenciones SET estado='LIBERADA',liberado_at=coalesce(liberado_at,now()),actualizado_at=now() WHERE id=v_r.id;
  UPDATE public.operacion_comisiones SET estado='LIBERADA',saldo_reservado=0,saldo_pagado=v_released_amount,actualizado_at=now(),observaciones=concat_ws(E'\\n',nullif(observaciones,''),'Liberación contable completa: todas las entregas individuales fueron confirmadas.') WHERE id=v_comm_id;
  UPDATE public.operacion_control_comercial SET comision_estado='LIBERADA',updated_at=now() WHERE operacion_id=p_operacion_id;
 ELSE
  UPDATE public.operacion_comisiones SET estado='RETENIDA',saldo_reservado=v_pending_amount,saldo_pagado=v_released_amount,actualizado_at=now(),observaciones=concat_ws(E'\\n',nullif(observaciones,''),'Liberación parcial por viajes; saldo restante retenido contablemente.') WHERE id=v_comm_id;
  UPDATE public.operacion_control_comercial SET comision_estado='RETENIDA',updated_at=now() WHERE operacion_id=p_operacion_id;
 END IF;
 RETURN jsonb_build_object('liberada',v_total_count>0 AND v_pending_amount=0,'liberaciones_nuevas',v_released_count,'viajes_totales',v_total_count,'importe_liberado',v_released_amount,'importe_retenido',v_pending_amount,'es_movimiento_bancario_automatico',false);
END $$;
REVOKE ALL ON FUNCTION public.asignar_comision_por_viaje() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bloquear_nuevo_viaje_despues_retencion() FROM PUBLIC,anon,authenticated;
