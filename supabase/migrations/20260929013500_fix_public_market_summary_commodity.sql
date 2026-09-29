-- Fix public market summary commodity labels.
-- Product names must take precedence over publication type (VENTA/COMPRA).
create or replace function public.refresh_market_public_summary_data()
returns void
language sql
security definer
set search_path to 'public'
as $function$
  delete from public.market_public_summary;
  insert into public.market_public_summary(commodity,precio_promedio,moneda,publicaciones,actualizado_at)
  select coalesce(nullif(trim(pr.nombre),''), nullif(trim(p.tipo),''), 'Sin especificar')::text,
         round(avg(p.precio_tn)::numeric,2),
         coalesce(m.codigo,'USD')::text,
         count(*)::bigint,
         now()
  from public.publicaciones p
  left join public.productos pr on pr.id=p.producto_id
  left join public.monedas m on m.id=p.moneda_id
  where p.estado='PUBLICADA' and p.precio_tn is not null and p.precio_tn>0
  group by coalesce(nullif(trim(pr.nombre),''), nullif(trim(p.tipo),''), 'Sin especificar'),m.codigo;
$function$;

select public.refresh_market_public_summary_data();
