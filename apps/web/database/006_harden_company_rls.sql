-- Harden company directory and registration policies.
-- Only verified/active companies are discoverable to authenticated users;
-- members retain access to their own company records.
-- New companies enter a non-public pending/inactive state.

DROP POLICY IF EXISTS companies_select_authenticated ON public.companies;
CREATE POLICY companies_select_authenticated
ON public.companies FOR SELECT TO authenticated
USING (estado = 'verificada' OR usuario_es_miembro_empresa(id));

DROP POLICY IF EXISTS companies_insert_authenticated ON public.companies;
CREATE POLICY companies_insert_authenticated
ON public.companies FOR INSERT TO authenticated
WITH CHECK (
  estado = 'pendiente'
  AND length(trim(razon_social)) >= 2
  AND length(trim(cuit)) >= 8
);

DROP POLICY IF EXISTS empresas_select_authenticated ON public.empresas;
CREATE POLICY empresas_select_authenticated
ON public.empresas FOR SELECT TO authenticated
USING (
  activa = true
  OR EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.company_id = empresas.id
      AND cu.profile_id = (SELECT auth.uid())
      AND cu.activo = true
  )
);

DROP POLICY IF EXISTS empresas_insert_member ON public.empresas;
CREATE POLICY empresas_insert_member
ON public.empresas FOR INSERT TO authenticated
WITH CHECK (
  activa = false
  AND length(trim(razon_social)) >= 2
  AND length(trim(cuit)) >= 8
);
