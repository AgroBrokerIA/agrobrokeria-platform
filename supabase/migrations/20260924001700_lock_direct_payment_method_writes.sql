-- Payment methods are created/changed through validated RPCs only.
drop policy if exists "medios_cobro_insert_own" on public.medios_cobro;
drop policy if exists "medios_cobro_update_own" on public.medios_cobro;
revoke insert on public.medios_cobro from authenticated;
revoke insert on public.medios_cobro from anon;
revoke update on public.medios_cobro from authenticated;
revoke update on public.medios_cobro from anon;
