ALTER TABLE public.viajes
  ADD COLUMN IF NOT EXISTS carta_porte_tipo_cpe text,
  ADD COLUMN IF NOT EXISTS carta_porte_sucursal integer;

ALTER TABLE public.viajes
  ADD CONSTRAINT viajes_carta_porte_sucursal_positive
  CHECK (carta_porte_sucursal IS NULL OR carta_porte_sucursal > 0);

COMMENT ON COLUMN public.viajes.carta_porte_tipo_cpe IS
  'Tipo de CPE utilizado al emitir la Carta de Porte en WSCPE; se conserva para consultas oficiales posteriores.';
COMMENT ON COLUMN public.viajes.carta_porte_sucursal IS
  'Sucursal WSCPE utilizada para emitir la CPE; se conserva junto con el número de orden para consultas oficiales.';
