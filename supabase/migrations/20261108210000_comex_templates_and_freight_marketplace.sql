-- COMEX headers, document fingerprints, and logistics freight marketplace.
-- Existing operational tables are extended rather than creating legacy integer-ID tables.

create unique index if not exists empresa_membretes_empresa_id_uidx on public.empresa_membretes(empresa_id);

alter table public.operaciones add column if not exists incoterm_id integer references public.incoterms(id);
alter table public.loi add column if not exists idioma_documento text not null default 'en', add column if not exists hash_sha256 text;
alter table public.sco add column if not exists idioma_documento text not null default 'en', add column if not exists hash_sha256 text;
alter table public.fco add column if not exists idioma_documento text not null default 'en', add column if not exists hash_sha256 text;

create table if not exists public.config_comisiones_agrobrokeria (
 id smallint primary key default 1 check (id=1),
 comision_granos_pct numeric(6,3) not null default 1.000 check(comision_granos_pct between 0 and 100),
 comision_logistica_pct numeric(6,3) not null default 1.000 check(comision_logistica_pct between 0 and 100),
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
insert into public.config_comisiones_agrobrokeria(id) values(1) on conflict(id) do nothing;
alter table public.config_comisiones_agrobrokeria enable row level security;
drop policy if exists comisiones_config_read_auth on public.config_comisiones_agrobrokeria;
create policy comisiones_config_read_auth on public.config_comisiones_agrobrokeria for select to authenticated using(true);
drop policy if exists comisiones_config_admin_update on public.config_comisiones_agrobrokeria;
create policy comisiones_config_admin_update on public.config_comisiones_agrobrokeria for update to authenticated using(exists(select 1 from public.platform_admins a where a.user_id=auth.uid())) with check(exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));

create table if not exists public.ofertas_logistica (
 id uuid primary key default gen_random_uuid(),
 transportista_id uuid not null references public.transportistas(id),
 empresa_transportista_id uuid not null references public.empresas(id),
 cantidad_camiones integer not null check(cantidad_camiones>0),
 ubicacion_actual text not null,
 destino_solicitado text,
 fecha_disponibilidad date not null,
 tipo_carroceria text not null default 'Granelero / Cerealero',
 observaciones text,
 estado text not null default 'PUBLICADA' check(estado in ('PUBLICADA','RESERVADA','ASIGNADA','CERRADA','CANCELADA')),
 creado_por uuid not null references auth.users(id),
 creado_at timestamptz not null default now(),
 actualizado_at timestamptz not null default now()
);
create index if not exists ofertas_logistica_busqueda_idx on public.ofertas_logistica(estado,fecha_disponibilidad,ubicacion_actual);

create table if not exists public.demandas_logistica (
 id uuid primary key default gen_random_uuid(),
 empresa_dadora_id uuid not null references public.empresas(id),
 operacion_id uuid references public.operaciones(id),
 cantidad_camiones_necesitados integer not null check(cantidad_camiones_necesitados>0),
 origen_carga text not null,
 destino_carga text not null,
 tarifa_estimada_ars numeric(14,2) check(tarifa_estimada_ars is null or tarifa_estimada_ars>=0),
 distancia_estimada_km integer check(distancia_estimada_km is null or distancia_estimada_km>0),
 permite_adelanto_combustible boolean not null default true,
 fecha_requerida date,
 tipo_carroceria text not null default 'Granelero / Cerealero',
 observaciones text,
 estado text not null default 'PUBLICADA' check(estado in ('PUBLICADA','PARCIAL','CUBIERTA','CERRADA','CANCELADA')),
 creado_por uuid not null references auth.users(id),
 creado_at timestamptz not null default now(),
 actualizado_at timestamptz not null default now()
);
create index if not exists demandas_logistica_busqueda_idx on public.demandas_logistica(estado,fecha_requerida,origen_carga,destino_carga);

create table if not exists public.tarifas_referencia_catac (
 id uuid primary key default gen_random_uuid(),
 distancia_km_desde integer not null check(distancia_km_desde>=0),
 distancia_km_hasta integer not null check(distancia_km_hasta>distancia_km_desde),
 valor_tonelada_ars numeric(14,2) not null check(valor_tonelada_ars>0),
 fuente text not null default 'CATAC',
 vigencia_desde date not null default current_date,
 vigencia_hasta date,
 activa boolean not null default true,
 actualizado_por uuid references auth.users(id),
 actualizado_at timestamptz not null default now()
);
create index if not exists tarifas_catac_vigencia_idx on public.tarifas_referencia_catac(activa,vigencia_desde,vigencia_hasta,distancia_km_desde);

