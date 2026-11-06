-- Company financial data and payout accounts require active company administrators.
DROP POLICY IF EXISTS "billetera empresa" ON public.billeteras_comisiones;
CREATE POLICY billetera_company_admin ON public.billeteras_comisiones
FOR SELECT TO authenticated
USING (public.es_administrador_plataforma() OR EXISTS (
  SELECT 1 FROM public.company_users cu
  WHERE cu.company_id=billeteras_comisiones.empresa_id
    AND cu.profile_id=(SELECT auth.uid()) AND cu.activo=true
    AND cu.rol='administrador'::public.user_role
));

DROP POLICY IF EXISTS "movimientos billetera empresa" ON public.billeteras_comisiones_movimientos;
CREATE POLICY movimientos_billetera_company_admin ON public.billeteras_comisiones_movimientos
FOR SELECT TO authenticated
USING (public.es_administrador_plataforma() OR EXISTS (
  SELECT 1 FROM public.company_users cu
  WHERE cu.company_id=billeteras_comisiones_movimientos.empresa_id
    AND cu.profile_id=(SELECT auth.uid()) AND cu.activo=true
    AND cu.rol='administrador'::public.user_role
));

DROP POLICY IF EXISTS "ingresos empresa" ON public.ingresos_comisiones;
CREATE POLICY ingresos_company_admin ON public.ingresos_comisiones
FOR SELECT TO authenticated
USING (public.es_administrador_plataforma() OR EXISTS (
  SELECT 1 FROM public.company_users cu
  WHERE cu.company_id=ingresos_comisiones.empresa_receptora_id
    AND cu.profile_id=(SELECT auth.uid()) AND cu.activo=true
    AND cu.rol='administrador'::public.user_role
));

DROP POLICY IF EXISTS "cuentas retiro empresa" ON public.cuentas_financieras_retiro;
CREATE POLICY cuentas_retiro_company_admin ON public.cuentas_financieras_retiro
FOR SELECT TO authenticated
USING (public.es_administrador_plataforma() OR EXISTS (
  SELECT 1 FROM public.company_users cu
  WHERE cu.profile_id=(SELECT auth.uid()) AND cu.activo=true
    AND cu.rol='administrador'::public.user_role
    AND (cu.company_id=cuentas_financieras_retiro.empresa_id OR EXISTS (
      SELECT 1 FROM public.company_empresa_map cem
      WHERE cem.company_id=cu.company_id AND cem.empresa_id=cuentas_financieras_retiro.empresa_id
    ))
));

DROP POLICY IF EXISTS retiros_select_own_or_admin ON public.retiros_comisiones;
CREATE POLICY retiros_select_own_company_admin_or_platform ON public.retiros_comisiones
FOR SELECT TO authenticated
USING (
  profile_id=(SELECT auth.uid())
  OR public.es_administrador_plataforma()
  OR EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.profile_id=(SELECT auth.uid()) AND cu.activo=true
      AND cu.rol='administrador'::public.user_role
      AND (cu.company_id=retiros_comisiones.empresa_id OR EXISTS (
        SELECT 1 FROM public.company_empresa_map cem
        WHERE cem.company_id=cu.company_id AND cem.empresa_id=retiros_comisiones.empresa_id
      ))
  )
);

DROP POLICY IF EXISTS partes_operacion_insert_participante ON public.partes_operacion;
CREATE POLICY partes_operacion_insert_party_admin ON public.partes_operacion
FOR INSERT TO authenticated
WITH CHECK (public.es_administrador_plataforma() OR EXISTS (
  SELECT 1 FROM public.operacion_participantes op
  JOIN public.company_users cu ON cu.profile_id=(SELECT auth.uid())
    AND cu.activo=true AND cu.rol='administrador'::public.user_role
    AND (cu.company_id=op.empresa_id OR EXISTS (
      SELECT 1 FROM public.company_empresa_map cem
      WHERE cem.company_id=cu.company_id AND cem.empresa_id=op.empresa_id
    ))
  WHERE op.operacion_id=partes_operacion.operacion_id
    AND upper(op.rol)=upper(partes_operacion.rol)
));

