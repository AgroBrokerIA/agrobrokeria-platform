-- RLS policies also require table-level SELECT privileges.
GRANT SELECT ON public.facturacion_eventos_outbox TO authenticated;
GRANT SELECT ON public.factura_arca_incidentes TO authenticated;
