-- Never trust user-supplied signup metadata for platform roles or verification.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tipo_usuario text;
BEGIN
  v_tipo_usuario := upper(trim(coalesce(NEW.raw_user_meta_data->>'tipo_usuario', '')));
  IF v_tipo_usuario IN ('ADMIN','ADMINISTRADOR','SUPERADMIN','SUPER_ADMIN','PLATFORM_ADMIN','ADMIN_PLATAFORMA') THEN
    v_tipo_usuario := NULL;
  END IF;
  INSERT INTO public.profiles (id,email,nombre,empresa,cuit,telefono,provincia,tipo_usuario)
  VALUES (
    NEW.id, NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'nombre', ''),
    NULLIF(NEW.raw_user_meta_data->>'empresa', ''),
    NULLIF(NEW.raw_user_meta_data->>'cuit', ''),
    NULLIF(NEW.raw_user_meta_data->>'telefono', ''),
    NULLIF(NEW.raw_user_meta_data->>'provincia', ''),
    NULLIF(v_tipo_usuario, '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre = COALESCE(EXCLUDED.nombre, public.profiles.nombre),
    empresa = COALESCE(EXCLUDED.empresa, public.profiles.empresa),
    cuit = COALESCE(EXCLUDED.cuit, public.profiles.cuit),
    telefono = COALESCE(EXCLUDED.telefono, public.profiles.telefono),
    provincia = COALESCE(EXCLUDED.provincia, public.profiles.provincia),
    tipo_usuario = COALESCE(EXCLUDED.tipo_usuario, public.profiles.tipo_usuario);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_profile_identity_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = NEW.id
     AND NOT public.es_administrador_plataforma() THEN
    IF TG_OP = 'INSERT' THEN
      IF upper(trim(coalesce(NEW.tipo_usuario, ''))) IN (
        'ADMIN','ADMINISTRADOR','SUPERADMIN','SUPER_ADMIN',
        'PLATFORM_ADMIN','ADMIN_PLATAFORMA'
      ) THEN
        RAISE EXCEPTION 'PROFILE_TYPE_ADMIN_ONLY';
      END IF;
      IF NEW.is_verified IS TRUE
         OR NEW.verification_status NOT IN ('NO_VERIFICADO','PENDIENTE')
         OR NEW.verification_notes IS NOT NULL
         OR NEW.verified_at IS NOT NULL
         OR NEW.verified_by IS NOT NULL THEN
        RAISE EXCEPTION 'PROFILE_VERIFICATION_ADMIN_ONLY';
      END IF;
      IF NEW.active_company_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.company_users cu
           WHERE cu.profile_id = auth.uid()
             AND cu.activo = true
             AND (
               cu.company_id = NEW.active_company_id
               OR EXISTS (
                 SELECT 1 FROM public.company_empresa_map cem
                 WHERE cem.company_id = cu.company_id
                   AND cem.empresa_id = NEW.active_company_id
               )
             )
         ) THEN
        RAISE EXCEPTION 'ACTIVE_COMPANY_MEMBERSHIP_REQUIRED';
      END IF;
    ELSE
      IF NEW.tipo_usuario IS DISTINCT FROM OLD.tipo_usuario THEN
        RAISE EXCEPTION 'PROFILE_TYPE_ADMIN_ONLY';
      END IF;
      IF NEW.active_company_id IS DISTINCT FROM OLD.active_company_id
         AND NEW.active_company_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.company_users cu
           WHERE cu.profile_id = auth.uid()
             AND cu.activo = true
             AND (
               cu.company_id = NEW.active_company_id
               OR EXISTS (
                 SELECT 1 FROM public.company_empresa_map cem
                 WHERE cem.company_id = cu.company_id
                   AND cem.empresa_id = NEW.active_company_id
               )
             )
         ) THEN
        RAISE EXCEPTION 'ACTIVE_COMPANY_MEMBERSHIP_REQUIRED';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_profile_identity_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_identity_escalation
BEFORE INSERT OR UPDATE OF
  tipo_usuario, active_company_id, is_verified,
  verification_status, verification_notes, verified_at, verified_by
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_identity_escalation();
