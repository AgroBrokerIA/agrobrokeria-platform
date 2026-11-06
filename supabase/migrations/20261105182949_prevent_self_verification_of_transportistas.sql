DROP POLICY IF EXISTS transportistas_insert_own ON public.transportistas;
CREATE POLICY transportistas_insert_own
ON public.transportistas
FOR INSERT TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND verificacion_estado = 'PENDIENTE'
  AND verificado_por IS NULL
  AND verificado_at IS NULL
);

DROP POLICY IF EXISTS transportistas_select_own_admin ON public.transportistas;
CREATE POLICY transportistas_select_own_admin
ON public.transportistas
FOR SELECT TO authenticated
USING (profile_id = auth.uid() OR public.es_administrador_plataforma());

DROP POLICY IF EXISTS transportistas_update_admin ON public.transportistas;
CREATE POLICY transportistas_update_admin
ON public.transportistas
FOR UPDATE TO authenticated
USING (public.es_administrador_plataforma())
WITH CHECK (public.es_administrador_plataforma());

DROP POLICY IF EXISTS transportistas_update_own_pending ON public.transportistas;
CREATE POLICY transportistas_update_own_pending
ON public.transportistas
FOR UPDATE TO authenticated
USING (profile_id = auth.uid() AND verificacion_estado <> 'VERIFICADO')
WITH CHECK (profile_id = auth.uid() AND verificacion_estado <> 'VERIFICADO');
