-- Habilita publicaciones para el intermediario interno de AgroBrokerIA.
-- Crea un contexto empresarial interno explícito; no reutiliza empresas de terceros.
ALTER TABLE public.empresas ALTER COLUMN cuit DROP NOT NULL;

DO $$
DECLARE
  v_user uuid;
  v_company uuid;
BEGIN
  SELECT id INTO v_user
  FROM public.profiles
  WHERE lower(email) = lower('jacobomartinallende@hotmail.com')
    AND lower(coalesce(tipo_usuario, '')) = 'intermediario'
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No se encontró el perfil interno de intermediario esperado; no se asignó ninguna empresa.';
  END IF;

  SELECT id INTO v_company
  FROM public.empresas
  WHERE cuenta_id = v_user
    AND tipo_empresa = 'INTERMEDIARIO'
    AND nombre_comercial = 'AgroBrokerIA - Intermediación de plataforma'
  LIMIT 1;

  IF v_company IS NULL THEN
    INSERT INTO public.empresas (
      cuenta_id, razon_social, nombre_comercial, cuit, tipo_empresa,
      pais, descripcion, activa, verificada
    )
    VALUES (
      v_user,
      'AgroBrokerIA - Intermediación de plataforma',
      'AgroBrokerIA - Intermediación de plataforma',
      NULL,
      'INTERMEDIARIO',
      'Argentina',
      'Contexto interno de intermediación de plataforma. No representa una empresa externa verificada.',
      true,
      false
    )
    RETURNING id INTO v_company;
  END IF;

  INSERT INTO public.company_users (company_id, profile_id, rol, activo)
  VALUES (v_company, v_user, 'intermediario'::public.user_role, true)
  ON CONFLICT (company_id, profile_id)
  DO UPDATE SET rol = EXCLUDED.rol, activo = true;

  UPDATE public.profiles
  SET active_company_id = v_company
  WHERE id = v_user;

  INSERT INTO public.auditoria (cuenta_id, tabla, registro_id, accion, descripcion)
  VALUES (
    v_user,
    'empresas',
    v_company,
    'VINCULACION_INTERMEDIARIO_PLATAFORMA',
    'Se creó/vinculó el contexto interno de intermediación de AgroBrokerIA. La empresa no se marca como verificada.'
  );
END $$;

CREATE OR REPLACE FUNCTION public.guardar_publicacion(p_publicacion_id uuid, p_datos jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_id uuid;
  v_existing_empresa uuid;
  v_puertos text[] := coalesce(array(
    SELECT value FROM jsonb_array_elements_text(coalesce(p_datos->'puertos','[]'::jsonb)) x(value)
    WHERE trim(value) <> ''
  ), '{}'::text[]);
  v_lugares text[] := coalesce(array(
    SELECT value FROM jsonb_array_elements_text(coalesce(p_datos->'lugares_recepcion','[]'::jsonb)) x(value)
    WHERE trim(value) <> ''
  ), '{}'::text[]);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT active_company_id INTO v_empresa
  FROM public.profiles
  WHERE id = v_uid;

  IF v_empresa IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_id = v_empresa AND profile_id = v_uid AND activo = true
  ) THEN
    RAISE EXCEPTION 'No hay una empresa activa autorizada para esta cuenta';
  END IF;

  IF p_publicacion_id IS NULL THEN
    IF coalesce(nullif(p_datos->>'cantidad_tn','')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
    END IF;

    INSERT INTO public.publicaciones (
      empresa_id, tipo, producto_id, cantidad_tn, precio_tn, moneda_id, incoterm_id,
      provincia, localidad, puerto, calidad, humedad, proteina, observaciones,
      estado, puertos, lugares_recepcion
    )
    VALUES (
      v_empresa,
      p_datos->>'tipo',
      (p_datos->>'producto_id')::integer,
      (p_datos->>'cantidad_tn')::numeric,
      nullif(p_datos->>'precio_tn','')::numeric,
      nullif(p_datos->>'moneda_id','')::integer,
      nullif(p_datos->>'incoterm_id','')::integer,
      nullif(p_datos->>'provincia',''),
      nullif(p_datos->>'localidad',''),
      coalesce(nullif(p_datos->>'puerto',''), v_puertos[1]),
      nullif(p_datos->>'calidad',''),
      nullif(p_datos->>'humedad','')::numeric,
      nullif(p_datos->>'proteina','')::numeric,
      nullif(p_datos->>'observaciones',''),
      'PUBLICADA',
      v_puertos,
      v_lugares
    )
    RETURNING id INTO v_id;

    INSERT INTO public.auditoria (cuenta_id, tabla, registro_id, accion, descripcion)
    VALUES (
      v_uid, 'publicaciones', v_id, 'CREAR',
      'Publicación creada por intermediario autenticado. Empresa de contexto: ' || v_empresa::text
    );
  ELSE
    SELECT empresa_id INTO v_existing_empresa
    FROM public.publicaciones
    WHERE id = p_publicacion_id
    FOR UPDATE;

    IF v_existing_empresa IS DISTINCT FROM v_empresa THEN
      RAISE EXCEPTION 'No autorizado para modificar esta publicación';
    END IF;

    UPDATE public.publicaciones
    SET tipo = p_datos->>'tipo',
        producto_id = (p_datos->>'producto_id')::integer,
        cantidad_tn = (p_datos->>'cantidad_tn')::numeric,
        precio_tn = nullif(p_datos->>'precio_tn','')::numeric,
        moneda_id = nullif(p_datos->>'moneda_id','')::integer,
        incoterm_id = nullif(p_datos->>'incoterm_id','')::integer,
        provincia = nullif(p_datos->>'provincia',''),
        localidad = nullif(p_datos->>'localidad',''),
        puerto = coalesce(nullif(p_datos->>'puerto',''), v_puertos[1]),
        calidad = nullif(p_datos->>'calidad',''),
        humedad = nullif(p_datos->>'humedad','')::numeric,
        proteina = nullif(p_datos->>'proteina','')::numeric,
        observaciones = nullif(p_datos->>'observaciones',''),
        puertos = v_puertos,
        lugares_recepcion = v_lugares
    WHERE id = p_publicacion_id
    RETURNING id INTO v_id;

    INSERT INTO public.auditoria (cuenta_id, tabla, registro_id, accion, descripcion)
    VALUES (
      v_uid, 'publicaciones', v_id, 'ACTUALIZAR',
      'Publicación actualizada por usuario autorizado. Empresa de contexto: ' || v_empresa::text
    );
  END IF;

  RETURN v_id;
END;
$function$;
