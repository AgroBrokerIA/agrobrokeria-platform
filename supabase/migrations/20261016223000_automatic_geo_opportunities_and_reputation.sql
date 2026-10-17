-- Automatic publication matching (distance-aware) and transaction-based reputation.
-- No synthetic market quotes, official verifications, or completed operations are created.

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS distancia_km numeric(10,2),
  ADD COLUMN IF NOT EXISTS detalles jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS oportunidades_publicacion_empresa_uidx
  ON public.oportunidades (publicacion_id, empresa_id);
CREATE INDEX IF NOT EXISTS oportunidades_empresa_creada_idx
  ON public.oportunidades (empresa_id, creada_en DESC);

CREATE OR REPLACE FUNCTION public.refresh_opportunities_for_product(p_product_id integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_product_id IS NULL THEN RETURN; END IF;
  DELETE FROM public.oportunidades o USING public.publicaciones target
  WHERE o.publicacion_id = target.id AND target.producto_id = p_product_id;

  WITH base AS (
    SELECT a.id AS target_publication_id, b.empresa_id AS recipient_company_id,
      a.cantidad_tn AS target_volume, b.cantidad_tn AS candidate_volume,
      a.precio_tn AS target_price, b.precio_tn AS candidate_price,
      a.moneda_id AS target_currency, b.moneda_id AS candidate_currency,
      a.provincia_id AS target_province_id, b.provincia_id AS candidate_province_id,
      a.provincia AS target_province, b.provincia AS candidate_province,
      a.localidad AS target_locality, b.localidad AS candidate_locality,
      la.latitud AS target_lat, la.longitud AS target_lon,
      lb.latitud AS candidate_lat, lb.longitud AS candidate_lon,
      COALESCE(e.reputacion_score, 0) AS recipient_reputation,
      b.creada_en AS candidate_created_at
    FROM public.publicaciones a
    JOIN public.publicaciones b ON b.producto_id = a.producto_id
      AND b.empresa_id <> a.empresa_id AND b.estado = 'PUBLICADA'
      AND ((upper(trim(a.tipo)) IN ('COMPRA','DEMANDA') AND upper(trim(b.tipo)) IN ('VENTA','OFERTA'))
        OR (upper(trim(a.tipo)) IN ('VENTA','OFERTA') AND upper(trim(b.tipo)) IN ('COMPRA','DEMANDA')))
    LEFT JOIN public.localidades la ON la.id = a.localidad_id
    LEFT JOIN public.localidades lb ON lb.id = b.localidad_id
    LEFT JOIN public.empresas e ON e.id = b.empresa_id
    WHERE a.estado = 'PUBLICADA' AND a.producto_id = p_product_id
  ), distances AS (
    SELECT base.*,
      CASE WHEN target_lat IS NOT NULL AND target_lon IS NOT NULL AND candidate_lat IS NOT NULL AND candidate_lon IS NOT NULL
        THEN round((6371 * 2 * asin(sqrt(least(1.0, greatest(0.0,
          power(sin(radians(candidate_lat-target_lat)/2),2)
          + cos(radians(target_lat))*cos(radians(candidate_lat))*power(sin(radians(candidate_lon-target_lon)/2),2)
        )))))::numeric, 2)
        ELSE NULL END AS distance_km
    FROM base
  ), scored AS (
    SELECT distances.*,
      CASE
        WHEN distance_km IS NOT NULL AND distance_km <= 50 THEN 100::numeric
        WHEN distance_km IS NOT NULL AND distance_km <= 150 THEN 80::numeric
        WHEN distance_km IS NOT NULL AND distance_km <= 300 THEN 60::numeric
        WHEN distance_km IS NOT NULL THEN 30::numeric
        WHEN target_locality IS NOT NULL AND candidate_locality IS NOT NULL
          AND lower(trim(target_locality))=lower(trim(candidate_locality))
          AND (target_province_id=candidate_province_id OR lower(trim(coalesce(target_province,'')))=lower(trim(coalesce(candidate_province,'')))) THEN 95::numeric
        WHEN target_province_id IS NOT NULL AND target_province_id=candidate_province_id THEN 75::numeric
        WHEN nullif(trim(target_province),'') IS NOT NULL AND lower(trim(target_province))=lower(trim(coalesce(candidate_province,''))) THEN 70::numeric
        ELSE 40::numeric END AS location_score,
      CASE WHEN target_volume>0 AND candidate_volume>0
        THEN round(100*least(target_volume,candidate_volume)/greatest(target_volume,candidate_volume),2)
        ELSE 50::numeric END AS volume_score,
      CASE WHEN target_price IS NULL OR candidate_price IS NULL THEN 50::numeric
        WHEN target_currency IS DISTINCT FROM candidate_currency THEN 30::numeric
        WHEN greatest(target_price,candidate_price)<=0 THEN 50::numeric
        ELSE greatest(0::numeric,round(100-(abs(target_price-candidate_price)/greatest(target_price,candidate_price))*200,2))
      END AS price_score,
      CASE WHEN recipient_reputation>0 THEN least(100::numeric,greatest(0::numeric,recipient_reputation::numeric))
        ELSE 50::numeric END AS trust_score
    FROM distances
  ), ranked AS (
    SELECT scored.*,
      round(35+volume_score*0.20+price_score*0.20+location_score*0.20+trust_score*0.05,2) AS match_score,
      row_number() OVER (PARTITION BY target_publication_id,recipient_company_id
        ORDER BY round(35+volume_score*0.20+price_score*0.20+location_score*0.20+trust_score*0.05,2) DESC,
          distance_km ASC NULLS LAST,candidate_created_at DESC NULLS LAST) AS rn
    FROM scored
  )
  INSERT INTO public.oportunidades(publicacion_id,empresa_id,indice_compatibilidad,estado,distancia_km,detalles,creada_en)
  SELECT target_publication_id,recipient_company_id,match_score,'ACTIVA',distance_km,
    jsonb_build_object('motor','matching_geografico_v1','distancia_km',distance_km,
      'cercana',distance_km IS NOT NULL AND distance_km<=150,'producto','coincidencia exacta de producto',
      'volumen_score',volume_score,'precio_score',price_score,'ubicacion_score',location_score,
      'reputacion_score',recipient_reputation,'moneda_coincide',target_currency IS NOT DISTINCT FROM candidate_currency,
      'localidad_publicacion',target_locality,'localidad_candidata',candidate_locality),now()
  FROM ranked WHERE rn=1
  ON CONFLICT(publicacion_id,empresa_id) DO UPDATE SET
    indice_compatibilidad=EXCLUDED.indice_compatibilidad,estado='ACTIVA',
    distancia_km=EXCLUDED.distancia_km,detalles=EXCLUDED.detalles,creada_en=now();
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_refresh_opportunities()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.producto_id IS DISTINCT FROM NEW.producto_id THEN
    PERFORM public.refresh_opportunities_for_product(OLD.producto_id);
  END IF;
  PERFORM public.refresh_opportunities_for_product(NEW.producto_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_opportunities ON public.publicaciones;
CREATE TRIGGER trg_refresh_opportunities
AFTER INSERT OR UPDATE OF estado,tipo,producto_id,cantidad_tn,precio_tn,moneda_id,localidad_id,provincia_id,provincia,localidad,puerto
ON public.publicaciones FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_opportunities();

REVOKE ALL ON FUNCTION public.refresh_opportunities_for_product(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.trg_refresh_opportunities() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.recalcular_reputacion_empresa(p_empresa_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_realizadas integer; v_exitosas integer; v_canceladas integer; v_tn numeric; v_last timestamptz; v_score integer;
BEGIN
  SELECT count(*) FILTER(WHERE o.estado='CERRADA'),
    count(*) FILTER(WHERE o.estado IN ('ANULADA','CANCELADA')),
    coalesce(sum(CASE WHEN o.estado='CERRADA' THEN o.cantidad_tn ELSE 0 END),0),
    max(o.actualizada_en)
  INTO v_exitosas,v_canceladas,v_tn,v_last
  FROM public.operacion_participantes op JOIN public.operaciones o ON o.id=op.operacion_id
  WHERE op.empresa_id=p_empresa_id;
  v_realizadas:=v_exitosas+v_canceladas;
  IF v_realizadas=0 THEN v_score:=0;
  ELSE v_score:=greatest(0,least(100,round(
    (v_exitosas::numeric/nullif(v_realizadas,0))*70 + least(30,v_exitosas*3) - least(20,v_canceladas*5)
  )::integer)); END IF;
  UPDATE public.empresas SET reputacion_score=v_score,operaciones_realizadas=v_realizadas,
    operaciones_exitosas=v_exitosas,operaciones_canceladas=v_canceladas,toneladas_operadas=v_tn,
    ultima_operacion_at=v_last,agrobroker_score=v_score,actualizado_en=now() WHERE id=p_empresa_id;
  DELETE FROM public.empresas_calificaciones WHERE empresa_id=p_empresa_id;
  INSERT INTO public.empresas_calificaciones(empresa_id,agrobroker_score,operaciones_exitosas,operaciones_canceladas,tiempo_promedio_respuesta,actualizado_en)
  VALUES(p_empresa_id,v_score,v_exitosas,v_canceladas,NULL,now());
END;
$$;
REVOKE ALL ON FUNCTION public.recalcular_reputacion_empresa(uuid) FROM PUBLIC,anon,authenticated;
