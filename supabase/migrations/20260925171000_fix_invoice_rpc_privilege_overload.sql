drop function if exists public.crear_solicitud_factura(uuid,uuid,integer,integer,numeric,numeric,date,date,integer);
revoke execute on function public.crear_solicitud_factura(uuid,uuid,integer,integer,numeric,numeric,date,date,integer,integer,numeric) from public,anon;
grant execute on function public.crear_solicitud_factura(uuid,uuid,integer,integer,numeric,numeric,date,date,integer,integer,numeric) to authenticated;
