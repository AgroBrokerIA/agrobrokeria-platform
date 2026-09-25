create or replace function public.guardar_liquidacion_operacion(p_operacion_id uuid,p_datos jsonb)
returns jsonb language plpgsql security definer set search_path=public
as $function$
declare
  v_uid uuid := auth.uid(); v_row public.operacion_liquidacion; v_id uuid; v_estado text;
  v_kilos numeric; v_entregada_tn numeric; v_contractual_tn numeric; v_precio_tn numeric;
  v_bruto numeric; v_ajustes numeric; v_deducciones numeric; v_neto numeric; v_comision numeric;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'FORBIDDEN'; end if;
  v_estado:=coalesce(nullif(trim(p_datos->>'estado'),''),'PRELIQUIDADA');
  if v_estado not in ('PRELIQUIDADA','CONFIRMADA') then raise exception 'INVALID_LIQUIDATION_STATE'; end if;
  v_kilos:=coalesce((p_datos->>'kilos_entregados')::numeric,0);
  if v_kilos<0 then raise exception 'INVALID_DELIVERED_QUANTITY'; end if;
  v_entregada_tn:=v_kilos/1000;
  select coalesce(c.cantidad_tn,o.cantidad_tn,0),coalesce(c.precio_tn,o.precio_tn,0)
    into v_contractual_tn,v_precio_tn
  from public.operaciones o
  left join public.contratos c on c.operacion_id=o.id and c.estado='CONFIRMADO'
  where o.id=p_operacion_id
  order by c.confirmado_at desc nulls last limit 1;
  if v_contractual_tn is null then raise exception 'OPERATION_NOT_FOUND'; end if;
  if v_contractual_tn<0 or v_precio_tn<0 then raise exception 'INVALID_CONTRACT_VALUES'; end if;
  v_ajustes:=coalesce((p_datos->>'ajustes_usd')::numeric,0);
  v_deducciones:=coalesce((p_datos->>'deducciones_usd')::numeric,0);
  if v_ajustes<0 or v_deducciones<0 then raise exception 'INVALID_LIQUIDATION_ADJUSTMENTS'; end if;
  v_bruto:=v_entregada_tn*v_precio_tn;
  v_neto:=v_bruto-v_ajustes-v_deducciones;
  v_comision:=v_entregada_tn;
  if v_neto<0 then raise exception 'INVALID_NET_LIQUIDATION'; end if;
  v_id:=nullif(p_datos->>'id','')::uuid;
  if v_id is not null then
    update public.operacion_liquidacion set estado=v_estado,cantidad_contractual_tn=v_contractual_tn,
      kilos_entregados=v_kilos,cantidad_entregada_tn=v_entregada_tn,diferencia_tn=v_contractual_tn-v_entregada_tn,
      precio_tn=v_precio_tn,importe_bruto_usd=v_bruto,ajustes_usd=v_ajustes,deducciones_usd=v_deducciones,
      comision_agrobroker_usd=v_comision,importe_neto_usd=v_neto,
      fecha_liquidacion=nullif(p_datos->>'fecha_liquidacion','')::timestamptz,
      referencia_comprobante=p_datos->>'referencia_comprobante',observaciones=p_datos->>'observaciones',updated_at=now()
    where id=v_id and operacion_id=p_operacion_id returning * into v_row;
  else
    insert into public.operacion_liquidacion(operacion_id,estado,cantidad_contractual_tn,kilos_entregados,cantidad_entregada_tn,
      diferencia_tn,precio_tn,importe_bruto_usd,ajustes_usd,deducciones_usd,comision_agrobroker_usd,importe_neto_usd,
      fecha_liquidacion,referencia_comprobante,observaciones,creado_por,creado_at,updated_at)
    values(p_operacion_id,v_estado,v_contractual_tn,v_kilos,v_entregada_tn,v_contractual_tn-v_entregada_tn,
      v_precio_tn,v_bruto,v_ajustes,v_deducciones,v_comision,v_neto,nullif(p_datos->>'fecha_liquidacion','')::timestamptz,
      p_datos->>'referencia_comprobante',p_datos->>'observaciones',v_uid,now(),now()) returning * into v_row;
  end if;
  if v_row.id is null then raise exception 'LIQUIDATION_NOT_FOUND'; end if;
  return to_jsonb(v_row);
end;
$function$;

revoke all on function public.guardar_liquidacion_operacion(uuid,jsonb) from public,anon;
grant execute on function public.guardar_liquidacion_operacion(uuid,jsonb) to authenticated;
