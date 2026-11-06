-- AgroBrokerIA: privacy-first, authenticated GPS telemetry linked to each validated CPE.
CREATE TABLE IF NOT EXISTS public.viaje_telemetria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id uuid NOT NULL REFERENCES public.viajes(id) ON DELETE CASCADE,
  operacion_id uuid NOT NULL REFERENCES public.operaciones(id) ON DELETE CASCADE,
  transportista_profile_id uuid NOT NULL REFERENCES auth.users(id),
  cpe_numero text NOT NULL,
  timestamp_dispositivo timestamptz NOT NULL,
  latitud numeric(9,6) NOT NULL CHECK (latitud BETWEEN -90 AND 90),
  longitud numeric(9,6) NOT NULL CHECK (longitud BETWEEN -180 AND 180),
  velocidad_kmh numeric(6,2) CHECK (velocidad_kmh BETWEEN 0 AND 250),
  rumbo_grados numeric(6,2) CHECK (rumbo_grados >= 0 AND rumbo_grados < 360),
  nivel_bateria smallint CHECK (nivel_bateria BETWEEN 0 AND 100),
  senal_red text,
  recibido_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(viaje_id,timestamp_dispositivo,latitud,longitud)
);
CREATE INDEX IF NOT EXISTS viaje_telemetria_viaje_time_idx
  ON public.viaje_telemetria(viaje_id,timestamp_dispositivo DESC);
CREATE INDEX IF NOT EXISTS viaje_telemetria_operacion_time_idx
  ON public.viaje_telemetria(operacion_id,timestamp_dispositivo DESC);
ALTER TABLE public.viaje_telemetria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS viaje_telemetria_read_owner_admin ON public.viaje_telemetria;
CREATE POLICY viaje_telemetria_read_owner_admin ON public.viaje_telemetria
  FOR SELECT TO authenticated
  USING (
    transportista_profile_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public.platform_admins a WHERE a.user_id=auth.uid())
  );
REVOKE ALL ON public.viaje_telemetria FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.viaje_telemetria TO authenticated;

CREATE OR REPLACE FUNCTION public.registrar_telemetria_viaje(
  p_viaje_id uuid,
  p_puntos jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,auth,pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_viaje public.viajes%rowtype;
  v_point jsonb;
  v_count integer := 0;
  v_inserted integer := 0;
  v_ts timestamptz;
  v_lat numeric;
  v_lon numeric;
  v_speed numeric;
  v_heading numeric;
  v_battery integer;
  v_cpe text;
  v_signal text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED'; END IF;
  IF jsonb_typeof(p_puntos) <> 'array' OR jsonb_array_length(p_puntos)=0 OR jsonb_array_length(p_puntos)>100 THEN
    RAISE EXCEPTION 'TELEMETRY_BATCH_MUST_CONTAIN_1_TO_100_POINTS';
  END IF;
  SELECT * INTO v_viaje FROM public.viajes WHERE id=p_viaje_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TRIP_NOT_FOUND'; END IF;
  IF v_viaje.transportista_profile_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'TRANSPORTER_NOT_ASSIGNED_TO_TRIP'; END IF;
  IF upper(coalesce(v_viaje.estado,'')) IN ('CANCELADO','CANCELADA','ENTREGADO_CONFIRMADO') THEN
    RAISE EXCEPTION 'TRIP_NOT_ACTIVE';
  END IF;

  FOR v_point IN SELECT value FROM jsonb_array_elements(p_puntos) LOOP
    v_count := v_count + 1;
    v_cpe := nullif(trim(v_point->>'cpe_numero'),'');
    IF v_cpe IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.viaje_cartas_porte cp
      WHERE cp.viaje_id=p_viaje_id
        AND cp.numero_carta_porte=v_cpe
        AND upper(coalesce(cp.estado_verificacion,''))='VALIDADA'
    ) THEN RAISE EXCEPTION 'CPE_NOT_VALIDATED_FOR_TRIP'; END IF;

    v_ts := (v_point->>'timestamp')::timestamptz;
    v_lat := (v_point#>>'{telemetria,latitud}')::numeric;
    v_lon := (v_point#>>'{telemetria,longitud}')::numeric;
    v_speed := nullif(v_point#>>'{telemetria,velocidad_kmh}','')::numeric;
    v_heading := nullif(v_point#>>'{telemetria,rumbo_grados}','')::numeric;
    v_battery := nullif(v_point#>>'{estado_dispositivo,nivel_bateria}','')::integer;
    v_signal := nullif(trim(v_point#>>'{estado_dispositivo,senal_red}'),'');
    IF v_ts IS NULL OR v_ts > now()+interval '2 minutes' OR v_ts < now()-interval '14 days' THEN
      RAISE EXCEPTION 'INVALID_TELEMETRY_TIMESTAMP';
    END IF;
    IF v_lat NOT BETWEEN -90 AND 90 OR v_lon NOT BETWEEN -180 AND 180 THEN
      RAISE EXCEPTION 'INVALID_GPS_COORDINATES';
    END IF;
    IF v_speed IS NOT NULL AND v_speed NOT BETWEEN 0 AND 250 THEN RAISE EXCEPTION 'INVALID_SPEED'; END IF;
    IF v_heading IS NOT NULL AND v_heading NOT BETWEEN 0 AND 359.99 THEN RAISE EXCEPTION 'INVALID_HEADING'; END IF;
    IF v_battery IS NOT NULL AND v_battery NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'INVALID_BATTERY_LEVEL'; END IF;

    INSERT INTO public.viaje_telemetria(
      viaje_id,operacion_id,transportista_profile_id,cpe_numero,timestamp_dispositivo,
      latitud,longitud,velocidad_kmh,rumbo_grados,nivel_bateria,senal_red
    ) VALUES (
      p_viaje_id,v_viaje.operacion_id,v_uid,v_cpe,v_ts,
      round(v_lat,6),round(v_lon,6),v_speed,v_heading,v_battery,v_signal
    ) ON CONFLICT (viaje_id,timestamp_dispositivo,latitud,longitud) DO NOTHING;
    IF FOUND THEN v_inserted := v_inserted+1; END IF;
  END LOOP;
  RETURN jsonb_build_object('viaje_id',p_viaje_id,'recibidos',v_count,'insertados',v_inserted,'duplicados',v_count-v_inserted);
EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
  RAISE EXCEPTION 'INVALID_TELEMETRY_PAYLOAD';
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_telemetria_viaje(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.registrar_telemetria_viaje(uuid,jsonb) TO authenticated;