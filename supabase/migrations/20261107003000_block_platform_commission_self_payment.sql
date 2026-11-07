DO $$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.registrar_pago_comision(uuid,numeric,text,text)'::regprocedure);
  v_old := $old$
  if not found then
    raise exception 'Comisión inexistente';
  end if;
$old$;
  v_new := $new$
  if not found then
    raise exception 'Comisión inexistente';
  end if;

  if upper(coalesce(v_comision.tipo_comision,''))='PLATAFORMA'
     or upper(coalesce(v_comision.origen_comision,''))='AGROBROKER_IA' then
    raise exception 'PLATFORM_COMMISSION_REQUIRES_OPERATIONS_BANK_RECONCILIATION';
  end if;
$new$;
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'PLATFORM_COMMISSION_GUARD_ANCHOR_NOT_FOUND'; END IF;
  EXECUTE replace(v_def,v_old,v_new);
END $$;