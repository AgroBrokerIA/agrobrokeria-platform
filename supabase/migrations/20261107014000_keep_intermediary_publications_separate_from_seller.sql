DO $migration$
DECLARE
  v_def text := pg_get_functiondef('public.guardar_publicacion(uuid,jsonb)'::regprocedure);
BEGIN
  v_def := replace(v_def,
    'values(v_empresa,v_uid,v_intermediario_empresa',
    'values(case when v_intermediario_empresa is not null then null else v_empresa end,v_uid,v_intermediario_empresa');
  v_def := replace(v_def,
    'update public.publicaciones set intermediario_empresa_id=',
    'update public.publicaciones set empresa_id=case when v_intermediario_empresa is not null then null else v_empresa end,intermediario_empresa_id=');
  IF position('case when v_intermediario_empresa is not null then null else v_empresa end' in v_def)=0 THEN
    RAISE EXCEPTION 'No se pudo separar el publicador intermediario del titular representado.';
  END IF;
  EXECUTE v_def;
END
$migration$;