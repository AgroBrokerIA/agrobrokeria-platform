-- Cover the financial/control foreign keys surfaced by Supabase performance advisor.
create index if not exists idx_billeteras_mov_operacion_comision_id on public.billeteras_comisiones_movimientos(operacion_comision_id);
create index if not exists idx_billeteras_mov_operacion_id on public.billeteras_comisiones_movimientos(operacion_id);
create index if not exists idx_billeteras_mov_profile_id on public.billeteras_comisiones_movimientos(profile_id);
create index if not exists idx_ingresos_comisiones_empresa_receptora_id on public.ingresos_comisiones(empresa_receptora_id);
create index if not exists idx_ingresos_comisiones_moneda_id on public.ingresos_comisiones(moneda_id);
create index if not exists idx_ingresos_comisiones_operacion_comision_id on public.ingresos_comisiones(operacion_comision_id);
create index if not exists idx_ingresos_comisiones_operacion_id on public.ingresos_comisiones(operacion_id);
create index if not exists idx_ingresos_comisiones_profile_id on public.ingresos_comisiones(profile_id);
create index if not exists idx_finanzas_auditoria_empresa_id on public.finanzas_auditoria(empresa_id);
create index if not exists idx_finanzas_auditoria_profile_id on public.finanzas_auditoria(profile_id);
create index if not exists idx_operacion_control_cancelacion_revision_por on public.operacion_control_comercial(cancelacion_revision_por);
create index if not exists idx_operacion_control_cancelacion_solicitada_por on public.operacion_control_comercial(cancelacion_solicitada_por);
