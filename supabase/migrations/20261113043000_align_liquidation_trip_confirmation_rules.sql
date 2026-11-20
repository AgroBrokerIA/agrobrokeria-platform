-- Align liquidation RPC with the UI's double-confirmation rules.
-- Only trips with matching carrier/producer kilos and no open observation
-- contribute to delivered kilos. Final confirmation rejects any incomplete trip.

CREATE OR REPLACE FUNCTION public.guardar_liquidacion_operacion(p_operacion_id uuid, p_datos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_row public.operacion_liquidacion;
 v_id uuid;
 v_estado text;
 v_kilos numeric;
 v_entregada_tn numeric;
 v_contractual_tn numeric;
 v_precio_tn numeric;
 v_bruto numeric;
 v_ajustes numeric;
 v_deducciones numeric;
 v_neto numeric;
 v_comision numeric;
 v_hay_viajes boolean;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF NOT public.usuario_participa_operacion(p_operacion_id)
    AND NOT public.es_administrador_plataforma() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 v_estado:=coalesce(nullif(trim(p_datos->>'estado'),''),'PRELIQUIDADA');
 IF v_estado NOT IN ('PRELIQUIDADA','CONFIRMADA') THEN RAISE EXCEPTION 'INVALID_LIQUIDATION_STATE'; END IF;

 SELECT EXISTS(SELECT 1 FROM public.viajes WHERE operacion_id=p_operacion_id) INTO v_hay_viajes;
 IF v_hay_viajes THEN
   IF v_estado='CONFIRMADA' AND EXISTS (
     SELECT 1 FROM public.viajes
     WHERE operacion_id=p_operacion_id
       AND (
         transportista_entrega_confirmada_at IS NULL
         OR productor_recepcion_confirmada_at IS NULL
         OR estado<>'ENTREGADO_CONFIRMADO'
         OR productor_recepcion_observada_at IS NOT NULL
         OR transportista_kilos_entregados IS NULL
         OR productor_kilos_recibidos IS NULL
         OR transportista_kilos_entregados < 0
         OR productor_kilos_recibidos < 0
         OR transportista_kilos_entregados IS DISTINCT FROM productor_kilos_recibidos
       )
   ) THEN RAISE EXCEPTION 'DUAL_DELIVERY_CONFIRMATION_REQUIRED'; END IF;

   SELECT coalesce(sum(productor_kilos_recibidos),0) INTO v_kilos
   FROM public.viajes
   WHERE operacion_id=p_operacion_id
     AND estado='ENTREGADO_CONFIRMADO'
     AND transportista_entrega_confirmada_at IS NOT NULL
     AND productor_recepcion_confirmada_at IS NOT NULL
     AND productor_recepcion_observada_at IS NULL
     AND transportista_kilos_entregados IS NOT NULL
     AND productor_kilos_recibidos IS NOT NULL
     AND transportista_kilos_entregados >= 0
     AND productor_kilos_recibidos >= 0
     AND transportista_kilos_entregados IS NOT DISTINCT FROM productor_kilos_recibidos;
 ELSE
   RAISE EXCEPTION 'DELIVERY_TRIP_REQUIRED';
 END IF;

 IF v_kilos<0 THEN RAISE EXCEPTION 'INVALID_DELIVERED_QUANTITY'; END IF;
 v_entregada_tn:=v_kilos/1000;
 SELECT coalesce(c.cantidad_tn,o.cantidad_tn,0),coalesce(c.precio_tn,o.precio_tn,0)
 INTO v_contractual_tn,v_precio_tn
 FROM public.operaciones o
 LEFT JOIN public.contratos c ON c.operacion_id=o.id AND c.estado='CONFIRMADO'
 WHERE o.id=p_operacion_id
 ORDER BY c.confirmado_at DESC NULLS LAST LIMIT 1;
 IF v_contractual_tn IS NULL THEN RAISE EXCEPTION 'OPERATION_NOT_FOUND'; END IF;
 IF v_contractual_tn<0 OR v_precio_tn<0 THEN RAISE EXCEPTION 'INVALID_CONTRACT_VALUES'; END IF;
 IF v_entregada_tn>v_contractual_tn THEN RAISE EXCEPTION 'DELIVERED_QUANTITY_EXCEEDS_CONTRACT'; END IF;

 v_ajustes:=coalesce((p_datos->>'ajustes_usd')::numeric,0);
 v_deducciones:=coalesce((p_datos->>'deducciones_usd')::numeric,0);
 IF v_ajustes<0 OR v_deducciones<0 THEN RAISE EXCEPTION 'INVALID_LIQUIDATION_ADJUSTMENTS'; END IF;
 v_bruto:=v_entregada_tn*v_precio_tn;
 v_comision:=v_entregada_tn;
 v_neto:=v_bruto-v_ajustes-v_deducciones-v_comision;
 IF v_neto<0 THEN RAISE EXCEPTION 'INVALID_NET_LIQUIDATION'; END IF;

 v_id:=nullif(p_datos->>'id','')::uuid;
 IF v_id IS NOT NULL THEN
  UPDATE public.operacion_liquidacion SET estado=v_estado,cantidad_contractual_tn=v_contractual_tn,kilos_entregados=v_kilos,
   cantidad_entregada_tn=v_entregada_tn,diferencia_tn=v_contractual_tn-v_entregada_tn,precio_tn=v_precio_tn,
   importe_bruto_usd=v_bruto,ajustes_usd=v_ajustes,deducciones_usd=v_deducciones,comision_agrobroker_usd=v_comision,
   importe_neto_usd=v_neto,fecha_liquidacion=nullif(p_datos->>'fecha_liquidacion','')::timestamptz,
   referencia_comprobante=p_datos->>'referencia_comprobante',observaciones=p_datos->>'observaciones',updated_at=now()
  WHERE id=v_id AND operacion_id=p_operacion_id RETURNING * INTO v_row;
 ELSE
  INSERT INTO public.operacion_liquidacion(operacion_id,estado,cantidad_contractual_tn,kilos_entregados,cantidad_entregada_tn,
   diferencia_tn,precio_tn,importe_bruto_usd,ajustes_usd,deducciones_usd,comision_agrobroker_usd,importe_neto_usd,
   fecha_liquidacion,referencia_comprobante,observaciones,creado_por,creado_at,updated_at)
  VALUES(p_operacion_id,v_estado,v_contractual_tn,v_kilos,v_entregada_tn,v_contractual_tn-v_entregada_tn,v_precio_tn,
   v_bruto,v_ajustes,v_deducciones,v_comision,v_neto,nullif(p_datos->>'fecha_liquidacion','')::timestamptz,
   p_datos->>'referencia_comprobante',p_datos->>'observaciones',v_uid,now(),now()) RETURNING * INTO v_row;
 END IF;
 IF v_row.id IS NULL THEN RAISE EXCEPTION 'LIQUIDATION_NOT_FOUND'; END IF;
 RETURN to_jsonb(v_row);
END;
$function$;
