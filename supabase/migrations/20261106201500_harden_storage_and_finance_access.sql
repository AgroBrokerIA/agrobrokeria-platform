-- Security hardening: narrow global carrier listing, prevent self-crediting
-- commission wallets, and restrict document mutations to the uploading user.
-- Applied to production Supabase before committing this migration for reproducibility.

CREATE OR REPLACE FUNCTION public.listar_transportistas_verificados()
RETURNS TABLE(
  profile_id uuid,
  nombre_completo text,
  empresa_transporte text,
  telefono text,
  foto_perfil_path text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  SELECT t.profile_id, t.nombre_completo, t.empresa_transporte,
         t.telefono, t.foto_perfil_path
  FROM public.transportistas AS t
  WHERE t.verificacion_estado = 'VERIFICADO'
    AND t.activo = true
    AND auth.uid() IS NOT NULL
    AND public.es_administrador_plataforma()
  ORDER BY t.nombre_completo;
$function$;

COMMENT ON FUNCTION public.listar_transportistas_verificados() IS
'Listado global de transportistas verificados exclusivo para administradores de plataforma. Los usuarios operativos deben utilizar listar_transportistas_verificados(p_operacion_id) para aplicar autorización por operación.';

CREATE OR REPLACE FUNCTION public.registrar_ingreso_comision(
  p_empresa_id uuid, p_operacion_id uuid, p_operacion_comision_id uuid,
  p_moneda_id integer, p_importe numeric, p_medio_pago text,
  p_proveedor_pago text DEFAULT NULL::text, p_referencia_pago text DEFAULT NULL::text,
  p_referencia_operacion text DEFAULT NULL::text, p_estado text DEFAULT 'PENDIENTE'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_bid uuid;
  v_comm public.operacion_comisiones%rowtype;
  v_estado text := upper(trim(coalesce(p_estado, 'PENDIENTE')));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_id = p_empresa_id AND profile_id = v_uid
      AND activo = true AND lower(rol::text) IN ('administrador','admin')
  ) THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;

  IF p_importe IS NULL OR p_importe <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
  IF v_estado NOT IN ('PENDIENTE','INICIADO','RECIBIDO','CONCILIADO','RECHAZADO','DEVUELTO') THEN
    RAISE EXCEPTION 'INVALID_STATE';
  END IF;

  IF v_estado IN ('RECIBIDO','CONCILIADO') THEN
    IF NOT public.es_administrador_plataforma() THEN
      RAISE EXCEPTION 'PLATFORM_ADMIN_CONFIRMATION_REQUIRED';
    END IF;
    IF nullif(trim(coalesce(p_referencia_pago,'')), '') IS NULL THEN
      RAISE EXCEPTION 'PAYMENT_REFERENCE_REQUIRED_FOR_CREDIT';
    END IF;
  END IF;

  SELECT * INTO v_comm
  FROM public.operacion_comisiones
  WHERE id = p_operacion_comision_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'COMMISSION_NOT_FOUND'; END IF;
  IF v_comm.operacion_id IS DISTINCT FROM p_operacion_id THEN RAISE EXCEPTION 'COMMISSION_OPERATION_MISMATCH'; END IF;
  IF v_comm.empresa_id IS DISTINCT FROM p_empresa_id THEN RAISE EXCEPTION 'COMMISSION_COMPANY_MISMATCH'; END IF;
  IF v_comm.moneda_id IS DISTINCT FROM p_moneda_id THEN RAISE EXCEPTION 'COMMISSION_CURRENCY_MISMATCH'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.operacion_participantes
    WHERE operacion_id = p_operacion_id AND empresa_id = p_empresa_id
  ) THEN RAISE EXCEPTION 'COMPANY_NOT_OPERATION_PARTICIPANT'; END IF;

  INSERT INTO public.ingresos_comisiones(
    empresa_receptora_id, profile_id, operacion_id, operacion_comision_id,
    moneda_id, importe, medio_pago, proveedor_pago, referencia_pago,
    referencia_operacion, estado, fecha_confirmacion
  ) VALUES (
    p_empresa_id, v_uid, p_operacion_id, p_operacion_comision_id,
    p_moneda_id, p_importe, p_medio_pago, p_proveedor_pago, p_referencia_pago,
    p_referencia_operacion, v_estado,
    CASE WHEN v_estado IN ('RECIBIDO','CONCILIADO') THEN now() END
  ) RETURNING id INTO v_id;

  IF v_estado IN ('RECIBIDO','CONCILIADO') THEN
    INSERT INTO public.billeteras_comisiones(empresa_id, moneda_id)
    VALUES (p_empresa_id, p_moneda_id)
    ON CONFLICT (empresa_id, moneda_id) DO NOTHING;

    SELECT id INTO v_bid
    FROM public.billeteras_comisiones
    WHERE empresa_id = p_empresa_id AND moneda_id = p_moneda_id
    FOR UPDATE;

    UPDATE public.billeteras_comisiones
    SET saldo_disponible = saldo_disponible + p_importe, updated_at = now()
    WHERE id = v_bid;

    INSERT INTO public.billeteras_comisiones_movimientos(
      billetera_id, empresa_id, profile_id, operacion_id,
      operacion_comision_id, tipo, importe, moneda_id, signo,
      referencia_externa, referencia_interna, proveedor_pago
    ) VALUES (
      v_bid, p_empresa_id, v_uid, p_operacion_id,
      p_operacion_comision_id, 'PAGO_COMISION_RECIBIDO',
      p_importe, p_moneda_id, 1, p_referencia_pago,
      p_referencia_operacion, p_proveedor_pago
    );
  END IF;

  INSERT INTO public.finanzas_auditoria(
    empresa_id, profile_id, entidad, entidad_id, accion, datos
  ) VALUES (
    p_empresa_id, v_uid, 'INGRESO_COMISION', v_id, 'CREADO',
    jsonb_build_object('importe', p_importe, 'estado', v_estado)
  );

  RETURN v_id;
