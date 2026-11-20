-- Resolve both sides of a formal opportunity using the effective company identity.
-- Intermediary publications may have empresa_id NULL and intermediary_empresa_id set.

CREATE OR REPLACE FUNCTION public.enviar_propuesta_formal_oportunidad(
  p_publicacion_compra_id uuid,
  p_publicacion_venta_id uuid,
  p_cantidad_tn numeric,
  p_mensaje text DEFAULT 'Propuesta formal enviada desde IA Matching.'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_profile uuid := auth.uid();
  v_directory_company uuid;
  v_sender_empresa uuid;
  v_buy public.publicaciones%ROWTYPE;
  v_sell public.publicaciones%ROWTYPE;
  v_buy_empresa uuid;
  v_sell_empresa uuid;
  v_sender_is_seller boolean;
  v_sender_is_buyer boolean;
  v_target_empresa uuid;
  v_target_directory uuid;
  v_reserved numeric;
  v_committed numeric;
  v_reservation uuid;
  v_target_profile uuid;
BEGIN
  IF v_profile IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_cantidad_tn IS NULL OR p_cantidad_tn <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  IF length(trim(coalesce(p_mensaje,''))) < 10 OR length(p_mensaje) > 2000 THEN RAISE EXCEPTION 'MESSAGE_LENGTH_INVALID'; END IF;

  SELECT active_company_id INTO v_directory_company
  FROM public.profiles WHERE id=v_profile;

  IF v_directory_company IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE profile_id=v_profile AND company_id=v_directory_company AND activo=true
  ) THEN
    RAISE EXCEPTION 'ACTIVE_MEMBERSHIP_REQUIRED';
  END IF;

  SELECT m.empresa_id INTO v_sender_empresa
  FROM public.company_empresa_map m
  JOIN public.empresas e ON e.id=m.empresa_id AND e.activa=true
  WHERE m.company_id=v_directory_company
  ORDER BY m.verified DESC NULLS LAST, m.confidence DESC NULLS LAST
  LIMIT 1;

  IF v_sender_empresa IS NULL THEN RAISE EXCEPTION 'SENDER_COMPANY_NOT_MAPPED'; END IF;

  SELECT * INTO v_buy
  FROM public.publicaciones
  WHERE id=p_publicacion_compra_id
    AND estado IN ('ACTIVA','PUBLICADA','ACTIVO')
  FOR SHARE;

  IF NOT FOUND THEN RAISE EXCEPTION 'BUY_PUBLICATION_NOT_AVAILABLE'; END IF;

  SELECT * INTO v_sell
  FROM public.publicaciones
  WHERE id=p_publicacion_venta_id
    AND estado IN ('ACTIVA','PUBLICADA','ACTIVO')
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'SELL_PUBLICATION_NOT_AVAILABLE'; END IF;

  IF upper(trim(v_buy.tipo::text)) NOT IN ('COMPRA','DEMANDA','BUY','PURCHASE','NECESIDAD')
     OR upper(trim(v_sell.tipo::text)) NOT IN ('VENTA','OFERTA','SELL','SELLING') THEN
    RAISE EXCEPTION 'PUBLICATION_TYPES_INVALID';
  END IF;

  IF v_buy.producto_id IS DISTINCT FROM v_sell.producto_id THEN
    RAISE EXCEPTION 'PRODUCT_MISMATCH';
  END IF;

  SELECT coalesce(v_buy.empresa_id, v_buy.intermediario_empresa_id, cem.empresa_id)
    INTO v_buy_empresa
  FROM public.profiles pr
  LEFT JOIN public.company_empresa_map cem
    ON cem.company_id=pr.active_company_id
   AND (cem.verified=true OR cem.match_method='platform_internal')
  WHERE pr.id=v_buy.publicador_profile_id;

  SELECT coalesce(v_sell.empresa_id, v_sell.intermediario_empresa_id, cem.empresa_id)
    INTO v_sell_empresa
  FROM public.profiles pr
  LEFT JOIN public.company_empresa_map cem
    ON cem.company_id=pr.active_company_id
   AND (cem.verified=true OR cem.match_method='platform_internal')
  WHERE pr.id=v_sell.publicador_profile_id;

  IF v_buy_empresa IS NULL OR v_sell_empresa IS NULL THEN
    RAISE EXCEPTION 'PUBLICATION_COMPANY_NOT_MAPPED';
  END IF;

  IF v_buy_empresa = v_sell_empresa THEN
    RAISE EXCEPTION 'SAME_COMPANY_NOT_ALLOWED';
  END IF;

  IF p_cantidad_tn > v_sell.cantidad_tn THEN
    RAISE EXCEPTION 'QUANTITY_EXCEEDS_LOT';
  END IF;

  v_sender_is_seller := v_sender_empresa IN (v_sell_empresa, v_sell.intermediario_empresa_id);
  v_sender_is_buyer := v_sender_empresa IN (v_buy_empresa, v_buy.intermediario_empresa_id);

  IF NOT v_sender_is_seller AND NOT v_sender_is_buyer THEN
    RAISE EXCEPTION 'SENDER_NOT_PARTICIPANT_IN_OPPORTUNITY';
  END IF;

  IF v_sender_is_seller THEN
    v_target_empresa := v_buy_empresa;
  ELSE
    v_target_empresa := v_sell_empresa;
  END IF;

  IF v_target_empresa IS NULL OR v_target_empresa=v_sender_empresa
     OR NOT EXISTS (
       SELECT 1 FROM public.empresas e
       WHERE e.id=v_target_empresa AND e.activa=true
     ) THEN
    RAISE EXCEPTION 'TARGET_COMPANY_INVALID';
  END IF;

  SELECT company_id INTO v_target_directory
  FROM public.company_empresa_map
  WHERE empresa_id=v_target_empresa
  ORDER BY verified DESC NULLS LAST, confidence DESC NULLS LAST
  LIMIT 1;

  IF v_target_directory IS NULL THEN
    RAISE EXCEPTION 'TARGET_COMPANY_NOT_MAPPED';
  END IF;

  SELECT coalesce(sum(cantidad_tn),0) INTO v_reserved
  FROM public.reservas_stock_oportunidad
  WHERE publicacion_venta_id=p_publicacion_venta_id
    AND estado='ACTIVA'
    AND vence_en>now();

  SELECT coalesce(sum(o.cantidad_tn),0) INTO v_committed
  FROM public.operaciones o
  WHERE o.publicacion_venta_id=p_publicacion_venta_id
    AND upper(coalesce(o.estado,'')) NOT IN ('CANCELADA','CANCELADO','RECHAZADA','RECHAZADO','VENCIDA','ANULADA');

  IF p_cantidad_tn > greatest(0,v_sell.cantidad_tn-v_reserved-v_committed) THEN
    RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_STOCK';
  END IF;

  INSERT INTO public.reservas_stock_oportunidad(
    publicacion_venta_id,publicacion_compra_id,cantidad_tn,
    solicitante_empresa_id,destinatario_empresa_id,creado_por
  )
  VALUES(
    p_publicacion_venta_id,p_publicacion_compra_id,p_cantidad_tn,
    v_sender_empresa,v_target_empresa,v_profile
  )
  RETURNING id INTO v_reservation;

  INSERT INTO public.solicitudes_oportunidad(
    publicacion_compra_id,publicacion_venta_id,remitente_profile_id,
    remitente_company_id,destinatario_company_id,mensaje,estado
  )
  VALUES(
    p_publicacion_compra_id,p_publicacion_venta_id,v_profile,
    v_directory_company,v_target_directory,
    trim(p_mensaje)||' Reserva temporal de stock: '||p_cantidad_tn::text||' TN. Vence en 30 minutos.',
    'PENDIENTE'
  )
  ON CONFLICT(publicacion_compra_id,publicacion_venta_id,remitente_company_id)
  DO UPDATE SET mensaje=excluded.mensaje,estado='PENDIENTE',actualizado_at=now();

  FOR v_target_profile IN
    SELECT profile_id
    FROM public.company_users
    WHERE company_id=v_target_directory AND activo=true AND profile_id<>v_profile
  LOOP
    INSERT INTO public.notificaciones(
      profile_id,titulo,mensaje,tipo,leida,creada_en,actualizado_at
    )
    VALUES(
      v_target_profile,
      'Nueva propuesta formal · stock reservado',
      'Un intermediario envió una propuesta formal por '||p_cantidad_tn::text||' TN. La reserva temporal vence en 30 minutos. Revisá la oportunidad.',
      'PROPUESTA_FORMAL_IA',false,now(),now()
    );
  END LOOP;

  RETURN v_reservation;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.enviar_propuesta_formal_oportunidad(uuid,uuid,numeric,text) TO authenticated, service_role;
