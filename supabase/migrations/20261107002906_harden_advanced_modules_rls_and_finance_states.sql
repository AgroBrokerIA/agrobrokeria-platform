-- Restrict marketplace approval to platform administrators and require evidence for a reported financing payout.
DROP POLICY IF EXISTS insumos_canje_manage_owner ON public.insumos_ofertas_canje;
DROP POLICY IF EXISTS insumos_canje_read_verified ON public.insumos_ofertas_canje;
DROP POLICY IF EXISTS insumos_canje_select_owner ON public.insumos_ofertas_canje;
CREATE POLICY insumos_canje_select_owner ON public.insumos_ofertas_canje FOR SELECT TO authenticated
 USING ((estado_verificacion='APROBADA' AND disponibilidad) OR EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=proveedor_empresa_id AND e.cuenta_id=auth.uid()) OR public.es_administrador_plataforma());
DROP POLICY IF EXISTS insumos_canje_insert_owner ON public.insumos_ofertas_canje;
CREATE POLICY insumos_canje_insert_owner ON public.insumos_ofertas_canje FOR INSERT TO authenticated
 WITH CHECK (estado_verificacion='PENDIENTE' AND verificada_por IS NULL AND verificada_at IS NULL AND EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=proveedor_empresa_id AND e.cuenta_id=auth.uid()));
DROP POLICY IF EXISTS insumos_canje_update_admin ON public.insumos_ofertas_canje;
CREATE POLICY insumos_canje_update_admin ON public.insumos_ofertas_canje FOR UPDATE TO authenticated USING(public.es_administrador_plataforma()) WITH CHECK(public.es_administrador_plataforma());
DROP POLICY IF EXISTS insumos_canje_delete_owner_pending ON public.insumos_ofertas_canje;
CREATE POLICY insumos_canje_delete_owner_pending ON public.insumos_ofertas_canje FOR DELETE TO authenticated
 USING((estado_verificacion IN ('PENDIENTE','RECHAZADA') AND EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=proveedor_empresa_id AND e.cuenta_id=auth.uid())) OR public.es_administrador_plataforma());
DROP POLICY IF EXISTS terminales_puerto_admin_write ON public.terminales_puerto;
CREATE POLICY terminales_puerto_admin_insert ON public.terminales_puerto FOR INSERT TO authenticated WITH CHECK(public.es_administrador_plataforma());
CREATE POLICY terminales_puerto_admin_update ON public.terminales_puerto FOR UPDATE TO authenticated USING(public.es_administrador_plataforma()) WITH CHECK(public.es_administrador_plataforma());
CREATE POLICY terminales_puerto_admin_delete ON public.terminales_puerto FOR DELETE TO authenticated USING(public.es_administrador_plataforma());
DROP POLICY IF EXISTS ordenes_inteligentes_update_owner ON public.ordenes_inteligentes_pizarra;
CREATE POLICY ordenes_inteligentes_update_owner ON public.ordenes_inteligentes_pizarra FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=productor_empresa_id AND e.cuenta_id=auth.uid()) AND estado IN('BORRADOR','ACTIVA_MONITOREO','PAUSADA','OBJETIVO_ALCANZADO','MATCHING_PENDIENTE','OFERTAS_COINCIDENTES','ACEPTACION_PENDIENTE'))
 WITH CHECK(EXISTS(SELECT 1 FROM public.empresas e WHERE e.id=productor_empresa_id AND e.cuenta_id=auth.uid()) AND estado IN('BORRADOR','ACTIVA_MONITOREO','PAUSADA','CANCELADA'));
ALTER TABLE public.adelantos_financieros DROP CONSTRAINT IF EXISTS adelantos_desembolso_evidencia_check;
ALTER TABLE public.adelantos_financieros ADD CONSTRAINT adelantos_desembolso_evidencia_check CHECK(estado<>'DESEMBOLSADO' OR (nullif(trim(referencia_entidad),'') IS NOT NULL AND nullif(trim(comprobante_storage_path),'') IS NOT NULL AND desembolsado_at IS NOT NULL AND revisado_por IS NOT NULL));