DROP POLICY IF EXISTS partes_operacion_update_participante ON public.partes_operacion;
CREATE POLICY partes_operacion_update_party_admin ON public.partes_operacion
FOR UPDATE TO authenticated
USING (public.es_administrador_plataforma() OR EXISTS (
  SELECT 1 FROM public.operacion_participantes op
  JOIN public.company_users cu ON cu.profile_id=(SELECT auth.uid())
    AND cu.activo=true AND cu.rol='administrador'::public.user_role
    AND (cu.company_id=op.empresa_id OR EXISTS (
      SELECT 1 FROM public.company_empresa_map cem
      WHERE cem.company_id=cu.company_id AND cem.empresa_id=op.empresa_id
    ))
  WHERE op.operacion_id=partes_operacion.operacion_id
    AND upper(op.rol)=upper(partes_operacion.rol)
))
WITH CHECK (public.es_administrador_plataforma() OR EXISTS (
  SELECT 1 FROM public.operacion_participantes op
  JOIN public.company_users cu ON cu.profile_id=(SELECT auth.uid())
    AND cu.activo=true AND cu.rol='administrador'::public.user_role
    AND (cu.company_id=op.empresa_id OR EXISTS (
      SELECT 1 FROM public.company_empresa_map cem
      WHERE cem.company_id=cu.company_id AND cem.empresa_id=op.empresa_id
    ))
  WHERE op.operacion_id=partes_operacion.operacion_id
    AND upper(op.rol)=upper(partes_operacion.rol)
));

CREATE OR REPLACE FUNCTION public.usuario_puede_gestionar_logistica_operacion(p_operacion_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public','auth','pg_temp'
AS $function$
  SELECT public.es_administrador_plataforma()
  OR EXISTS (
    SELECT 1 FROM public.operacion_participantes op
    JOIN public.company_empresa_map cem ON cem.empresa_id=op.empresa_id
    JOIN public.company_users cu ON cu.company_id=cem.company_id
      AND cu.profile_id=auth.uid() AND cu.activo=true
      AND cu.rol='administrador'::public.user_role
    JOIN public.profiles p ON p.id=cu.profile_id
    WHERE op.operacion_id=p_operacion_id
      AND lower(coalesce(op.rol,'')) NOT IN ('intermediario','consignatario','corredor','transportista')
      AND lower(coalesce(p.tipo_usuario,'')) NOT LIKE '%intermediario%'
      AND lower(coalesce(p.tipo_usuario,'')) NOT LIKE '%consignatario%'
      AND lower(coalesce(p.tipo_usuario,'')) NOT LIKE '%corredor%'
      AND lower(coalesce(p.tipo_usuario,'')) NOT LIKE '%transportista%'
  )
  OR EXISTS (
    SELECT 1 FROM public.operacion_participantes op
    JOIN public.company_users cu ON cu.company_id=op.empresa_id
      AND cu.profile_id=auth.uid() AND cu.activo=true
      AND cu.rol='administrador'::public.user_role
    JOIN public.profiles p ON p.id=cu.profile_id
    WHERE op.operacion_id=p_operacion_id
      AND lower(coalesce(op.rol,'')) NOT IN ('intermediario','consignatario','corredor','transportista')
      AND lower(coalesce(p.tipo_usuario,'')) NOT LIKE '%intermediario%'
      AND lower(coalesce(p.tipo_usuario,'')) NOT LIKE '%consignatario%'
      AND lower(coalesce(p.tipo_usuario,'')) NOT LIKE '%corredor%'
      AND lower(coalesce(p.tipo_usuario,'')) NOT LIKE '%transportista%'
  );
$function$;

DROP POLICY IF EXISTS operacion_logistica_insert_participante ON public.operacion_logistica;
CREATE POLICY operacion_logistica_insert_authorized_manager ON public.operacion_logistica
FOR INSERT TO authenticated
WITH CHECK (public.usuario_puede_gestionar_logistica_operacion(operacion_id));

DROP POLICY IF EXISTS operacion_logistica_update_participante ON public.operacion_logistica;
CREATE POLICY operacion_logistica_update_authorized_manager ON public.operacion_logistica
FOR UPDATE TO authenticated
USING (public.usuario_puede_gestionar_logistica_operacion(operacion_id))
WITH CHECK (public.usuario_puede_gestionar_logistica_operacion(operacion_id));

DROP POLICY IF EXISTS comisiones_intermediarios_insert_participante ON public.comisiones_intermediarios;
DROP POLICY IF EXISTS comisiones_intermediarios_update_participante ON public.comisiones_intermediarios;
REVOKE INSERT, UPDATE, DELETE ON public.comisiones_intermediarios FROM authenticated, anon, PUBLIC;

REVOKE ALL ON public.cuentas, public.documento_traducciones FROM authenticated, anon, PUBLIC;
