-- Resolve the legal company for direct and intermediary-published listings before creating an operation.
CREATE OR REPLACE FUNCTION public.crear_operacion_desde_publicaciones(p_publicacion_compra_id uuid,p_publicacion_venta_id uuid,p_cantidad_tn numeric,p_precio_tn numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE v_user uuid:=auth.uid(); v_compra public.publicaciones%rowtype; v_venta public.publicaciones%rowtype; v_compra_empresa_id uuid; v_venta_empresa_id uuid; v_operacion uuid; v_moneda integer; v_workflow uuid; v_stage uuid; v_ow uuid;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Debés iniciar sesión para crear una operación.'; END IF;
 PERFORM public.exigir_validacion_sisa(v_user);
 IF p_publicacion_compra_id IS NULL OR p_publicacion_venta_id IS NULL OR p_publicacion_compra_id=p_publicacion_venta_id THEN RAISE EXCEPTION 'Seleccioná una compra y una venta diferentes.'; END IF;
 IF p_cantidad_tn IS NULL OR p_cantidad_tn<=0 OR p_precio_tn IS NULL OR p_precio_tn<=0 THEN RAISE EXCEPTION 'La cantidad y el precio acordados deben ser mayores que cero.'; END IF;
 SELECT * INTO v_compra FROM public.publicaciones WHERE id=p_publicacion_compra_id AND estado IN ('PUBLICADA','ACTIVA') FOR SHARE;
 SELECT * INTO v_venta FROM public.publicaciones WHERE id=p_publicacion_venta_id AND estado IN ('PUBLICADA','ACTIVA') FOR SHARE;
 IF v_compra.id IS NULL OR v_venta.id IS NULL THEN RAISE EXCEPTION 'Una de las publicaciones ya no está activa o no existe.'; END IF;
 PERFORM public.exigir_validacion_sisa(v_compra.publicador_profile_id); PERFORM public.exigir_validacion_sisa(v_venta.publicador_profile_id);
 IF upper(v_compra.tipo) NOT IN ('COMPRA','DEMANDA') OR upper(v_venta.tipo) NOT IN ('VENTA','OFERTA') THEN RAISE EXCEPTION 'Seleccioná una demanda/compra y una oferta/venta.'; END IF;
 IF v_compra.producto_id IS DISTINCT FROM v_venta.producto_id THEN RAISE EXCEPTION 'Los productos de compra y venta deben coincidir.'; END IF;
 IF v_compra.moneda_id IS NOT NULL AND v_venta.moneda_id IS NOT NULL AND v_compra.moneda_id<>v_venta.moneda_id THEN RAISE EXCEPTION 'Las monedas de compra y venta deben coincidir.'; END IF;
 IF p_cantidad_tn>least(v_compra.cantidad_tn,v_venta.cantidad_tn) THEN RAISE EXCEPTION 'La cantidad acordada supera el volumen disponible.'; END IF;
 SELECT coalesce(v_compra.empresa_id,v_compra.intermediario_empresa_id,cem.empresa_id) INTO v_compra_empresa_id FROM public.profiles pr LEFT JOIN public.company_empresa_map cem ON cem.company_id=pr.active_company_id WHERE pr.id=v_compra.publicador_profile_id;
 SELECT coalesce(v_venta.empresa_id,v_venta.intermediario_empresa_id,cem.empresa_id) INTO v_venta_empresa_id FROM public.profiles pr LEFT JOIN public.company_empresa_map cem ON cem.company_id=pr.active_company_id WHERE pr.id=v_venta.publicador_profile_id;
 IF v_compra_empresa_id IS NULL OR v_venta_empresa_id IS NULL THEN RAISE EXCEPTION 'No se pudo identificar la empresa responsable de ambas publicaciones.'; END IF;
 IF v_compra_empresa_id=v_venta_empresa_id THEN RAISE EXCEPTION 'La compra y la venta deben pertenecer a empresas distintas.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.company_users cu JOIN public.company_empresa_map cem ON cem.company_id=cu.company_id WHERE cu.profile_id=v_user AND cu.activo IS TRUE AND cem.empresa_id IN (v_compra_empresa_id,v_venta_empresa_id)) THEN RAISE EXCEPTION 'No tenés permisos para iniciar una operación con estas empresas.'; END IF;
 v_moneda:=coalesce(v_compra.moneda_id,v_venta.moneda_id);
 INSERT INTO public.operaciones(codigo,publicacion_compra_id,publicacion_venta_id,estado,precio_tn,cantidad_tn,moneda_id,importe_total,fecha_operacion,modalidad_comercial,cantidad_original,unidad_original,factor_normalizacion,unidad_base)
 VALUES('OP-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS'),v_compra.id,v_venta.id,'NEGOCIACION',p_precio_tn,p_cantidad_tn,v_moneda,p_precio_tn*p_cantidad_tn,now(),'A_COORDINAR',p_cantidad_tn,'TN',1,'TN') RETURNING id INTO v_operacion;
 INSERT INTO public.operacion_participantes(operacion_id,empresa_id,rol) VALUES(v_operacion,v_compra_empresa_id,'COMPRADOR'),(v_operacion,v_venta_empresa_id,'VENDEDOR');
 SELECT id INTO v_workflow FROM public.workflows WHERE nombre='Operación de granos' AND activo=true ORDER BY creado_en LIMIT 1; IF v_workflow IS NULL THEN RAISE EXCEPTION 'No existe workflow activo de Operación de granos'; END IF;
 SELECT id INTO v_stage FROM public.workflow_etapas WHERE workflow_id=v_workflow AND orden=1 LIMIT 1; IF v_stage IS NULL THEN RAISE EXCEPTION 'El workflow no tiene etapa inicial'; END IF;
 INSERT INTO public.operacion_workflow(operacion_id,workflow_id,etapa_actual_id,estado) VALUES(v_operacion,v_workflow,v_stage,'EN_CURSO') RETURNING id INTO v_ow;
 INSERT INTO public.workflow_historial(operacion_workflow_id,etapa_id,fecha_inicio,usuario_id,observaciones) SELECT v_ow,v_stage,now(),cu.id,'Operación iniciada desde el cruce de publicaciones; continuar negociación y acuerdo comercial.' FROM public.profiles pr JOIN public.cuentas cu ON lower(trim(cu.email))=lower(trim(pr.email)) WHERE pr.id=v_user LIMIT 1;
 IF NOT EXISTS(SELECT 1 FROM public.workflow_historial WHERE operacion_workflow_id=v_ow AND etapa_id=v_stage) THEN INSERT INTO public.workflow_historial(operacion_workflow_id,etapa_id,fecha_inicio,usuario_id,observaciones) VALUES(v_ow,v_stage,now(),NULL,'Operación iniciada desde el cruce de publicaciones; continuar negociación y acuerdo comercial.'); END IF;
 RETURN v_operacion;
