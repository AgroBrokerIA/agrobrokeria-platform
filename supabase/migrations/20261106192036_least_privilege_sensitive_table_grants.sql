-- RLS does not protect TRUNCATE, TRIGGER or REFERENCES privileges.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated, PUBLIC;

-- Sensitive identity, KYC, contract and financial records are never anonymous API resources.
REVOKE ALL PRIVILEGES ON TABLE
  public.profiles,
  public.empresas_bancos,
  public.medios_cobro,
  public.user_bank_accounts,
  public.cuentas_financieras_retiro,
  public.retiros_comisiones,
  public.billeteras_comisiones,
  public.billeteras_comisiones_movimientos,
  public.ingresos_comisiones,
  public.operacion_comisiones,
  public.operacion_comision_retenciones,
  public.pagos,
  public.operacion_movimientos_economicos,
  public.finanzas_auditoria,
  public.empresas_verificaciones,
  public.empresas_documentos,
  public.account_onboarding,
  public.account_onboarding_documents,
  public.documentos_operacion,
  public.contratos,
  public.contrato_firmantes,
  public.contrato_copias_firmadas
FROM anon, PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.empresas_bancos,
  public.medios_cobro,
  public.user_bank_accounts,
  public.cuentas_financieras_retiro,
  public.retiros_comisiones,
  public.billeteras_comisiones,
  public.billeteras_comisiones_movimientos,
  public.ingresos_comisiones,
  public.operacion_comisiones,
  public.operacion_comision_retenciones,
  public.pagos,
  public.operacion_movimientos_economicos,
  public.finanzas_auditoria,
  public.empresas_verificaciones,
  public.empresas_documentos,
  public.account_onboarding,
  public.account_onboarding_documents,
  public.documentos_operacion,
  public.contratos,
  public.contrato_firmantes,
  public.contrato_copias_firmadas
TO authenticated, service_role;
