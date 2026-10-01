-- Pricing and acceptance hardening applied to the remote project.
-- Keeps pricing calculations tied to the operation/market quote currency and
-- removes the previous unconditional USD fallback from offer acceptance.

create or replace function public.calcular_precio_operacion(
  p_operation_id uuid,
  p_market_quote_id uuid,
  p_base_price numeric,
  p_premium numeric default 0,
  p_discount numeric default 0,
  p_freight numeric default 0,
  p_taxes numeric default 0,
  p_commission numeric default 0,
  p_other_costs numeric default 0,
  p_formula text default 'BASE'
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare
  v_uid uuid:=auth.uid(); v_id uuid; v_op public.operaciones%rowtype;
  v_q public.market_quotes%rowtype; v_product_id integer; v_commodity_id uuid;
  v_quantity numeric; v_unit text; v_currency text; v_price_type text;
  v_base numeric; v_final numeric;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_operation_id is not null and not public.usuario_participa_operacion(p_operation_id) then raise exception 'FORBIDDEN'; end if;
  if p_operation_id is not null then
    select * into v_op from public.operaciones where id=p_operation_id;
    if v_op.id is null then raise exception 'OPERATION_NOT_FOUND'; end if;
    v_quantity:=coalesce(v_op.cantidad_tn,v_op.cantidad_original,0);
    v_currency:=(select m.codigo from public.monedas m where m.id=v_op.moneda_id);
    select coalesce(pc.producto_id,pv.producto_id)
      into v_product_id
      from public.operaciones o
      left join public.publicaciones pc on pc.id=o.publicacion_compra_id
      left join public.publicaciones pv on pv.id=o.publicacion_venta_id
      where o.id=p_operation_id;
  end if;
  if p_market_quote_id is not null then
    select * into v_q from public.market_quotes where id=p_market_quote_id;
    if v_q.id is null then raise exception 'MARKET_QUOTE_NOT_FOUND'; end if;
    v_commodity_id:=v_q.commodity_id; v_product_id:=coalesce(v_q.product_id,v_product_id);
  end if;
  v_base:=coalesce(p_base_price,v_q.price);
  if v_base is null then raise exception 'PRICE_REQUIRED'; end if;
  v_unit:=coalesce(v_q.unit,v_op.unidad_base,'TN');
  v_currency:=coalesce(v_q.currency,v_currency,'SIN_MONEDA');
  v_price_type:=coalesce(v_q.price_type,'FIXED');
  v_final:=v_base+coalesce(p_premium,0)-coalesce(p_discount,0)-coalesce(p_freight,0)+coalesce(p_taxes,0)+coalesce(p_commission,0)+coalesce(p_other_costs,0);
  insert into public.pricing_calculations(
    operation_id,commodity_id,product_id,quantity,unit,currency,price_type,market_quote_id,
    base_price,premium,discount,freight,taxes,commission,other_costs,final_price,formula,snapshot
  ) values (
    p_operation_id,v_commodity_id,v_product_id,coalesce(v_quantity,0),v_unit,v_currency,v_price_type,p_market_quote_id,
    v_base,coalesce(p_premium,0),coalesce(p_discount,0),coalesce(p_freight,0),coalesce(p_taxes,0),
    coalesce(p_commission,0),coalesce(p_other_costs,0),v_final,p_formula,
    jsonb_build_object('quote_id',p_market_quote_id,'source',v_q.source,'source_reference',v_q.source_reference,
      'market_date',v_q.market_date,'obtained_at',v_q.obtained_at,'price',v_q.price,'currency',v_currency,
      'unit',v_unit,'position',v_q.position,'market',v_q.market,'port',v_q.port,
      'operation_currency',v_currency,'product_id',v_product_id)
  ) returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.calcular_precio_operacion(uuid,uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric,text) from public,anon;
grant execute on function public.calcular_precio_operacion(uuid,uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric,text) to authenticated;

create or replace function public.procesar_aceptacion_oferta(p_oferta_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_uid uuid:=auth.uid(); v_of record; v_workflow record; v_stage record; v_ow uuid;
  v_control uuid; v_qty numeric; v_currency text; v_currency_id integer;
  v_platform_intermediary uuid; v_price_calc uuid;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select o.*,p.empresa_id as vendedor_empresa,p.id as pub_id into v_of
  from ofertas_negociacion o join publicaciones p on p.id=o.publicacion_id
  where o.id=p_oferta_id for update;
  if not found then raise exception 'Oferta inexistente'; end if;
  if not exists(select 1 from company_users where company_id=v_of.vendedor_empresa and profile_id=v_uid and activo=true) then raise exception 'No autorizado para aceptar esta oferta'; end if;
  if v_of.vendedor_empresa=v_of.empresa_id then raise exception 'Comprador y vendedor no pueden ser la misma empresa'; end if;
  select cantidad_tn,moneda_id into v_qty,v_currency_id from operaciones where id=v_of.operacion_id for update;
  if v_qty is null or v_qty<=0 then raise exception 'Operación sin cantidad válida'; end if;
  v_currency:=(select codigo from monedas where id=v_currency_id);
  update ofertas_negociacion set estado='ACEPTADA' where id=p_oferta_id;
  update operaciones set estado='ACEPTADA' where id=v_of.operacion_id;
  insert into operacion_participantes(operacion_id,empresa_id,rol,porcentaje_comision,monto_comision,factura_presentada,factura_aprobada)
  values(v_of.operacion_id,v_of.vendedor_empresa,'VENDEDOR',null,null,false,false)
  on conflict(operacion_id,empresa_id,rol) do nothing;
  insert into operacion_participantes(operacion_id,empresa_id,rol,porcentaje_comision,monto_comision,factura_presentada,factura_aprobada)
  values(v_of.operacion_id,v_of.empresa_id,'COMPRADOR',null,null,false,false)
  on conflict(operacion_id,empresa_id,rol) do nothing;
  select op.empresa_id into v_platform_intermediary from operacion_participantes op
  where op.operacion_id=v_of.operacion_id and op.rol='INTERMEDIARIO' order by op.empresa_id limit 1;
  if v_platform_intermediary is null then
    select e.id into v_platform_intermediary from empresas e
    where e.razon_social ilike '%AgroBrokerIA%' or e.nombre_comercial ilike '%AgroBrokerIA%'
    order by e.creado_en limit 1;
    if v_platform_intermediary is not null then
      insert into operacion_participantes(operacion_id,empresa_id,rol,porcentaje_comision,monto_comision,factura_presentada,factura_aprobada)
      values(v_of.operacion_id,v_platform_intermediary,'INTERMEDIARIO',null,v_qty,false,false)
      on conflict(operacion_id,empresa_id,rol) do update set monto_comision=excluded.monto_comision;
    end if;
  end if;
  insert into operacion_control_comercial(operacion_id,comision_monto,comision_moneda,updated_at)
  values(v_of.operacion_id,v_qty,coalesce(v_currency,'SIN_MONEDA'),now())
  on conflict(operacion_id) do update set comision_monto=excluded.comision_monto,comision_moneda=excluded.comision_moneda,updated_at=now()
  returning id into v_control;
  if v_platform_intermediary is not null and not exists(
    select 1 from comisiones c where c.operacion_id=v_of.operacion_id and c.participante_id=v_platform_intermediary and c.tipo='AGROBROKERIA'
  ) then
    insert into comisiones(operacion_id,participante_id,tipo,valor,importe_calculado,moneda_id,estado)
    values(v_of.operacion_id,v_platform_intermediary,'AGROBROKERIA',1,v_qty,v_currency_id,'PENDIENTE');
  end if;
  begin
    v_price_calc:=public.calcular_precio_operacion(v_of.operacion_id,null,v_of.precio_tn,0,0,0,0,0,0,'ACEPTACION');
  exception when others then v_price_calc:=null;
  end;
  select id into v_workflow from workflows where nombre='Operación de granos' and activo=true limit 1;
  if v_workflow.id is null then raise exception 'No existe workflow activo de Operación de granos'; end if;
  select id into v_stage from workflow_etapas where workflow_id=v_workflow.id and orden=1 limit 1;
  if v_stage.id is null then raise exception 'El workflow no tiene etapa inicial'; end if;
  select id into v_ow from operacion_workflow where operacion_id=v_of.operacion_id limit 1 for update;
  if v_ow is null then
    insert into operacion_workflow(operacion_id,workflow_id,etapa_actual_id,estado)
    values(v_of.operacion_id,v_workflow.id,v_stage.id,'EN_CURSO') returning id into v_ow;
    insert into workflow_historial(operacion_workflow_id,etapa_id,fecha_inicio,usuario_id,observaciones)
    values(v_ow,v_stage.id,now(),v_uid,'La oferta fue aceptada y se inició el workflow de la operación.');
  end if;
  return jsonb_build_object('oferta_id',p_oferta_id,'operacion_id',v_of.operacion_id,'estado','ACEPTADA',
    'control_id',v_control,'workflow_id',v_ow,'pricing_calculation_id',v_price_calc,
    'comision_agrobroker_por_tn',1,'comision_agrobroker_total',v_qty,'comision_moneda',coalesce(v_currency,'SIN_MONEDA'));
end $$;

revoke execute on function public.procesar_aceptacion_oferta(uuid) from public,anon;
grant execute on function public.procesar_aceptacion_oferta(uuid) to authenticated;
