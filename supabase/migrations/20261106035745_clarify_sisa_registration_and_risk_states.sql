-- ARCA distinguishes the SISA registration status from the SISA risk state (Estados 1, 2 and 3).
-- Keep the existing sisa_categoria column for compatibility, but describe its stored value accurately.

CREATE OR REPLACE FUNCTION public.exigir_validacion_sisa(
  p_profile_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF public.es_administrador_plataforma() THEN
    RETURN;
  END IF;

  IF NOT public.perfil_habilitado_sisa(p_profile_id) THEN
    RAISE EXCEPTION 'VERIFICACION_SISA_PENDIENTE: KYC empresarial pendiente. Para publicar, negociar, acceder al chat o generar operaciones, la empresa debe tener CUIT activo consultado en ARCA, actividad agropecuaria confirmada, situación registral SISA ACTIVA, Estado SISA 1, 2 o 3 y legajo documental aprobado por Administración.';
  END IF;
END;
$function$;