END; $function$;
-- Return only active public listings plus their resolved legal company.
-- Profile company links are resolved server-side because profiles are private under RLS.
CREATE OR REPLACE FUNCTION public.listar_publicaciones_para_nueva_operacion()
RETURNS TABLE(
 id uuid,
 empresa_id uuid,
 intermediario_empresa_id uuid,
 publicador_profile_id uuid,
 tipo text,
 producto_id integer,
 cantidad_tn numeric,
 precio_tn numeric,
 moneda_id integer,
 provincia text,
 localidad text,
 estado text,
 producto_nombre text,
 moneda_codigo text,
 empresa_nombre text,
 empresa_efectiva_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 RETURN QUERY
 SELECT p.id,p.empresa_id,p.intermediario_empresa_id,p.publicador_profile_id,
   p.tipo::text,p.producto_id,p.cantidad_tn,p.precio_tn,p.moneda_id,
   p.provincia::text,p.localidad::text,p.estado::text,pr.nombre::text,m.codigo::text,
   e.razon_social::text,
   coalesce(p.empresa_id,p.intermediario_empresa_id,cem.empresa_id)
 FROM public.publicaciones p
 LEFT JOIN public.productos pr ON pr.id=p.producto_id
 LEFT JOIN public.monedas m ON m.id=p.moneda_id
 LEFT JOIN public.profiles pub ON pub.id=p.publicador_profile_id
 LEFT JOIN public.company_empresa_map cem ON cem.company_id=pub.active_company_id
 LEFT JOIN public.empresas e ON e.id=coalesce(p.empresa_id,p.intermediario_empresa_id,cem.empresa_id)
 WHERE p.estado IN ('PUBLICADA','ACTIVA')
 ORDER BY p.creada_en DESC;
END;
$function$;
REVOKE ALL ON FUNCTION public.listar_publicaciones_para_nueva_operacion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_publicaciones_para_nueva_operacion() TO authenticated;
