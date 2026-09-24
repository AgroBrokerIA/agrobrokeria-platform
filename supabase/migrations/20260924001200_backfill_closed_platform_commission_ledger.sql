-- Backfill the platform commission ledger for legacy closed operations
-- whose confirmed liquidation already records the fixed USD 1/TN fee.
do $$
declare
  r record;
  v_comision_id uuid;
begin
  for r in
    select o.id as operacion_id, l.cantidad_entregada_tn as entregada_tn
    from public.operaciones o
    join public.operacion_liquidacion l on l.operacion_id=o.id
    where o.estado='CERRADA'
      and l.estado='CONFIRMADA'
      and l.cantidad_entregada_tn>0
      and not exists (
        select 1
        from public.operacion_comisiones c
        where c.operacion_id=o.id
          and c.origen_comision='AGROBROKER_IA'
          and c.tipo_comision='PLATAFORMA'
      )
  loop
    insert into public.operacion_comisiones(
      operacion_id,empresa_id,profile_id,tipo_comision,tipo_ganancia,concepto,
      modalidad_calculo,cantidad_tn,valor_unitario,porcentaje,valor_base,
      subtotal,moneda_id,iva_porcentaje,iva_importe,total,estado,factura_estado,
      saldo_pendiente,saldo_pagado,origen_comision,observaciones,creado_at,actualizado_at
    )
    values(
      r.operacion_id,null,null,'PLATAFORMA','USD_TN','Comisión propia AgroBroker IA',
      'USD_TN',r.entregada_tn,1,null,null,
      r.entregada_tn,2,0,0,r.entregada_tn,'PENDIENTE','NO_CORRESPONDE',
      r.entregada_tn,0,'AGROBROKER_IA',
      'Backfill de liquidación confirmada: USD 1 por tonelada entregada.',now(),now()
    )
    returning id into v_comision_id;

    insert into public.operacion_movimientos_economicos(
      operacion_id,comision_id,empresa_id,profile_id,tipo_movimiento,concepto,
      moneda_id,importe,signo,estado,referencia,fecha_movimiento,creado_at,actualizado_at
    )
    values(
      r.operacion_id,v_comision_id,null,null,'COMISION_GENERADA',
      'Comisión propia AgroBroker IA — USD 1/TN',2,r.entregada_tn,1,
      'PENDIENTE','AGROBROKER-IA-'||r.operacion_id,now(),now(),now()
    );
  end loop;
end $$;
