-- AgroBrokerIA advanced modules. UUID schema; intentionally does not create legacy integer tables.
CREATE TABLE IF NOT EXISTS public.insumos_ofertas_canje (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), proveedor_empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
 categoria_insumo text NOT NULL CHECK(categoria_insumo IN ('SEMILLAS','FERTILIZANTES','FITOSANITARIOS','MAQUINARIA','REPUESTOS','OTROS')),
 descripcion_producto text NOT NULL CHECK(length(trim(descripcion_producto)) BETWEEN 5 AND 4000), marca text,
 precio_referencia numeric(18,2) NOT NULL CHECK(precio_referencia>0), moneda text NOT NULL DEFAULT 'USD' CHECK(moneda IN ('USD','ARS')),
 unidad_comercial text NOT NULL DEFAULT 'UNIDAD', producto_grano_equivalente_id integer REFERENCES public.productos(id),
 imagen_storage_path text, localidad text, provincia text, disponibilidad boolean NOT NULL DEFAULT true,
 estado_verificacion text NOT NULL DEFAULT 'PENDIENTE' CHECK(estado_verificacion IN ('PENDIENTE','APROBADA','RECHAZADA','SUSPENDIDA')),
 verificada_por uuid REFERENCES auth.users(id), verificada_at timestamptz, creado_at timestamptz NOT NULL DEFAULT now(), actualizado_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.triangulaciones_canje (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), oferta_insumo_id uuid NOT NULL REFERENCES public.insumos_ofertas_canje(id) ON DELETE RESTRICT,
 productor_empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT, acopio_empresa_id uuid REFERENCES public.empresas(id) ON DELETE RESTRICT,
 agronomia_empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT, operacion_granos_id uuid REFERENCES public.operaciones(id) ON DELETE RESTRICT,
 producto_grano_id integer NOT NULL REFERENCES public.productos(id), toneladas_grano numeric(18,3) NOT NULL CHECK(toneladas_grano>0),
 precio_pizarra_referencia numeric(18,2) CHECK(precio_pizarra_referencia>0), moneda_pizarra text,
 valor_insumo_snapshot numeric(18,2) NOT NULL CHECK(valor_insumo_snapshot>0), moneda_insumo text NOT NULL CHECK(moneda_insumo IN ('USD','ARS')),
 toneladas_equivalentes_snapshot numeric(18,3) CHECK(toneladas_equivalentes_snapshot>0),
 estado text NOT NULL DEFAULT 'PENDIENTE' CHECK(estado IN ('PENDIENTE','ACEPTACION_PRODUCTOR','ACEPTACION_ACOPIO','ACEPTACION_AGRONOMIA','DOCUMENTACION','CONTRATO_PENDIENTE','APROBADO','LIQUIDADO','RECHAZADO','CANCELADO')),
 condiciones jsonb NOT NULL DEFAULT '{}'::jsonb, creado_por uuid NOT NULL REFERENCES auth.users(id), aprobado_at timestamptz, liquidado_at timestamptz,
 creado_at timestamptz NOT NULL DEFAULT now(), actualizado_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.adelantos_financieros (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), viaje_id uuid NOT NULL REFERENCES public.viajes(id) ON DELETE RESTRICT,
 operacion_id uuid NOT NULL REFERENCES public.operaciones(id) ON DELETE RESTRICT, productor_empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
 entidad_financiera_cuit text NOT NULL CHECK(entidad_financiera_cuit ~ '^[0-9]{11}$'), entidad_financiera_nombre text,
 kilos_descargados_confirmados numeric(18,2) NOT NULL CHECK(kilos_descargados_confirmados>0), valor_bruto_lote_ars numeric(18,2) NOT NULL CHECK(valor_bruto_lote_ars>0),
 porcentaje_adelanto numeric(5,2) NOT NULL DEFAULT 85 CHECK(porcentaje_adelanto>0 AND porcentaje_adelanto<=85),
 tasa_estructuracion_pct numeric(5,2) CHECK(tasa_estructuracion_pct>=0 AND tasa_estructuracion_pct<=100),
 monto_bruto_adelanto_ars numeric(18,2) NOT NULL CHECK(monto_bruto_adelanto_ars>0), monto_neto_estimado_ars numeric(18,2) NOT NULL CHECK(monto_neto_estimado_ars>=0),
 estado text NOT NULL DEFAULT 'SOLICITUD_PENDIENTE' CHECK(estado IN ('SOLICITUD_PENDIENTE','EN_REVISION_FINANCIERA','APROBADO_POR_ENTIDAD','DESEMBOLSO_EN_PROCESO','DESEMBOLSADO','RECHAZADO','CANCELADO','FALLIDO')),
 referencia_entidad text, idempotency_key uuid NOT NULL DEFAULT gen_random_uuid(), comprobante_storage_path text,
 solicitado_por uuid NOT NULL REFERENCES auth.users(id), revisado_por uuid REFERENCES auth.users(id), desembolsado_at timestamptz, motivo_rechazo text,
 metadata_entidad jsonb NOT NULL DEFAULT '{}'::jsonb, creado_at timestamptz NOT NULL DEFAULT now(), actualizado_at timestamptz NOT NULL DEFAULT now(), UNIQUE(idempotency_key)
);
CREATE TABLE IF NOT EXISTS public.ordenes_inteligentes_pizarra (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), productor_empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
 producto_id integer NOT NULL REFERENCES public.productos(id), toneladas_objetivo numeric(18,3) NOT NULL CHECK(toneladas_objetivo>0),
 precio_limite numeric(18,2) NOT NULL CHECK(precio_limite>0), moneda text NOT NULL DEFAULT 'USD' CHECK(moneda IN ('USD','ARS')),
 mercado_referencia text NOT NULL DEFAULT 'ROSARIO', tipo_precio text NOT NULL DEFAULT 'PIZARRA_CAC',
 solo_compradores_premium boolean NOT NULL DEFAULT false, minimo_score_premium integer NOT NULL DEFAULT 90 CHECK(minimo_score_premium BETWEEN 0 AND 100),
 estado text NOT NULL DEFAULT 'BORRADOR' CHECK(estado IN ('BORRADOR','ACTIVA_MONITOREO','OBJETIVO_ALCANZADO','MATCHING_PENDIENTE','OFERTAS_COINCIDENTES','ACEPTACION_PENDIENTE','EJECUTADA','CANCELADA','EXPIRADA','PAUSADA')),
 ultimo_precio_observado numeric(18,2), ultima_cotizacion_id uuid REFERENCES public.market_quotes(id), ultima_evaluacion_at timestamptz,
 activada_at timestamptz,cancelada_at timestamptz,expira_at timestamptz,creado_por uuid NOT NULL REFERENCES auth.users(id),
 creado_at timestamptz NOT NULL DEFAULT now(),actualizado_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ordenes_inteligentes_coincidencias (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),orden_id uuid NOT NULL REFERENCES public.ordenes_inteligentes_pizarra(id) ON DELETE CASCADE,
 comprador_empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,score_confianza integer,score_cobertura_pct integer,
 estado text NOT NULL DEFAULT 'CANDIDATO' CHECK(estado IN ('CANDIDATO','NOTIFICADO','INTERESADO','RECHAZADO','VENCIDO')),
 notificado_at timestamptz,creado_at timestamptz NOT NULL DEFAULT now(),UNIQUE(orden_id,comprador_empresa_id)
);
CREATE TABLE IF NOT EXISTS public.terminales_puerto (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),nombre text NOT NULL,puerto text NOT NULL,localidad text,provincia text,
 latitud numeric(10,7) NOT NULL CHECK(latitud BETWEEN -90 AND 90),longitud numeric(10,7) NOT NULL CHECK(longitud BETWEEN -180 AND 180),
 radio_geocerca_m integer NOT NULL DEFAULT 2000 CHECK(radio_geocerca_m BETWEEN 100 AND 10000),activa boolean NOT NULL DEFAULT true,
 creado_at timestamptz NOT NULL DEFAULT now(),actualizado_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.congestion_puertos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),terminal_id uuid NOT NULL UNIQUE REFERENCES public.terminales_puerto(id) ON DELETE CASCADE,
 camiones_activos_en_espera integer NOT NULL DEFAULT 0,tiempo_espera_promedio_minutos integer NOT NULL DEFAULT 0,
 nivel text NOT NULL DEFAULT 'SIN_DATOS' CHECK(nivel IN ('SIN_DATOS','BAJA','MEDIA','ALTA','CRITICA')),
 calculado_con_gps_at timestamptz,muestra_desde timestamptz,viajes_detectados uuid[] NOT NULL DEFAULT '{}',
 detalle jsonb NOT NULL DEFAULT '{}'::jsonb,actualizado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS insumos_canje_disponibilidad_idx ON public.insumos_ofertas_canje(disponibilidad,estado_verificacion,creado_at DESC);
