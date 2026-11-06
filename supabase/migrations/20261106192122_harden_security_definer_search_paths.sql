-- Put the temporary schema last for SECURITY DEFINER routines.
-- This prevents temporary objects from shadowing trusted public/auth objects.
DO $migration$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid, array_to_string(p.proconfig, ',') AS config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND (
        array_to_string(p.proconfig, ',') = 'search_path=public'
        OR array_to_string(p.proconfig, ',') = 'search_path=public, auth'
      )
  LOOP
    IF fn.config = 'search_path=public' THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path TO public, pg_temp', fn.oid::regprocedure);
    ELSIF fn.config = 'search_path=public, auth' THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path TO public, auth, pg_temp', fn.oid::regprocedure);
    END IF;
  END LOOP;
END;
$migration$;
