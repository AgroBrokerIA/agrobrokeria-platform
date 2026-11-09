-- CATAC reference: restore chat RPC against the current tarifas_referencia_catac schema.
-- Official source: CATAC published tariff image dated 10/04/2026:
-- https://www.catac.org.ar/noticias/3184/nuevo-cuadro-tarifario-de-referencia-2
-- Exact 150 km row: ARS 33,974.73 per metric ton.
-- Only this exact distance is seeded; other distances remain unavailable until
-- the full official table is imported. No interpolation or invented price is used.
-- The original schema disallowed exact-kilometer rows, which made one-km CATAC data impossible to store.
ALTER TABLE public.tarifas_referencia_catac DROP CONSTRAINT IF EXISTS tarifas_referencia_catac_check;
ALTER TABLE public.tarifas_referencia_catac ADD CONSTRAINT tarifas_referencia_catac_check CHECK (distancia_km_hasta >= distancia_km_desde);
INSERT INTO public.tarifas_referencia_catac (
  distancia_km_desde, distancia_km_hasta, valor_tonelada_ars,
  fuente, vigencia_desde, vigencia_hasta, activa
)
SELECT 150, 150, 33974.73,
  'CATAC · Tarifa de referencia oficial · 10/04/2026 · https://www.catac.org.ar/noticias/3184/nuevo-cuadro-tarifario-de-referencia-2',
  DATE '2026-04-10', NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.tarifas_referencia_catac t
  WHERE t.distancia_km_desde=150 AND t.distancia_km_hasta=150
    AND t.vigencia_desde=DATE '2026-04-10'
);

CREATE OR REPLACE FUNCTION public.enviar_referencia_catac_al_chat(
  p_conversacion_id uuid, p_distancia_km integer, p_toneladas numeric
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_conv public.conversaciones_fletes%rowtype;
  v_cierre public.cierres_logistica%rowtype;
  v_tarifa public.tarifas_referencia_catac%rowtype;
  v_total_catac numeric(14,2);
  v_flete_unitario_catac numeric(14,2);
  v_comision_unitaria_estimada numeric(14,2);
  v_comision_total_estimada numeric(14,2);
  v_message_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_distancia_km IS NULL OR p_distancia_km<=0 OR p_toneladas IS NULL OR p_toneladas<=0 THEN
    RAISE EXCEPTION 'CATAC_INPUT_INVALID';
  END IF;
  SELECT * INTO v_conv FROM public.conversaciones_fletes WHERE id=p_conversacion_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'FREIGHT_CONVERSATION_NOT_FOUND'; END IF;
  IF NOT (public.usuario_es_miembro_empresa(v_conv.empresa_transportista_id)
       OR public.usuario_es_miembro_empresa(v_conv.empresa_dadora_id)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO v_cierre FROM public.cierres_logistica WHERE id=v_conv.cierre_logistica_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'FREIGHT_CLOSURE_NOT_FOUND'; END IF;
  SELECT * INTO v_tarifa FROM public.tarifas_referencia_catac t
  WHERE t.activa=true AND p_distancia_km BETWEEN t.distancia_km_desde AND t.distancia_km_hasta
    AND t.vigencia_desde<=current_date
    AND (t.vigencia_hasta IS NULL OR t.vigencia_hasta>=current_date)
  ORDER BY t.vigencia_desde DESC,t.actualizado_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'CATAC_RATE_NOT_FOUND'; END IF;
  IF COALESCE(v_cierre.cantidad_camiones,0)<=0 THEN RAISE EXCEPTION 'TRUCK_COUNT_INVALID'; END IF;
  v_total_catac:=round(v_tarifa.valor_tonelada_ars*p_toneladas,2);
  v_flete_unitario_catac:=round(v_total_catac/v_cierre.cantidad_camiones,2);
  v_comision_unitaria_estimada:=round(v_flete_unitario_catac*0.01,2);
  v_comision_total_estimada:=v_comision_unitaria_estimada*v_cierre.cantidad_camiones;
  INSERT INTO public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje)
  VALUES(p_conversacion_id,NULL,true,
    '📊 [AgroBrokerIA Asistente] Referencia CATAC para '||p_distancia_km||' km. Tarifa publicada '||
    to_char(v_tarifa.vigencia_desde,'DD/MM/YYYY')||': $'||to_char(v_tarifa.valor_tonelada_ars,'FM999G999G990D00')||
    ' ARS/TN. Para '||to_char(p_toneladas,'FM999G999G990D000')||' TN, total referencial: $'||
    to_char(v_total_catac,'FM999G999G990D00')||' ARS. Distribuido entre '||v_cierre.cantidad_camiones||
    ' camión(es): $'||to_char(v_flete_unitario_catac,'FM999G999G990D00')||
    ' ARS por camión. Comisión estimada AgroBrokerIA (1% por camión): $'||
    to_char(v_comision_unitaria_estimada,'FM999G999G990D00')||' ARS por unidad; total estimado $'||
    to_char(v_comision_total_estimada,'FM999G999G990D00')||' ARS. Fuente: '||v_tarifa.fuente||
    '. La tarifa es referencial; el cierre definitivo usa el flete pactado por camión.')
  RETURNING id INTO v_message_id;
  RETURN v_message_id;
END;
$$;
REVOKE ALL ON FUNCTION public.enviar_referencia_catac_al_chat(uuid,integer,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.enviar_referencia_catac_al_chat(uuid,integer,numeric) TO authenticated;
