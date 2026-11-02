-- Allow independent intermediary/commission-agent publications to bypass
-- company-only Smart Match ownership assumptions while preserving missing-ID errors.
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

  IF position('intermediario' in v_tipo_usuario) > 0 OR position('comisionista' in v_tipo_usuario) > 0 THEN
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

  IF v_empresa IS NULL AND position('intermediario' in v_tipo_usuario) = 0 AND position('comisionista' in v_tipo_usuario) = 0 THEN
    SELECT e.id INTO v_empresa
    FROM public.cuentas c
    JOIN public.empresas e ON e.cuenta_id = c.id
    WHERE lower(c.email) = lower(v_email)
      AND e.activa = true
    ORDER BY e.id
    LIMIT 1;
  END IF;

  -- Solo el rol intermediario puede publicar sin una empresa vendedora asociada.
  IF v_empresa IS NULL AND position('intermediario' in v_tipo_usuario) = 0 AND position('comisionista' in v_tipo_usuario) = 0 THEN
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
$function$
;
CREATE OR REPLACE FUNCTION public.procesar_smart_match_publicacion(p_publicacion_id uuid)
 RETURNS TABLE(smart_match_id uuid, publicacion_id uuid, buyer_company_id uuid, comprador character varying, match_score numeric, status text, opportunity_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_match record; v_owner uuid; v_active uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select empresa_id into v_owner from public.publicaciones where id=p_publicacion_id;
 if not found then raise exception 'PUBLICATION_NOT_FOUND'; end if;
 -- Las publicaciones independientes de intermediarios/comisionistas no tienen
 -- empresa vendedora asociada; no deben romperse al disparar Smart Match.
 if v_owner is null then
   if exists (
     select 1 from public.publicaciones p
     join public.profiles pr on pr.id = p.publicador_profile_id
     where p.id = p_publicacion_id
       and (
         position('intermediario' in lower(coalesce(pr.tipo_usuario,''))) > 0
         or position('comisionista' in lower(coalesce(pr.tipo_usuario,''))) > 0
       )
   ) then
     return;
   end if;
   raise exception 'PUBLICATION_OWNER_REQUIRED';
 end if;
 select active_company_id into v_active from public.profiles where id=auth.uid();
 if v_active is null or not exists(select 1 from public.company_empresa_map where company_id=v_active and empresa_id=v_owner and (verified=true or match_method='platform_internal')) then raise exception 'FORBIDDEN'; end if;
 perform public.calcular_smart_matches(p_publicacion_id);

 insert into public.smart_matches(publicacion_id,offer_id,buyer_company_id,match_score,confidence_score,price_score,volume_score,location_score,condition_score,payment_score,history_score,explanation,status)
 select mc.publicacion_id,mc.publicacion_id,cem.company_id,mc.puntaje_total,mc.puntaje_total,mc.puntaje_precio,mc.puntaje_cantidad,mc.puntaje_zona,mc.puntaje_condicion,50,mc.puntaje_historial,
 jsonb_build_object('motor','Smart Match','puntaje_total',mc.puntaje_total,'producto',mc.puntaje_producto,'zona',mc.puntaje_zona,'cantidad',mc.puntaje_cantidad,'precio',mc.puntaje_precio,'historial',mc.puntaje_historial,'condicion',mc.puntaje_condicion,'logistica',mc.puntaje_logistica,'explicacion',mc.explicacion),'NEW'
 from public.motor_compatibilidad mc join public.company_empresa_map cem on cem.empresa_id=mc.empresa_id and cem.verified=true
 where mc.publicacion_id=p_publicacion_id and mc.recomendada=true
 and not exists(select 1 from public.smart_matches sm where sm.publicacion_id=mc.publicacion_id and sm.buyer_company_id=cem.company_id);

 for v_match in select sm.id from public.smart_matches sm where sm.publicacion_id=p_publicacion_id and sm.match_score>=70 loop
   perform public.generar_oportunidad_desde_smart_match(v_match.id);
 end loop;

 return query select sm.id,sm.publicacion_id,sm.buyer_company_id,c.razon_social::varchar,sm.match_score,sm.status,
 (select ao.id from public.ai_opportunities ao where ao.offer_id=sm.publicacion_id and ao.buyer_company_id=sm.buyer_company_id and ao.opportunity_type='SMART_MATCH' order by ao.created_at desc limit 1)
 from public.smart_matches sm join public.companies c on c.id=sm.buyer_company_id
 where sm.publicacion_id=p_publicacion_id order by sm.match_score desc;
end $function$
;
