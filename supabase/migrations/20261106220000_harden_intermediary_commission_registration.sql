-- Prevent intermediary-company users from marking their own commission as paid.
-- Fix the INSERT value ordering so state and balance columns receive their
-- intended types and values. Existing commission records are not rewritten.

CREATE OR REPLACE FUNCTION public.sincronizar_comision_intermediario(
  p_operacion_id uuid,
  p_empresa_intermediaria_id uuid,
  p_tipo_comision text,
  p_valor_comision numeric,
  p_quien_abona text,
  p_estado text DEFAULT 'PENDIENTE'::text,
  p_acuerdo_previo boolean DEFAULT false,
  p_detalle text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_exist uuid;
  v_qty numeric;
  v_total numeric;
  v_sub numeric;
  v_tipo text := upper(trim(coalesce(p_tipo_comision, '')));
  v_estado text := upper(trim(coalesce(p_estado, '')));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.usuario_participa_operacion(p_operacion_id) THEN RAISE EXCEPTION 'OPERATION_FORBIDDEN'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.operacion_participantes
     WHERE operacion_id = p_operacion_id
       AND empresa_id = p_empresa_intermediaria_id
       AND rol = 'INTERMEDIARIO'
  ) THEN RAISE EXCEPTION 'INTERMEDIARY_NOT_PARTICIPANT'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_users
     WHERE company_id = p_empresa_intermediaria_id
       AND profile_id = v_uid AND activo = true
       AND lower(rol::text) IN ('administrador', 'admin')
  ) THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;

  IF v_tipo NOT IN ('USD_TN', 'PORCENTAJE', 'FIJA') THEN RAISE EXCEPTION 'INVALID_COMMISSION_TYPE'; END IF;
  IF p_valor_comision IS NULL OR p_valor_comision <= 0 THEN RAISE EXCEPTION 'INVALID_COMMISSION_VALUE'; END IF;

  -- Settlement is a separate finance action; intermediary users can only
  -- create a pending commission, never self-declare payment.
  IF v_estado <> 'PENDIENTE' THEN RAISE EXCEPTION 'INTERMEDIARY_COMMISSION_MUST_START_PENDING'; END IF;

  SELECT cantidad_tn, total INTO v_qty, v_total
    FROM public.operaciones WHERE id = p_operacion_id FOR UPDATE;
  IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'INVALID_OPERATION_QUANTITY'; END IF;

  v_sub := CASE
    WHEN v_tipo = 'USD_TN' THEN p_valor_comision * v_qty
    WHEN v_tipo = 'PORCENTAJE' THEN (p_valor_comision / 100.0) * coalesce(v_total, 0)
    ELSE p_valor_comision
  END;
  IF v_sub IS NULL OR v_sub <= 0 THEN RAISE EXCEPTION 'INVALID_COMMISSION_TOTAL'; END IF;

  SELECT oc.id INTO v_exist
    FROM public.operacion_comisiones oc
   WHERE oc.operacion_id = p_operacion_id
     AND oc.empresa_id = p_empresa_intermediaria_id
     AND oc.tipo_comision = 'INTERMEDIARIO'
     AND oc.tipo_ganancia = CASE WHEN v_tipo = 'USD_TN' THEN 'USD_TN' ELSE 'FIJA' END
     AND oc.valor_unitario = p_valor_comision
   LIMIT 1 FOR UPDATE;

  IF v_exist IS NULL THEN
    INSERT INTO public.operacion_comisiones(
      operacion_id, empresa_id, tipo_comision, tipo_ganancia, concepto,
      modalidad_calculo, cantidad_tn, valor_unitario, porcentaje, subtotal,
      moneda_id, iva_porcentaje, iva_importe, total, estado, factura_estado,
      saldo_pendiente, saldo_pagado, observaciones, actualizado_at
    )
    VALUES(
      p_operacion_id, p_empresa_intermediaria_id, 'INTERMEDIARIO',
      CASE WHEN v_tipo = 'USD_TN' THEN 'USD_TN' ELSE 'FIJA' END,
      'Comisión intermediario — ' || v_tipo, v_tipo,
      CASE WHEN v_tipo = 'USD_TN' THEN v_qty ELSE NULL END,
      p_valor_comision,
      CASE WHEN v_tipo = 'PORCENTAJE' THEN p_valor_comision ELSE NULL END,
      v_sub, 2, 0, 0, v_sub, 'PENDIENTE', 'NO_CORRESPONDE',
      v_sub, 0,
      concat_ws(' | ',
        nullif(trim(coalesce(p_detalle, '')), ''),
        CASE WHEN nullif(trim(coalesce(p_quien_abona, '')), '') IS NOT NULL
             THEN 'Abona: ' || trim(p_quien_abona) END,
        CASE WHEN p_acuerdo_previo THEN 'Acuerdo previo declarado' END
      ),
      now()
    )
    RETURNING id INTO v_exist;
  END IF;

  RETURN jsonb_build_object('id', v_exist, 'subtotal', v_sub, 'estado', 'PENDIENTE');
END;
$function$;