create table if not exists public.cierres_logistica (
 id uuid primary key default gen_random_uuid(),
 codigo_operacion text not null unique,
 id_oferta_flete uuid not null references public.ofertas_logistica(id),
 id_demanda_flete uuid not null references public.demandas_logistica(id),
 empresa_transportista_id uuid not null references public.empresas(id),
 empresa_dadora_id uuid not null references public.empresas(id),
 cantidad_camiones integer not null check(cantidad_camiones>0),
 total_flete_pactado_ars numeric(14,2) not null check(total_flete_pactado_ars>0),
 comision_logistica_pct numeric(6,3) not null check(comision_logistica_pct between 0 and 100),
 comision_logistica_ars numeric(14,2) not null check(comision_logistica_ars>=0),
 estado_cierre text not null default 'cerrado_formal' check(estado_cierre in ('en_negociacion','cerrado_formal','cancelado')),
 estado_pago_comision_logistica text not null default 'esperando_comprobante' check(estado_pago_comision_logistica in ('esperando_comprobante','comprobante_enviado','aprobado','rechazado')),
 url_comprobante_logistica text,
 referencia_pago text,
 revisado_por uuid references auth.users(id),
 revisado_at timestamptz,
 motivo_revision text,
 fecha_cierre timestamptz not null default now(),
 creado_por uuid not null references auth.users(id)
);
create index if not exists cierres_logistica_empresa_idx on public.cierres_logistica(empresa_transportista_id,estado_pago_comision_logistica);

create table if not exists public.conversaciones_fletes (
 id uuid primary key default gen_random_uuid(),
 cierre_logistica_id uuid not null unique references public.cierres_logistica(id),
 empresa_transportista_id uuid not null references public.empresas(id),
 empresa_dadora_id uuid not null references public.empresas(id),
 estado text not null default 'ACTIVA' check(estado in ('ACTIVA','CERRADA')),
 creada_at timestamptz not null default now()
);
create table if not exists public.mensajes_fletes (
 id uuid primary key default gen_random_uuid(),
 conversacion_id uuid not null references public.conversaciones_fletes(id) on delete cascade,
 emisor_profile_id uuid references auth.users(id),
 es_sistema boolean not null default false,
 mensaje text not null,
 adjunto_path text,
 creado_at timestamptz not null default now()
);
create index if not exists mensajes_fletes_conversacion_idx on public.mensajes_fletes(conversacion_id,creado_at);

create table if not exists public.logistica_adelantos_combustible (
 id uuid primary key default gen_random_uuid(),
 cierre_logistica_id uuid not null references public.cierres_logistica(id),
 solicitado_por uuid not null references auth.users(id),
 monto_solicitado_ars numeric(14,2) not null check(monto_solicitado_ars>0),
 porcentaje_flete numeric(6,3) not null check(porcentaje_flete>0 and porcentaje_flete<=100),
 estado text not null default 'SOLICITADO' check(estado in ('SOLICITADO','ACEPTADO_POR_DADOR','COMPROBANTE_CARGADO','APROBADO','RECHAZADO','CANCELADO')),
 comprobante_path text,
 referencia_transferencia text,
 revisado_por uuid references auth.users(id),
 revisado_at timestamptz,
 creado_at timestamptz not null default now()
);

alter table public.ofertas_logistica enable row level security;
alter table public.demandas_logistica enable row level security;
alter table public.tarifas_referencia_catac enable row level security;
alter table public.cierres_logistica enable row level security;
alter table public.conversaciones_fletes enable row level security;
alter table public.mensajes_fletes enable row level security;
alter table public.logistica_adelantos_combustible enable row level security;

drop policy if exists ofertas_logistica_read on public.ofertas_logistica;
create policy ofertas_logistica_read on public.ofertas_logistica for select to authenticated using(estado='PUBLICADA' or public.usuario_es_miembro_empresa(empresa_transportista_id) or exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));
drop policy if exists ofertas_logistica_insert on public.ofertas_logistica;
create policy ofertas_logistica_insert on public.ofertas_logistica for insert to authenticated with check(creado_por=auth.uid() and public.usuario_es_miembro_empresa(empresa_transportista_id) and exists(select 1 from public.transportistas t where t.id=transportista_id and t.empresa_id=empresa_transportista_id and t.profile_id=auth.uid() and t.verificacion_estado='VERIFICADO'));
drop policy if exists ofertas_logistica_update on public.ofertas_logistica;
create policy ofertas_logistica_update on public.ofertas_logistica for update to authenticated using(public.usuario_es_miembro_empresa(empresa_transportista_id)) with check(public.usuario_es_miembro_empresa(empresa_transportista_id));

drop policy if exists demandas_logistica_read on public.demandas_logistica;
create policy demandas_logistica_read on public.demandas_logistica for select to authenticated using(estado in ('PUBLICADA','PARCIAL') or public.usuario_es_miembro_empresa(empresa_dadora_id) or exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));
drop policy if exists demandas_logistica_insert on public.demandas_logistica;
create policy demandas_logistica_insert on public.demandas_logistica for insert to authenticated with check(creado_por=auth.uid() and public.usuario_es_miembro_empresa(empresa_dadora_id));
drop policy if exists demandas_logistica_update on public.demandas_logistica;
create policy demandas_logistica_update on public.demandas_logistica for update to authenticated using(public.usuario_es_miembro_empresa(empresa_dadora_id)) with check(public.usuario_es_miembro_empresa(empresa_dadora_id));

