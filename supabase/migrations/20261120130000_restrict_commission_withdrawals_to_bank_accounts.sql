-- Enforce bank-transfer-only withdrawals at the database boundary.
-- Preserve balances, requests and historical payment records.
DO $$
DECLARE
  v_definition text;
  v_updated text;
  v_replacements integer;
BEGIN
  SELECT pg_get_functiondef(
    'public.solicitar_retiro_comision(uuid,uuid,uuid,integer,numeric,uuid)'::regprocedure
  ) INTO v_definition;

  v_replacements := (
    length(v_definition) - length(replace(v_definition, 'and estado = ''VALIDADO''', ''))
  ) / length('and estado = ''VALIDADO''');

  IF v_replacements <> 2 THEN
    RAISE EXCEPTION 'EXPECTED_TWO_VERIFIED_METHOD_FILTERS_FOUND_%', v_replacements;
  END IF;

  v_updated := replace(
    v_definition,
    'and estado = ''VALIDADO''',
    'and tipo = ''BANCO''
      and estado = ''VALIDADO'''
  );

  EXECUTE v_updated;
END;
$$;
