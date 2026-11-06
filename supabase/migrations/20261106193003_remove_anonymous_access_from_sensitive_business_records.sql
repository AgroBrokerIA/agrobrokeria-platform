-- Remove anonymous table privileges from business, identity, operation and finance data.
REVOKE ALL PRIVILEGES ON TABLE
  public.aceptaciones_legales,
  public.comisiones_intermediarios,
  public.companies,
  public.configuracion_empresa,
  public.cuentas,
  public.documento_traducciones,
  public.empresa_membretes,
  public.empresas,
  public.empresas_contactos,
  public.empresas_verificacion_requisitos,
  public.facturas,
  public.operacion_control_comercial,
  public.operacion_documentos_fiscales,
  public.operacion_logistica,
  public.partes_operacion,
  public.platform_payment_accounts,
  public.prospectos_comerciales,
  public.soporte_tickets,
  public.tokens_api,
  public.contrato_versiones
FROM anon, PUBLIC;

DROP POLICY IF EXISTS soporte_insert_own ON public.soporte_tickets;
CREATE POLICY soporte_insert_own ON public.soporte_tickets
FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS soporte_select_own_or_admin ON public.soporte_tickets;
CREATE POLICY soporte_select_own_or_admin ON public.soporte_tickets
FOR SELECT TO authenticated
USING (auth.uid() = profile_id OR public.es_administrador_plataforma());

DROP POLICY IF EXISTS soporte_update_admin ON public.soporte_tickets;
CREATE POLICY soporte_update_admin ON public.soporte_tickets
FOR UPDATE TO authenticated
USING (public.es_administrador_plataforma())
WITH CHECK (public.es_administrador_plataforma());
