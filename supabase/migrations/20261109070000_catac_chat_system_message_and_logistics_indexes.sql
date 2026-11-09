-- Send the CATAC reference as a trusted system message and index the new freight relationships.

create index if not exists cierres_logistica_operacion_id_idx
  on public.cierres_logistica(operacion_id);
create index if not exists viajes_cierre_logistica_id_idx
  on public.viajes(cierre_logistica_id);
create index if not exists conversaciones_fletes_cierre_logistica_id_idx
  on public.conversaciones_fletes(cierre_logistica_id);
create index if not exists mensajes_fletes_conversacion_id_idx
  on public.mensajes_fletes(conversacion_id);
create index if not exists operacion_participantes_operacion_empresa_idx
  on public.operacion_participantes(operacion_id,empresa_id);
create index if not exists tarifas_referencia_catac_rango_idx
  on public.tarifas_referencia_catac(distancia_km_desde,distancia_km_hasta);

create or replace function public.enviar_referencia_catac_al_chat(
  p_conversacion_id uuid,
  p_distancia_km integer,
  p_toneladas numeric
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_conv public.conversaciones_fletes%rowtype;
  v_cierre public.cierres_logistica%rowtype;
  v_tarifa numeric(14,2);
  v_total_catac numeric(14,2);
  v_flete_unitario_catac numeric(14,2);
  v_comision_unitaria_estimada numeric(14,2);
  v_comision_total_estimada numeric(14,2);
  v_message_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_distancia_km is null or p_distancia_km<=0 or p_toneladas is null or p_toneladas<=0 then
    raise exception 'CATAC_INPUT_INVALID';
  end if;

  select * into v_conv from public.conversaciones_fletes where id=p_conversacion_id;
  if not found then raise exception 'FREIGHT_CONVERSATION_NOT_FOUND'; end if;
  if not(
    public.usuario_es_miembro_empresa(v_conv.empresa_transportista_id)
    or public.usuario_es_miembro_empresa(v_conv.empresa_dadora_id)
  ) then raise exception 'FORBIDDEN'; end if;

  select * into v_cierre from public.cierres_logistica where id=v_conv.cierre_logistica_id;
  if not found then raise exception 'FREIGHT_CLOSURE_NOT_FOUND'; end if;

  select t.valor_tonelada_ars into v_tarifa
  from public.tarifas_referencia_catac t
  where p_distancia_km between t.distancia_km_desde and t.distancia_km_hasta
  order by t.ultima_actualizacion desc,t.id_tarifa_catac desc
  limit 1;
  if v_tarifa is null then raise exception 'CATAC_RATE_NOT_FOUND'; end if;

  v_total_catac:=round(v_tarifa*p_toneladas,2);
  v_flete_unitario_catac:=round(v_total_catac/nullif(v_cierre.cantidad_camiones,0),2);
  v_comision_unitaria_estimada:=round(v_flete_unitario_catac*0.01,2);
  v_comision_total_estimada:=v_comision_unitaria_estimada*v_cierre.cantidad_camiones;

  insert into public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje)
  values(
    p_conversacion_id,null,true,
    '📊 [AgroBrokerIA Asistente] Referencia CATAC para el trayecto: '||p_distancia_km||' km. '||
    'Tarifa vigente: $'||to_char(v_tarifa,'FM999G999G990D00')||' ARS/TN. '||
    'Para '||to_char(p_toneladas,'FM999G999G990D000')||' TN, total referencial: $'||
    to_char(v_total_catac,'FM999G999G990D00')||' ARS. '||
    'Distribuido entre '||v_cierre.cantidad_camiones||' camión(es): $'||
    to_char(v_flete_unitario_catac,'FM999G999G990D00')||' ARS por camión. '||
    'Comisión estimada AgroBrokerIA (1% por camión): $'||
    to_char(v_comision_unitaria_estimada,'FM999G999G990D00')||' ARS por unidad; total estimado $'||
    to_char(v_comision_total_estimada,'FM999G999G990D00')||' ARS. '||
    'La tarifa es una referencia editable. La comisión definitiva se recalcula al 1% sobre el valor de flete por camión que acuerden las partes y quede registrado en el cierre.'
  )
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke all on function public.enviar_referencia_catac_al_chat(uuid,integer,numeric) from public,anon;
grant execute on function public.enviar_referencia_catac_al_chat(uuid,integer,numeric) to authenticated;