drop policy if exists tarifas_catac_read on public.tarifas_referencia_catac;
create policy tarifas_catac_read on public.tarifas_referencia_catac for select to authenticated using(activa=true);
drop policy if exists tarifas_catac_admin_write on public.tarifas_referencia_catac;
create policy tarifas_catac_admin_write on public.tarifas_referencia_catac for all to authenticated using(exists(select 1 from public.platform_admins a where a.user_id=auth.uid())) with check(exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));

drop policy if exists cierres_logistica_read on public.cierres_logistica;
create policy cierres_logistica_read on public.cierres_logistica for select to authenticated using(public.usuario_es_miembro_empresa(empresa_transportista_id) or public.usuario_es_miembro_empresa(empresa_dadora_id) or exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));
drop policy if exists conversaciones_fletes_read on public.conversaciones_fletes;
create policy conversaciones_fletes_read on public.conversaciones_fletes for select to authenticated using(public.usuario_es_miembro_empresa(empresa_transportista_id) or public.usuario_es_miembro_empresa(empresa_dadora_id) or exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));
drop policy if exists mensajes_fletes_read on public.mensajes_fletes;
create policy mensajes_fletes_read on public.mensajes_fletes for select to authenticated using(exists(select 1 from public.conversaciones_fletes c where c.id=conversacion_id and (public.usuario_es_miembro_empresa(c.empresa_transportista_id) or public.usuario_es_miembro_empresa(c.empresa_dadora_id) or exists(select 1 from public.platform_admins a where a.user_id=auth.uid()))));
drop policy if exists mensajes_fletes_insert on public.mensajes_fletes;
create policy mensajes_fletes_insert on public.mensajes_fletes for insert to authenticated with check(emisor_profile_id=auth.uid() and es_sistema=false and exists(select 1 from public.conversaciones_fletes c where c.id=conversacion_id and c.estado='ACTIVA' and (public.usuario_es_miembro_empresa(c.empresa_transportista_id) or public.usuario_es_miembro_empresa(c.empresa_dadora_id))));
drop policy if exists adelantos_logistica_read on public.logistica_adelantos_combustible;
create policy adelantos_logistica_read on public.logistica_adelantos_combustible for select to authenticated using(exists(select 1 from public.cierres_logistica c where c.id=cierre_logistica_id and (public.usuario_es_miembro_empresa(c.empresa_transportista_id) or public.usuario_es_miembro_empresa(c.empresa_dadora_id))) or exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));
drop policy if exists adelantos_logistica_insert on public.logistica_adelantos_combustible;
create policy adelantos_logistica_insert on public.logistica_adelantos_combustible for insert to authenticated with check(solicitado_por=auth.uid() and exists(select 1 from public.cierres_logistica c where c.id=cierre_logistica_id and public.usuario_es_miembro_empresa(c.empresa_transportista_id)));
drop policy if exists adelantos_logistica_admin_update on public.logistica_adelantos_combustible;
create policy adelantos_logistica_admin_update on public.logistica_adelantos_combustible for update to authenticated using(exists(select 1 from public.platform_admins a where a.user_id=auth.uid())) with check(exists(select 1 from public.platform_admins a where a.user_id=auth.uid()));

