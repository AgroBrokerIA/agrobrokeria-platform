-- Public market summary: expose safe price variation for the landing/pizarra.
alter table public.market_public_summary add column if not exists variacion numeric;

create or replace function public.refresh_market_public_summary_data()
returns void
language sql
security definer
set search_path to 'public'
as $function$
  delete from public.market_public_summary;
  insert into public.market_public_summary(commodity,precio_promedio,moneda,publicaciones,actualizado_at,variacion)
  with market as (
    select coalesce(c.nombre, 'Sin especificar')::text commodity,
           round(avg(q.price)::numeric,2) precio,
           coalesce(q.currency,'USD')::text moneda,
           0::bigint publicaciones,
           max(coalesce(q.obtained_at,q.created_at)) actualizado_at,
           round(avg(q.variation)::numeric,2) variacion
    from public.market_quotes q
    left join public.commodities c on c.id=q.commodity_id
    where q.status='VALID' and q.price_type='PIZARRA_CAC' and q.price is not null
      and q.market_date >= current_date - 7
    group by coalesce(c.nombre, 'Sin especificar'),coalesce(q.currency,'USD')
  ),
  pub as (
    select coalesce(nullif(trim(pr.nombre),''), nullif(trim(p.tipo),''), 'Sin especificar')::text commodity,
           round(avg(p.precio_tn)::numeric,2) precio,
           coalesce(m.codigo,'USD')::text moneda,
           count(*)::bigint publicaciones,
           max(p.actualizada_en) actualizado_at,
           null::numeric variacion
    from public.publicaciones p
    left join public.productos pr on pr.id=p.producto_id
    left join public.monedas m on m.id=p.moneda_id
    where p.estado='PUBLICADA' and p.precio_tn is not null and p.precio_tn>0
    group by coalesce(nullif(trim(pr.nombre),''), nullif(trim(p.tipo),''), 'Sin especificar'),m.codigo
  )
  select commodity,precio,moneda,publicaciones,actualizado_at,variacion from market
  union all
  select p.commodity,p.precio,p.moneda,p.publicaciones,p.actualizado_at,p.variacion
  from pub p
  where not exists (select 1 from market m where lower(m.commodity)=lower(p.commodity));
$function$;

select public.refresh_market_public_summary_data();
