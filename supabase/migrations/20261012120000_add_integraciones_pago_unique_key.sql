-- Required by the Mercado Pago OAuth callback upsert.
-- Checked existing rows first: no duplicate (empresa_id, proveedor, ambiente) groups.
create unique index if not exists integraciones_pago_empresa_proveedor_ambiente_uidx
  on public.integraciones_pago (empresa_id, proveedor, ambiente)
  where empresa_id is not null;
