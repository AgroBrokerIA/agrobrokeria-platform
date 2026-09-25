-- Critical workflow data must only be mutated through authorized RPCs.
drop policy if exists "contratos_insert" on public.contratos;
drop policy if exists "contratos_update" on public.contratos;
drop policy if exists "contratos_delete" on public.contratos;
revoke insert, update, delete on public.contratos from authenticated;
revoke insert, update, delete on public.contratos from anon;

-- Operation documents currently have no public write workflow; keep them read-only
-- until a dedicated authorized document/version RPC is exposed.
revoke insert, update, delete on public.documentos_operacion from authenticated;
revoke insert, update, delete on public.documentos_operacion from anon;