END
$function$;

COMMENT ON FUNCTION public.registrar_ingreso_comision(uuid,uuid,uuid,integer,numeric,text,text,text,text,text) IS
'Registra ingresos de comisión. Usuarios administradores de empresa solo pueden crear ingresos pendientes/iniciados; la acreditación de saldo en billetera requiere administrador de plataforma y referencia de pago.';

ALTER POLICY documentos_operacion_storage_update
ON storage.objects
USING (
  bucket_id = 'documentos-operacion'
  AND EXISTS (
    SELECT 1 FROM public.operaciones o
    WHERE o.id = (storage.foldername(objects.name))[1]::uuid
      AND public.usuario_participa_operacion(o.id)
  )
  AND owner = (SELECT auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM public.documentos_operacion d
    WHERE d.firmado_externamente = true
      AND right(coalesce(d.url_archivo,''), length(objects.name)) = objects.name
  )
)
WITH CHECK (
  bucket_id = 'documentos-operacion'
  AND EXISTS (
    SELECT 1 FROM public.operaciones o
    WHERE o.id = (storage.foldername(objects.name))[1]::uuid
      AND public.usuario_participa_operacion(o.id)
  )
  AND owner = (SELECT auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM public.documentos_operacion d
    WHERE d.firmado_externamente = true
      AND right(coalesce(d.url_archivo,''), length(objects.name)) = objects.name
  )
);

ALTER POLICY documentos_operacion_storage_delete
ON storage.objects
USING (
  bucket_id = 'documentos-operacion'
  AND EXISTS (
    SELECT 1 FROM public.operaciones o
    WHERE o.id = (storage.foldername(objects.name))[1]::uuid
      AND public.usuario_participa_operacion(o.id)
  )
  AND owner = (SELECT auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM public.documentos_operacion d
    WHERE d.firmado_externamente = true
      AND right(coalesce(d.url_archivo,''), length(objects.name)) = objects.name
  )
);

ALTER POLICY agrobroker_private_update
ON storage.objects
USING (
  bucket_id = 'agrobroker-private'
  AND split_part(name, '/', 1) <> ALL (ARRAY['cpe','transportistas'])
  AND public.usuario_participa_operacion((NULLIF(split_part(name, '/', 2), ''))::uuid)
  AND owner = (SELECT auth.uid())
)
WITH CHECK (
  bucket_id = 'agrobroker-private'
  AND split_part(name, '/', 1) <> ALL (ARRAY['cpe','transportistas'])
  AND public.usuario_participa_operacion((NULLIF(split_part(name, '/', 2), ''))::uuid)
  AND owner = (SELECT auth.uid())
);

ALTER POLICY agrobroker_private_delete
ON storage.objects
USING (
  bucket_id = 'agrobroker-private'
  AND split_part(name, '/', 1) <> ALL (ARRAY['cpe','transportistas'])
  AND public.usuario_participa_operacion((NULLIF(split_part(name, '/', 2), ''))::uuid)
  AND owner = (SELECT auth.uid())
);
