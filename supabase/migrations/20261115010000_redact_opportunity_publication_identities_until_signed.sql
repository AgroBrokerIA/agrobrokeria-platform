-- Protect legal identities in the opportunity-matching RPC.
-- Keep verified company IDs for matching; release legal identities only to owners,
-- platform admins, or operation participants after both latest-version contract copies
-- have been approved by platform administration.
CREATE OR REPLACE FUNCTION public.listar_publicaciones_activas_oportunidades()
RETURNS TABLE(id uuid,empresa_id uuid,publicador_profile_id uuid,tipo text,cantidad_tn numeric,precio_tn numeric,moneda_id integer,provincia text,localidad text,puerto text,incoterms jsonb,productos jsonb,paises jsonb,empresas jsonb,calidad text,humedad numeric,proteina numeric,fecha_disponible date,fecha_vencimiento date,puertos text[],lugares_entrega text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_uid uuid := auth.uid(); v_admin boolean := false;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=v_uid) INTO v_admin;
 RETURN QUERY
 SELECT p.id,p.empresa_id,p.publicador_profile_id,upper(trim(p.tipo::text)),p.cantidad_tn,p.precio_tn,p.moneda_id,p.provincia::text,p.localidad::text,p.puerto::text,
  CASE WHEN i.id IS NULL THEN NULL ELSE jsonb_build_object('codigo',i.codigo) END,
  CASE WHEN pr.id IS NULL THEN NULL ELSE jsonb_build_object('nombre',pr.nombre) END,
  CASE WHEN pa.id IS NULL THEN NULL ELSE jsonb_build_object('nombre',pa.nombre,'codigo_iso',pa.codigo_iso) END,
  CASE WHEN p.publicador_profile_id=v_uid OR v_admin OR EXISTS(
   SELECT 1 FROM public.operaciones o
   JOIN public.contratos c ON c.operacion_id=o.id AND c.estado='CONFIRMADO'
   JOIN LATERAL(SELECT max(cf.version_contrato) version_contrato FROM public.contrato_copias_firmadas cf WHERE cf.contrato_id=c.id) latest ON true
   WHERE (o.publicacion_compra_id=p.id OR o.publicacion_venta_id=p.id)
    AND public.usuario_participa_operacion(o.id)
    AND latest.version_contrato IS NOT NULL
    AND (SELECT count(DISTINCT cf.rol) FROM public.contrato_copias_firmadas cf
         WHERE cf.contrato_id=c.id AND cf.version_contrato=latest.version_contrato
          AND cf.rol IN('VENDEDOR','COMPRADOR') AND cf.estado='APROBADA')=2
  ) THEN jsonb_build_object(
   'razon_social',coalesce(e.razon_social,p.representado_razon_social),'tipo_empresa',coalesce(e.tipo_empresa,CASE WHEN ei.id IS NOT NULL THEN 'INTERMEDIARIO' END),
   'verificada',coalesce(e.verificada,ei.verificada),'reputacion_score',e.reputacion_score,'operaciones_realizadas',e.operaciones_realizadas,'toneladas_operadas',e.toneladas_operadas,
   'representado_razon_social',p.representado_razon_social,'representado_cuit',p.representado_cuit,'representado_sisa_categoria',p.representado_sisa_categoria,
   'intermediario_razon_social',ei.razon_social,'intermediario_empresa_id',ei.id,'intermediario_cuit',ei.cuit,
   'publicador_nombre',pub.nombre,'publicador_tipo_usuario',pub.tipo_usuario,'publicador_company_id',pub.active_company_id,
   'empresa_company_id',(SELECT cem.company_id FROM public.company_empresa_map cem WHERE cem.empresa_id=e.id AND (cem.verified=true OR cem.match_method='platform_internal') ORDER BY cem.verified DESC NULLS LAST,cem.updated_at DESC LIMIT 1),
   'intermediario_company_id',(SELECT cemi.company_id FROM public.company_empresa_map cemi WHERE cemi.empresa_id=ei.id AND (cemi.verified=true OR cemi.match_method='platform_internal') ORDER BY cemi.verified DESC NULLS LAST,cemi.updated_at DESC LIMIT 1)
  ) ELSE jsonb_build_object(
   'tipo_empresa',coalesce(e.tipo_empresa,CASE WHEN ei.id IS NOT NULL THEN 'INTERMEDIARIO' END),'verificada',coalesce(e.verificada,ei.verificada),
   'reputacion_score',e.reputacion_score,'operaciones_realizadas',e.operaciones_realizadas,'toneladas_operadas',e.toneladas_operadas,
   'intermediario_empresa_id',ei.id,'publicador_company_id',pub.active_company_id,
   'empresa_company_id',(SELECT cem.company_id FROM public.company_empresa_map cem WHERE cem.empresa_id=e.id AND (cem.verified=true OR cem.match_method='platform_internal') ORDER BY cem.verified DESC NULLS LAST,cem.updated_at DESC LIMIT 1),
   'intermediario_company_id',(SELECT cemi.company_id FROM public.company_empresa_map cemi WHERE cemi.empresa_id=ei.id AND (cemi.verified=true OR cemi.match_method='platform_internal') ORDER BY cemi.verified DESC NULLS LAST,cemi.updated_at DESC LIMIT 1),
   'identidad_reservada',true
  ) END,
  p.calidad::text,p.humedad,p.proteina,p.fecha_disponible,p.fecha_vencimiento,p.puertos,p.lugares_entrega
 FROM public.publicaciones p
 LEFT JOIN public.incoterms i ON i.id=p.incoterm_id LEFT JOIN public.productos pr ON pr.id=p.producto_id LEFT JOIN public.paises pa ON pa.id=p.pais_id
 LEFT JOIN public.empresas e ON e.id=p.empresa_id LEFT JOIN public.empresas ei ON ei.id=p.intermediario_empresa_id LEFT JOIN public.profiles pub ON pub.id=p.publicador_profile_id
 WHERE upper(trim(p.estado::text)) IN('PUBLICADA','ACTIVA') ORDER BY p.creada_en DESC;
END;
$function$;
REVOKE ALL ON FUNCTION public.listar_publicaciones_activas_oportunidades() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_publicaciones_activas_oportunidades() TO authenticated;
