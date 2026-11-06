-- Platform-admin incident resolution reopens the producer confirmation; it never confirms receipt on the producer's behalf.
CREATE OR REPLACE FUNCTION public.resolver_incidencia_recepcion_viaje(
  p_viaje_id uuid,
  p_observaciones text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_v public.viajes%rowtype;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id=v_uid) THEN
    RAISE EXCEPTION 'PLATFORM_ADMIN_REQUIRED';
  END IF;
  IF nullif(trim(coalesce(p_observaciones,'')),'') IS NULL THEN
    RAISE EXCEPTION 'RESOLUTION_REASON_REQUIRED';
  END IF;
  SELECT * INTO v_v FROM public.viajes WHERE id=p_viaje_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TRIP_NOT_FOUND'; END IF;
  IF v_v.productor_recepcion_observada_at IS NULL OR v_v.estado<>'OBSERVADO' THEN
    RAISE EXCEPTION 'NO_OPEN_DELIVERY_INCIDENT';
  END IF;

  UPDATE public.viajes
  SET productor_recepcion_observada_at=NULL,
      productor_recepcion_observaciones=concat_ws(E'\n',nullif(productor_recepcion_observaciones,''),'Resolución administrativa: '||trim(p_observaciones)),
      estado='ESPERANDO_RECEPCION_PRODUCTOR',
      actualizado_at=now()
  WHERE id=p_viaje_id;

  INSERT INTO public.viaje_eventos(
    viaje_id,operacion_id,estado,toneladas,observaciones,registrado_por
  ) VALUES (
    p_viaje_id,v_v.operacion_id,'INCIDENCIA_RESUELTA_PENDIENTE_RECONFIRMACION',
    coalesce(v_v.productor_kilos_recibidos,0)/1000,
    trim(p_observaciones)||'. El productor debe confirmar nuevamente la recepción.',
    v_uid
  );

  RETURN jsonb_build_object('viaje_id',p_viaje_id,'estado','ESPERANDO_RECEPCION_PRODUCTOR',
    'requiere_reconfirmacion_productor',true,'comision_liberada',false);
END;
$$;

REVOKE ALL ON FUNCTION public.resolver_incidencia_recepcion_viaje(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolver_incidencia_recepcion_viaje(uuid,text) TO authenticated;