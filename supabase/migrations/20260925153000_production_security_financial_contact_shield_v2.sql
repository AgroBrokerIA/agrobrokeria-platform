-- Production hardening: Contact Shield, critical write isolation, financial invariants, and idempotency.
drop policy if exists "contactos comerciales lectura" on public.contactos_comerciales;
revoke all on table public.contactos_comerciales from anon, authenticated;

create or replace function public.listar_contactos_comerciales_autorizados()
returns table(
  id uuid, tipo_persona text, nombre_razon_social text, dni text, cuit text,
  domicilio text, localidad text, provincia text, email text, telefono text,
  representante_nombre text, representante_dni text, representante_cargo text,
  observaciones text, activo boolean, created_at timestamptz, updated_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  return query
  select distinct c.id,c.tipo_persona,c.nombre_razon_social,c.dni,c.cuit,c.domicilio,
    c.localidad,c.provincia,c.email,c.telefono,c.representante_nombre,
    c.representante_dni,c.representante_cargo,c.observaciones,c.activo,
    c.created_at,c.updated_at
  from public.contactos_comerciales c
  join public.partes_operacion po on po.contacto_id=c.id
  where c.activo=true and public.usuario_participa_operacion(po.operacion_id)
  order by c.nombre_razon_social;
end;
$$;
revoke all on function public.listar_contactos_comerciales_autorizados() from public, anon;
grant execute on function public.listar_contactos_comerciales_autorizados() to authenticated;

drop policy if exists contratos_insert_participante on public.contratos;
drop policy if exists contratos_update_participante on public.contratos;
drop policy if exists liquidaciones_insert_participante on public.liquidaciones;
drop policy if exists liquidaciones_update_participante on public.liquidaciones;
drop policy if exists operaciones_insert_empresa on public.operaciones;
drop policy if exists operaciones_update_participante on public.operaciones;
drop policy if exists pagos_insert_participante on public.pagos;
drop policy if exists pagos_update_participante on public.pagos;

create policy contratos_insert_rpc_only on public.contratos for insert to authenticated with check (false);
create policy contratos_update_rpc_only on public.contratos for update to authenticated using (false) with check (false);
create policy liquidaciones_insert_rpc_only on public.liquidaciones for insert to authenticated with check (false);
create policy liquidaciones_update_rpc_only on public.liquidaciones for update to authenticated using (false) with check (false);
create policy operaciones_insert_rpc_only on public.operaciones for insert to authenticated with check (false);
create policy operaciones_update_rpc_only on public.operaciones for update to authenticated using (false) with check (false);
create policy pagos_insert_rpc_only on public.pagos for insert to authenticated with check (false);
create policy pagos_update_rpc_only on public.pagos for update to authenticated using (false) with check (false);

alter table public.publicaciones drop constraint if exists publicaciones_cantidad_tn_positive, drop constraint if exists publicaciones_precio_tn_positive;
alter table public.publicaciones add constraint publicaciones_cantidad_tn_positive check (cantidad_tn > 0), add constraint publicaciones_precio_tn_positive check (precio_tn is null or precio_tn > 0);
alter table public.operaciones drop constraint if exists operaciones_cantidad_tn_positive, drop constraint if exists operaciones_precio_tn_positive, drop constraint if exists operaciones_importe_total_nonnegative;
alter table public.operaciones add constraint operaciones_cantidad_tn_positive check (cantidad_tn > 0), add constraint operaciones_precio_tn_positive check (precio_tn > 0), add constraint operaciones_importe_total_nonnegative check (importe_total is null or importe_total >= 0);
alter table public.ofertas_negociacion drop constraint if exists ofertas_negociacion_cantidad_positive, drop constraint if exists ofertas_negociacion_precio_positive;
alter table public.ofertas_negociacion add constraint ofertas_negociacion_cantidad_positive check (cantidad_tn is null or cantidad_tn > 0), add constraint ofertas_negociacion_precio_positive check (precio_tn is null or precio_tn > 0);
alter table public.contraofertas drop constraint if exists contraofertas_cantidad_positive, drop constraint if exists contraofertas_precio_positive;
alter table public.contraofertas add constraint contraofertas_cantidad_positive check (cantidad_tn is null or cantidad_tn > 0), add constraint contraofertas_precio_positive check (precio_tn is null or precio_tn > 0);
alter table public.comisiones drop constraint if exists comisiones_valor_nonnegative, drop constraint if exists comisiones_importe_nonnegative;
alter table public.comisiones add constraint comisiones_valor_nonnegative check (valor >= 0), add constraint comisiones_importe_nonnegative check (importe_calculado is null or importe_calculado >= 0);
alter table public.liquidaciones drop constraint if exists liquidaciones_importe_bruto_nonnegative, drop constraint if exists liquidaciones_total_comisiones_nonnegative, drop constraint if exists liquidaciones_neto_nonnegative, drop constraint if exists liquidaciones_total_comprador_nonnegative;
alter table public.liquidaciones add constraint liquidaciones_importe_bruto_nonnegative check (importe_bruto is null or importe_bruto >= 0), add constraint liquidaciones_total_comisiones_nonnegative check (total_comisiones is null or total_comisiones >= 0), add constraint liquidaciones_neto_nonnegative check (importe_neto_vendedor is null or importe_neto_vendedor >= 0), add constraint liquidaciones_total_comprador_nonnegative check (importe_total_comprador is null or importe_total_comprador >= 0);
alter table public.pagos drop constraint if exists pagos_importe_nonnegative;
alter table public.pagos add constraint pagos_importe_nonnegative check (importe is null or importe >= 0);
alter table public.retiros_comisiones drop constraint if exists retiros_comisiones_importe_positive;
alter table public.retiros_comisiones add constraint retiros_comisiones_importe_positive check (importe > 0);

create or replace function public.proteger_contrato_confirmado()
returns trigger language plpgsql set search_path = public
as $$
begin
  if old.estado = 'CONFIRMADO' then
    if new.operacion_id is distinct from old.operacion_id
       or new.acuerdo_id is distinct from old.acuerdo_id
       or new.numero_contrato is distinct from old.numero_contrato
       or new.tipo_contrato is distinct from old.tipo_contrato
       or new.cantidad_tn is distinct from old.cantidad_tn
       or new.precio_tn is distinct from old.precio_tn
       or new.importe_total is distinct from old.importe_total
       or new.lugar_carga is distinct from old.lugar_carga
       or new.destino is distinct from old.destino
       or new.condicion_entrega is distinct from old.condicion_entrega
       or new.forma_pago is distinct from old.forma_pago
       or new.plazo_pago is distinct from old.plazo_pago
       or new.flete is distinct from old.flete
       or new.calidad is distinct from old.calidad
       or new.observaciones is distinct from old.observaciones
       or new.contenido is distinct from old.contenido
       or new.estado is distinct from old.estado then
      raise exception 'El contrato confirmado es inmutable.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_proteger_contrato_confirmado on public.contratos;
create trigger trg_proteger_contrato_confirmado before update on public.contratos for each row execute function public.proteger_contrato_confirmado();

create unique index if not exists ux_firma_solicitud_pendiente_contrato_email
on public.firma_solicitudes (operacion_id, lower(firmante_email)) where estado = 'PENDIENTE';

create or replace function public.registrar_pago_operacion(
  p_operacion_id uuid, p_empresa_pagadora uuid, p_empresa_cobradora uuid,
  p_importe numeric, p_moneda_id integer, p_metodo_pago text,
  p_referencia text default null, p_comprobante text default null
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); v_active_company uuid; v_admin boolean;
  v_total numeric; v_pagado numeric; v_id uuid;
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;
  if p_importe is null or p_importe <= 0 then raise exception 'El importe debe ser mayor a cero'; end if;
  if p_moneda_id is null then raise exception 'La moneda es obligatoria'; end if;
  if nullif(trim(p_metodo_pago),'') is null then raise exception 'El método de pago es obligatorio'; end if;
  if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para esta operación'; end if;
  select active_company_id into v_active_company from public.profiles where id=v_uid;
  if v_active_company is null or v_active_company not in (p_empresa_pagadora,p_empresa_cobradora) then raise exception 'La empresa activa no participa del pago'; end if;
  select exists(select 1 from public.company_users where profile_id=v_uid and company_id=v_active_company and activo=true and lower(rol::text) in ('administrador','admin')) into v_admin;
  if not v_admin then raise exception 'Se requiere rol administrador'; end if;
  if p_empresa_pagadora is not null and not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_pagadora) then raise exception 'Empresa pagadora no participa de la operación'; end if;
  if p_empresa_cobradora is not null and not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_cobradora) then raise exception 'Empresa cobradora no participa de la operación'; end if;
  select importe_total into v_total from public.operaciones where id=p_operacion_id for update;
  if v_total is null or v_total <= 0 then raise exception 'Operación sin importe contractual válido'; end if;
  select coalesce(sum(importe),0) into v_pagado from public.pagos where operacion_id=p_operacion_id and estado in ('CONFIRMADO','PAGADO','COMPLETADO');
  if v_pagado + p_importe > v_total then raise exception 'El pago acumulado supera el importe contractual'; end if;
  if p_referencia is not null and exists(select 1 from public.pagos where operacion_id=p_operacion_id and comprobante=p_referencia) then
    select id into v_id from public.pagos where operacion_id=p_operacion_id and comprobante=p_referencia limit 1;
    return v_id;
  end if;
  insert into public.pagos(operacion_id,empresa_pagadora,empresa_cobradora,importe,moneda_id,metodo_pago,estado,comprobante,creado_en)
  values(p_operacion_id,p_empresa_pagadora,p_empresa_cobradora,p_importe,p_moneda_id,trim(p_metodo_pago),'PENDIENTE',coalesce(p_comprobante,p_referencia),now())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.registrar_pago_operacion(uuid,uuid,uuid,numeric,integer,text,text,text) from public, anon;
grant execute on function public.registrar_pago_operacion(uuid,uuid,uuid,numeric,integer,text,text,text) to authenticated;

revoke insert, update, delete on table public.pagos from anon, authenticated;
revoke insert, update, delete on table public.operaciones from anon, authenticated;
revoke insert, update, delete on table public.contratos from anon, authenticated;
revoke insert, update, delete on table public.liquidaciones from anon, authenticated;

create unique index if not exists ux_pagos_operacion_comprobante
on public.pagos(operacion_id, comprobante) where comprobante is not null;
