-- Publicaciones publicadas por personas intermediarias sin empresa propia.
-- La empresa representada se incorpora en la etapa contractual, no se inventa al publicar.
ALTER TABLE public.publicaciones ALTER COLUMN empresa_id DROP NOT NULL;
ALTER TABLE public.publicaciones
  ADD COLUMN IF NOT EXISTS publicador_profile_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT;

UPDATE public.publicaciones p
SET publicador_profile_id = pr.id
FROM public.empresas e
JOIN public.cuentas c ON c.id = e.cuenta_id
JOIN public.profiles pr ON lower(pr.email) = lower(c.email)
WHERE p.empresa_id = e.id
  AND p.publicador_profile_id IS NULL;

CREATE INDEX IF NOT EXISTS publicaciones_publicador_profile_id_idx
  ON public.publicaciones(publicador_profile_id);

-- Compatibilidad para publicaciones históricas y nuevas publicaciones.
DROP POLICY IF EXISTS publicaciones_select_publicadas ON public.publicaciones;
CREATE POLICY publicaciones_select_publicadas ON public.publicaciones
FOR SELECT TO authenticated
USING (
  estado = 'PUBLICADA'
  OR public.usuario_es_miembro_empresa(empresa_id)
  OR publicador_profile_id = auth.uid()
);

DROP POLICY IF EXISTS publicaciones_update_empresa ON public.publicaciones;
CREATE POLICY publicaciones_update_empresa ON public.publicaciones
FOR UPDATE TO authenticated
USING (
  public.usuario_es_miembro_empresa(empresa_id)
  OR publicador_profile_id = auth.uid()
)
WITH CHECK (
  public.usuario_es_miembro_empresa(empresa_id)
  OR publicador_profile_id = auth.uid()
);

