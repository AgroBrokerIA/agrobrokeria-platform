-- Close legacy COMEX RPC overloads that do not enforce the document issuer role.
-- The current UI calls only the six-argument signatures with explicit issuer/recipient.
revoke execute on function public.crear_loi_comercial(uuid, text) from public, anon, authenticated;
revoke execute on function public.crear_sco_comercial(uuid, text) from public, anon, authenticated;
revoke execute on function public.crear_fco_comercial(uuid, text) from public, anon, authenticated;

grant execute on function public.crear_loi_comercial(uuid, text, text, text, uuid, uuid) to authenticated;
grant execute on function public.crear_sco_comercial(uuid, text, text, text, uuid, uuid) to authenticated;
grant execute on function public.crear_fco_comercial(uuid, text, text, text, uuid, uuid) to authenticated;

-- Rate-limit storage is backend-only; no direct Data API access is required.
revoke all on table public.padron_lookup_rate_limits from public, anon, authenticated;
grant all on table public.padron_lookup_rate_limits to service_role;
