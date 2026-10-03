-- Production commercial closure rules: payment methods, seven-day contracts and private-data release gate.

insert into public.formas_pago (nombre)
select v.nombre
from (values
  ('Transferencia bancaria'),
  ('Financiera'),
  ('eCheq'),
  ('Otro / Según contrato'),
  ('Combinado')
) v(nombre)
where not exists (select 1 from public.formas_pago fp where lower(fp.nombre)=lower(v.nombre));

alter table public.contratos
  add column if not exists abierto_at timestamptz,
  add column if not exists vencimiento_at timestamptz,
  add column if not exists cancelado_por_vencimiento_at timestamptz;

update public.contratos
set abierto_at=coalesce(abierto_at,creado_en,now()),
    vencimiento_at=coalesce(vencimiento_at,coalesce(abierto_at,creado_en,now())+interval '7 days')
where abierto_at is null or vencimiento_at is null;

alter table public.contratos
  alter column abierto_at set default now(),
  alter column vencimiento_at set default (now()+interval '7 days');

create or replace function public.operacion_comision_plataforma_segura(p_operacion_id uuid)
returns boolean language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null or not public.usuario_participa_operacion(p_operacion_id) then return false; end if;
  return exists (
    select 1 from public.operacion_control_comercial occ
    where occ.operacion_id=p_operacion_id
      and upper(coalesce(occ.comision_estado,'')) in ('RESERVADA','RETENIDA','ASEGURADA','PAGADA','ABONADA')
  ) or exists (
    select 1 from public.operacion_comisiones oc
    where oc.operacion_id=p_operacion_id and oc.tipo_comision='PLATAFORMA'
      and upper(coalesce(oc.estado,'')) in ('RESERVADA','RETENIDA','ASEGURADA','PAGADA','ABONADA')
  );
end; $$;

create or replace function public.operacion_datos_privados_liberados(p_operacion_id uuid)
returns boolean language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null or not public.usuario_participa_operacion(p_operacion_id) then return false; end if;
  return public.operacion_comision_plataforma_segura(p_operacion_id)
    and exists(select 1 from public.contratos c where c.operacion_id=p_operacion_id and c.estado='CONFIRMADO')
    and exists(select 1 from public.operacion_control_comercial occ where occ.operacion_id=p_operacion_id and occ.no_elusion_aceptada=true);
end; $$;

revoke all on function public.operacion_comision_plataforma_segura(uuid) from public,anon,authenticated;
revoke all on function public.operacion_datos_privados_liberados(uuid) from public,anon,authenticated;

create or replace function public.listar_contactos_comerciales_autorizados()
returns table(
  id uuid,tipo_persona text,nombre_razon_social text,dni text,cuit text,domicilio text,
  localidad text,provincia text,email text,telefono text,representante_nombre text,
  representante_dni text,representante_cargo text,observaciones text,activo boolean,
  created_at timestamptz,updated_at timestamptz
) language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  return query
  select distinct c.id,c.tipo_persona,c.nombre_razon_social,
    case when public.operacion_datos_privados_liberados(po.operacion_id) then c.dni end,
    case when public.operacion_datos_privados_liberados(po.operacion_id) then c.cuit end,
    case when public.operacion_datos_privados_liberados(po.operacion_id) then c.domicilio end,
    c.localidad,c.provincia,
    case when public.operacion_datos_privados_liberados(po.operacion_id) then c.email end,
    case when public.operacion_datos_privados_liberados(po.operacion_id) then c.telefono end,
    c.representante_nombre,
    case when public.operacion_datos_privados_liberados(po.operacion_id) then c.representante_dni end,
    c.representante_cargo,c.observaciones,c.activo,c.created_at,c.updated_at
  from public.contactos_comerciales c
  join public.partes_operacion po on po.contacto_id=c.id
  where c.activo=true and public.usuario_participa_operacion(po.operacion_id)
  order by c.nombre_razon_social;
end; $$;

revoke all on function public.listar_contactos_comerciales_autorizados() from public,anon;
grant execute on function public.listar_contactos_comerciales_autorizados() to authenticated;