create or replace function public.cerrar_operacion_logistica_market(p_oferta_id uuid,p_demanda_id uuid,p_total_flete_ars numeric)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare uid uuid:=auth.uid(); o public.ofertas_logistica%rowtype; d public.demandas_logistica%rowtype; pct numeric; cid uuid; conv uuid; qty integer; code text;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_total_flete_ars is null or p_total_flete_ars<=0 then raise exception 'TOTAL_FLETE_INVALIDO'; end if;
 select * into o from public.ofertas_logistica where id=p_oferta_id and estado='PUBLICADA' for update;
 if not found then raise exception 'OFERTA_FLETE_NO_DISPONIBLE'; end if;
 select * into d from public.demandas_logistica where id=p_demanda_id and estado in ('PUBLICADA','PARCIAL') for update;
 if not found then raise exception 'DEMANDA_FLETE_NO_DISPONIBLE'; end if;
 if not public.usuario_es_miembro_empresa(d.empresa_dadora_id) then raise exception 'SOLO_EL_DADOR_PUEDE_CERRAR'; end if;
 if o.empresa_transportista_id=d.empresa_dadora_id then raise exception 'PARTES_INVALIDAS'; end if;
 qty:=least(o.cantidad_camiones,d.cantidad_camiones_necesitados);
 select comision_logistica_pct into pct from public.config_comisiones_agrobrokeria where id=1;
 pct:=coalesce(pct,1.000);
 code:='OP-LOG-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
 insert into public.cierres_logistica(codigo_operacion,id_oferta_flete,id_demanda_flete,empresa_transportista_id,empresa_dadora_id,cantidad_camiones,total_flete_pactado_ars,comision_logistica_pct,comision_logistica_ars,estado_cierre,creado_por)
 values(code,o.id,d.id,o.empresa_transportista_id,d.empresa_dadora_id,qty,p_total_flete_ars,pct,round(p_total_flete_ars*pct/100,2),'cerrado_formal',uid) returning id into cid;
 insert into public.conversaciones_fletes(cierre_logistica_id,empresa_transportista_id,empresa_dadora_id) values(cid,o.empresa_transportista_id,d.empresa_dadora_id) returning id into conv;
 insert into public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje)
 values(conv,null,true,'¡Operación de flete cerrada con éxito! La empresa de transporte comprometió '||qty||' camión(es) con origen en '||o.ubicacion_actual||' hacia '||coalesce(o.destino_solicitado,d.destino_carga)||'. La comisión tecnológica de la plataforma es del '||pct||'% del flete pactado y debe ser abonada por la empresa de transporte. El comprobante del 1% de servicio tecnológico debe transferirse a las cuentas oficiales de AgroComercio Santa Fe. Administración verificará manualmente el ingreso bancario antes de habilitar la asignación de patentes y choferes y la prevalidación documental de la CPE ante ARCA.');
 update public.ofertas_logistica set estado='ASIGNADA',actualizado_at=now() where id=o.id;
 update public.demandas_logistica set estado=case when d.cantidad_camiones_necesitados<=qty then 'CUBIERTA' else 'PARCIAL' end,actualizado_at=now() where id=d.id;
 return cid;
end $$;
revoke all on function public.cerrar_operacion_logistica_market(uuid,uuid,numeric) from public,anon;
grant execute on function public.cerrar_operacion_logistica_market(uuid,uuid,numeric) to authenticated;

create or replace function public.registrar_comprobante_comision_logistica(p_cierre_id uuid,p_storage_path text,p_referencia text default null)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare c public.cierres_logistica%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into c from public.cierres_logistica where id=p_cierre_id for update;
 if not found or not public.usuario_es_miembro_empresa(c.empresa_transportista_id) then raise exception 'NO_AUTORIZADO'; end if;
 if c.estado_cierre<>'cerrado_formal' then raise exception 'CIERRE_NO_ACTIVO'; end if;
 if p_storage_path is null or length(p_storage_path)>500 then raise exception 'COMPROBANTE_INVALIDO'; end if;
 update public.cierres_logistica set url_comprobante_logistica=p_storage_path,referencia_pago=nullif(trim(p_referencia),''),estado_pago_comision_logistica='comprobante_enviado' where id=p_cierre_id;
end $$;
revoke all on function public.registrar_comprobante_comision_logistica(uuid,text,text) from public,anon;
grant execute on function public.registrar_comprobante_comision_logistica(uuid,text,text) to authenticated;

create or replace function public.revisar_comision_logistica(p_cierre_id uuid,p_aprobar boolean,p_motivo text default null)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.platform_admins a where a.user_id=auth.uid()) then raise exception 'ADMIN_REQUIRED'; end if;
 update public.cierres_logistica set estado_pago_comision_logistica=case when p_aprobar then 'aprobado' else 'rechazado' end,revisado_por=auth.uid(),revisado_at=now(),motivo_revision=nullif(trim(p_motivo),'')
 where id=p_cierre_id and estado_pago_comision_logistica='comprobante_enviado';
 if not found then raise exception 'COMPROBANTE_NO_PENDIENTE'; end if;
end $$;
revoke all on function public.revisar_comision_logistica(uuid,boolean,text) from public,anon;
grant execute on function public.revisar_comision_logistica(uuid,boolean,text) to authenticated;

create or replace function public.solicitar_adelanto_combustible_logistica(p_cierre_id uuid,p_monto_ars numeric,p_porcentaje numeric)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare c public.cierres_logistica%rowtype; rid uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into c from public.cierres_logistica where id=p_cierre_id;
 if not found or not public.usuario_es_miembro_empresa(c.empresa_transportista_id) then raise exception 'NO_AUTORIZADO'; end if;
 if p_monto_ars<=0 or p_porcentaje<=0 or p_porcentaje>100 or p_monto_ars>c.total_flete_pactado_ars*p_porcentaje/100 then raise exception 'ADELANTO_INVALIDO'; end if;
 if not exists(select 1 from public.demandas_logistica d where d.id=c.id_demanda_flete and d.permite_adelanto_combustible=true) then raise exception 'ADELANTO_NO_PERMITIDO'; end if;
 insert into public.logistica_adelantos_combustible(cierre_logistica_id,solicitado_por,monto_solicitado_ars,porcentaje_flete)
 values(p_cierre_id,auth.uid(),p_monto_ars,p_porcentaje) returning id into rid;
 insert into public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje)
 select cf.id,null,true,'El transportista solicitó un adelanto para combustible y viáticos por $'||to_char(p_monto_ars,'FM999G999G990D00')||' ARS ('||p_porcentaje||'% del flete). El dador debe responder desde el expediente y, si acepta, transferir externamente y adjuntar el comprobante.'
 from public.conversaciones_fletes cf where cf.cierre_logistica_id=p_cierre_id;
 return rid;
