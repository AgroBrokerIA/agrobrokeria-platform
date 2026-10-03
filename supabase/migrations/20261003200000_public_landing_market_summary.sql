-- Public landing data and current BCR/CAC summary hardening.
-- Operational tables remain private; the public landing reads only aggregate counters.

drop view if exists public.landing_public_summary;

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

create schema if not exists private;

create table if not exists public.landing_public_counters (
  id integer primary key,
  verified_companies bigint not null default 0,
  active_offers bigint not null default 0,
  active_demands bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint landing_public_counters_singleton check (id=1)
);

alter table public.landing_public_counters enable row level security;
revoke all on table public.landing_public_counters from anon, authenticated;
grant select on table public.landing_public_counters to anon, authenticated;
drop policy if exists landing_public_counters_select on public.landing_public_counters;
create policy landing_public_counters_select
on public.landing_public_counters
for select
to anon, authenticated
using (true);

insert into public.landing_public_counters(id)
values (1)
on conflict (id) do nothing;

create or replace function private.refresh_landing_public_counters()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.landing_public_counters
  set
    verified_companies = (select count(*) from public.companies where estado='verificada'),
    active_offers = (
      select count(*) from public.publicaciones
      where estado='PUBLICADA'
        and (upper(coalesce(tipo,'')) like '%OFERTA%' or upper(coalesce(tipo,'')) like '%VENTA%')
    ),
    active_demands = (
      select count(*) from public.publicaciones
      where estado='PUBLICADA'
        and (upper(coalesce(tipo,'')) like '%DEMANDA%' or upper(coalesce(tipo,'')) like '%COMPRA%')
    ),
    updated_at = now()
  where id=1;
end;
$function$;

create or replace function private.refresh_landing_public_counters_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.refresh_landing_public_counters();
  return null;
end;
$function$;

revoke execute on function private.refresh_landing_public_counters() from public, anon, authenticated;
revoke execute on function private.refresh_landing_public_counters_trigger() from public, anon, authenticated;
grant execute on function private.refresh_landing_public_counters() to service_role;

drop trigger if exists trg_refresh_landing_company on public.companies;
create trigger trg_refresh_landing_company
after insert or update or delete on public.companies
for each statement execute function private.refresh_landing_public_counters_trigger();

drop trigger if exists trg_refresh_landing_publication on public.publicaciones;
create trigger trg_refresh_landing_publication
after insert or update or delete on public.publicaciones
for each statement execute function private.refresh_landing_public_counters_trigger();

select private.refresh_landing_public_counters();

create or replace function public.estado_confidencialidad_operacion(p_operacion_id uuid)
returns table(
  rol text,
  company_id uuid,
  requerido boolean,
  aceptado boolean,
  aceptado_at timestamptz,
  version text,
  hash_sha256 text,
  documento_codigo text,
  documento_titulo text
)
language sql
stable
security definer
set search_path = ''
as $function$
with caller as (
  select auth.uid() as uid
),
cfg as (
  select case
    when exists(
      select 1 from public.operacion_participantes op
      where op.operacion_id=p_operacion_id and upper(op.rol)='INTERMEDIARIO'
    )
    then 'CONFIDENCIALIDAD_INTERMEDIACION'
    else 'CONFIDENCIALIDAD_OPERACION'
  end as codigo
),
roles as (
  select distinct upper(op.rol) as rol, op.empresa_id as company_id
  from public.operacion_participantes op, caller c
  where op.operacion_id=p_operacion_id
    and upper(op.rol) in('COMPRADOR','VENDEDOR','INTERMEDIARIO')
    and (
      upper(op.rol)<>'INTERMEDIARIO'
      or (select codigo from cfg)='CONFIDENCIALIDAD_INTERMEDIACION'
    )
    and c.uid is not null
    and exists(
      select 1 from public.company_users cu
      where cu.company_id=op.empresa_id
        and cu.profile_id=c.uid
        and cu.activo=true
    )
),
doc as (
  select d.*
  from public.documentos_legales d,cfg
  where d.codigo=cfg.codigo and d.estado='VIGENTE'
  order by d.vigencia_desde desc
  limit 1
)
select
  r.rol,r.company_id,true,
  exists(
    select 1 from public.operacion_aceptaciones_confidencialidad a,doc
    where a.operacion_id=p_operacion_id
      and a.company_id=r.company_id
      and upper(a.rol)=r.rol
      and a.documento_legal_id=doc.id
  ),
  (
    select max(a.aceptado_at)
    from public.operacion_aceptaciones_confidencialidad a,doc
    where a.operacion_id=p_operacion_id
      and a.company_id=r.company_id
      and upper(a.rol)=r.rol
      and a.documento_legal_id=doc.id
  ),
  doc.version,doc.hash_sha256,doc.codigo,doc.titulo
from roles r,doc
order by case r.rol when 'VENDEDOR' then 1 when 'COMPRADOR' then 2 when 'INTERMEDIARIO' then 3 else 4 end,r.company_id;
$function$;

revoke execute on function public.registrar_firma_electronica(text,text,boolean,text,inet,text) from authenticated, anon;
grant execute on function public.registrar_firma_electronica(text,text,boolean,text,inet,text) to service_role;

select public.refresh_market_public_summary_data();
