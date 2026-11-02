-- Block direct contact exchange until the operation reaches "Contrato Definitivo".
-- This trigger is the enforcement layer; the UI also masks legacy messages and validates drafts.
CREATE OR REPLACE FUNCTION public.bloquear_datos_contacto_precontrato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mensaje text;
  v_habilitado boolean := false;
  v_operacion_id uuid;
BEGIN
  v_mensaje := NEW.mensaje;

  IF TG_TABLE_NAME = 'mensajes_comerciales' THEN
    v_operacion_id := NEW.operacion_id;
    SELECT EXISTS (
      SELECT 1
      FROM public.operacion_workflow ow
      JOIN public.workflow_etapas et ON et.id = ow.etapa_actual_id
      WHERE ow.operacion_id = v_operacion_id
        AND et.orden >= 4
    ) INTO v_habilitado;
  ELSIF TG_TABLE_NAME = 'mensajes_publicaciones' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.conversaciones_publicaciones cp
      JOIN public.operaciones op
        ON op.publicacion_compra_id = cp.publicacion_id
        OR op.publicacion_venta_id = cp.publicacion_id
      JOIN public.operacion_workflow ow ON ow.operacion_id = op.id
      JOIN public.workflow_etapas et ON et.id = ow.etapa_actual_id
      WHERE cp.id = NEW.conversacion_id
        AND et.orden >= 4
    ) INTO v_habilitado;
  END IF;

  IF NOT coalesce(v_habilitado, false) AND (
    v_mensaje ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
    OR v_mensaje ~* '(https?://|www\.|wa\.me/|t\.me/)'
    OR v_mensaje ~* '@[a-z0-9_.]{2,}'
    OR v_mensaje ~* '(\+?[0-9][0-9(). -]{6,}[0-9])'
    OR v_mensaje ~* '(calle|avenida|av\.|domicilio|dirección|direccion|ruta)[[:space:]]+[^,.;]+'
  ) THEN
    RAISE EXCEPTION 'CONTACTO_BLOQUEADO_HASTA_CONTRATO'
      USING ERRCODE = 'check_violation',
            HINT = 'Los datos de contacto se habilitan al llegar a Contrato Definitivo.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_contacto_precontrato ON public.mensajes_comerciales;
CREATE TRIGGER trg_bloquear_contacto_precontrato
BEFORE INSERT ON public.mensajes_comerciales
FOR EACH ROW EXECUTE FUNCTION public.bloquear_datos_contacto_precontrato();

DROP TRIGGER IF EXISTS trg_bloquear_contacto_precontrato ON public.mensajes_publicaciones;
CREATE TRIGGER trg_bloquear_contacto_precontrato
BEFORE INSERT ON public.mensajes_publicaciones
FOR EACH ROW EXECUTE FUNCTION public.bloquear_datos_contacto_precontrato();
