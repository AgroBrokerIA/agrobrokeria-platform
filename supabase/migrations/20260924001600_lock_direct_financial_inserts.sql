-- Financial ledger writes must go through validated RPCs.
-- Direct client INSERT would bypass commission/reconciliation invariants.
drop policy if exists "operacion_comisiones_insert" on public.operacion_comisiones;
revoke insert on public.operacion_comisiones from authenticated;
revoke insert on public.operacion_comisiones from anon;

drop policy if exists "retiros_insert_own" on public.retiros_comisiones;
revoke insert on public.retiros_comisiones from authenticated;
revoke insert on public.retiros_comisiones from anon;

-- The platform's internal SECURITY DEFINER RPCs retain write access.
