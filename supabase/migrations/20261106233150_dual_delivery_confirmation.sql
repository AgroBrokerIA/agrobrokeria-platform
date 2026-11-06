-- Two-party proof of delivery: carrier handoff + seller/producer receipt.
ALTER TABLE public.viajes
  ADD COLUMN IF NOT EXISTS transportista_entrega_confirmada_por uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS transportista_entrega_confirmada_at timestamptz,
  ADD COLUMN IF NOT EXISTS transportista_kilos_entregados numeric,
  ADD COLUMN IF NOT EXISTS productor_recepcion_confirmada_por uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS productor_recepcion_confirmada_at timestamptz,
  ADD COLUMN IF NOT EXISTS productor_kilos_recibidos numeric,
  ADD COLUMN IF NOT EXISTS productor_recepcion_observaciones text,
  ADD COLUMN IF NOT EXISTS productor_recepcion_observada_at timestamptz;

ALTER TABLE public.viaje_eventos
  DROP CONSTRAINT IF EXISTS viaje_eventos_estado_check;
ALTER TABLE public.viaje_eventos
  ADD CONSTRAINT viaje_eventos_estado_check CHECK (estado = ANY (ARRAY[
    'CAMION_ASIGNADO','ARRIBO_ORIGEN','INICIO_CARGA','CARGA_FINALIZADA',
    'SALIDA_ORIGEN','EN_TRANSITO','ARRIBO_DESTINO','INICIO_DESCARGA',
    'DESCARGA_FINALIZADA','ENTREGA_CONFIRMADA','ENTREGA_TRANSPORTISTA_CONFIRMADA',
    'RECEPCION_PRODUCTOR_CONFIRMADA','OBSERVADO'
  ]));

