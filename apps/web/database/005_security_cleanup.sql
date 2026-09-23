-- Security cleanup applied to production Supabase.
-- These legacy RLS policies are redundant because authenticated direct
-- INSERT/UPDATE/DELETE privileges on contactos_comerciales are revoked;
-- writes are routed through the secured guardar_contacto_comercial RPC.

DROP POLICY IF EXISTS "contactos comerciales alta" ON public.contactos_comerciales;
DROP POLICY IF EXISTS "contactos comerciales eliminacion" ON public.contactos_comerciales;
DROP POLICY IF EXISTS "contactos comerciales modificacion" ON public.contactos_comerciales;
