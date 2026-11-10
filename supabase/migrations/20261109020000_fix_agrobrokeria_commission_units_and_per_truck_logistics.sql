-- Correct AgroBrokerIA platform commission units and make logistics commission auditable per truck.
-- Grain brokerage remains a fixed USD 1 per metric ton. Logistics remains 1% in ARS per contracted truck.

alter table public.config_comisiones_agrobrokeria
  add column if not exists comision_granos_usd_por_tn numeric(14,4) not null default 1.0000;

update public.config_comisiones_agrobrokeria
set comision_granos_usd_por_tn = 1.0000,
    comision_logistica_pct = 1.000,
    updated_at = now()
where id = 1;

comment on column public.config_comisiones_agrobrokeria.comision_granos_usd_por_tn
  is 'Comisión fija de AgroBrokerIA por compraventa de granos: USD 1 por tonelada métrica. No es un porcentaje.';
comment on column public.config_comisiones_agrobrokeria.comision_granos_pct
  is 'LEGACY / DEPRECATED. No utilizar para calcular la comisión de granos; la comisión vigente es USD 1 por tonelada.';
comment on column public.config_comisiones_agrobrokeria.comision_logistica_pct
  is 'Comisión fija de AgroBrokerIA en logística: 1% en ARS por camión contratado, aplicada al valor de flete de cada camión.';

alter table public.cierres_logistica
  add column if not exists valor_flete_por_camion_ars numeric(14,2),
  add column if not exists comision_logistica_por_camion_ars numeric(14,2);

update public.cierres_logistica
set valor_flete_por_camion_ars = round(total_flete_pactado_ars / nullif(cantidad_camiones, 0), 2),
    comision_logistica_por_camion_ars = round(
      round((total_flete_pactado_ars / nullif(cantidad_camiones, 0)) * 0.01, 2), 2
    )
where valor_flete_por_camion_ars is null
   or comision_logistica_por_camion_ars is null;

comment on column public.cierres_logistica.valor_flete_por_camion_ars
  is 'Valor unitario promedio del flete por camión dentro de este cierre, en ARS.';
comment on column public.cierres_logistica.comision_logistica_por_camion_ars
  is 'Comisión AgroBrokerIA por camión: 1% del valor del flete unitario, redondeada a centavos ARS.';

create or replace function public.cerrar_operacion_logistica_market(
  p_oferta_id uuid,
  p_demanda_id uuid,
  p_total_flete_ars numeric
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
  o public.ofertas_logistica%rowtype;
  d public.demandas_logistica%rowtype;
  pct numeric(6,3) := 1.000;
  cid uuid;
  conv uuid;
  qty integer;
  code text;
  flete_unitario numeric(14,2);
  comision_unitaria numeric(14,2);
  comision_total numeric(14,2);
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_total_flete_ars is null or p_total_flete_ars <= 0 then
    raise exception 'TOTAL_FLETE_INVALIDO';
  end if;

  select * into o
  from public.ofertas_logistica
  where id = p_oferta_id and estado = 'PUBLICADA'
  for update;
  if not found then raise exception 'OFERTA_FLETE_NO_DISPONIBLE'; end if;

  select * into d
  from public.demandas_logistica
  where id = p_demanda_id and estado in ('PUBLICADA','PARCIAL')
  for update;
  if not found then raise exception 'DEMANDA_FLETE_NO_DISPONIBLE'; end if;

  if not public.usuario_es_miembro_empresa(d.empresa_dadora_id) then
    raise exception 'SOLO_EL_DADOR_PUEDE_CERRAR';
  end if;
  if o.empresa_transportista_id = d.empresa_dadora_id then
    raise exception 'PARTES_INVALIDAS';
  end if;
  if not exists (
    select 1 from public.transportistas t
    where t.id = o.transportista_id
      and t.empresa_id = o.empresa_transportista_id
      and t.verificacion_estado = 'VERIFICADO'
  ) then
    raise exception 'TRANSPORTISTA_VERIFICADO_REQUERIDO';
  end if;

  qty := least(o.cantidad_camiones, d.cantidad_camiones_necesitados);
  if qty <= 0 then raise exception 'CANTIDAD_CAMIONES_INVALIDA'; end if;

  -- p_total_flete_ars is the agreed total for this closure.
  -- Split it evenly across the contracted trucks, then calculate and round 1% per truck.
  flete_unitario := round(p_total_flete_ars / qty, 2);
  comision_unitaria := round(flete_unitario * pct / 100, 2);
  comision_total := comision_unitaria * qty;

  code := 'OP-LOG-' || to_char(now(),'YYYYMMDD') || '-' ||
          upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  insert into public.cierres_logistica(
    codigo_operacion, id_oferta_flete, id_demanda_flete,
    empresa_transportista_id, empresa_dadora_id, cantidad_camiones,
    total_flete_pactado_ars, valor_flete_por_camion_ars,
    comision_logistica_pct, comision_logistica_por_camion_ars,
    comision_logistica_ars, estado_cierre, creado_por
  )
  values(
    code, o.id, d.id, o.empresa_transportista_id, d.empresa_dadora_id, qty,
    p_total_flete_ars, flete_unitario, pct, comision_unitaria,
    comision_total, 'cerrado_formal', uid
  )
  returning id into cid;

  insert into public.conversaciones_fletes(
    cierre_logistica_id, empresa_transportista_id, empresa_dadora_id
  )
  values(cid, o.empresa_transportista_id, d.empresa_dadora_id)
  returning id into conv;

  insert into public.mensajes_fletes(
    conversacion_id, emisor_profile_id, es_sistema, mensaje
  )
  values(
    conv, null, true,
    '¡Operación de flete cerrada con éxito! La empresa de transporte comprometió ' ||
    qty || ' camión(es) con origen en ' || o.ubicacion_actual ||
    ' hacia ' || coalesce(o.destino_solicitado, d.destino_carga) ||
    '. Valor total del flete: $' || to_char(p_total_flete_ars,'FM999G999G990D00') ||
    ' ARS. Valor promedio por camión: $' || to_char(flete_unitario,'FM999G999G990D00') ||
    ' ARS. Comisión AgroBrokerIA: 1% por camión ($' ||
    to_char(comision_unitaria,'FM999G999G990D00') ||
    ' ARS por unidad), total $' ||
    to_char(comision_total,'FM999G999G990D00') ||
    ' ARS. El transportista debe transferir la comisión a la cuenta oficial de AgroComercio Santa Fe. Administración verificará manualmente el ingreso bancario antes de habilitar la asignación de patentes y choferes y la prevalidación documental de la CPE ante ARCA.'
  );

  if o.cantidad_camiones > qty then
    update public.ofertas_logistica
    set cantidad_camiones = cantidad_camiones - qty,
        actualizado_at = now()
    where id = o.id;
  else
    update public.ofertas_logistica
    set estado = 'ASIGNADA', actualizado_at = now()
    where id = o.id;
  end if;

  if d.cantidad_camiones_necesitados > qty then
    update public.demandas_logistica
    set cantidad_camiones_necesitados = cantidad_camiones_necesitados - qty,
        estado = 'PARCIAL',
        actualizado_at = now()
    where id = d.id;
  else
    update public.demandas_logistica
    set estado = 'CUBIERTA', actualizado_at = now()
    where id = d.id;
  end if;

  return cid;
end;
$$;

revoke all on function public.cerrar_operacion_logistica_market(uuid, uuid, numeric)
  from public, anon;
grant execute on function public.cerrar_operacion_logistica_market(uuid, uuid, numeric)
  to authenticated;
