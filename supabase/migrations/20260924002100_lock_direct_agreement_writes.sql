revoke insert, update, delete on public.acuerdos_comerciales from authenticated;
revoke insert, update, delete on public.acuerdos_comerciales from anon;
drop policy if exists "acuerdos_comerciales_insert" on public.acuerdos_comerciales;
drop policy if exists "acuerdos_comerciales_update" on public.acuerdos_comerciales;
drop policy if exists "acuerdos_comerciales_delete" on public.acuerdos_comerciales;
