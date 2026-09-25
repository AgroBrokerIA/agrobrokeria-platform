-- AgroBrokerIA: central market data model + fiscal idempotency/hardening
create extension if not exists pgcrypto;

create table if not exists public.market_quotes (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_reference text,
  market_date date not null,
  published_at timestamptz,
  obtained_at timestamptz not null default now(),
  commodity_id uuid references public.commodities(id),
  product_id integer references public.productos(id),
  variety text,
  position text,
  market text,
  port text,
  price_type text not null,
  price numeric(20,6),
  currency text,
  unit text,
  status text not null default 'VALID',
  freshness text not null default 'UPDATED',
  previous_value numeric(20,6),
  variation numeric(20,6),
  payload jsonb not null default '{}'::jsonb,
  fingerprint text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_market_quotes_fingerprint on public.market_quotes(fingerprint);
create index if not exists ix_market_quotes_lookup on public.market_quotes(source, market_date desc, commodity_id, price_type);
create index if not exists ix_market_quotes_freshness on public.market_quotes(obtained_at desc, freshness);

create table if not exists public.market_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  records_seen integer not null default 0,
  records_saved integer not null default 0,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists ix_market_sync_runs_source_time on public.market_sync_runs(source, started_at desc);

alter table public.market_quotes enable row level security;
alter table public.market_sync_runs enable row level security;

drop policy if exists market_quotes_select_authenticated on public.market_quotes;
create policy market_quotes_select_authenticated on public.market_quotes
for select to authenticated using (true);

drop policy if exists market_sync_runs_select_authenticated on public.market_sync_runs;
create policy market_sync_runs_select_authenticated on public.market_sync_runs
for select to authenticated using (true);

revoke insert, update, delete on public.market_quotes from anon, authenticated;
revoke insert, update, delete on public.market_sync_runs from anon, authenticated;

alter table public.facturas add column if not exists doc_tipo_receptor integer;
alter table public.facturas add column if not exists iva_alicuota numeric(8,4);
alter table public.facturas add column if not exists arca_numero_solicitado bigint;
alter table public.facturas add column if not exists arca_attempt_key text;

create index if not exists ix_facturas_operacion_estado on public.facturas(operacion_id, estado);
create index if not exists ix_facturas_cae on public.facturas(cae) where cae is not null;
create unique index if not exists ux_facturas_arca_attempt_key on public.facturas(arca_attempt_key) where arca_attempt_key is not null;

create or replace function public.crear_solicitud_factura(
 p_operacion_id uuid,
 p_empresa_receptor_id uuid,
 p_tipo_comprobante_codigo integer,
 p_punto_venta integer,
 p_importe_neto numeric,
 p_importe_iva numeric,
 p_fecha_emision date default current_date,
 p_fecha_vencimiento date default null,
 p_condicion_iva_receptor integer default null,
 p_doc_tipo_receptor integer default 80,
 p_iva_alicuota numeric default 21
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare
 v_uid uuid:=auth.uid(); v_empresa uuid; v_contrato uuid; v_producto integer; v_cantidad numeric; v_moneda integer; v_total numeric; v_id uuid;
 v_issuer public.empresas%rowtype; v_receiver public.empresas%rowtype; v_key text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_tipo_comprobante_codigo not in (1,6,11,51) then raise exception 'INVALID_COMPROBANTE_TYPE'; end if;
 if p_punto_venta is null or p_punto_venta < 1 then raise exception 'PUNTO_VENTA_REQUIRED'; end if;
 if p_importe_neto is null or p_importe_neto <= 0 then raise exception 'NET_AMOUNT_REQUIRED'; end if;
 if coalesce(p_importe_iva,0) < 0 then raise exception 'IVA_INVALID'; end if;
 if coalesce(p_importe_iva,0) > 0 and (p_iva_alicuota is null or p_iva_alicuota <= 0) then raise exception 'IVA_RATE_REQUIRED'; end if;
 if p_doc_tipo_receptor is null or p_doc_tipo_receptor <= 0 then raise exception 'DOC_TYPE_REQUIRED'; end if;
 select active_company_id into v_empresa from public.profiles where id=v_uid;
 if v_empresa is null or not public.usuario_es_miembro_empresa(v_empresa) then raise exception 'ACTIVE_COMPANY_REQUIRED'; end if;
 if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'FORBIDDEN'; end if;
 select id into v_contrato from public.contratos where operacion_id=p_operacion_id and estado='CONFIRMADO' limit 1;
 if v_contrato is null then raise exception 'CONFIRMED_CONTRACT_REQUIRED'; end if;
 if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=v_empresa) then raise exception 'ISSUER_NOT_PARTICIPANT'; end if;
 if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_receptor_id) then raise exception 'RECEIVER_NOT_PARTICIPANT'; end if;
 if p_empresa_receptor_id=v_empresa then raise exception 'RECEIVER_MUST_DIFFER_FROM_ISSUER'; end if;
 select cantidad_tn,moneda_id into v_cantidad,v_moneda from public.operaciones where id=p_operacion_id;
 select * into v_issuer from public.empresas where id=v_empresa;
 select * into v_receiver from public.empresas where id=p_empresa_receptor_id;
 select producto_id into v_producto from public.publicaciones where id in((select publicacion_venta_id from public.operaciones where id=p_operacion_id) union all(select publicacion_compra_id from public.operaciones where id=p_operacion_id)) and producto_id is not null limit 1;
 v_total:=round(p_importe_neto+coalesce(p_importe_iva,0),2);
 v_key:=encode(digest(concat_ws('|',p_operacion_id::text,v_empresa::text,p_empresa_receptor_id::text,p_tipo_comprobante_codigo::text,p_punto_venta::text,p_importe_neto::text,p_importe_iva::text,p_fecha_emision::text), 'sha256'),'hex');
 select id into v_id from public.facturas where arca_attempt_key=v_key and estado not in ('ANULADA','RECHAZADA') limit 1;
 if v_id is not null then return v_id; end if;
 select id into v_id from public.facturas where operacion_id=p_operacion_id and empresa_id=v_empresa and estado in('PENDIENTE_ARCA','PENDIENTE','PENDIENTE_RECONCILIACION') limit 1;
 if v_id is not null then return v_id; end if;
 insert into public.facturas(operacion_id,empresa_id,contrato_id,empresa_receptor_id,producto_id,cantidad_tn,tipo_factura,tipo_comprobante_codigo,punto_venta,importe,importe_neto,importe_iva,importe_total,moneda_id,fecha_emision,fecha_vencimiento,estado,cuit_emisor,cuit_receptor,razon_social_emisor,razon_social_receptor,condicion_iva_receptor,doc_tipo_receptor,iva_alicuota,arca_attempt_key,usuario_responsable,creada_en,actualizada_en)
 values(p_operacion_id,v_empresa,v_contrato,p_empresa_receptor_id,v_producto,v_cantidad,case p_tipo_comprobante_codigo when 1 then 'A' when 6 then 'B' when 11 then 'C' when 51 then 'M' end,p_tipo_comprobante_codigo,p_punto_venta,p_importe_neto,p_importe_neto,p_importe_iva,v_total,v_moneda,p_fecha_emision,p_fecha_vencimiento,'PENDIENTE_ARCA',v_issuer.cuit,v_receiver.cuit,v_issuer.razon_social,v_receiver.razon_social,p_condicion_iva_receptor,p_doc_tipo_receptor,p_iva_alicuota,v_key,v_uid,now(),now())
 returning id into v_id;
 insert into public.factura_eventos(factura_id,actor_profile_id,evento,metadata) values(v_id,v_uid,'SOLICITADA_ARCA',jsonb_build_object('tipo_comprobante',p_tipo_comprobante_codigo,'punto_venta',p_punto_venta,'attempt_key',v_key));
 return v_id;
end $$;

revoke execute on function public.crear_solicitud_factura(uuid,uuid,integer,integer,numeric,numeric,date,date,integer) from anon,authenticated;
grant execute on function public.crear_solicitud_factura(uuid,uuid,integer,integer,numeric,numeric,date,date,integer,integer,numeric) to authenticated;

comment on table public.market_quotes is 'Immutable normalized market observations. Never overwrite historical observations.';
comment on table public.market_sync_runs is 'Auditable execution history for MarketDataService.';
