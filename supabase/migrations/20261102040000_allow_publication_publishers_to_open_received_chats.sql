CREATE OR REPLACE FUNCTION public.iniciar_conversacion_publicacion(p_publicacion_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_publicador uuid;
  v_estado text;
  v_conversacion uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  -- Si ya existe una conversación donde participa el usuario, devolverla.
  -- Esto permite que el publicador abra y lea el mensaje recibido.
  SELECT c.id INTO v_conversacion
  FROM public.conversaciones_publicaciones c
  WHERE c.publicacion_id = p_publicacion_id
    AND v_uid IN (c.publicador_profile_id, c.interesado_profile_id)
  ORDER BY c.actualizado_at DESC
  LIMIT 1;

  IF v_conversacion IS NOT NULL THEN
    RETURN v_conversacion;
  END IF;

  SELECT coalesce(p.publicador_profile_id, pr.id), p.estado
    INTO v_publicador, v_estado
  FROM public.publicaciones p
  LEFT JOIN public.empresas e ON e.id = p.empresa_id
  LEFT JOIN public.cuentas c ON c.id = e.cuenta_id
  LEFT JOIN public.profiles pr ON lower(pr.email) = lower(c.email)
  WHERE p.id = p_publicacion_id
    AND (p.empresa_id IS NULL OR coalesce(e.activa,true) = true)
    AND coalesce(c.estado,'') NOT IN ('BLOQUEADA','ELIMINADA');

  IF v_publicador IS NULL OR upper(coalesce(v_estado,'')) <> 'PUBLICADA' THEN
    RAISE EXCEPTION 'PUBLICACION_NO_DISPONIBLE';
  END IF;
  IF v_publicador = v_uid THEN
    RAISE EXCEPTION 'NO_HAY_CONVERSACION_PENDIENTE';
  END IF;

  INSERT INTO public.conversaciones_publicaciones(
    publicacion_id, publicador_profile_id, interesado_profile_id
  ) VALUES (p_publicacion_id, v_publicador, v_uid)
  ON CONFLICT (publicacion_id, interesado_profile_id)
  DO UPDATE SET actualizado_at = now()
  RETURNING id INTO v_conversacion;

  RETURN v_conversacion;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.iniciar_conversacion_publicacion(uuid) TO authenticated;