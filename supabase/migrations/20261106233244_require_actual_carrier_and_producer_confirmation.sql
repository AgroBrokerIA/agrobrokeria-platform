-- Confirmation must come from the actual carrier and seller/producer, never a platform-admin substitute.
DO $$
DECLARE
  v_def text;
  v_old text;
BEGIN
  v_old := 'IF v_v.transportista_profile_id IS DISTINCT FROM v_uid' || E'\n     AND NOT public.es_administrador_plataforma() THEN';
  v_def := pg_get_functiondef('public.confirmar_entrega_transportista(uuid,numeric,text)'::regprocedure);
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'EXPECTED_CARRIER_AUTH_GUARD_NOT_FOUND'; END IF;
  v_def := replace(v_def, v_old, 'IF v_v.transportista_profile_id IS DISTINCT FROM v_uid THEN');
  EXECUTE v_def;

  v_old := 'IF NOT (public.es_administrador_plataforma() OR v_productor) THEN';
  v_def := pg_get_functiondef('public.confirmar_recepcion_productor(uuid,numeric,boolean,text)'::regprocedure);
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'EXPECTED_PRODUCER_AUTH_GUARD_NOT_FOUND'; END IF;
  v_def := replace(v_def, v_old, 'IF NOT v_productor THEN');
  EXECUTE v_def;
END;
$$;