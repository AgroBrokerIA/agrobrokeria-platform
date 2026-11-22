-- Do not disclose matched buyer legal names from the smart-match RPC.
-- The caller may own the source publication, but the matched counterparty remains
-- confidential until the signed-contract release condition is satisfied by the
-- publication-listing RPC. Keep internal company IDs for matching only.
CREATE OR REPLACE FUNCTION public.procesar_smart_match_publicacion(p_publicacion_id uuid)
RETURNS TABLE(smart_match_id uuid,publicacion_id uuid,buyer_company_id uuid,comprador character varying,match_score numeric,status text,opportunity_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE v_match record; v_owner uuid; v_active uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT empresa_id INTO v_owner FROM public.publicaciones WHERE id=p_publicacion_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'PUBLICATION_NOT_FOUND'; END IF;
 SELECT active_company_id INTO v_active FROM public.profiles WHERE id=auth.uid();
 IF v_active IS NULL OR NOT EXISTS (
   SELECT 1
   FROM public.publicaciones p
   JOIN public.company_empresa_map cem ON cem.company_id=v_active
   WHERE p.id=p_publicacion_id
     AND (
       (p.empresa_id IS NOT NULL AND cem.empresa_id=p.empresa_id)
       OR (p.intermediario_empresa_id IS NOT NULL AND cem.empresa_id=p.intermediario_empresa_id)
       OR (p.empresa_id IS NULL AND p.intermediario_empresa_id IS NULL
           AND p.publicador_profile_id=auth.uid()
           AND cem.match_method='platform_internal')
     )
     AND (cem.verified=true OR cem.match_method='platform_internal')
 ) THEN
   RAISE EXCEPTION 'FORBIDDEN';
 END IF;
 PERFORM public.calcular_smart_matches(p_publicacion_id);

 INSERT INTO public.smart_matches(publicacion_id,offer_id,buyer_company_id,match_score,confidence_score,price_score,volume_score,location_score,condition_score,payment_score,history_score,explanation,status)
 SELECT mc.publicacion_id,mc.publicacion_id,cem.company_id,mc.puntaje_total,mc.puntaje_total,mc.puntaje_precio,mc.puntaje_cantidad,mc.puntaje_zona,mc.puntaje_condicion,50,mc.puntaje_historial,
   jsonb_build_object('motor','Smart Match','puntaje_total',mc.puntaje_total,'producto',mc.puntaje_producto,'zona',mc.puntaje_zona,'cantidad',mc.puntaje_cantidad,'precio',mc.puntaje_precio,'historial',mc.puntaje_historial,'condicion',mc.puntaje_condicion,'logistica',mc.puntaje_logistica,'explicacion',mc.explicacion),'NEW'
 FROM public.motor_compatibilidad mc
 JOIN public.company_empresa_map cem ON cem.empresa_id=mc.empresa_id AND (cem.verified=true OR cem.match_method='platform_internal')
 WHERE mc.publicacion_id=p_publicacion_id AND mc.recomendada=true
   AND NOT EXISTS(SELECT 1 FROM public.smart_matches sm WHERE sm.publicacion_id=mc.publicacion_id AND sm.buyer_company_id=cem.company_id);

 FOR v_match IN SELECT sm.id FROM public.smart_matches sm WHERE sm.publicacion_id=p_publicacion_id AND sm.match_score>=70 LOOP
   PERFORM public.generar_oportunidad_desde_smart_match(v_match.id);
 END LOOP;

 RETURN QUERY
 SELECT sm.id,sm.publicacion_id,sm.buyer_company_id,NULL::varchar,sm.match_score,sm.status,
   (SELECT ao.id FROM public.ai_opportunities ao
    WHERE ao.offer_id=sm.publicacion_id AND ao.buyer_company_id=sm.buyer_company_id
      AND ao.opportunity_type='SMART_MATCH'
    ORDER BY ao.created_at DESC LIMIT 1)
 FROM public.smart_matches sm
 WHERE sm.publicacion_id=p_publicacion_id
 ORDER BY sm.match_score DESC;
END
$function$;

REVOKE ALL ON FUNCTION public.procesar_smart_match_publicacion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.procesar_smart_match_publicacion(uuid) TO authenticated;