CREATE OR REPLACE FUNCTION public.guardar_publicacion(p_publicacion_id uuid, p_datos jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tipo_usuario text;
  v_company uuid;
  v_empresa uuid;
  v_id uuid;
  v_existing_empresa uuid;
  v_existing_owner uuid;
  v_cuenta uuid;
  v_email text;
  v_puertos text[] := coalesce(array(
    select value from jsonb_array_elements_text(coalesce(p_datos->'puertos','[]'::jsonb)) x(value)
    where trim(value) <> ''
  ), '{}'::text[]);
  v_lugares text[] := coalesce(array(
    select value from jsonb_array_elements_text(coalesce(p_datos->'lugares_recepcion','[]'::jsonb)) x(value)
    where trim(value) <> ''
  ), '{}'::text[]);
  v_pais integer := nullif(p_datos->>'pais_id','')::integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT active_company_id, email, lower(coalesce(tipo_usuario,''))
    INTO v_company, v_email, v_tipo_usuario
  FROM public.profiles WHERE id = v_uid;

  IF v_tipo_usuario IN ('intermediario','intermediaria') THEN
    -- El intermediario se identifica como publicador; nunca se usa una empresa
    -- interna o de contexto como vendedor contractual.
    v_empresa := NULL;
  ELSIF v_company IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.company_users
      WHERE company_id = v_company AND profile_id = v_uid AND activo = true
    ) THEN
      SELECT empresa_id INTO v_empresa
      FROM public.company_empresa_map WHERE company_id = v_company;
    END IF;
  END IF;

  -- Solo el rol intermediario puede publicar sin una empresa vendedora asociada.
  IF v_empresa IS NULL AND v_tipo_usuario NOT IN ('intermediario','intermediaria') THEN
    RAISE EXCEPTION 'EMPRESA_ACTIVA_REQUERIDA';
  END IF;

  SELECT id INTO v_cuenta FROM public.cuentas
  WHERE lower(email) = lower(v_email) LIMIT 1;

  IF v_pais IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.paises WHERE id = v_pais AND activo = true
  ) THEN RAISE EXCEPTION 'PAIS_NO_VALIDO'; END IF;

  IF coalesce(nullif(p_datos->>'cantidad_tn','')::numeric,0) <= 0
    AND p_publicacion_id IS NULL THEN
    RAISE EXCEPTION 'CANTIDAD_INVALIDA';
  END IF;

  IF p_publicacion_id IS NULL THEN
    INSERT INTO public.publicaciones(
      empresa_id, publicador_profile_id, tipo, producto_id, cantidad_tn, precio_tn,
      moneda_id, incoterm_id, pais_id, provincia, localidad, puerto, calidad,
      humedad, proteina, observaciones, estado, puertos, lugares_recepcion
    )
    VALUES(
      v_empresa, v_uid, p_datos->>'tipo', (p_datos->>'producto_id')::integer,
      (p_datos->>'cantidad_tn')::numeric, nullif(p_datos->>'precio_tn','')::numeric,
      nullif(p_datos->>'moneda_id','')::integer, nullif(p_datos->>'incoterm_id','')::integer,
      v_pais, nullif(p_datos->>'provincia',''), nullif(p_datos->>'localidad',''),
      coalesce(nullif(p_datos->>'puerto',''),v_puertos[1]), nullif(p_datos->>'calidad',''),
      nullif(p_datos->>'humedad','')::numeric, nullif(p_datos->>'proteina','')::numeric,
      nullif(p_datos->>'observaciones',''), 'PUBLICADA', v_puertos, v_lugares
    ) RETURNING id INTO v_id;

    IF v_cuenta IS NOT NULL THEN
      INSERT INTO public.auditoria(cuenta_id,tabla,registro_id,accion,descripcion)
      VALUES(v_cuenta,'publicaciones',v_id,'CREAR',
        'Publicación creada por perfil '||v_uid::text||
        CASE WHEN v_empresa IS NULL THEN ' como intermediario independiente.' ELSE ' vinculado a empresa.' END);
    END IF;
  ELSE
    SELECT empresa_id, publicador_profile_id
      INTO v_existing_empresa, v_existing_owner
    FROM public.publicaciones WHERE id = p_publicacion_id FOR UPDATE;

    IF NOT FOUND OR NOT (
      v_existing_owner = v_uid
      OR (v_empresa IS NOT NULL AND v_existing_empresa = v_empresa)
    ) THEN RAISE EXCEPTION 'PUBLICACION_NO_AUTORIZADA'; END IF;

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
      lugares_recepcion = v_lugares,
      actualizada_en = now()
    WHERE id = p_publicacion_id
    RETURNING id INTO v_id;

    IF v_cuenta IS NOT NULL THEN
      INSERT INTO public.auditoria(cuenta_id,tabla,registro_id,accion,descripcion)
      VALUES(v_cuenta,'publicaciones',v_id,'ACTUALIZAR','Publicación actualizada por su publicador autorizado.');
    END IF;
  END IF;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_publicacion(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_publicacion(uuid,jsonb) TO authenticated;

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
  v_conversacion uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

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
  IF v_publicador = v_uid THEN RAISE EXCEPTION 'NO_PODES_CONTACTARTE_A_VOS_MISMO'; END IF;

  INSERT INTO public.conversaciones_publicaciones(
    publicacion_id, publicador_profile_id, interesado_profile_id
  ) VALUES (p_publicacion_id, v_publicador, v_uid)
  ON CONFLICT (publicacion_id, interesado_profile_id)
  DO UPDATE SET actualizado_at = now()
  RETURNING id INTO v_conversacion;

  RETURN v_conversacion;
END;
$function$;

REVOKE ALL ON FUNCTION public.iniciar_conversacion_publicacion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.iniciar_conversacion_publicacion(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.publicaciones_propias_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT p.id
  FROM public.publicaciones p
  LEFT JOIN public.empresas e ON e.id = p.empresa_id
  LEFT JOIN public.cuentas c ON c.id = e.cuenta_id
  LEFT JOIN public.profiles pr ON lower(pr.email) = lower(c.email)
  WHERE p.publicador_profile_id = auth.uid() OR pr.id = auth.uid();
$function$;

REVOKE ALL ON FUNCTION public.publicaciones_propias_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publicaciones_propias_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.cambiar_estado_publicacion(p_publicacion_id uuid, p_nuevo_estado text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_empresa uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT empresa_id INTO v_empresa
  FROM public.publicaciones
  WHERE id = p_publicacion_id
    AND (publicador_profile_id = v_uid OR public.usuario_es_miembro_empresa(empresa_id));

  IF NOT FOUND THEN RAISE EXCEPTION 'PUBLICACION_NO_AUTORIZADA'; END IF;
  IF p_nuevo_estado NOT IN ('PUBLICADA','PAUSADA') THEN RAISE EXCEPTION 'ESTADO_INVALIDO'; END IF;

  UPDATE public.publicaciones
  SET estado = p_nuevo_estado, actualizada_en = now()
  WHERE id = p_publicacion_id;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.cambiar_estado_publicacion(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_publicacion(uuid,text) TO authenticated;

CREATE OR REPLACE VIEW public.vw_publicaciones_activas AS
SELECT
  p.id,
  e.nombre_comercial,
  pr.nombre AS producto,
  p.cantidad_tn,
  p.precio_tn,
  m.codigo AS moneda,
  p.provincia,
  p.puerto,
  coalesce(nullif(trim(pub.nombre),''), nullif(trim(pub.email),''), e.nombre_comercial, 'Usuario AgroBrokerIA') AS publicador_nombre,
  CASE WHEN p.empresa_id IS NULL THEN 'INTERMEDIARIO' ELSE 'EMPRESA' END AS publicador_tipo
FROM public.publicaciones p
LEFT JOIN public.empresas e ON e.id = p.empresa_id
LEFT JOIN public.profiles pub ON pub.id = p.publicador_profile_id
JOIN public.productos pr ON pr.id = p.producto_id
LEFT JOIN public.monedas m ON m.id = p.moneda_id
WHERE p.estado = 'PUBLICADA';

