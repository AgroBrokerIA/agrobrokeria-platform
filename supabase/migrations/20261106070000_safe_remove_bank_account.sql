-- Logical removal of a bank collection method. Keep payment and withdrawal references intact.
-- Add an explicit terminal state for removed payment methods without reusing INACTIVO.
ALTER TABLE public.medios_cobro
  DROP CONSTRAINT IF EXISTS medios_cobro_estado_check;
ALTER TABLE public.medios_cobro
  ADD CONSTRAINT medios_cobro_estado_check
  CHECK (estado = ANY (ARRAY['PENDIENTE','VALIDADO','RECHAZADO','INACTIVO','ELIMINADA']::text[]));

CREATE OR REPLACE FUNCTION public.eliminar_medio_cobro(p_medio_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_active_company uuid;
  v_account public.medios_cobro%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF p_medio_id IS NULL THEN
    RAISE EXCEPTION 'ACCOUNT_REQUIRED';
  END IF;

  SELECT active_company_id
    INTO v_active_company
    FROM public.profiles
   WHERE id = v_uid;

  IF v_active_company IS NULL THEN
    RAISE EXCEPTION 'ACTIVE_COMPANY_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.company_users
     WHERE company_id = v_active_company
       AND profile_id = v_uid
       AND activo = true
  ) THEN
    RAISE EXCEPTION 'ACTIVE_MEMBERSHIP_REQUIRED';
  END IF;

  SELECT *
    INTO v_account
    FROM public.medios_cobro
   WHERE id = p_medio_id
     AND empresa_id = v_active_company
     AND profile_id = v_uid
     AND tipo = 'BANCO'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BANK_ACCOUNT_NOT_FOUND_OR_NOT_OWNED';
  END IF;

  IF v_account.estado = 'ELIMINADA' THEN
    RETURN;
  END IF;

  UPDATE public.medios_cobro
     SET estado = 'ELIMINADA',
         es_predeterminado = false,
         actualizado_at = now()
   WHERE id = p_medio_id
     AND empresa_id = v_active_company
     AND profile_id = v_uid;

  INSERT INTO public.auditoria (
    cuenta_id, tabla, registro_id, accion, descripcion, dispositivo
  )
  VALUES (
    v_uid,
    'medios_cobro',
    p_medio_id,
    'CUENTA_BANCARIA_ELIMINADA',
    'Cuenta bancaria retirada de los medios disponibles. Se conservan los pagos y retiros históricos asociados.',
    'web'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.eliminar_medio_cobro(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eliminar_medio_cobro(uuid)
  TO authenticated;
