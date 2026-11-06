-- Prevent public views from bypassing the underlying tables' RLS policies.
-- The commercial-memory aggregate contains private company and operation intelligence.
REVOKE ALL PRIVILEGES ON TABLE public.memoria_comercial FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.memoria_comercial TO service_role;

-- Active publications must obey RLS on publicaciones, productos and monedas.
ALTER VIEW public.vw_publicaciones_activas SET (security_invoker = true);
REVOKE ALL PRIVILEGES ON TABLE public.vw_publicaciones_activas FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.vw_publicaciones_activas TO authenticated, service_role;
