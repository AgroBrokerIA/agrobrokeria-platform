-- Restrict company bank details to active company administrators.
-- A generic company membership is not sufficient to read or mutate payout coordinates.
DROP POLICY IF EXISTS empresas_bancos_select ON public.empresas_bancos;
DROP POLICY IF EXISTS empresas_bancos_insert ON public.empresas_bancos;
DROP POLICY IF EXISTS empresas_bancos_update ON public.empresas_bancos;
DROP POLICY IF EXISTS empresas_bancos_delete ON public.empresas_bancos;

CREATE POLICY empresas_bancos_select_admin
ON public.empresas_bancos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.profile_id = (SELECT auth.uid())
      AND cu.activo = true
      AND cu.rol = 'administrador'::public.user_role
      AND (
        cu.company_id = empresas_bancos.empresa_id
        OR EXISTS (
          SELECT 1 FROM public.company_empresa_map cem
          WHERE cem.company_id = cu.company_id
            AND cem.empresa_id = empresas_bancos.empresa_id
        )
      )
  )
);

CREATE POLICY empresas_bancos_insert_admin
ON public.empresas_bancos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.profile_id = (SELECT auth.uid())
      AND cu.activo = true
      AND cu.rol = 'administrador'::public.user_role
      AND (
        cu.company_id = empresas_bancos.empresa_id
        OR EXISTS (
          SELECT 1 FROM public.company_empresa_map cem
          WHERE cem.company_id = cu.company_id
            AND cem.empresa_id = empresas_bancos.empresa_id
        )
      )
  )
);

CREATE POLICY empresas_bancos_update_admin
ON public.empresas_bancos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.profile_id = (SELECT auth.uid())
      AND cu.activo = true
      AND cu.rol = 'administrador'::public.user_role
      AND (
        cu.company_id = empresas_bancos.empresa_id
        OR EXISTS (
          SELECT 1 FROM public.company_empresa_map cem
          WHERE cem.company_id = cu.company_id
            AND cem.empresa_id = empresas_bancos.empresa_id
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.profile_id = (SELECT auth.uid())
      AND cu.activo = true
      AND cu.rol = 'administrador'::public.user_role
      AND (
        cu.company_id = empresas_bancos.empresa_id
        OR EXISTS (
          SELECT 1 FROM public.company_empresa_map cem
          WHERE cem.company_id = cu.company_id
            AND cem.empresa_id = empresas_bancos.empresa_id
        )
      )
  )
);

CREATE POLICY empresas_bancos_delete_admin
ON public.empresas_bancos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.profile_id = (SELECT auth.uid())
      AND cu.activo = true
      AND cu.rol = 'administrador'::public.user_role
      AND (
        cu.company_id = empresas_bancos.empresa_id
        OR EXISTS (
          SELECT 1 FROM public.company_empresa_map cem
          WHERE cem.company_id = cu.company_id
            AND cem.empresa_id = empresas_bancos.empresa_id
        )
      )
  )
);

-- Keep operation documents private, cap uploads, and restrict accepted content types.
UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png'
    ]::text[]
WHERE id = 'documentos-operacion';

-- Public company logos are raster images only; SVG uploads can contain active content.
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp']::text[]
WHERE id = 'empresa-logos';
