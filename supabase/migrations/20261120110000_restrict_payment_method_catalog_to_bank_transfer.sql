-- Nexo/AgroBrokerIA payment policy: only bank transfer is available for new preferences.
-- Existing commercial agreements and accounting records are intentionally untouched.
DO $$
DECLARE
  v_references bigint;
BEGIN
  SELECT count(*)
    INTO v_references
    FROM public.empresas_preferencias
   WHERE forma_pago_id <> 1;

  IF v_references > 0 THEN
    RAISE EXCEPTION
      'PAYMENT_METHOD_CATALOG_MIGRATION_BLOCKED: % existing company preferences still reference non-bank payment methods',
      v_references;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.formas_pago
     WHERE id = 1 AND lower(trim(nombre)) = lower('Transferencia Bancaria')
  ) THEN
    RAISE EXCEPTION 'BANK_TRANSFER_PAYMENT_METHOD_MISSING';
  END IF;

  DELETE FROM public.formas_pago
   WHERE id <> 1;
END;
$$;
