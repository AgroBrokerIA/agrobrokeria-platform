-- A pending or rejected bank account cannot become the default withdrawal destination.
DO $$
DECLARE
  v_definition text;
  v_updated text;
  v_old text := 'where id=p_medio_id and empresa_id=v_empresa and profile_id=v_uid and tipo=''BANCO''';
  v_new text := 'where id=p_medio_id and empresa_id=v_empresa and profile_id=v_uid and tipo=''BANCO'' and estado=''VALIDADO''';
BEGIN
  SELECT pg_get_functiondef(
    'public.establecer_medio_cobro_predeterminado(uuid)'::regprocedure
  ) INTO v_definition;

  IF length(v_definition) - length(replace(v_definition, v_old, '')) <> length(v_old) THEN
    RAISE EXCEPTION 'DEFAULT_BANK_ACCOUNT_GUARD_PATTERN_NOT_FOUND_OR_AMBIGUOUS';
  END IF;

  v_updated := replace(v_definition, v_old, v_new);
  EXECUTE v_updated;
END;
$$;
