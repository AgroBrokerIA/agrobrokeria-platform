DO $migration$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='calcular_smart_matches'
    AND pg_get_function_identity_arguments(p.oid)='p_publicacion_id uuid';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'calcular_smart_matches not found';
  END IF;

  v_def := replace(
    v_def,
    $anchor$if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_publicacion from public.publicaciones where id=p_publicacion_id;
 if not found then raise exception 'PUBLICATION_NOT_FOUND'; end if;$anchor$,
    $guard$if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_publicacion from public.publicaciones where id=p_publicacion_id;
 if not found then raise exception 'PUBLICATION_NOT_FOUND'; end if;
 if not exists (
   select 1
   from public.profiles pr
   join public.company_empresa_map cem on cem.company_id=pr.active_company_id
   where pr.id=auth.uid()
     and cem.empresa_id=v_publicacion.empresa_id
     and cem.verified=true
 ) then
   raise exception 'FORBIDDEN';
 end if;$guard$
  );

  IF v_def = pg_get_functiondef('public.calcular_smart_matches(uuid)'::regprocedure) THEN
    RAISE EXCEPTION 'security guard replacement did not apply';
  END IF;

  EXECUTE v_def;
END
$migration$;