CREATE OR REPLACE FUNCTION public.confirmar_entrega_transportista(
  p_viaje_id uuid,
  p_kilos_entregados numeric,
  p_observaciones text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','auth','pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_v public.viajes%rowtype;
  v_cpe_kilos numeric;
  v_total_previo numeric;
  v_operacion_kilos numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_v FROM public.viajes WHERE id=p_viaje_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TRIP_NOT_FOUND'; END IF;
  IF v_v.transportista_profile_id IS DISTINCT FROM v_uid
     AND NOT public.es_administrador_plataforma() THEN
    RAISE EXCEPTION 'ASSIGNED_CARRIER_REQUIRED';
  END IF;
  IF v_v.transportista_entrega_confirmada_at IS NOT NULL THEN
    RAISE EXCEPTION 'CARRIER_DELIVERY_ALREADY_CONFIRMED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.viaje_eventos
    WHERE viaje_id=p_viaje_id AND estado='DESCARGA_FINALIZADA'
  ) THEN RAISE EXCEPTION 'UNLOADING_COMPLETION_REQUIRED'; END IF;
  IF p_kilos_entregados IS NULL OR p_kilos_entregados<=0 THEN
    RAISE EXCEPTION 'INVALID_DELIVERED_WEIGHT';
  END IF;
  SELECT coalesce(sum(kilos_declarados),0) INTO v_cpe_kilos
  FROM public.viaje_cartas_porte
  WHERE viaje_id=p_viaje_id AND estado_verificacion='VALIDADA';
  IF v_cpe_kilos<=0 THEN RAISE EXCEPTION 'VALIDATED_CPE_WITH_WEIGHT_REQUIRED'; END IF;
  IF p_kilos_entregados>v_cpe_kilos THEN
    RAISE EXCEPTION 'DELIVERED_WEIGHT_EXCEEDS_CPE_WEIGHT';
  END IF;
  SELECT coalesce(sum(transportista_kilos_entregados),0)
    INTO v_total_previo
  FROM public.viajes
  WHERE operacion_id=v_v.operacion_id
    AND id<>p_viaje_id
    AND transportista_entrega_confirmada_at IS NOT NULL;
  SELECT coalesce(cantidad_tn,0)*1000 INTO v_operacion_kilos
  FROM public.operaciones WHERE id=v_v.operacion_id FOR UPDATE;
  IF v_total_previo+p_kilos_entregados>v_operacion_kilos THEN
    RAISE EXCEPTION 'DELIVERED_QUANTITY_EXCEEDS_OPERATION';
  END IF;
  UPDATE public.viajes
  SET transportista_entrega_confirmada_por=v_uid,
      transportista_entrega_confirmada_at=now(),
      transportista_kilos_entregados=p_kilos_entregados,
      estado='ESPERANDO_RECEPCION_PRODUCTOR',
      actualizado_at=now()
  WHERE id=p_viaje_id;
  INSERT INTO public.viaje_eventos(
    viaje_id,operacion_id,estado,toneladas,observaciones,registrado_por
  ) VALUES (
    p_viaje_id,v_v.operacion_id,'ENTREGA_TRANSPORTISTA_CONFIRMADA',
    p_kilos_entregados/1000,
    coalesce(nullif(trim(p_observaciones),''),'Entrega informada por el transportista; pendiente de recepción del productor.'),
    v_uid
  );
  RETURN jsonb_build_object(
    'viaje_id',p_viaje_id,'estado','ESPERANDO_RECEPCION_PRODUCTOR',
    'transportista_confirmado',true,'productor_confirmado',false,
    'kilos_entregados',p_kilos_entregados,'comision_liberada',false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_recepcion_productor(
  p_viaje_id uuid,
  p_kilos_recibidos numeric,
  p_confirmar boolean,
  p_observaciones text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','auth','pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_v public.viajes%rowtype;
  v_productor boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_v FROM public.viajes WHERE id=p_viaje_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TRIP_NOT_FOUND'; END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.operacion_participantes op
    JOIN public.company_empresa_map cem ON cem.empresa_id=op.empresa_id
    JOIN public.company_users cu ON cu.company_id=cem.company_id
      AND cu.profile_id=v_uid AND cu.activo
    WHERE op.operacion_id=v_v.operacion_id
      AND lower(trim(op.rol)) IN ('vendedor','productor','seller')
  ) OR EXISTS (
    SELECT 1
    FROM public.operacion_participantes op
    JOIN public.company_users cu ON cu.company_id=op.empresa_id
      AND cu.profile_id=v_uid AND cu.activo
    WHERE op.operacion_id=v_v.operacion_id
      AND lower(trim(op.rol)) IN ('vendedor','productor','seller')
  ) INTO v_productor;

  IF NOT (public.es_administrador_plataforma() OR v_productor) THEN
    RAISE EXCEPTION 'PRODUCER_SELLER_CONFIRMATION_REQUIRED';
  END IF;
  IF v_v.transportista_entrega_confirmada_at IS NULL THEN
    RAISE EXCEPTION 'CARRIER_CONFIRMATION_REQUIRED';
  END IF;
  IF v_v.productor_recepcion_confirmada_at IS NOT NULL
     OR v_v.productor_recepcion_observada_at IS NOT NULL THEN
    RAISE EXCEPTION 'PRODUCER_RESPONSE_ALREADY_REGISTERED';
  END IF;
  IF p_kilos_recibidos IS NULL OR p_kilos_recibidos<=0 THEN
    RAISE EXCEPTION 'INVALID_RECEIVED_WEIGHT';
  END IF;

  IF NOT coalesce(p_confirmar,false) THEN
    UPDATE public.viajes
    SET productor_kilos_recibidos=p_kilos_recibidos,
        productor_recepcion_observaciones=nullif(trim(coalesce(p_observaciones,'')),''),
        productor_recepcion_observada_at=now(),
        estado='OBSERVADO',
        actualizado_at=now()
    WHERE id=p_viaje_id;
    INSERT INTO public.viaje_eventos(
      viaje_id,operacion_id,estado,toneladas,observaciones,registrado_por
    ) VALUES (
      p_viaje_id,v_v.operacion_id,'OBSERVADO',p_kilos_recibidos/1000,
      coalesce(nullif(trim(p_observaciones),''),'El productor informó una diferencia o incidencia en la recepción.'),
      v_uid
    );
    RETURN jsonb_build_object(
      'viaje_id',p_viaje_id,'estado','OBSERVADO',
      'transportista_confirmado',true,'productor_confirmado',false,
      'comision_liberada',false
    );
  END IF;

  IF p_kilos_recibidos<>v_v.transportista_kilos_entregados THEN
    RAISE EXCEPTION 'RECEIVED_WEIGHT_MISMATCH_REPORT_INCIDENT';
  END IF;
  UPDATE public.viajes
  SET productor_recepcion_confirmada_por=v_uid,
      productor_recepcion_confirmada_at=now(),
      productor_kilos_recibidos=p_kilos_recibidos,
      productor_recepcion_observaciones=nullif(trim(coalesce(p_observaciones,'')),''),
      kilos_entregados=p_kilos_recibidos,
      entregado_confirmado_por=v_uid,
      entregado_confirmado_at=now(),
      estado='ENTREGADO_CONFIRMADO',
      actualizado_at=now()
  WHERE id=p_viaje_id;
  INSERT INTO public.viaje_eventos(
    viaje_id,operacion_id,estado,toneladas,observaciones,registrado_por
  ) VALUES (
    p_viaje_id,v_v.operacion_id,'RECEPCION_PRODUCTOR_CONFIRMADA',
    p_kilos_recibidos/1000,
    coalesce(nullif(trim(p_observaciones),''),'Recepción confirmada por el productor. Comisión sujeta a conciliación y cierre.'),
    v_uid
  );
  RETURN jsonb_build_object(
    'viaje_id',p_viaje_id,'estado','ENTREGADO_CONFIRMADO',
    'transportista_confirmado',true,'productor_confirmado',true,
    'toneladas_entregadas',p_kilos_recibidos/1000,
    'comision_liberada',false,'comision_retenida',true
  );
END;
$$;

-- Disable the legacy one-party confirmation endpoint.
REVOKE ALL ON FUNCTION public.confirmar_entrega_viaje_y_liberar_comision(uuid,numeric) FROM PUBLIC, anon, authenticated;

-- Confirmed liquidation is impossible until every trip has both confirmations.
CREATE OR REPLACE FUNCTION public.guardar_liquidacion_operacion(
  p_operacion_id uuid,
  p_datos jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','auth','pg_temp'
AS $$
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
       AND (transportista_entrega_confirmada_at IS NULL
         OR productor_recepcion_confirmada_at IS NULL
         OR estado<>'ENTREGADO_CONFIRMADO'
         OR productor_recepcion_observada_at IS NOT NULL)
   ) THEN RAISE EXCEPTION 'DUAL_DELIVERY_CONFIRMATION_REQUIRED'; END IF;
   SELECT coalesce(sum(kilos_entregados),0) INTO v_kilos
   FROM public.viajes
   WHERE operacion_id=p_operacion_id AND estado='ENTREGADO_CONFIRMADO'
     AND transportista_entrega_confirmada_at IS NOT NULL
     AND productor_recepcion_confirmada_at IS NOT NULL;
 ELSE
   v_kilos:=coalesce((p_datos->>'kilos_entregados')::numeric,0);
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
$$;

GRANT EXECUTE ON FUNCTION public.confirmar_entrega_transportista(uuid,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_recepcion_productor(uuid,numeric,boolean,text) TO authenticated;