end $$;
revoke all on function public.solicitar_adelanto_combustible_logistica(uuid,numeric,numeric) from public,anon;
grant execute on function public.solicitar_adelanto_combustible_logistica(uuid,numeric,numeric) to authenticated;

-- Commercial document RPCs: the issuer must match the proper side of the transaction.
create or replace function public.crear_loi_comercial(p_operacion_id uuid,p_archivo_pdf text,p_hash_sha256 text,p_idioma text,p_empresa_emisora uuid,p_empresa_receptora uuid)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare rid uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_idioma not in ('es','en','pt','zh-CN') then raise exception 'IDIOMA_NO_ADMITIDO'; end if;
 if p_hash_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'HASH_SHA256_INVALIDO'; end if;
 if p_archivo_pdf is null or length(p_archivo_pdf)>1000000 or p_archivo_pdf !~ '^data:application/pdf;base64,' then raise exception 'PDF_INVALIDO';
 end if;
 if not public.usuario_es_miembro_empresa(p_empresa_emisora) or not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_emisora and upper(rol) in ('COMPRADOR','BUYER')) then raise exception 'EL_EMISOR_LOI_DEBE_SER_COMPRADOR'; end if;
 if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_receptora and upper(rol) in ('VENDEDOR','SELLER')) then raise exception 'CONTRAPARTE_LOI_INVALIDA'; end if;
 insert into public.loi(operacion_id,empresa_emisora,empresa_receptora,fecha_emision,estado,archivo_pdf,hash_sha256,idioma_documento)
 values(p_operacion_id,p_empresa_emisora,p_empresa_receptora,current_date,'EMITIDO',p_archivo_pdf,p_hash_sha256,p_idioma) returning id into rid;
 return rid;
end $$;
revoke all on function public.crear_loi_comercial(uuid,text,text,text,uuid,uuid) from public,anon;
grant execute on function public.crear_loi_comercial(uuid,text,text,text,uuid,uuid) to authenticated;

create or replace function public.crear_sco_comercial(p_operacion_id uuid,p_archivo_pdf text,p_hash_sha256 text,p_idioma text,p_empresa_emisora uuid,p_empresa_receptora uuid)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare rid uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_idioma not in ('es','en','pt','zh-CN') then raise exception 'IDIOMA_NO_ADMITIDO'; end if;
 if p_hash_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'HASH_SHA256_INVALIDO'; end if;
 if p_archivo_pdf is null or length(p_archivo_pdf)>1000000 or p_archivo_pdf !~ '^data:application/pdf;base64,' then raise exception 'PDF_INVALIDO'; end if;
 if not public.usuario_es_miembro_empresa(p_empresa_emisora) or not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_emisora and upper(rol) in ('VENDEDOR','SELLER')) then raise exception 'EL_EMISOR_SCO_DEBE_SER_VENDEDOR'; end if;
 if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_receptora and upper(rol) in ('COMPRADOR','BUYER')) then raise exception 'CONTRAPARTE_SCO_INVALIDA'; end if;
 insert into public.sco(operacion_id,empresa_emisora,fecha_emision,estado,archivo_pdf,hash_sha256,idioma_documento)
 values(p_operacion_id,p_empresa_emisora,current_date,'EMITIDO',p_archivo_pdf,p_hash_sha256,p_idioma) returning id into rid;
 return rid;
end $$;
revoke all on function public.crear_sco_comercial(uuid,text,text,text,uuid,uuid) from public,anon;
grant execute on function public.crear_sco_comercial(uuid,text,text,text,uuid,uuid) to authenticated;

