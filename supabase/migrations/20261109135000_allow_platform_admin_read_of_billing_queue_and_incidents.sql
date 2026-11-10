-- Read-only visibility for platform administrators. Mutation remains service-role only.
DROP POLICY IF EXISTS facturacion_outbox_platform_admin_select
  ON public.facturacion_eventos_outbox;
CREATE POLICY facturacion_outbox_platform_admin_select
  ON public.facturacion_eventos_outbox
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS factura_arca_incidentes_platform_admin_select
  ON public.factura_arca_incidentes;
CREATE POLICY factura_arca_incidentes_platform_admin_select
  ON public.factura_arca_incidentes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()
  ));
