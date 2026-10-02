-- Keep the platform commission trigger callable by the database trigger only.
-- The function is SECURITY DEFINER and must not be exposed through PostgREST.
REVOKE EXECUTE ON FUNCTION public.ensure_platform_commission_on_operation_acceptance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_platform_commission_on_operation_acceptance() TO postgres;