CREATE INDEX IF NOT EXISTS ordenes_inteligentes_activas_idx ON public.ordenes_inteligentes_pizarra(estado,producto_id,mercado_referencia);
CREATE UNIQUE INDEX IF NOT EXISTS terminales_puerto_nombre_uniq ON public.terminales_puerto(lower(nombre));

ALTER TABLE public.insumos_ofertas_canje ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triangulaciones_canje ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adelantos_financieros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_inteligentes_pizarra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_inteligentes_coincidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminales_puerto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.congestion_puertos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS insumos_canje_read_verified ON public.insumos_ofertas_canje;
CREATE POLICY insumos_canje_read_verified ON public.insumos_ofertas_canje FOR SELECT TO authenticated USING(estado_verificacion='APROBADA' AND disponibilidad OR EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=proveedor_empresa_id AND e.cuenta_id=auth.uid()) OR public.es_administrador_plataforma());
DROP POLICY IF EXISTS insumos_canje_manage_owner ON public.insumos_ofertas_canje;
CREATE POLICY insumos_canje_manage_owner ON public.insumos_ofertas_canje FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=proveedor_empresa_id AND e.cuenta_id=auth.uid()) OR public.es_administrador_plataforma()) WITH CHECK(EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=proveedor_empresa_id AND e.cuenta_id=auth.uid()) OR public.es_administrador_plataforma());
DROP POLICY IF EXISTS triangulaciones_canje_read_parties ON public.triangulaciones_canje;
CREATE POLICY triangulaciones_canje_read_parties ON public.triangulaciones_canje FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.empresas e WHERE e.id IN(productor_empresa_id,agronomia_empresa_id,acopio_empresa_id) AND e.cuenta_id=auth.uid()) OR public.es_administrador_plataforma());
DROP POLICY IF EXISTS triangulaciones_canje_insert_producer ON public.triangulaciones_canje;
CREATE POLICY triangulaciones_canje_insert_producer ON public.triangulaciones_canje FOR INSERT TO authenticated WITH CHECK(creado_por=auth.uid() AND EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=productor_empresa_id AND e.cuenta_id=auth.uid()) AND EXISTS(SELECT 1 FROM public.insumos_ofertas_canje o WHERE o.id=oferta_insumo_id AND o.disponibilidad AND o.estado_verificacion='APROBADA' AND o.proveedor_empresa_id=agronomia_empresa_id));
DROP POLICY IF EXISTS triangulaciones_canje_update_admin ON public.triangulaciones_canje;
CREATE POLICY triangulaciones_canje_update_admin ON public.triangulaciones_canje FOR UPDATE TO authenticated USING(public.es_administrador_plataforma()) WITH CHECK(public.es_administrador_plataforma());
DROP POLICY IF EXISTS adelantos_read_owner_admin ON public.adelantos_financieros;
CREATE POLICY adelantos_read_owner_admin ON public.adelantos_financieros FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=productor_empresa_id AND e.cuenta_id=auth.uid()) OR public.es_administrador_plataforma());
DROP POLICY IF EXISTS adelantos_insert_owner ON public.adelantos_financieros;
CREATE POLICY adelantos_insert_owner ON public.adelantos_financieros FOR INSERT TO authenticated WITH CHECK(solicitado_por=auth.uid() AND estado='SOLICITUD_PENDIENTE' AND EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=productor_empresa_id AND e.cuenta_id=auth.uid()) AND EXISTS(SELECT 1 FROM public.viajes v WHERE v.id=viaje_id AND v.operacion_id=adelantos_financieros.operacion_id AND v.transportista_entrega_confirmada_at IS NOT NULL AND v.productor_recepcion_confirmada_at IS NOT NULL AND v.transportista_kilos_entregados=v.productor_kilos_recibidos) AND EXISTS(SELECT 1 FROM public.viaje_cartas_porte cp WHERE cp.viaje_id=adelantos_financieros.viaje_id AND cp.estado_verificacion='VALIDADA'));
DROP POLICY IF EXISTS adelantos_update_admin ON public.adelantos_financieros;
CREATE POLICY adelantos_update_admin ON public.adelantos_financieros FOR UPDATE TO authenticated USING(public.es_administrador_plataforma()) WITH CHECK(public.es_administrador_plataforma());
DROP POLICY IF EXISTS ordenes_inteligentes_read_owner_admin ON public.ordenes_inteligentes_pizarra;
CREATE POLICY ordenes_inteligentes_read_owner_admin ON public.ordenes_inteligentes_pizarra FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=productor_empresa_id AND e.cuenta_id=auth.uid()) OR public.es_administrador_plataforma());
DROP POLICY IF EXISTS ordenes_inteligentes_insert_owner ON public.ordenes_inteligentes_pizarra;
CREATE POLICY ordenes_inteligentes_insert_owner ON public.ordenes_inteligentes_pizarra FOR INSERT TO authenticated WITH CHECK(creado_por=auth.uid() AND estado='BORRADOR' AND EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=productor_empresa_id AND e.cuenta_id=auth.uid()));
DROP POLICY IF EXISTS ordenes_inteligentes_update_owner ON public.ordenes_inteligentes_pizarra;
CREATE POLICY ordenes_inteligentes_update_owner ON public.ordenes_inteligentes_pizarra FOR UPDATE TO authenticated USING(EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=productor_empresa_id AND e.cuenta_id=auth.uid()) AND estado IN('BORRADOR','ACTIVA_MONITOREO','PAUSADA')) WITH CHECK(EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=productor_empresa_id AND e.cuenta_id=auth.uid()) AND estado IN('BORRADOR','ACTIVA_MONITOREO','PAUSADA','CANCELADA'));
DROP POLICY IF EXISTS ordenes_coincidencias_read_parties ON public.ordenes_inteligentes_coincidencias;
CREATE POLICY ordenes_coincidencias_read_parties ON public.ordenes_inteligentes_coincidencias FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.ordenes_inteligentes_pizarra o JOIN public.empresas e ON e.id=o.productor_empresa_id WHERE o.id=orden_id AND e.cuenta_id=auth.uid()) OR EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=comprador_empresa_id AND e.cuenta_id=auth.uid()) OR public.es_administrador_plataforma());
DROP POLICY IF EXISTS terminales_puerto_read_auth ON public.terminales_puerto;
CREATE POLICY terminales_puerto_read_auth ON public.terminales_puerto FOR SELECT TO authenticated USING(true);
DROP POLICY IF EXISTS terminales_puerto_admin_write ON public.terminales_puerto;
CREATE POLICY terminales_puerto_admin_write ON public.terminales_puerto FOR ALL TO authenticated USING(public.es_administrador_plataforma()) WITH CHECK(public.es_administrador_plataforma());
DROP POLICY IF EXISTS congestion_puertos_read_auth ON public.congestion_puertos;
CREATE POLICY congestion_puertos_read_auth ON public.congestion_puertos FOR SELECT TO authenticated USING(true);

