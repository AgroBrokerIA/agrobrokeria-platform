-- Link intermediary SMART_MATCH opportunities to the effective listing owner.
CREATE OR REPLACE FUNCTION public.generar_oportunidad_desde_smart_match(p_smart_match_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_match public.smart_matches%ROWTYPE;
    v_publicacion public.publicaciones%ROWTYPE;
    v_company_id uuid;
    v_opportunity_id uuid;
BEGIN
    SELECT * INTO v_match FROM public.smart_matches WHERE id = p_smart_match_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'El Smart Match % no existe', p_smart_match_id; END IF;
    IF v_match.match_score < 70 THEN RETURN NULL; END IF;

    SELECT * INTO v_publicacion FROM public.publicaciones WHERE id = v_match.publicacion_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'La publicación % no existe', v_match.publicacion_id; END IF;

    -- Prefer the effective intermediary company, then the represented company.
    SELECT cem.company_id INTO v_company_id
    FROM public.company_empresa_map cem
    WHERE cem.empresa_id IN (v_publicacion.intermediario_empresa_id, v_publicacion.empresa_id)
      AND (cem.verified = true OR cem.match_method = 'platform_internal')
    ORDER BY
      CASE WHEN cem.empresa_id = v_publicacion.intermediario_empresa_id THEN 0 ELSE 1 END,
      cem.verified DESC NULLS LAST,
      cem.confidence DESC NULLS LAST
    LIMIT 1;

    -- For platform/legacy publications without a mapped legal entity, use only
    -- the publisher's still-active company membership.
    IF v_company_id IS NULL AND v_publicacion.publicador_profile_id IS NOT NULL THEN
      SELECT pr.active_company_id INTO v_company_id
      FROM public.profiles pr
      JOIN public.company_users cu
        ON cu.profile_id = pr.id
       AND cu.company_id = pr.active_company_id
       AND cu.activo = true
      WHERE pr.id = v_publicacion.publicador_profile_id
      LIMIT 1;
    END IF;

    SELECT id INTO v_opportunity_id
    FROM public.ai_opportunities
    WHERE offer_id = v_match.publicacion_id
      AND buyer_company_id = v_match.buyer_company_id
      AND opportunity_type = 'SMART_MATCH'
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.ai_opportunities
      SET company_id = COALESCE(company_id, v_company_id),
          score = v_match.match_score,
          confidence = v_match.confidence_score,
          estimated_volume = v_publicacion.cantidad_tn,
          updated_at = now()
      WHERE id = v_opportunity_id;
      RETURN v_opportunity_id;
    END IF;

    INSERT INTO public.ai_opportunities (
      company_id, offer_id, buyer_company_id, opportunity_type, title,
      description, score, confidence, estimated_volume, estimated_margin,
      reasoning, status
    )
    VALUES (
      v_company_id, v_match.publicacion_id, v_match.buyer_company_id,
      'SMART_MATCH', 'Oportunidad comercial detectada',
      'La IA detectó una compatibilidad comercial entre la publicación y un comprador verificado.',
      v_match.match_score, v_match.confidence_score, v_publicacion.cantidad_tn,
      NULL,
      jsonb_build_object(
        'smart_match_id', v_match.id,
        'publicacion_id', v_match.publicacion_id,
        'buyer_company_id', v_match.buyer_company_id,
        'match_score', v_match.match_score,
        'price_score', v_match.price_score,
        'volume_score', v_match.volume_score,
        'location_score', v_match.location_score,
        'history_score', v_match.history_score,
        'explanation', v_match.explanation
      ),
      'NEW'
    )
    RETURNING id INTO v_opportunity_id;

    RETURN v_opportunity_id;
END;
$function$;