create or replace function public.crear_fco_comercial(p_operacion_id uuid,p_archivo_pdf text,p_hash_sha256 text,p_idioma text,p_empresa_emisora uuid,p_empresa_receptora uuid)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare rid uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_idioma not in ('es','en','pt','zh-CN') then raise exception 'IDIOMA_NO_ADMITIDO'; end if;
 if p_hash_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'HASH_SHA256_INVALIDO'; end if;
 if p_archivo_pdf is null or length(p_archivo_pdf)>1000000 or p_archivo_pdf !~ '^data:application/pdf;base64,' then raise exception 'PDF_INVALIDO'; end if;
 if not public.usuario_es_miembro_empresa(p_empresa_emisora) or not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_emisora and upper(rol) in ('VENDEDOR','SELLER')) then raise exception 'EL_EMISOR_FCO_DEBE_SER_VENDEDOR'; end if;
 if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_receptora and upper(rol) in ('COMPRADOR','BUYER')) then raise exception 'CONTRAPARTE_FCO_INVALIDA'; end if;
 insert into public.fco(operacion_id,empresa_emisora,empresa_receptora,fecha_emision,estado,archivo_pdf,hash_sha256,idioma_documento)
 values(p_operacion_id,p_empresa_emisora,p_empresa_receptora,current_date,'EMITIDO',p_archivo_pdf,p_hash_sha256,p_idioma) returning id into rid;
 return rid;
end $$;
revoke all on function public.crear_fco_comercial(uuid,text,text,text,uuid,uuid) from public,anon;
grant execute on function public.crear_fco_comercial(uuid,text,text,text,uuid,uuid) to authenticated;

-- Private proof bucket: a participant can upload only under the closure they belong to.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('logistica-comprobantes','logistica-comprobantes',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf','image/jpeg','image/png'];

drop policy if exists logistica_proof_upload_participant on storage.objects;
create policy logistica_proof_upload_participant on storage.objects for insert to authenticated
with check(bucket_id='logistica-comprobantes' and exists(
 select 1 from public.cierres_logistica c where c.id::text=(storage.foldername(name))[1]
 and public.usuario_es_miembro_empresa(c.empresa_transportista_id) and owner_id::text=auth.uid()::text
));
drop policy if exists logistica_proof_read_participant on storage.objects;
create policy logistica_proof_read_participant on storage.objects for select to authenticated
using(bucket_id='logistica-comprobantes' and exists(
 select 1 from public.cierres_logistica c where c.id::text=(storage.foldername(name))[1]
 and (public.usuario_es_miembro_empresa(c.empresa_transportista_id) or public.usuario_es_miembro_empresa(c.empresa_dadora_id)
 or exists(select 1 from public.platform_admins a where a.user_id=auth.uid()))
));

create or replace function public.registrar_comprobante_comision_logistica(p_cierre_id uuid,p_storage_path text,p_referencia text default null)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare c public.cierres_logistica%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into c from public.cierres_logistica where id=p_cierre_id for update;
 if not found or not public.usuario_es_miembro_empresa(c.empresa_transportista_id) then raise exception 'NO_AUTORIZADO'; end if;
 if c.estado_cierre<>'cerrado_formal' then raise exception 'CIERRE_NO_ACTIVO'; end if;
 if p_storage_path is null or length(p_storage_path)>500 or p_storage_path not like p_cierre_id::text||'/%' then raise exception 'COMPROBANTE_INVALIDO'; end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='logistica-comprobantes' and o.name=p_storage_path and o.owner_id::text=auth.uid()::text) then raise exception 'COMPROBANTE_NO_ENCONTRADO'; end if;
 update public.cierres_logistica set url_comprobante_logistica=p_storage_path,referencia_pago=nullif(trim(p_referencia),''),estado_pago_comision_logistica='comprobante_enviado' where id=p_cierre_id;
end $$;
revoke all on function public.registrar_comprobante_comision_logistica(uuid,text,text) from public,anon;
grant execute on function public.registrar_comprobante_comision_logistica(uuid,text,text) to authenticated;

create or replace function public.buscar_tarifa_referencia_catac(p_distancia_km integer)
returns table(id uuid,distancia_km_desde integer,distancia_km_hasta integer,valor_tonelada_ars numeric,fuente text,vigencia_desde date)
language sql stable security invoker set search_path=public,pg_temp as $$
 select t.id,t.distancia_km_desde,t.distancia_km_hasta,t.valor_tonelada_ars,t.fuente,t.vigencia_desde
 from public.tarifas_referencia_catac t
 where t.activa=true and p_distancia_km between t.distancia_km_desde and t.distancia_km_hasta
 and t.vigencia_desde<=current_date and (t.vigencia_hasta is null or t.vigencia_hasta>=current_date)
 order by t.vigencia_desde desc,t.actualizado_at desc limit 1
$$;
revoke all on function public.buscar_tarifa_referencia_catac(integer) from public,anon;
grant execute on function public.buscar_tarifa_referencia_catac(integer) to authenticated;

-- Expose only active public remittance coordinates to signed-in participants.
create or replace function public.listar_cuentas_pago_logistica()
returns table(id uuid,bank_name text,account_holder text,holder_tax_id text,account_type text,currency text,cbu text,alias text,notes text)
language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 return query select p.id,p.bank_name,p.account_holder,p.holder_tax_id,p.account_type,p.currency,p.cbu,p.alias,p.notes
 from public.platform_payment_accounts p where p.active=true and lower(p.account_holder) like '%agrocomercio santa fe%' order by p.bank_name,p.currency;
