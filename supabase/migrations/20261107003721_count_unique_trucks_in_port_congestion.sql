-- Count distinct trucks, not individual trips, in a port congestion geofence.
CREATE OR REPLACE FUNCTION public.recalcular_congestion_puertos()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE t record; v_count integer; v_wait integer; v_ids uuid[]; v_details jsonb; v_level text; v_total integer:=0;
BEGIN
 FOR t IN SELECT * FROM public.terminales_puerto WHERE activa LOOP
  WITH latest AS (
   SELECT DISTINCT ON (vt.viaje_id) vt.viaje_id,vt.latitud,vt.longitud,vt.velocidad_kmh,vt.timestamp_dispositivo
   FROM public.viaje_telemetria vt WHERE vt.timestamp_dispositivo>now()-interval '15 minutes'
   ORDER BY vt.viaje_id,vt.timestamp_dispositivo DESC
  ), near_terminal AS (
   SELECT l.*,(6371000*2*asin(sqrt(power(sin(radians(l.latitud-t.latitud)/2),2)+cos(radians(t.latitud))*cos(radians(l.latitud))*power(sin(radians(l.longitud-t.longitud)/2),2)))) AS distancia_m,
    coalesce(v.vehiculo_id::text,nullif(upper(trim(v.patente_camion)),''),l.viaje_id::text) AS truck_key
   FROM latest l JOIN public.viajes v ON v.id=l.viaje_id
  ), stopped AS (
   SELECT n.viaje_id,n.truck_key,n.timestamp_dispositivo,
    coalesce((SELECT max(vt.timestamp_dispositivo) FROM public.viaje_telemetria vt WHERE vt.viaje_id=n.viaje_id AND vt.timestamp_dispositivo>now()-interval '4 hours' AND coalesce(vt.velocidad_kmh,0)>1),
    (SELECT min(vt.timestamp_dispositivo)-interval '1 second' FROM public.viaje_telemetria vt WHERE vt.viaje_id=n.viaje_id AND vt.timestamp_dispositivo>now()-interval '4 hours')) AS last_moving_at
   FROM near_terminal n WHERE n.distancia_m<=t.radio_geocerca_m AND coalesce(n.velocidad_kmh,0)<=1
  ), eligible AS (
   SELECT DISTINCT ON (s.truck_key) s.viaje_id,s.truck_key,s.timestamp_dispositivo,s.last_moving_at,extract(epoch FROM (s.timestamp_dispositivo-s.last_moving_at))/60 AS wait_minutes
   FROM stopped s WHERE s.last_moving_at IS NOT NULL AND s.timestamp_dispositivo-s.last_moving_at>=interval '2 hours'
   ORDER BY s.truck_key,wait_minutes DESC
  )
  SELECT count(*)::integer,coalesce(round(avg(wait_minutes),0),0)::integer,coalesce(array_agg(viaje_id),'{}'::uuid[]),
   coalesce(jsonb_agg(jsonb_build_object('viaje_id',viaje_id,'truck_key',truck_key,'detenido_desde',last_moving_at,'minutos',round(wait_minutes))),'[]'::jsonb)
  INTO v_count,v_wait,v_ids,v_details FROM eligible;
  v_level:=CASE WHEN v_count>=10 THEN 'CRITICA' WHEN v_count>=5 THEN 'ALTA' WHEN v_count>=3 THEN 'MEDIA' WHEN v_count>=1 THEN 'BAJA' ELSE 'SIN_DATOS' END;
  INSERT INTO public.congestion_puertos(terminal_id,camiones_activos_en_espera,tiempo_espera_promedio_minutos,nivel,calculado_con_gps_at,muestra_desde,viajes_detectados,detalle,actualizado_at)
  VALUES(t.id,v_count,v_wait,v_level,now(),now()-interval '2 hours',v_ids,v_details,now())
  ON CONFLICT(terminal_id) DO UPDATE SET camiones_activos_en_espera=excluded.camiones_activos_en_espera,tiempo_espera_promedio_minutos=excluded.tiempo_espera_promedio_minutos,nivel=excluded.nivel,calculado_con_gps_at=excluded.calculado_con_gps_at,muestra_desde=excluded.muestra_desde,viajes_detectados=excluded.viajes_detectados,detalle=excluded.detalle,actualizado_at=now();
  v_total:=v_total+1;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'terminales_calculadas',v_total,'calculated_at',now());
END $$;
REVOKE ALL ON FUNCTION public.recalcular_congestion_puertos() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_congestion_puertos() TO service_role;
