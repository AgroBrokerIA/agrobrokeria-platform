-- AgroBrokerIA Trust Scoring v1.0.0
-- Score is evidence-weighted. Missing evidence is shown as coverage, not treated as a positive result.
CREATE TABLE IF NOT EXISTS public.empresa_scoring_actual(
  empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  cuit text NOT NULL, score integer, cobertura_pct integer NOT NULL DEFAULT 0,
  score_calidad numeric(5,2),score_liquidacion numeric(5,2),score_logistica numeric(5,2),score_fiscal numeric(5,2),
  operaciones_evaluadas integer NOT NULL DEFAULT 0,viajes_evaluados integer NOT NULL DEFAULT 0,
  alertas_desvio_no_justificadas integer NOT NULL DEFAULT 0,
  badge_code text NOT NULL DEFAULT 'SIN_HISTORIAL',badge_label text NOT NULL DEFAULT 'Historial insuficiente',
  badge_color text NOT NULL DEFAULT '#9E9E9E',estado_scoring text NOT NULL DEFAULT 'PROVISIONAL',
  factores jsonb NOT NULL DEFAULT '{}'::jsonb,version_algoritmo text NOT NULL DEFAULT '1.0.0',
  calculado_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.empresa_scoring_historial(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cuit text NOT NULL,score integer,cobertura_pct integer NOT NULL,
  score_calidad numeric(5,2),score_liquidacion numeric(5,2),score_logistica numeric(5,2),score_fiscal numeric(5,2),
  operaciones_evaluadas integer NOT NULL DEFAULT 0,viajes_evaluados integer NOT NULL DEFAULT 0,
  alertas_desvio_no_justificadas integer NOT NULL DEFAULT 0,
  badge_code text NOT NULL,badge_label text NOT NULL,badge_color text NOT NULL,estado_scoring text NOT NULL,
  factores jsonb NOT NULL DEFAULT '{}'::jsonb,version_algoritmo text NOT NULL DEFAULT '1.0.0',
  calculado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS empresa_scoring_historial_empresa_fecha_idx ON public.empresa_scoring_historial(empresa_id,calculado_at DESC);
CREATE INDEX IF NOT EXISTS empresa_scoring_actual_cuit_idx ON public.empresa_scoring_actual(cuit);
ALTER TABLE public.viaje_eventos ADD COLUMN IF NOT EXISTS alerta_justificada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alerta_resuelta_at timestamptz,
  ADD COLUMN IF NOT EXISTS alerta_resuelta_por uuid REFERENCES auth.users(id);
ALTER TABLE public.viaje_eventos DROP CONSTRAINT IF EXISTS viaje_eventos_estado_check;
ALTER TABLE public.viaje_eventos ADD CONSTRAINT viaje_eventos_estado_check CHECK (
 estado = ANY(ARRAY['CAMION_ASIGNADO','ARRIBO_ORIGEN','INICIO_CARGA','CARGA_FINALIZADA','SALIDA_ORIGEN',
 'EN_TRANSITO','ARRIBO_DESTINO','INICIO_DESCARGA','DESCARGA_FINALIZADA','ENTREGA_CONFIRMADA',
 'ENTREGA_TRANSPORTISTA_CONFIRMADA','RECEPCION_PRODUCTOR_CONFIRMADA','OBSERVADO',
 'ALERTA_DESVIO','ALERTA_DEMORA','ALERTA_CRITICA']::text[])
);
ALTER TABLE public.empresa_scoring_actual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_scoring_historial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS empresa_scoring_actual_select_authenticated ON public.empresa_scoring_actual;
CREATE POLICY empresa_scoring_actual_select_authenticated ON public.empresa_scoring_actual FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS empresa_scoring_historial_select_admin ON public.empresa_scoring_historial;
CREATE POLICY empresa_scoring_historial_select_admin ON public.empresa_scoring_historial FOR SELECT TO authenticated USING (public.es_administrador_plataforma());
REVOKE ALL ON public.empresa_scoring_actual,public.empresa_scoring_historial FROM anon,authenticated;
GRANT SELECT ON public.empresa_scoring_actual,public.empresa_scoring_historial TO authenticated;

CREATE OR REPLACE FUNCTION public.agrobroker_horas_habiles(p_inicio timestamp with time zone, p_fin timestamp with time zone)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE d date; v_total numeric:=0; v_desde timestamptz; v_hasta timestamptz;
BEGIN
  IF p_inicio IS NULL OR p_fin IS NULL OR p_fin<=p_inicio THEN RETURN 0; END IF;
  FOR d IN SELECT generate_series((p_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,(p_fin AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,interval '1 day')::date LOOP
    IF extract(isodow FROM d)<6 THEN
      v_desde := (d::timestamp + time '09:00') AT TIME ZONE 'America/Argentina/Buenos_Aires';
      v_hasta := (d::timestamp + time '18:00') AT TIME ZONE 'America/Argentina/Buenos_Aires';
      v_total := v_total + greatest(0,extract(epoch FROM least(p_fin,v_hasta)-greatest(p_inicio,v_desde))/3600);
    END IF;
  END LOOP;
  RETURN round(v_total,2);
END $function$


CREATE OR REPLACE FUNCTION public.recalcular_scoring_confianza_agrobrokeria()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  e record;
  v_onboarding record;
  v_quality numeric;
  v_financial numeric;
  v_logistics numeric;
  v_fiscal numeric;
  v_score numeric;
  v_coverage integer;
  v_ops integer;
  v_trips integer;
  v_alerts integer; v_quality_bad_events integer:=0;
  v_sisa numeric;
  v_tenure numeric;
  v_sisa_reviewed boolean;
  v_tenure_days integer;
  v_badge_code text;
  v_badge_label text;
  v_badge_color text;
  v_state text;
  v_factors jsonb;
  v_processed integer:=0;
  v_without_history integer:=0;
BEGIN
  FOR e IN
    SELECT id,cuit,creado_en,activa
    FROM public.empresas
    WHERE activa IS TRUE AND nullif(regexp_replace(coalesce(cuit,''),'[^0-9]','','g'),'') IS NOT NULL
  LOOP
    v_quality:=NULL; v_financial:=NULL; v_logistics:=NULL; v_fiscal:=NULL;
    v_ops:=0; v_trips:=0; v_alerts:=0; v_coverage:=0; v_score:=NULL;
    v_sisa:=NULL; v_tenure:=NULL; v_sisa_reviewed:=false;

    SELECT * INTO v_onboarding
    FROM public.account_onboarding ao
    WHERE regexp_replace(coalesce(ao.cuil_cuit,''),'[^0-9]','','g')=regexp_replace(e.cuit,'[^0-9]','','g')
      AND upper(ao.account_type)='EMPRESA'
    ORDER BY ao.updated_at DESC NULLS LAST,ao.created_at DESC
    LIMIT 1;

    -- A: contract tonnes versus final double-confirmed received tonnes.
    WITH op_scope AS (
      SELECT DISTINCT op.operacion_id
      FROM public.operacion_participantes op
      WHERE op.empresa_id=e.id
      UNION
      SELECT DISTINCT v.operacion_id
      FROM public.viajes v
      JOIN public.profiles pr ON pr.id=v.transportista_profile_id
      JOIN public.company_empresa_map cem ON cem.company_id=pr.active_company_id AND cem.empresa_id=e.id
    ), delivery AS (
      SELECT os.operacion_id,
        coalesce(ct.cantidad_tn,o.cantidad_tn,0)::numeric AS contract_tn,
        coalesce(sum(v.productor_kilos_recibidos) FILTER (
          WHERE v.transportista_entrega_confirmada_at IS NOT NULL
            AND v.productor_recepcion_confirmada_at IS NOT NULL
            AND v.estado='ENTREGADO_CONFIRMADO'
            AND v.productor_recepcion_observada_at IS NULL
            AND v.transportista_kilos_entregados IS NOT NULL
            AND v.productor_kilos_recibidos=v.transportista_kilos_entregados
        ),0)/1000.0 AS received_tn,
        count(v.id) AS trip_count,
        count(v.id) FILTER (
          WHERE v.transportista_entrega_confirmada_at IS NOT NULL
            AND v.productor_recepcion_confirmada_at IS NOT NULL
            AND v.estado='ENTREGADO_CONFIRMADO'
            AND v.productor_recepcion_observada_at IS NULL
            AND v.transportista_kilos_entregados IS NOT NULL
            AND v.productor_kilos_recibidos=v.transportista_kilos_entregados
        ) AS confirmed_trip_count
      FROM op_scope os
      JOIN public.operaciones o ON o.id=os.operacion_id
      LEFT JOIN LATERAL (
        SELECT c.cantidad_tn FROM public.contratos c
        WHERE c.operacion_id=os.operacion_id
        ORDER BY c.confirmado_at DESC NULLS LAST,c.creado_en DESC NULLS LAST LIMIT 1
      ) ct ON true
      LEFT JOIN public.viajes v ON v.operacion_id=os.operacion_id
      GROUP BY os.operacion_id,ct.cantidad_tn,o.cantidad_tn
    )
    SELECT count(*) FILTER (
      WHERE contract_tn>0 AND trip_count>0 AND trip_count=confirmed_trip_count
        AND abs(received_tn-contract_tn)/contract_tn>0.05
    ),count(*) FILTER (WHERE contract_tn>0 AND trip_count>0 AND trip_count=confirmed_trip_count)
    INTO v_quality_bad_events,v_ops
    FROM delivery;
    IF v_ops>0 THEN v_quality:=greatest(0,100-(coalesce(v_quality_bad_events,0)*10))::numeric; END IF;

    -- B: actual commodity payment, not the AgroBrokerIA platform fee.
    -- Only bank transfers with a confirmed payment state count as evidence.
    WITH op_scope AS (
      SELECT DISTINCT op.operacion_id FROM public.operacion_participantes op WHERE op.empresa_id=e.id
      UNION
      SELECT DISTINCT v.operacion_id FROM public.viajes v
      JOIN public.profiles pr ON pr.id=v.transportista_profile_id
      JOIN public.company_empresa_map cem ON cem.company_id=pr.active_company_id AND cem.empresa_id=e.id
    ), arrivals AS (
      SELECT os.operacion_id,max(v.productor_recepcion_confirmada_at) AS delivered_at,
        count(v.id) AS trips,
        count(v.id) FILTER(WHERE v.transportista_entrega_confirmada_at IS NOT NULL
          AND v.productor_recepcion_confirmada_at IS NOT NULL
          AND v.estado='ENTREGADO_CONFIRMADO'
          AND v.productor_recepcion_observada_at IS NULL
          AND v.productor_kilos_recibidos=v.transportista_kilos_entregados) AS confirmed
      FROM op_scope os JOIN public.viajes v ON v.operacion_id=os.operacion_id
      GROUP BY os.operacion_id
    ), settled AS (
      SELECT p.operacion_id,sum(p.importe) AS paid_amount,max(p.fecha_pago) AS paid_at
      FROM public.pagos p
      WHERE upper(p.estado) IN ('CONFIRMADO','PAGADO','COMPLETADO')
        AND lower(coalesce(p.metodo_pago,'')) LIKE '%transfer%'
        AND p.fecha_pago IS NOT NULL
      GROUP BY p.operacion_id
    ), scored AS (
      SELECT greatest(0,100-greatest(0,
        public.agrobroker_horas_habiles(a.delivered_at,s.paid_at)-72
      )*(100.0/168.0)) AS points
      FROM op_scope os
      JOIN public.operaciones o ON o.id=os.operacion_id
      JOIN arrivals a ON a.operacion_id=os.operacion_id
      JOIN settled s ON s.operacion_id=os.operacion_id
      WHERE a.trips>0 AND a.trips=a.confirmed
        AND s.paid_amount>=coalesce(o.importe_total,0)
        AND coalesce(o.importe_total,0)>0
    )
    SELECT avg(points),count(*) INTO v_financial,v_trips FROM scored;
    IF v_trips=0 THEN v_financial:=NULL; END IF;

    -- C: success ratio plus direct penalty for each unjustified route deviation.
    WITH op_scope AS (
      SELECT DISTINCT op.operacion_id FROM public.operacion_participantes op WHERE op.empresa_id=e.id
      UNION
      SELECT DISTINCT v.operacion_id FROM public.viajes v
      JOIN public.profiles pr ON pr.id=v.transportista_profile_id
      JOIN public.company_empresa_map cem ON cem.company_id=pr.active_company_id AND cem.empresa_id=e.id
    ), finished AS (
      SELECT v.id,v.operacion_id
      FROM op_scope os JOIN public.viajes v ON v.operacion_id=os.operacion_id
      WHERE v.transportista_entrega_confirmada_at IS NOT NULL
        AND v.productor_recepcion_confirmada_at IS NOT NULL
        AND v.estado='ENTREGADO_CONFIRMADO'
        AND v.productor_recepcion_observada_at IS NULL
    ), metrics AS (
      SELECT count(*) AS total,
        count(*) FILTER(WHERE NOT EXISTS(
          SELECT 1 FROM public.viaje_eventos ve
          WHERE ve.viaje_id=f.id AND upper(ve.estado) IN ('ALERTA_DESVIO','ALERTA_DEMORA','ALERTA_CRITICA')
        )) AS clean,
        count(*) FILTER(WHERE EXISTS(
          SELECT 1 FROM public.viaje_eventos ve
          WHERE ve.viaje_id=f.id AND upper(ve.estado) IN ('ALERTA_DESVIO','ALERTA_DEMORA','ALERTA_CRITICA')
        )) AS alerted,
        (SELECT count(*) FROM public.viaje_eventos ve
         JOIN finished ff ON ff.id=ve.viaje_id
         WHERE upper(ve.estado)='ALERTA_DESVIO' AND ve.alerta_justificada IS FALSE) AS unjustified_deviations
      FROM finished f
    )
    SELECT CASE WHEN total>0 THEN greatest(0,(100.0*clean/total)-(15*unjustified_deviations)) ELSE NULL END,
           total,unjustified_deviations
    INTO v_logistics,v_trips,v_alerts
    FROM metrics;
    IF coalesce(v_trips,0)=0 THEN v_logistics:=NULL; END IF;

    -- D: SISA category plus active platform tenure.
    IF v_onboarding.user_id IS NOT NULL AND upper(coalesce(v_onboarding.sisa_status,'PENDIENTE'))<>'PENDIENTE' THEN
      v_sisa_reviewed:=true;
      v_sisa:=CASE
        WHEN upper(v_onboarding.sisa_status)='ACTIVO' AND regexp_replace(coalesce(v_onboarding.sisa_categoria,''),'[^123]','','g')='1' THEN 100
        WHEN upper(v_onboarding.sisa_status)='ACTIVO' AND regexp_replace(coalesce(v_onboarding.sisa_categoria,''),'[^123]','','g')='2' THEN 85
        WHEN upper(v_onboarding.sisa_status)='ACTIVO' AND regexp_replace(coalesce(v_onboarding.sisa_categoria,''),'[^123]','','g')='3' THEN 70
        ELSE 0 END;
      v_tenure_days:=greatest(0,coalesce(current_date-e.creado_en::date,0));
      v_tenure:=CASE WHEN e.activa IS NOT TRUE THEN 0 WHEN v_tenure_days<90 THEN 40 WHEN v_tenure_days<365 THEN 70 ELSE 100 END;
      v_fiscal:=round((v_sisa*0.7)+(v_tenure*0.3),2);
    END IF;

    v_coverage := (CASE WHEN v_quality IS NOT NULL THEN 40 ELSE 0 END)
                + (CASE WHEN v_financial IS NOT NULL THEN 30 ELSE 0 END)
                + (CASE WHEN v_logistics IS NOT NULL THEN 20 ELSE 0 END)
                + (CASE WHEN v_fiscal IS NOT NULL THEN 10 ELSE 0 END);
    IF v_coverage>=40 THEN
      v_score:=round((
        coalesce(v_quality,0)*CASE WHEN v_quality IS NOT NULL THEN 40 ELSE 0 END+
        coalesce(v_financial,0)*CASE WHEN v_financial IS NOT NULL THEN 30 ELSE 0 END+
        coalesce(v_logistics,0)*CASE WHEN v_logistics IS NOT NULL THEN 20 ELSE 0 END+
        coalesce(v_fiscal,0)*CASE WHEN v_fiscal IS NOT NULL THEN 10 ELSE 0 END
      )/v_coverage);
    END IF;

    IF v_score IS NULL THEN
      v_badge_code:='SIN_HISTORIAL';v_badge_label:='Historial insuficiente';v_badge_color:='#9E9E9E';v_state:='SIN_HISTORIAL';v_without_history:=v_without_history+1;
    ELSIF v_score>=90 THEN
      v_badge_code:='PREMIUM';v_badge_label:='Operador Premium / SISA Excelente';v_badge_color:='#00C853';v_state:=CASE WHEN v_coverage=100 THEN 'COMPLETO' ELSE 'PROVISIONAL' END;
    ELSIF v_score>=70 THEN
      v_badge_code:='VERIFICADO';v_badge_label:='Operador Verificado / Riesgo Bajo';v_badge_color:='#2962FF';v_state:=CASE WHEN v_coverage=100 THEN 'COMPLETO' ELSE 'PROVISIONAL' END;
    ELSIF v_score>=40 THEN
      v_badge_code:='OBSERVACION';v_badge_label:='Operador Bajo Observación / Demoras';v_badge_color:='#FFD600';v_state:=CASE WHEN v_coverage=100 THEN 'COMPLETO' ELSE 'PROVISIONAL' END;
    ELSE
      v_badge_code:='RESTRINGIDO';v_badge_label:='Operador Restringido / Alto Riesgo';v_badge_color:='#D50000';v_state:=CASE WHEN v_coverage=100 THEN 'COMPLETO' ELSE 'PROVISIONAL' END;
    END IF;

    v_factors:=jsonb_build_object(
      'calidad_entrega',jsonb_build_object('weight',40,'score',v_quality,'bad_deviation_events',coalesce(v_quality_bad_events,0)),
      'liquidacion_financiera',jsonb_build_object('weight',30,'score',v_financial,'definition','Transferencia bancaria del contrato confirmada; no incluye comisión de plataforma.'),
      'alertas_logisticas',jsonb_build_object('weight',20,'score',v_logistics,'unjustified_route_deviations',coalesce(v_alerts,0)),
      'fiscal_antiguedad',jsonb_build_object('weight',10,'score',v_fiscal,'sisa_reviewed',v_sisa_reviewed,'sisa_status',v_onboarding.sisa_status,'sisa_category',v_onboarding.sisa_categoria)
    );

    INSERT INTO public.empresa_scoring_actual(
      empresa_id,cuit,score,cobertura_pct,score_calidad,score_liquidacion,score_logistica,score_fiscal,
      operaciones_evaluadas,viajes_evaluados,alertas_desvio_no_justificadas,badge_code,badge_label,badge_color,
      estado_scoring,factores,version_algoritmo,calculado_at,updated_at
    ) VALUES (
      e.id,regexp_replace(e.cuit,'[^0-9]','','g'),v_score,v_coverage,v_quality,v_financial,v_logistics,v_fiscal,
      coalesce(v_ops,0),coalesce(v_trips,0),coalesce(v_alerts,0),v_badge_code,v_badge_label,v_badge_color,
      v_state,v_factors,'1.0.0',now(),now()
    )
    ON CONFLICT(empresa_id) DO UPDATE SET
      cuit=excluded.cuit,score=excluded.score,cobertura_pct=excluded.cobertura_pct,
      score_calidad=excluded.score_calidad,score_liquidacion=excluded.score_liquidacion,
      score_logistica=excluded.score_logistica,score_fiscal=excluded.score_fiscal,
      operaciones_evaluadas=excluded.operaciones_evaluadas,viajes_evaluados=excluded.viajes_evaluados,
      alertas_desvio_no_justificadas=excluded.alertas_desvio_no_justificadas,
      badge_code=excluded.badge_code,badge_label=excluded.badge_label,badge_color=excluded.badge_color,
      estado_scoring=excluded.estado_scoring,factores=excluded.factores,
      version_algoritmo=excluded.version_algoritmo,calculado_at=now(),updated_at=now();

    INSERT INTO public.empresa_scoring_historial(
      empresa_id,cuit,score,cobertura_pct,score_calidad,score_liquidacion,score_logistica,score_fiscal,
      operaciones_evaluadas,viajes_evaluados,alertas_desvio_no_justificadas,badge_code,badge_label,badge_color,
      estado_scoring,factores,version_algoritmo,calculado_at
    ) VALUES (
      e.id,regexp_replace(e.cuit,'[^0-9]','','g'),v_score,v_coverage,v_quality,v_financial,v_logistics,v_fiscal,
      coalesce(v_ops,0),coalesce(v_trips,0),coalesce(v_alerts,0),v_badge_code,v_badge_label,v_badge_color,
      v_state,v_factors,'1.0.0',now()
    );
    v_processed:=v_processed+1;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'processed',v_processed,'without_history',v_without_history,'calculated_at',now(),'version','1.0.0');
END $function$


REVOKE ALL ON FUNCTION public.agrobroker_horas_habiles(timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.recalcular_scoring_confianza_agrobrokeria() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_scoring_confianza_agrobrokeria() TO service_role;
