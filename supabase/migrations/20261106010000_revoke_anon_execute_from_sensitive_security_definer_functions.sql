-- Restrict SECURITY DEFINER functions that were unintentionally executable through the anon role.
-- Trigger functions are not RPC entry points; PostgreSQL checks their EXECUTE privilege when
-- the trigger is created, so revoking direct execution does not disable the installed triggers.

REVOKE EXECUTE ON FUNCTION public.bloquear_datos_contacto_precontrato()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.exigir_kyc_publicaciones()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.notificar_nuevo_mensaje_publicacion()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.sincronizar_firmantes_contrato()
  FROM PUBLIC, anon, authenticated, service_role;

-- These functions are required by authenticated application users and/or RLS policies.
-- Keep backend service_role access for trusted server-side workflows.
REVOKE EXECUTE ON FUNCTION public.inicializar_control_comercial_contrato(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inicializar_control_comercial_contrato(uuid)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.listar_conversaciones_publicaciones()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_conversaciones_publicaciones()
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.marcar_mensajes_publicacion_leidos(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_mensajes_publicacion_leidos(uuid)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.usuario_puede_gestionar_logistica_operacion(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuario_puede_gestionar_logistica_operacion(uuid)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.usuario_puede_ver_carta_porte(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuario_puede_ver_carta_porte(uuid)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.usuario_puede_ver_foto_transportista(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuario_puede_ver_foto_transportista(uuid)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.usuario_puede_ver_logistica_operacion(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuario_puede_ver_logistica_operacion(uuid)
  TO authenticated, service_role;