end $$;
revoke all on function public.listar_cuentas_pago_logistica() from public,anon;
grant execute on function public.listar_cuentas_pago_logistica() to authenticated;

create or replace function public.establecer_incoterm_operacion(p_operacion_id uuid,p_incoterm_id integer)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'OPERACION_NO_AUTORIZADA'; end if;
 if not exists(select 1 from public.incoterms where id=p_incoterm_id) then raise exception 'INCOTERM_INVALIDO'; end if;
 update public.operaciones set incoterm_id=p_incoterm_id,actualizada_en=now() where id=p_operacion_id;
 if not found then raise exception 'OPERACION_NO_ENCONTRADA'; end if;
end $$;
revoke all on function public.establecer_incoterm_operacion(uuid,integer) from public,anon;
grant execute on function public.establecer_incoterm_operacion(uuid,integer) to authenticated;

-- Link freight closures to an optional grain operation and gate vehicle assignment on manual commission approval.
alter table public.cierres_logistica add column if not exists operacion_id uuid references public.operaciones(id);
alter table public.viajes add column if not exists cierre_logistica_id uuid references public.cierres_logistica(id);

create or replace function public.completar_operacion_en_cierre_flete()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if new.operacion_id is null then select d.operacion_id into new.operacion_id from public.demandas_logistica d where d.id=new.id_demanda_flete; end if;
 return new;
end $$;
drop trigger if exists trg_completar_operacion_cierre_flete on public.cierres_logistica;
create trigger trg_completar_operacion_cierre_flete before insert on public.cierres_logistica for each row execute function public.completar_operacion_en_cierre_flete();

create or replace function public.validar_comision_flete_antes_de_asignar_camion()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare c public.cierres_logistica%rowtype;
begin
 if new.cierre_logistica_id is null then return new; end if;
 select * into c from public.cierres_logistica where id=new.cierre_logistica_id;
 if not found or c.estado_cierre<>'cerrado_formal' or c.estado_pago_comision_logistica<>'aprobado' then
  raise exception 'COMISION_LOGISTICA_PENDIENTE_VALIDACION_MANUAL';
 end if;
 if c.operacion_id is not null and c.operacion_id<>new.operacion_id then raise exception 'CIERRE_FLETE_OPERACION_NO_COINCIDE'; end if;
 return new;
end $$;
drop trigger if exists trg_validar_comision_flete_antes_de_asignar_camion on public.viajes;
create trigger trg_validar_comision_flete_antes_de_asignar_camion
before insert or update of cierre_logistica_id,vehiculo_id,transportista_profile_id,patente_camion,patente_acoplado,chofer_nombre
on public.viajes for each row execute function public.validar_comision_flete_antes_de_asignar_camion();

create or replace function public.vincular_viaje_cierre_logistica(p_cierre_id uuid,p_viaje_id uuid)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare c public.cierres_logistica%rowtype; v public.viajes%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into c from public.cierres_logistica where id=p_cierre_id;
 select * into v from public.viajes where id=p_viaje_id;
 if not found or (not public.usuario_es_miembro_empresa(c.empresa_transportista_id) and not public.usuario_es_miembro_empresa(c.empresa_dadora_id)) then raise exception 'NO_AUTORIZADO'; end if;
 if c.estado_pago_comision_logistica<>'aprobado' then raise exception 'COMISION_LOGISTICA_PENDIENTE_VALIDACION_MANUAL'; end if;
 if c.operacion_id is not null and c.operacion_id<>v.operacion_id then raise exception 'OPERACION_NO_COINCIDE'; end if;
 update public.viajes set cierre_logistica_id=p_cierre_id,actualizado_at=now() where id=p_viaje_id;
end $$;
revoke all on function public.vincular_viaje_cierre_logistica(uuid,uuid) from public,anon;
grant execute on function public.vincular_viaje_cierre_logistica(uuid,uuid) to authenticated;

create or replace function public.responder_adelanto_combustible_logistica(p_adelanto_id uuid,p_aceptar boolean)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare a public.logistica_adelantos_combustible%rowtype; c public.cierres_logistica%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into a from public.logistica_adelantos_combustible where id=p_adelanto_id for update;
 select * into c from public.cierres_logistica where id=a.cierre_logistica_id;
 if not found or not public.usuario_es_miembro_empresa(c.empresa_dadora_id) then raise exception 'SOLO_EL_DADOR_PUEDE_RESPONDER'; end if;
 if a.estado<>'SOLICITADO' then raise exception 'ADELANTO_NO_PENDIENTE'; end if;
 update public.logistica_adelantos_combustible set estado=case when p_aceptar then 'ACEPTADO_POR_DADOR' else 'RECHAZADO' end where id=p_adelanto_id;
 insert into public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje)
 select cf.id,null,true,case when p_aceptar then 'El dador de carga aceptó el adelanto de combustible. Debe realizar la transferencia bancaria externa y adjuntar el comprobante para revisión.' else 'El dador de carga rechazó la solicitud de adelanto de combustible.' end
 from public.conversaciones_fletes cf where cf.cierre_logistica_id=c.id;
