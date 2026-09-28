-- Defense-in-depth: legacy commission ledger is read-only to authenticated clients.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.comisiones FROM authenticated, anon;
