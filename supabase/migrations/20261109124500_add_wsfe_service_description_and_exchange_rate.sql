-- WSFEv1 service-detail fields. Exchange rates are explicit snapshots, never implicit 1:1 conversions.
ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS concepto_descripcion text,
  ADD COLUMN IF NOT EXISTS fecha_servicio_desde date,
  ADD COLUMN IF NOT EXISTS fecha_servicio_hasta date,
  ADD COLUMN IF NOT EXISTS moneda_cotizacion numeric(20,6);

ALTER TABLE public.facturas
  ADD CONSTRAINT facturas_concepto_descripcion_length_check
  CHECK (concepto_descripcion IS NULL OR length(btrim(concepto_descripcion)) BETWEEN 1 AND 1000);

ALTER TABLE public.facturas
  ADD CONSTRAINT facturas_moneda_cotizacion_positive_check
  CHECK (moneda_cotizacion IS NULL OR moneda_cotizacion > 0);

COMMENT ON COLUMN public.facturas.concepto_descripcion IS
  'Detalle textual para renderizar en el PDF del comprobante; WSFEv1 no admite una descripción libre de ítem.';
COMMENT ON COLUMN public.facturas.moneda_cotizacion IS
  'Cotización ARS por unidad de moneda extranjera usada como snapshot en WSFEv1. Obligatoria para DOL/EUR.';
