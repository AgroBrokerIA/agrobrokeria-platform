-- Public landing data and current BCR/CAC summary hardening.
-- Keeps operational tables private while exposing only aggregate public counters.

create or replace function public.refresh_market_public_summary_data()
returns void
language sql
security definer
set search_path = public
as $function$
  delete from public.market_public_summary;

  insert into public.market_public_summary(
    commodity, precio_promedio, moneda, publicaciones, actualizado_at, variacion
  )
  with ranked_market as (
    select
      coalesce(c.nombre, 'Sin especificar')::text as commodity,
      q.price,
      coalesce(q.currency,'USD')::text as moneda,
      q.market_date,
      coalesce(q.obtained_at,q.created_at) as actualizado_at,
      q.variation,
      row_number() over (
        partition by q.commodity_id, coalesce(q.currency,'USD')
        order by q.market_date desc, q.created_at desc
      ) as rn
    from public.market_quotes q
    left join public.commodities c on c.id=q.commodity_id
    where q.status in ('VALID','ACTIVE')
      and q.price_type='PIZARRA_CAC'
      and q.price is not null
      and q.market_date >= current_date - 7
  ),
  market as (
    select commodity, round(price::numeric,2) as precio, moneda,
           0::bigint as publicaciones, actualizado_at, variation as variacion
    from ranked_market
    where rn=1
  ),
  pub as (
    select
      coalesce(nullif(trim(pr.nombre),''), nullif(trim(p.tipo),''), 'Sin especificar')::text commodity,
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
  where not exists (
    select 1 from market m where lower(m.commodity)=lower(p.commodity)
  );
$function$;

create or replace view public.landing_public_summary as
select
  (select count(*)::bigint from public.companies where estado='verificada') as verified_companies,
  (select count(*)::bigint from public.publicaciones
    where estado='PUBLICADA'
      and (upper(coalesce(tipo,'')) like '%OFERTA%' or upper(coalesce(tipo,'')) like '%VENTA%')) as active_offers,
  (select count(*)::bigint from public.publicaciones
    where estado='PUBLICADA'
      and (upper(coalesce(tipo,'')) like '%DEMANDA%' or upper(coalesce(tipo,'')) like '%COMPRA%')) as active_demands;

grant select on public.landing_public_summary to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.landing_public_summary from anon, authenticated;

select public.refresh_market_public_summary_data();
