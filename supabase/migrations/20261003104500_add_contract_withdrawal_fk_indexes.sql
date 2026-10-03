-- Cover contract cancellation and withdrawal account foreign keys.
create index if not exists idx_cancelaciones_contrato_contrato_id on public.cancelaciones_contrato(contrato_id);
create index if not exists idx_cancelaciones_contrato_moneda_id on public.cancelaciones_contrato(moneda_id);
create index if not exists idx_cancelaciones_contrato_revisada_por on public.cancelaciones_contrato(revisada_por);
create index if not exists idx_cancelaciones_contrato_solicitada_por on public.cancelaciones_contrato(solicitada_por);
create index if not exists idx_cuentas_financieras_retiro_empresa_id on public.cuentas_financieras_retiro(empresa_id);
create index if not exists idx_cuentas_financieras_retiro_medio_cobro_id on public.cuentas_financieras_retiro(medio_cobro_id);
create index if not exists idx_cuentas_financieras_retiro_moneda_id on public.cuentas_financieras_retiro(moneda_id);
create index if not exists idx_cuentas_financieras_retiro_profile_id on public.cuentas_financieras_retiro(profile_id);
create index if not exists idx_cuentas_financieras_retiro_verificada_por on public.cuentas_financieras_retiro(verificada_por);
