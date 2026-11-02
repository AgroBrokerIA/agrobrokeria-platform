-- Intermediary publications belong to the publishing profile, not to a fictitious company.
-- Existing company-owned publications remain unchanged.
ALTER TABLE public.publicaciones
  ALTER COLUMN empresa_id DROP NOT NULL;

ALTER TABLE public.publicaciones
  ADD COLUMN IF NOT EXISTS publicador_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.publicaciones p
SET publicador_profile_id = pr.id
FROM public.empresas e
JOIN public.cuentas c ON c.id = e.cuenta_id
JOIN public.profiles pr ON lower(pr.email) = lower(c.email)
WHERE p.empresa_id = e.id
  AND p.publicador_profile_id IS NULL;

CREATE INDEX IF NOT EXISTS publicaciones_publicador_profile_id_idx
  ON public.publicaciones(publicador_profile_id);

-- A publication created by a profile without a commercial company is allowed only
-- for a registered intermediary. The represented seller is deliberately not guessed.
CREATE OR REPLACE FUNCTION public.guardar_publicacion(p_publicacion_id uuid, p_datos jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_company uuid;
  v_empresa uuid;
  v_id uuid;
  v_owner uuid;
  v_cuenta uuid;
  v_email text;
  v_tipo_usuario text;
  v_puertos text[] := coalesce(
    array(select value from jsonb_array_elements_text(coalesce(p_datos->'puertos','[]'::jsonb)) x(value) where trim(value) <> ''),
    '{}'::text[]
  );
  v_lugares text[] := coalesce(
    array(select value from jsonb_array_elements_text(coalesce(p_datos->'lugares_recepcion','[]'::jsonb)) x(value) where trim(value) <> ''),
    '{}'::text[]
  );
  v_pais integer := nullif(p_datos->>'pais_id','')::integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT active_company_id,email,tipo_usuario
    INTO v_company,v_email,v_tipo_usuario
  FROM public.profiles
  WHERE id = v_uid;

  IF v_company IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.company_users
      WHERE company_id = v_company AND profile_id = v_uid AND activo = true
    ) THEN
      RAISE EXCEPTION 'ACTIVE_COMPANY_NOT_AUTHORIZED';
    END IF;

    SELECT CASE
             WHEN lower(coalesce(v_tipo_usuario,'')) = 'intermediario'
                  AND match_method = 'platform_internal' THEN NULL
             ELSE empresa_id
           END
      INTO v_empresa
    FROM public.company_empresa_map
    WHERE company_id = v_company;
  END IF;

  IF v_empresa IS NULL AND lower(coalesce(v_tipo_usuario,'')) <> 'intermediario' THEN
    RAISE EXCEPTION 'Tu usuario necesita una empresa activa para publicar.';
  END IF;

  SELECT id INTO v_cuenta
  FROM public.cuentas
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_pais IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.paises WHERE id = v_pais AND activo = true
  ) THEN
    RAISE EXCEPTION 'PAIS_NO_VALIDO';
  END IF;

  IF coalesce(nullif(p_datos->>'cantidad_tn','')::numeric,0) <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero.';
  END IF;

  IF p_publicacion_id IS NULL THEN
    INSERT INTO public.publicaciones (
      empresa_id, publicador_profile_id, tipo, producto_id, cantidad_tn,
      precio_tn, moneda_id, incoterm_id, pais_id, provincia, localidad, puerto,
      calidad, humedad, proteina, observaciones, estado, puertos, lugares_recepcion
    )
    VALUES (
      v_empresa, v_uid, p_datos->>'tipo', (p_datos->>'producto_id')::integer,
      (p_datos->>'cantidad_tn')::numeric,
      nullif(p_datos->>'precio_tn','')::numeric,
      nullif(p_datos->>'moneda_id','')::integer,
      nullif(p_datos->>'incoterm_id','')::integer,
      v_pais, nullif(p_datos->>'provincia',''), nullif(p_datos->>'localidad',''),
      coalesce(nullif(p_datos->>'puerto',''),v_puertos[1]),
      nullif(p_datos->>'calidad',''),
      nullif(p_datos->>'humedad','')::numeric,
      nullif(p_datos->>'proteina','')::numeric,
      nullif(p_datos->>'observaciones',''),
      'PUBLICADA',v_puertos,v_lugares
    )
    RETURNING id INTO v_id;

    IF v_cuenta IS NOT NULL THEN
      INSERT INTO public.auditoria(cuenta_id,tabla,registro_id,accion,descripcion)
      VALUES (
        v_cuenta,'publicaciones',v_id,'CREAR',
        'Publicación creada por perfil '||v_uid::text||
        CASE WHEN v_empresa IS NULL THEN '; intermediario sin empresa propia.' ELSE '; empresa comercial vinculada.' END
      );
    END IF;
  ELSE
    SELECT empresa_id,publicador_profile_id
      INTO v_owner,v_id
    FROM public.publicaciones
    WHERE id = p_publicacion_id
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'PUBLICACION_NO_ENCONTRADA'; END IF;

    IF NOT (
      v_id = v_uid OR
      (v_owner IS NOT NULL AND public.usuario_es_miembro_empresa(v_owner))
    ) THEN
      RAISE EXCEPTION 'No autorizado para modificar esta publicación.';
    END IF;

    UPDATE public.publicaciones SET
      tipo = p_datos->>'tipo',
      producto_id = (p_datos->>'producto_id')::integer,
      cantidad_tn = (p_datos->>'cantidad_tn')::numeric,
      precio_tn = nullif(p_datos->>'precio_tn','')::numeric,
      moneda_id = nullif(p_datos->>'moneda_id','')::integer,
      incoterm_id = nullif(p_datos->>'incoterm_id','')::integer,
      pais_id = v_pais,
      provincia = nullif(p_datos->>'provincia',''),
      localidad = nullif(p_datos->>'localidad',''),
      puerto = coalesce(nullif(p_datos->>'puerto',''),v_puertos[1]),
      calidad = nullif(p_datos->>'calidad',''),
      humedad = nullif(p_datos->>'humedad','')::numeric,
      proteina = nullif(p_datos->>'proteina','')::numeric,
      observaciones = nullif(p_datos->>'observaciones',''),
      puertos = v_puertos,
      lugares_recepcion = v_lugares
    WHERE id = p_publicacion_id
    RETURNING id INTO v_id;

    IF v_cuenta IS NOT NULL THEN
      INSERT INTO public.auditoria(cuenta_id,tabla,registro_id,accion,descripcion)
      VALUES(v_cuenta,'publicaciones',v_id,'ACTUALIZAR','Publicación actualizada por su publicador o miembro autorizado.');
    END IF;
  END IF;

  RETURN v_id;
