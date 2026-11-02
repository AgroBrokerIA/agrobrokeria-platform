DROP FUNCTION IF EXISTS public.listar_publicaciones_activas_oportunidades();
CREATE FUNCTION public.listar_publicaciones_activas_oportunidades()
RETURNS TABLE(
 id uuid,
 empresa_id uuid,
 publicador_profile_id uuid,
 tipo text,
 cantidad_tn numeric,
 precio_tn numeric,
 moneda_id integer,
 provincia text,
 localidad text,
 puerto text,
 incoterms jsonb,
 productos jsonb,
 paises jsonb,
 empresas jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $function$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 RETURN QUERY
 SELECT p.id,p.empresa_id,p.publicador_profile_id,upper(trim(p.tipo::text)),p.cantidad_tn,p.precio_tn,p.moneda_id,
   p.provincia::text,p.localidad::text,p.puerto::text,
   CASE WHEN i.id IS NULL THEN NULL ELSE jsonb_build_object('codigo',i.codigo) END,
   CASE WHEN pr.id IS NULL THEN NULL ELSE jsonb_build_object('nombre',pr.nombre) END,
   CASE WHEN pa.id IS NULL THEN NULL ELSE jsonb_build_object('nombre',pa.nombre,'codigo_iso',pa.codigo_iso) END,
   CASE WHEN e.id IS NULL THEN NULL ELSE jsonb_build_object('razon_social',e.razon_social,'tipo_empresa',e.tipo_empresa,'verificada',e.verificada,'reputacion_score',e.reputacion_score,'operaciones_realizadas',e.operaciones_realizadas,'toneladas_operadas',e.toneladas_operadas) END
 FROM public.publicaciones p
 LEFT JOIN public.incoterms i ON i.id=p.incoterm_id
 LEFT JOIN public.productos pr ON pr.id=p.producto_id
 LEFT JOIN public.paises pa ON pa.id=p.pais_id
 LEFT JOIN public.empresas e ON e.id=p.empresa_id
 WHERE upper(trim(p.estado::text)) IN ('PUBLICADA','ACTIVA')
 ORDER BY p.creada_en DESC;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.listar_publicaciones_activas_oportunidades() TO authenticated;