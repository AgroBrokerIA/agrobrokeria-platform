-- Smart Match calculation is an internal primitive.
-- Authenticated users must enter through procesar_smart_match_publicacion(),
-- which validates publication ownership and redacts counterparty identity.
REVOKE ALL ON FUNCTION public.calcular_smart_matches(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calcular_smart_matches(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.calcular_smart_matches(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_smart_matches(uuid) TO service_role;
