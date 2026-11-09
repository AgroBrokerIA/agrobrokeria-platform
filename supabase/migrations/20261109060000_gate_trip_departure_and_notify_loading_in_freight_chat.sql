-- Do not record departure/transit until logistics commission, any requested fuel advance and ARCA CPE are cleared.
-- Report loading automatically in the private freight chat.

create or replace function public.registrar_evento_viaje(
  p_viaje_id uuid,
  p_estado text,
  p_lugar text default null,
  p_empresa_nombre text default null,
  p_toneladas numeric default null,
  p_observaciones text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_v public.viajes%rowtype;
  v_cierre public.cierres_logistica%rowtype;
  v_id uuid;
  v_conv uuid;
  v_orden integer;
  v_prev integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_v from public.viajes where id=p_viaje_id for update;
  if not found then raise exception 'TRIP_NOT_FOUND'; end if;
  if not(public.es_administrador_plataforma() or v_v.transportista_profile_id=auth.uid() or public.usuario_puede_gestionar_logistica_operacion(v_v.operacion_id)) then
    raise exception 'FORBIDDEN';
  end if;
  if p_estado='ENTREGA_CONFIRMADA' then raise exception 'USE_BUYER_DELIVERY_CONFIRMATION'; end if;

  if p_estado in ('SALIDA_ORIGEN','EN_TRANSITO') then
    if v_v.cierre_logistica_id is null then raise exception 'LOGISTICS_CLOSURE_REQUIRED'; end if;
    select * into v_cierre from public.cierres_logistica where id=v_v.cierre_logistica_id;
    if not found or v_cierre.operacion_id<>v_v.operacion_id or v_cierre.estado_pago_comision_logistica<>'aprobado' then
      raise exception 'LOGISTICS_COMMISSION_NOT_APPROVED';
    end if;
    if v_v.carta_porte_ctg is null or v_v.carta_porte_estado<>'EMITIDA' then
      raise exception 'ARCA_CPE_NOT_ISSUED';
    end if;
    if exists(
      select 1 from public.logistica_adelantos_combustible a
      where a.cierre_logistica_id=v_cierre.id and a.estado in ('ACEPTADO_POR_DADOR','COMPROBANTE_CARGADO')
    ) then raise exception 'FUEL_ADVANCE_PENDING_MANUAL_VALIDATION'; end if;
  end if;

  v_orden:=array_position(array['CAMION_ASIGNADO','ARRIBO_ORIGEN','INICIO_CARGA','CARGA_FINALIZADA','SALIDA_ORIGEN','EN_TRANSITO','ARRIBO_DESTINO','INICIO_DESCARGA','DESCARGA_FINALIZADA'],p_estado);
  if v_orden is null then raise exception 'INVALID_TRIP_EVENT'; end if;
  select max(array_position(array['CAMION_ASIGNADO','ARRIBO_ORIGEN','INICIO_CARGA','CARGA_FINALIZADA','SALIDA_ORIGEN','EN_TRANSITO','ARRIBO_DESTINO','INICIO_DESCARGA','DESCARGA_FINALIZADA'],estado))
  into v_prev from public.viaje_eventos where viaje_id=p_viaje_id;
  if v_prev is not null and v_orden>v_prev+1 then raise exception 'TRIP_EVENT_SEQUENCE_INVALID'; end if;

  insert into public.viaje_eventos(viaje_id,operacion_id,estado,lugar,empresa_nombre,toneladas,observaciones,registrado_por)
  values(p_viaje_id,v_v.operacion_id,p_estado,p_lugar,p_empresa_nombre,p_toneladas,p_observaciones,auth.uid())
  returning id into v_id;
  update public.viajes set estado=p_estado,actualizado_at=now() where id=p_viaje_id;

  if p_estado='CARGA_FINALIZADA' and v_v.cierre_logistica_id is not null then
    select id into v_conv from public.conversaciones_fletes where cierre_logistica_id=v_v.cierre_logistica_id limit 1;
    if v_conv is not null then
      insert into public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje)
      values(
        v_conv,null,true,
        '🌾 [AgroBrokerIA Logística] Carga reportada en origen. Patente: '||coalesce(v_v.patente_camion,'Pendiente')||
        '. Origen: '||coalesce(v_v.origen_nombre,v_v.origen,'No informado')||
        '. CPE/CTG: '||coalesce(v_v.carta_porte_ctg,'Pendiente')||
        ' (estado ARCA: '||coalesce(v_v.carta_porte_estado,'PENDIENTE')||'). Destino: '||
        coalesce(v_v.destino_nombre,v_v.destino,'No informado')||
        '. Se registrarán eventos de viaje y alertas de telemetría cuando el dispositivo conectado envíe datos.'
      );
    end if;
  end if;
  return v_id;
end;
$$;

revoke all on function public.registrar_evento_viaje(uuid,text,text,text,numeric,text) from public,anon;
grant execute on function public.registrar_evento_viaje(uuid,text,text,text,numeric,text) to authenticated;
