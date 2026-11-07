CREATE OR REPLACE FUNCTION public.registrar_onboarding_alta_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  m jsonb := coalesce(NEW.raw_user_meta_data,'{}'::jsonb);
  v_type text := upper(coalesce(m->>'account_type','PERSONA'));
  v_role text := coalesce(nullif(m->>'tipo_usuario',''),'comprador');
  v_birth date;
  v_pep boolean;
  v_obliged boolean;
  v_funds boolean;
  v_us_tax boolean;
BEGIN
  IF coalesce(m->>'birth_date','') ~ '^\d{4}-\d{2}-\d{2}$' THEN
    BEGIN v_birth := (m->>'birth_date')::date; EXCEPTION WHEN others THEN v_birth := NULL; END;
  END IF;
  v_pep := CASE lower(coalesce(m->>'politically_exposed','')) WHEN 'true' THEN true WHEN 'false' THEN false ELSE NULL END;
  v_obliged := CASE lower(coalesce(m->>'obliged_subject','')) WHEN 'true' THEN true WHEN 'false' THEN false ELSE NULL END;
  v_funds := CASE lower(coalesce(m->>'lawful_funds','')) WHEN 'true' THEN true WHEN 'false' THEN false ELSE NULL END;
  v_us_tax := CASE lower(coalesce(m->>'us_tax_resident','')) WHEN 'true' THEN true WHEN 'false' THEN false ELSE NULL END;

  INSERT INTO public.account_onboarding(
    user_id,account_type,role,document_type,document_number,cuil_cuit,
    first_name,middle_name,last_name,birth_date,gender,nationality,country_of_birth,marital_status,
    legal_name,trade_name,ruca_number,representative_cuil,representative_position,
    email,phone,phone_alt,country,province,city,street,street_number,floor,apartment,postal_code,
    economic_activity,income_tax_status,vat_status,employment_status,
    politically_exposed,obliged_subject,lawful_funds,us_tax_resident,
    terms_accepted_at,registration_completed,review_status,is_verified
  ) VALUES (
    NEW.id,
    CASE WHEN v_type='EMPRESA' THEN 'EMPRESA' ELSE 'PERSONA' END,
    v_role,
    nullif(m->>'document_type',''),
    nullif(regexp_replace(coalesce(m->>'document_number',''),'[^0-9]','','g'),''),
    nullif(regexp_replace(coalesce(m->>'cuit',''),'[^0-9]','','g'),''),
    nullif(m->>'first_name',''),nullif(m->>'middle_name',''),nullif(m->>'last_name',''),
    v_birth,nullif(m->>'gender',''),nullif(m->>'nationality',''),nullif(m->>'country_of_birth',''),nullif(m->>'marital_status',''),
    nullif(m->>'empresa',''),nullif(m->>'trade_name',''),nullif(m->>'ruca_number',''),
    nullif(regexp_replace(coalesce(m->>'representative_cuil',''),'[^0-9]','','g'),''),
    nullif(m->>'representative_position',''),
    coalesce(nullif(m->>'email',''),NEW.email),
    nullif(m->>'phone',''),nullif(m->>'phone_alt',''),
    nullif(m->>'country',''),nullif(m->>'province',''),nullif(m->>'city',''),nullif(m->>'street',''),
    nullif(m->>'street_number',''),nullif(m->>'floor',''),nullif(m->>'apartment',''),nullif(m->>'postal_code',''),
    nullif(m->>'economic_activity',''),nullif(m->>'income_tax_status',''),nullif(m->>'vat_status',''),nullif(m->>'employment_status',''),
    v_pep,v_obliged,v_funds,v_us_tax,
    now(),true,
    CASE WHEN v_type='EMPRESA' THEN 'PENDIENTE' ELSE 'NO_VERIFICADO' END,
    false
  )
  ON CONFLICT(user_id) DO NOTHING;

  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION public.registrar_onboarding_alta_usuario() FROM PUBLIC, anon, authenticated;