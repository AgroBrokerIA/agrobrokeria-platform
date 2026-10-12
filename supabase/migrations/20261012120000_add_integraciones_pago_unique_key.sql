-- Required by the Mercado Pago OAuth callback upsert.
-- Checked existing rows first: no duplicate (empresa_id, proveedor, ambiente) groups.
-- Use a non-partial index so Postgres can infer it from ON CONFLICT (empresa_id, proveedor, ambiente).
drop index if exists public.integraciones_pago_empresa_proveedor_ambiente_uidx;
create unique index integraciones_pago_empresa_proveedor_ambiente_uidx
  on public.integraciones_pago (empresa_id, proveedor, ambiente);
