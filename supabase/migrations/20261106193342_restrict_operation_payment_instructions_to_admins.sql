-- Commercial control contains payment instructions and bank coordinates.
-- Only operation-side administrators or platform administrators may read it.
DROP POLICY IF EXISTS operacion_control_comercial_select ON public.operacion_control_comercial;
CREATE POLICY operacion_control_comercial_select_authorized_admin
ON public.operacion_control_comercial
FOR SELECT TO authenticated
USING (public.usuario_puede_gestionar_logistica_operacion(operacion_id));
