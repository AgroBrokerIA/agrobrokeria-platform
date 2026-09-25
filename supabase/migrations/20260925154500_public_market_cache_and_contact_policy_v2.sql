create policy contactos_comerciales_denegar_select on public.contactos_comerciales for select to authenticated using (false);
create table if not exists public.market_public_summary(
  commodity text not null,
  precio_promedio numeric not null,
  moneda text not null,
  publicaciones bigint not null,
  actualizado_at timestamptz not null default now(),
  primary key (commodity,moneda)
);
alter table public.market_public_summary enable row level security;
drop policy if exists market_public_summary_select_anon on public.market_public_summary;
create policy market_public_summary_select_anon on public.market_public_summary for select to anon, authenticated using (true);
revoke insert,update,delete on public.market_public_summary from anon,authenticated;

create or replace function public.refresh_market_public_summary_data()
returns void language sql security definer set search_path=public
as $$
  delete from public.market_public_summary;
  insert into public.market_public_summary(commodity,precio_promedio,moneda,publicaciones,actualizado_at)
  select coalesce(nullif(trim(p.tipo),''),pr.nombre)::text,
         round(avg(p.precio_tn)::numeric,2),
         coalesce(m.codigo,'USD')::text,
         count(*)::bigint, now()
  from public.publicaciones p
  left join public.productos pr on pr.id=p.producto_id
  left join public.monedas m on m.id=p.moneda_id
  where p.estado='PUBLICADA' and p.precio_tn is not null and p.precio_tn>0
  group by coalesce(nullif(trim(p.tipo),''),pr.nombre),m.codigo;
$$;

create or replace function public.refresh_market_public_summary_trigger()
returns trigger language plpgsql security definer set search_path=public
as $$ begin perform public.refresh_market_public_summary_data(); return null; end; $$;

revoke all on function public.refresh_market_public_summary_data() from public,anon,authenticated;
revoke all on function public.refresh_market_public_summary_trigger() from public,anon,authenticated;
drop trigger if exists trg_refresh_market_public_summary on public.publicaciones;
create trigger trg_refresh_market_public_summary
after insert or update or delete on public.publicaciones
for each statement execute function public.refresh_market_public_summary_trigger();

select public.refresh_market_public_summary_data();
drop function if exists public.resumen_publico_mercado();