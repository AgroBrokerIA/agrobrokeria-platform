-- Keep company identifiers consistent in opportunity matching.
-- The matching RPC returns companies.id, while publications store empresas.id.
-- Expose only verified/platform-internal mappings through the existing authenticated RPC.

CREATE OR REPLACE FUNCTION public.listar_publicaciones_activas_oportunidades()
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
  empresas jsonb,
  calidad text,
  humedad numeric,
  proteina numeric,
  fecha_disponible date,
  fecha_vencimiento date,
  puertos text[],
  lugares_entrega text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.empresa_id,
    p.publicador_profile_id,
    upper(trim(p.tipo::text)),
    p.cantidad_tn,
    p.precio_tn,
    p.moneda_id,
    p.provincia::text,
    p.localidad::text,
    p.puerto::text,
    CASE WHEN i.id IS NULL THEN NULL ELSE jsonb_build_object('codigo', i.codigo) END,
    CASE WHEN pr.id IS NULL THEN NULL ELSE jsonb_build_object('nombre', pr.nombre) END,
    CASE WHEN pa.id IS NULL THEN NULL ELSE jsonb_build_object('nombre', pa.nombre, 'codigo_iso', pa.codigo_iso) END,
    CASE
      WHEN e.id IS NULL AND ei.id IS NULL AND p.representado_razon_social IS NULL
      THEN jsonb_build_object('publicador_company_id', pub.active_company_id)
      ELSE jsonb_build_object(
        'razon_social', coalesce(e.razon_social, p.representado_razon_social),
        'tipo_empresa', coalesce(e.tipo_empresa, CASE WHEN ei.id IS NOT NULL THEN 'INTERMEDIARIO' END),
        'verificada', coalesce(e.verificada, ei.verificada),
        'reputacion_score', e.reputacion_score,
        'operaciones_realizadas', e.operaciones_realizadas,
        'toneladas_operadas', e.toneladas_operadas,
        'representado_razon_social', p.representado_razon_social,
        'representado_cuit', p.representado_cuit,
        'representado_sisa_categoria', p.representado_sisa_categoria,
        'intermediario_razon_social', ei.razon_social,
        'intermediario_empresa_id', ei.id,
        'intermediario_cuit', ei.cuit,
        'publicador_nombre', pub.nombre,
        'publicador_tipo_usuario', pub.tipo_usuario,
        'publicador_company_id', pub.active_company_id,
        'empresa_company_id', (
          SELECT cem.company_id
          FROM public.company_empresa_map cem
          WHERE cem.empresa_id = e.id
            AND (cem.verified = true OR cem.match_method = 'platform_internal')
          ORDER BY cem.verified DESC NULLS LAST, cem.updated_at DESC
          LIMIT 1
        ),
        'intermediario_company_id', (
          SELECT cemi.company_id
          FROM public.company_empresa_map cemi
          WHERE cemi.empresa_id = ei.id
            AND (cemi.verified = true OR cemi.match_method = 'platform_internal')
          ORDER BY cemi.verified DESC NULLS LAST, cemi.updated_at DESC
          LIMIT 1
        )
      )
    END,
    p.calidad::text,
    p.humedad,
    p.proteina,
    p.fecha_disponible,
    p.fecha_vencimiento,
    p.puertos,
    p.lugares_entrega
  FROM public.publicaciones p
  LEFT JOIN public.incoterms i ON i.id = p.incoterm_id
  LEFT JOIN public.productos pr ON pr.id = p.producto_id
  LEFT JOIN public.paises pa ON pa.id = p.pais_id
  LEFT JOIN public.empresas e ON e.id = p.empresa_id
  LEFT JOIN public.empresas ei ON ei.id = p.intermediario_empresa_id
  LEFT JOIN public.profiles pub ON pub.id = p.publicador_profile_id
  WHERE upper(trim(p.estado::text)) IN ('PUBLICADA', 'ACTIVA')
  ORDER BY p.creada_en DESC;
END;
$function$;