CREATE OR REPLACE FUNCTION public.evaluar_ordenes_inteligentes_pizarra()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE o record; q record; v_candidates integer:=0; v_triggered integer:=0;
BEGIN
 FOR o IN SELECT * FROM public.ordenes_inteligentes_pizarra WHERE estado='ACTIVA_MONITOREO' AND (expira_at IS NULL OR expira_at>now()) LOOP
  SELECT * INTO q FROM public.market_quotes mq
   WHERE mq.product_id=o.producto_id AND upper(coalesce(mq.market,'')) IN (upper(o.mercado_referencia),'ROSARIO','BCR','BCR/CAC')
     AND upper(coalesce(mq.price_type,''))=upper(o.tipo_precio)
     AND upper(coalesce(mq.currency,''))=upper(o.moneda)
     AND upper(coalesce(mq.unit,'')) IN ('USD/TN','ARS/TN','USD/TON','ARS/TON','USD/T','ARS/T')
     AND mq.price IS NOT NULL AND coalesce(mq.status,'') NOT IN ('INVALID','REJECTED')
   ORDER BY mq.market_date DESC,mq.obtained_at DESC LIMIT 1;
  IF q.id IS NOT NULL THEN
   UPDATE public.ordenes_inteligentes_pizarra SET ultimo_precio_observado=q.price,ultima_cotizacion_id=q.id,ultima_evaluacion_at=now(),actualizado_at=now()
   WHERE id=o.id;
   IF q.price>=o.precio_limite THEN
    UPDATE public.ordenes_inteligentes_pizarra SET estado='MATCHING_PENDIENTE' WHERE id=o.id;
    INSERT INTO public.ordenes_inteligentes_coincidencias(orden_id,comprador_empresa_id,score_confianza,score_cobertura_pct)
    SELECT o.id,ep.empresa_id,s.score,s.cobertura_pct
    FROM public.empresas_productos ep JOIN public.empresas e ON e.id=ep.empresa_id
    LEFT JOIN public.empresa_scoring_actual s ON s.empresa_id=e.id
    WHERE ep.producto_id=o.producto_id AND ep.compra IS TRUE AND e.activa IS TRUE AND e.verificada IS TRUE
      AND (NOT o.solo_compradores_premium OR (s.score>=o.minimo_score_premium AND s.estado_scoring='COMPLETO'))
    ON CONFLICT(orden_id,comprador_empresa_id) DO NOTHING;
    GET DIAGNOSTICS v_candidates=ROW_COUNT; v_triggered:=v_triggered+1;
    IF v_candidates>0 THEN UPDATE public.ordenes_inteligentes_pizarra SET estado='OFERTAS_COINCIDENTES' WHERE id=o.id; END IF;
   END IF;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'ordenes_activadas',v_triggered,'coincidencias_nuevas',v_candidates,'evaluado_at',now());