create or replace function public.guardar_contrato_comercial(p_operacion_id uuid,p_datos jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_id uuid; v_uid uuid:=auth.uid(); v_workflow public.operacion_workflow%rowtype;
  v_orden integer; v_estado text; v_qty numeric; v_price numeric; v_total numeric;
  v_agreement_id uuid; v_abierto_at timestamptz; v_vencimiento_at timestamptz;
begin
  if v_uid is null or not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para esta operación.'; end if;
  select * into v_workflow from public.operacion_workflow where operacion_id=p_operacion_id for update;
  if not found then raise exception 'La operación no tiene workflow.'; end if;
  select orden into v_orden from public.workflow_etapas where id=v_workflow.etapa_actual_id and workflow_id=v_workflow.workflow_id;
  if v_orden<>4 then raise exception 'El contrato definitivo solo puede gestionarse en la etapa 4.'; end if;
  v_estado:=coalesce(nullif(p_datos->>'estado',''),'BORRADOR');
  if v_estado not in ('BORRADOR','CONFIRMADO') then raise exception 'Estado de contrato inválido.'; end if;
  select cantidad_tn,precio_tn,importe_total into v_qty,v_price,v_total from public.operaciones where id=p_operacion_id for update;
  if not found then raise exception 'Operación inexistente.'; end if;
  if nullif(p_datos->>'numero_contrato','') is null then raise exception 'El número de contrato es obligatorio.'; end if;
  if (p_datos->>'cantidad_tn')::numeric is distinct from v_qty then raise exception 'La cantidad contractual no coincide con la operación.'; end if;
  if (p_datos->>'precio_tn')::numeric is distinct from v_price then raise exception 'El precio contractual no coincide con la operación.'; end if;
  if (p_datos->>'importe_total')::numeric is distinct from v_total then raise exception 'El importe contractual no coincide con la operación.'; end if;
  select abierto_at,vencimiento_at into v_abierto_at,v_vencimiento_at from public.contratos where operacion_id=p_operacion_id for update;
  v_abierto_at:=coalesce(v_abierto_at,now()); v_vencimiento_at:=coalesce(v_vencimiento_at,v_abierto_at+interval '7 days');
  if now()>=v_vencimiento_at and v_estado<>'CONFIRMADO' then
    update public.contratos set estado='CANCELADO',cancelado_por_vencimiento_at=now(),updated_at=now() where operacion_id=p_operacion_id;
    update public.operacion_control_comercial set cancelacion_estado='CANCELADA_POR_VENCIMIENTO',
      cancelacion_motivo='Contrato no cerrado dentro del plazo máximo de 7 días.',cancelacion_fecha=now(),updated_at=now()
      where operacion_id=p_operacion_id;
    raise exception 'El contrato venció: el plazo máximo de 7 días fue superado.';
  end if;
  if v_estado='CONFIRMADO' then
    v_agreement_id:=nullif(p_datos->>'acuerdo_id','')::uuid;
    if v_agreement_id is null then raise exception 'El contrato confirmado requiere Acuerdo Comercial.'; end if;
    if not exists(select 1 from public.acuerdos_comerciales where id=v_agreement_id and operacion_id=p_operacion_id and estado='CONFIRMADO') then raise exception 'El Acuerdo Comercial debe estar confirmado antes del contrato.'; end if;
    if nullif(p_datos->>'contenido','') is null then raise exception 'El contrato confirmado requiere contenido.'; end if;
    if not public.operacion_comision_plataforma_segura(p_operacion_id) then raise exception 'La comisión obligatoria de AgroBrokerIA debe estar asegurada antes de cerrar el contrato.'; end if;
    if not exists(select 1 from public.operacion_control_comercial where operacion_id=p_operacion_id and no_elusion_aceptada=true) then raise exception 'Debe aceptarse la cláusula de no elusión antes de cerrar el contrato.'; end if;
  end if;
  insert into public.contratos(
    operacion_id,acuerdo_id,numero_contrato,tipo_contrato,estado,cantidad_tn,precio_tn,importe_total,
    lugar_carga,destino,condicion_entrega,forma_pago,plazo_pago,flete,calidad,observaciones,contenido,
    confirmado_at,updated_at,abierto_at,vencimiento_at,cancelado_por_vencimiento_at
  ) select p_operacion_id,nullif(p_datos->>'acuerdo_id','')::uuid,nullif(p_datos->>'numero_contrato',''),
    nullif(p_datos->>'tipo_contrato',''),v_estado,(p_datos->>'cantidad_tn')::numeric,(p_datos->>'precio_tn')::numeric,
    (p_datos->>'importe_total')::numeric,nullif(p_datos->>'lugar_carga',''),nullif(p_datos->>'destino',''),
    nullif(p_datos->>'condicion_entrega',''),nullif(p_datos->>'forma_pago',''),nullif(p_datos->>'plazo_pago',''),
    nullif(p_datos->>'flete',''),nullif(p_datos->>'calidad',''),nullif(p_datos->>'observaciones',''),p_datos->>'contenido',
    case when v_estado='CONFIRMADO' then now() end,now(),v_abierto_at,v_vencimiento_at,null
  on conflict(operacion_id) do update set acuerdo_id=excluded.acuerdo_id,numero_contrato=excluded.numero_contrato,
    tipo_contrato=excluded.tipo_contrato,estado=excluded.estado,cantidad_tn=excluded.cantidad_tn,precio_tn=excluded.precio_tn,
    importe_total=excluded.importe_total,lugar_carga=excluded.lugar_carga,destino=excluded.destino,
    condicion_entrega=excluded.condicion_entrega,forma_pago=excluded.forma_pago,plazo_pago=excluded.plazo_pago,
    flete=excluded.flete,calidad=excluded.calidad,observaciones=excluded.observaciones,contenido=excluded.contenido,
    confirmado_at=excluded.confirmado_at,updated_at=excluded.updated_at,abierto_at=public.contratos.abierto_at,
    vencimiento_at=public.contratos.vencimiento_at,cancelado_por_vencimiento_at=null
  returning id into v_id;
  return (select to_jsonb(c) from public.contratos c where c.id=v_id);
end; $$;

revoke all on function public.guardar_contrato_comercial(uuid,jsonb) from public,anon;
grant execute on function public.guardar_contrato_comercial(uuid,jsonb) to authenticated;

create or replace function public.expirar_contratos_vencidos()
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  with expired as (
    update public.contratos c set estado='CANCELADO',
      cancelado_por_vencimiento_at=coalesce(c.cancelado_por_vencimiento_at,now()),updated_at=now()
    where c.estado in ('BORRADOR','PENDIENTE')
      and coalesce(c.vencimiento_at,c.creado_en+interval '7 days')<=now()
    returning c.operacion_id
  )
  update public.operacion_control_comercial occ set cancelacion_estado='CANCELADA_POR_VENCIMIENTO',
    cancelacion_motivo='Contrato no cerrado dentro del plazo máximo de 7 días.',
    cancelacion_fecha=coalesce(occ.cancelacion_fecha,now()),updated_at=now()
  where occ.operacion_id in (select operacion_id from expired)
    and coalesce(occ.cancelacion_estado,'NO_CANCELADA')<>'CANCELADA_POR_VENCIMIENTO';
  get diagnostics v_count=row_count; return coalesce(v_count,0);
end; $$;
revoke all on function public.expirar_contratos_vencidos() from public,anon,authenticated;

create or replace function public.ensure_platform_commission_on_operation_acceptance()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_usd_id integer;
begin
  if new.estado='ACEPTADA' and old.estado is distinct from new.estado then
    select id into v_usd_id from public.monedas where codigo='USD' limit 1;
    if v_usd_id is null then raise exception 'No existe la moneda USD en el catálogo'; end if;
    insert into public.operacion_comisiones(
      operacion_id,empresa_id,profile_id,tipo_comision,tipo_ganancia,concepto,modalidad_calculo,
      cantidad_tn,valor_unitario,subtotal,moneda_id,iva_porcentaje,iva_importe,total,estado,
      factura_estado,saldo_pendiente,saldo_pagado,observaciones,origen_comision
    ) select new.id,null,null,'PLATAFORMA','USD_TN','Comisión propia AgroBroker IA','USD_TN',
      new.cantidad_tn,1,new.cantidad_tn,v_usd_id,0,0,new.cantidad_tn,'PENDIENTE','NO_CORRESPONDE',
      new.cantidad_tn,0,'Comisión automática de plataforma: USD 1 por tonelada.','AGROBROKER_IA'
    where new.cantidad_tn>0 and not exists(
      select 1 from public.operacion_comisiones oc where oc.operacion_id=new.id
        and oc.tipo_comision='PLATAFORMA' and oc.origen_comision='AGROBROKER_IA'
    );
  end if;
  return new;
end; $$;
revoke execute on function public.ensure_platform_commission_on_operation_acceptance() from public,anon,authenticated;
grant execute on function public.ensure_platform_commission_on_operation_acceptance() to postgres;

alter table public.adobe_sign_oauth_states enable row level security;
alter table public.adobe_sign_oauth_tokens enable row level security;
drop policy if exists adobe_sign_oauth_states_owner on public.adobe_sign_oauth_states;
create policy adobe_sign_oauth_states_owner on public.adobe_sign_oauth_states for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists adobe_sign_oauth_tokens_owner on public.adobe_sign_oauth_tokens;
create policy adobe_sign_oauth_tokens_owner on public.adobe_sign_oauth_tokens for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.adobe_sign_oauth_states from anon;
revoke all on public.adobe_sign_oauth_tokens from anon;

alter table public.google_oauth_states enable row level security;
alter table public.google_oauth_tokens enable row level security;
drop policy if exists google_oauth_states_owner on public.google_oauth_states;
create policy google_oauth_states_owner on public.google_oauth_states for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists google_oauth_tokens_owner on public.google_oauth_tokens;
create policy google_oauth_tokens_owner on public.google_oauth_tokens for all to authenticated
using ((select auth.uid())=connected_by) with check ((select auth.uid())=connected_by);
revoke all on public.google_oauth_states from anon;
revoke all on public.google_oauth_tokens from anon;