end $$;
revoke all on function public.responder_adelanto_combustible_logistica(uuid,boolean) from public,anon;
grant execute on function public.responder_adelanto_combustible_logistica(uuid,boolean) to authenticated;

create or replace function public.registrar_comprobante_adelanto_logistica(p_adelanto_id uuid,p_storage_path text,p_referencia text default null)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare a public.logistica_adelantos_combustible%rowtype; c public.cierres_logistica%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into a from public.logistica_adelantos_combustible where id=p_adelanto_id for update;
 select * into c from public.cierres_logistica where id=a.cierre_logistica_id;
 if not found or not public.usuario_es_miembro_empresa(c.empresa_dadora_id) then raise exception 'SOLO_EL_DADOR_PUEDE_SUBIR_COMPROBANTE'; end if;
 if a.estado<>'ACEPTADO_POR_DADOR' then raise exception 'ADELANTO_NO_ACEPTADO'; end if;
 if p_storage_path not like c.id::text||'/adelantos/%' or not exists(select 1 from storage.objects where bucket_id='logistica-comprobantes' and name=p_storage_path and owner_id::text=auth.uid()::text) then raise exception 'COMPROBANTE_ADELANTO_INVALIDO'; end if;
 update public.logistica_adelantos_combustible set comprobante_path=p_storage_path,referencia_transferencia=nullif(trim(p_referencia),''),estado='COMPROBANTE_CARGADO' where id=p_adelanto_id;
 insert into public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje,adjunto_path)
 select cf.id,null,true,'El dador de carga adjuntó el comprobante de transferencia del adelanto. Queda pendiente de validación manual por Administración.',p_storage_path
 from public.conversaciones_fletes cf where cf.cierre_logistica_id=c.id;
end $$;
revoke all on function public.registrar_comprobante_adelanto_logistica(uuid,text,text) from public,anon;
grant execute on function public.registrar_comprobante_adelanto_logistica(uuid,text,text) to authenticated;


alter table public.logistica_adelantos_combustible add column if not exists motivo_rechazo text;

create or replace function public.revisar_adelanto_combustible_logistica(p_adelanto_id uuid,p_aprobar boolean,p_motivo text default null)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.platform_admins a where a.user_id=auth.uid()) then raise exception 'ADMIN_REQUIRED'; end if;
 update public.logistica_adelantos_combustible set estado=case when p_aprobar then 'APROBADO' else 'RECHAZADO' end,revisado_por=auth.uid(),revisado_at=now(),motivo_rechazo=case when p_aprobar then null else nullif(trim(p_motivo),'') end
 where id=p_adelanto_id and estado='COMPROBANTE_CARGADO';
 if not found then raise exception 'COMPROBANTE_ADELANTO_NO_PENDIENTE'; end if;
end $$;
revoke all on function public.revisar_adelanto_combustible_logistica(uuid,boolean,text) from public,anon;
grant execute on function public.revisar_adelanto_combustible_logistica(uuid,boolean,text) to authenticated;

-- The driver's load event is mirrored into the private freight chat as an auditable system message.
create or replace function public.notificar_carga_en_chat_flete()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.viajes%rowtype; conv uuid; msg text;
begin
 if new.estado<>'CARGA_FINALIZADA' then return new; end if;
 select * into v from public.viajes where id=new.viaje_id;
 if v.cierre_logistica_id is null then return new; end if;
 select id into conv from public.conversaciones_fletes where cierre_logistica_id=v.cierre_logistica_id and estado='ACTIVA';
 if conv is null then return new; end if;
 msg:='¡Carga reportada en origen! Patente: '||coalesce(v.patente_camion,'Pendiente')||'. Origen: '||coalesce(v.origen_nombre,v.origen,'No informado')||'. CPE: '||coalesce(v.carta_porte_ctg,v.carta_porte_numero,'Pendiente de vinculación')||' (estado registrado: '||coalesce(v.carta_porte_estado,'PENDIENTE')||'). Destino: '||coalesce(v.destino_nombre,v.destino,'No informado')||'. El monitoreo del viaje se continuará desde el expediente logístico.';
 insert into public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje) values(conv,null,true,msg);
 return new;
end $$;
drop trigger if exists trg_notificar_carga_en_chat_flete on public.viaje_eventos;
create trigger trg_notificar_carga_en_chat_flete after insert on public.viaje_eventos for each row execute function public.notificar_carga_en_chat_flete();
revoke all on function public.notificar_carga_en_chat_flete() from public,anon,authenticated;