END;
$function$;

-- The public profile is the conversation counterpart for intermediary-owned listings.
CREATE OR REPLACE FUNCTION public.iniciar_conversacion_publicacion(p_publicacion_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_publicador uuid;
  v_estado text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT coalesce(p.publicador_profile_id,pr.id),p.estado
    INTO v_publicador,v_estado
  FROM public.publicaciones p
  LEFT JOIN public.empresas e ON e.id = p.empresa_id
  LEFT JOIN public.cuentas c ON c.id = e.cuenta_id
  LEFT JOIN public.profiles pr ON lower(pr.email) = lower(c.email)
  WHERE p.id = p_publicacion_id
    AND (p.empresa_id IS NULL OR coalesce(e.activa,true) = true)
    AND coalesce(c.estado,'') NOT IN ('BLOQUEADA','ELIMINADA')
  ORDER BY e.creado_en ASC NULLS LAST
  LIMIT 1;

  IF v_publicador IS NULL OR upper(coalesce(v_estado,'')) <> 'PUBLICADA' THEN
    RAISE EXCEPTION 'PUBLICACION_NO_DISPONIBLE';
  END IF;
  IF v_publicador = v_uid THEN RAISE EXCEPTION 'NO_PODES_CONTACTARTE_A_VOS_MISMO'; END IF;

  INSERT INTO public.conversaciones_publicaciones(publicacion_id,publicador_profile_id,interesado_profile_id)
  VALUES(p_publicacion_id,v_publicador,v_uid)
  ON CONFLICT(publicacion_id,interesado_profile_id)
  DO UPDATE SET actualizado_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.publicaciones_propias_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT p.id
  FROM public.publicaciones p
  WHERE p.publicador_profile_id = auth.uid()
     OR (p.empresa_id IS NOT NULL AND public.usuario_es_miembro_empresa(p.empresa_id));
$function$;

CREATE OR REPLACE FUNCTION public.cambiar_estado_publicacion(p_publicacion_id uuid,p_nuevo_estado text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_nuevo_estado NOT IN ('PUBLICADA','PAUSADA') THEN RAISE EXCEPTION 'ESTADO_INVALIDO'; END IF;

  UPDATE public.publicaciones
  SET estado = p_nuevo_estado, actualizada_en = now()
  WHERE id = p_publicacion_id
    AND (publicador_profile_id = v_uid OR (empresa_id IS NOT NULL AND public.usuario_es_miembro_empresa(empresa_id)));

  IF NOT FOUND THEN RAISE EXCEPTION 'PUBLICACION_NO_AUTORIZADA_O_ESTADO_INVALIDO'; END IF;
  RETURN true;
END;
$function$;

-- Avoid invoking the company-only Smart Match engine for a profile-only publication.
CREATE OR REPLACE FUNCTION public.trigger_procesar_smart_match_publicacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.estado = 'PUBLICADA' AND NEW.empresa_id IS NOT NULL THEN
    PERFORM public.procesar_smart_match_publicacion(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Preserve existing public listings and expose the actual publisher separately.
CREATE OR REPLACE VIEW public.vw_publicaciones_activas AS
SELECT p.id,
       e.nombre_comercial,
       pr.nombre AS producto,
       p.cantidad_tn,
       p.precio_tn,
       m.codigo AS moneda,
       p.provincia,
       p.puerto,
       p.publicador_profile_id,
       coalesce(pub.nombre,pub.empresa,e.nombre_comercial) AS publicador_nombre
FROM public.publicaciones p
LEFT JOIN public.empresas e ON e.id = p.empresa_id
LEFT JOIN public.profiles pub ON pub.id = p.publicador_profile_id
JOIN public.productos pr ON pr.id = p.producto_id
LEFT JOIN public.monedas m ON m.id = p.moneda_id
WHERE p.estado::text = 'PUBLICADA';

-- Policies support profile-owned listings while preserving legacy company ownership.
DROP POLICY IF EXISTS publicaciones_insert_empresa ON public.publicaciones;
CREATE POLICY publicaciones_insert_empresa ON public.publicaciones
FOR INSERT TO authenticated
WITH CHECK (
  (publicador_profile_id = auth.uid() AND
    (empresa_id IS NULL OR public.usuario_es_miembro_empresa(empresa_id)))
  OR
  (publicador_profile_id IS NULL AND empresa_id IS NOT NULL AND public.usuario_es_miembro_empresa(empresa_id))
);

DROP POLICY IF EXISTS publicaciones_update_empresa ON public.publicaciones;
CREATE POLICY publicaciones_update_empresa ON public.publicaciones
FOR UPDATE TO authenticated
USING (
  publicador_profile_id = auth.uid()
  OR (empresa_id IS NOT NULL AND public.usuario_es_miembro_empresa(empresa_id))
)
WITH CHECK (
  publicador_profile_id = auth.uid()
  OR (empresa_id IS NOT NULL AND public.usuario_es_miembro_empresa(empresa_id))
);

DROP POLICY IF EXISTS publicaciones_delete_empresa ON public.publicaciones;
CREATE POLICY publicaciones_delete_empresa ON public.publicaciones
FOR DELETE TO authenticated
USING (
  publicador_profile_id = auth.uid()
  OR (empresa_id IS NOT NULL AND public.usuario_es_miembro_empresa(empresa_id))
);

REVOKE ALL ON FUNCTION public.guardar_publicacion(uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.iniciar_conversacion_publicacion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publicaciones_propias_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cambiar_estado_publicacion(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_publicacion(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_conversacion_publicacion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publicaciones_propias_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_publicacion(uuid,text) TO authenticated;


-- Profile-owned listings must remain visible to their publisher when paused.
DROP POLICY IF EXISTS publicaciones_select_publicadas ON public.publicaciones;
CREATE POLICY publicaciones_select_publicadas ON public.publicaciones
FOR SELECT
USING (
  estado::text = 'PUBLICADA'
  OR publicador_profile_id = auth.uid()
  OR (empresa_id IS NOT NULL AND public.usuario_es_miembro_empresa(empresa_id))
);

CREATE OR REPLACE FUNCTION public.eliminar_publicacion(p_publicacion_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  DELETE FROM public.publicaciones
  WHERE id = p_publicacion_id
    AND (publicador_profile_id = v_uid OR
         (empresa_id IS NOT NULL AND public.usuario_es_miembro_empresa(empresa_id)));
  IF NOT FOUND THEN RAISE EXCEPTION 'PUBLICACION_NO_AUTORIZADA'; END IF;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.eliminar_publicacion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eliminar_publicacion(uuid) TO authenticated;
