-- Reglas de elegibilidad: solo intermediarios/comisionistas pueden publicar sin empresa propia.
-- Productores, vendedores, compradores y corredores requieren empresa activa vinculada.
CREATE OR REPLACE FUNCTION public.guardar_publicacion(p_publicacion_id uuid, p_datos jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

  IF v_tipo_usuario IN ('intermediario','intermediaria','comisionista') THEN
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

  -- Compatibilidad con perfiles heredados: active_company_id puede apuntar directamente
  -- a empresas, o la empresa puede estar vinculada a la cuenta histórica por email.
  IF v_empresa IS NULL AND v_company IS NOT NULL THEN
    SELECT id INTO v_empresa
    FROM public.empresas
    WHERE id = v_company AND activa = true
    LIMIT 1;
  END IF;

  IF v_empresa IS NULL AND v_tipo_usuario NOT IN ('intermediario','intermediaria','comisionista') THEN
    SELECT e.id INTO v_empresa
    FROM public.cuentas c
    JOIN public.empresas e ON e.cuenta_id = c.id
    WHERE lower(c.email) = lower(v_email)
      AND e.activa = true
    ORDER BY e.id
    LIMIT 1;
  END IF;

  -- Solo el rol intermediario puede publicar sin una empresa vendedora asociada.
  IF v_empresa IS NULL AND v_tipo_usuario NOT IN ('intermediario','intermediaria','comisionista') THEN
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

-- SISA se controla por separado de ARCA. Estas filas exigen evidencia oficial y
-- NO representan una integración API automática con SISA.
INSERT INTO public.verificacion_requisitos_catalogo
  (tipo_empresa,codigo,nombre,obligatorio,fuente,descripcion)
VALUES
  ('PRODUCTOR','SISA_REGISTRO','Inscripción vigente en SISA',true,'SISA / organismo oficial','Exigir constancia o consulta oficial vigente; declarar CUIT no acredita inscripción.'),
  ('COMPRADOR','SISA_REGISTRO','Inscripción vigente en SISA',true,'SISA / organismo oficial','Exigir constancia o consulta oficial vigente.'),
  ('BROKER','SISA_REGISTRO','Inscripción vigente en SISA',true,'SISA / organismo oficial','Exigir constancia o consulta oficial vigente.'),
  ('CORREDOR','SISA_REGISTRO','Inscripción vigente en SISA',true,'SISA / organismo oficial','Exigir constancia o consulta oficial vigente.'),
  ('VENDEDOR','IDENTIDAD_FISCAL','CUIT y constancia fiscal',true,'ARCA','Identidad fiscal vigente del vendedor titular.'),
  ('VENDEDOR','SISA_REGISTRO','Inscripción vigente en SISA',true,'SISA / organismo oficial','Exigir constancia o consulta oficial vigente del vendedor titular.')
ON CONFLICT (tipo_empresa,codigo) DO UPDATE SET
  nombre=EXCLUDED.nombre, obligatorio=EXCLUDED.obligatorio, fuente=EXCLUDED.fuente, descripcion=EXCLUDED.descripcion;

-- La exención del intermediario/comisionista es sobre su inscripción propia como operador.
-- La facturación de honorarios/comisiones sigue el régimen fiscal que corresponda.
UPDATE public.verificacion_requisitos_catalogo
SET obligatorio=false,
    descripcion='No se exige inscripción propia ARCA/SISA para actuar exclusivamente como intermediario/comisionista. La documentación fiscal de honorarios se gestiona según el régimen aplicable.'
WHERE tipo_empresa='INTERMEDIARIO'
  AND codigo IN ('IDENTIDAD_FISCAL','ACTIVIDAD','FACTURACION');
