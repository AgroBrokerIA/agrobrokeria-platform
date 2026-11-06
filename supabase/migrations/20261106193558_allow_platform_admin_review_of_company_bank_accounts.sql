DROP POLICY IF EXISTS empresas_bancos_select_admin ON public.empresas_bancos;
CREATE POLICY empresas_bancos_select_admin
ON public.empresas_bancos
FOR SELECT TO authenticated
USING (
  public.es_administrador_plataforma()
  OR EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.profile_id=(SELECT auth.uid())
      AND cu.activo=true
      AND cu.rol='administrador'::public.user_role
      AND (
        cu.company_id=empresas_bancos.empresa_id
        OR EXISTS (
          SELECT 1 FROM public.company_empresa_map cem
          WHERE cem.company_id=cu.company_id
            AND cem.empresa_id=empresas_bancos.empresa_id
        )
      )
  )
);