END $function$


CREATE OR REPLACE FUNCTION public.recalcular_congestion_puertos()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE t record; v_count integer; v_wait integer; v_ids uuid[]; v_details jsonb; v_level text; v_total integer:=0;
BEGIN
 FOR t IN SELECT * FROM public.terminales_puerto WHERE activa LOOP
  WITH latest AS (
   SELECT DISTINCT ON (vt.viaje_id) vt.viaje_id,vt.latitud,vt.longitud,vt.velocidad_kmh,vt.timestamp_dispositivo,vt.transportista_profile_id
   FROM public.viaje_telemetria vt
   WHERE vt.timestamp_dispositivo>now()-interval '15 minutes'
   ORDER BY vt.viaje_id,vt.timestamp_dispositivo DESC
  ), near_terminal AS (
   SELECT l.*,
    (6371000*2*asin(sqrt(
      power(sin(radians(l.latitud-t.latitud)/2),2)+cos(radians(t.latitud))*cos(radians(l.latitud))*power(sin(radians(l.longitud-t.longitud)/2),2)
    ))) AS distancia_m
   FROM latest l
  ), stopped AS (
   SELECT n.viaje_id,n.timestamp_dispositivo,
     coalesce((SELECT max(vt.timestamp_dispositivo) FROM public.viaje_telemetria vt
       WHERE vt.viaje_id=n.viaje_id AND vt.timestamp_dispositivo>now()-interval '4 hours'
         AND coalesce(vt.velocidad_kmh,0)>1),
       (SELECT min(vt.timestamp_dispositivo)-interval '1 second' FROM public.viaje_telemetria vt
        WHERE vt.viaje_id=n.viaje_id AND vt.timestamp_dispositivo>now()-interval '4 hours')) AS last_moving_at
   FROM near_terminal n
   WHERE n.distancia_m<=t.radio_geocerca_m AND coalesce(n.velocidad_kmh,0)<=1
  )
  SELECT count(*)::integer,coalesce(round(avg(extract(epoch FROM (s.timestamp_dispositivo-s.last_moving_at))/60),0),0)::integer,
    coalesce(array_agg(s.viaje_id),'{}'::uuid[]),
    coalesce(jsonb_agg(jsonb_build_object('viaje_id',s.viaje_id,'detenido_desde',s.last_moving_at,'minutos',round(extract(epoch FROM (s.timestamp_dispositivo-s.last_moving_at))/60))), '[]'::jsonb)
  INTO v_count,v_wait,v_ids,v_details FROM stopped s WHERE s.last_moving_at IS NOT NULL AND s.timestamp_dispositivo-s.last_moving_at>=interval '2 hours';
  v_level:=CASE WHEN v_count>=10 THEN 'CRITICA' WHEN v_count>=5 THEN 'ALTA' WHEN v_count>=3 THEN 'MEDIA' WHEN v_count>=1 THEN 'BAJA' ELSE 'SIN_DATOS' END;
  INSERT INTO public.congestion_puertos(terminal_id,camiones_activos_en_espera,tiempo_espera_promedio_minutos,nivel,calculado_con_gps_at,muestra_desde,viajes_detectados,detalle,actualizado_at)
  VALUES(t.id,v_count,v_wait,v_level,now(),now()-interval '2 hours',v_ids,v_details,now())
  ON CONFLICT(terminal_id) DO UPDATE SET camiones_activos_en_espera=excluded.camiones_activos_en_espera,
   tiempo_espera_promedio_minutos=excluded.tiempo_espera_promedio_minutos,nivel=excluded.nivel,
   calculado_con_gps_at=excluded.calculado_con_gps_at,muestra_desde=excluded.muestra_desde,
   viajes_detectados=excluded.viajes_detectados,detalle=excluded.detalle,actualizado_at=now();
  v_total:=v_total+1;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'terminales_calculadas',v_total,'calculated_at',now());
END $function$


REVOKE ALL ON FUNCTION public.evaluar_ordenes_inteligentes_pizarra() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.recalcular_congestion_puertos() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.evaluar_ordenes_inteligentes_pizarra() TO service_role;
GRANT EXECUTE ON FUNCTION public.recalcular_congestion_puertos() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('agrobrokeria-scoring-diario','0 3 * * *',$$SELECT public.recalcular_scoring_confianza_agrobrokeria();$$);
SELECT cron.schedule('agrobrokeria-ordenes-inteligentes-15m','*/15 * * * *',$$SELECT public.evaluar_ordenes_inteligentes_pizarra();$$);
SELECT cron.schedule('agrobrokeria-congestion-puertos-10m','*/10 * * * *',$$SELECT public.recalcular_congestion_puertos();$$);
