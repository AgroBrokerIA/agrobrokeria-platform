-- Prevent self-service privilege escalation through mutable profile fields.
CREATE OR REPLACE FUNCTION public.prevent_profile_identity_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND NOT public.es_administrador_plataforma() THEN
    IF NEW.tipo_usuario IS DISTINCT FROM OLD.tipo_usuario THEN
      RAISE EXCEPTION 'PROFILE_TYPE_ADMIN_ONLY';
    END IF;

    IF NEW.active_company_id IS DISTINCT FROM OLD.active_company_id
       AND NEW.active_company_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM public.company_users cu
         WHERE cu.profile_id = auth.uid()
           AND cu.activo = true
           AND (
             cu.company_id = NEW.active_company_id
             OR EXISTS (
               SELECT 1
               FROM public.company_empresa_map cem
               WHERE cem.company_id = cu.company_id
                 AND cem.empresa_id = NEW.active_company_id
             )
           )
       ) THEN
      RAISE EXCEPTION 'ACTIVE_COMPANY_MEMBERSHIP_REQUIRED';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_profile_identity_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_identity_escalation
BEFORE UPDATE OF tipo_usuario, active_company_id
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_identity_escalation();
