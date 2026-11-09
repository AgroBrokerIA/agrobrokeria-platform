-- Enforce the 1% ARS logistics commission before a truck/driver can be assigned or a CPE can be issued.
-- A freight demand must be linked to a real grain operation; the closure stores that operation ID.

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
  if p_total_flete_ars is null or p_total_flete_ars <= 0 then raise exception 'TOTAL_FLETE_INVALIDO'; end if;

  select * into o from public.ofertas_logistica
  where id=p_oferta_id and estado='PUBLICADA' for update;
  if not found then raise exception 'OFERTA_FLETE_NO_DISPONIBLE'; end if;

  select * into d from public.demandas_logistica
  where id=p_demanda_id and estado in ('PUBLICADA','PARCIAL') for update;
  if not found then raise exception 'DEMANDA_FLETE_NO_DISPONIBLE'; end if;

  if not public.usuario_es_miembro_empresa(d.empresa_dadora_id) then raise exception 'SOLO_EL_DADOR_PUEDE_CERRAR'; end if;
  if o.empresa_transportista_id=d.empresa_dadora_id then raise exception 'PARTES_INVALIDAS'; end if;
  if d.operacion_id is null then raise exception 'OPERACION_GRANOS_REQUERIDA_PARA_FLETE'; end if;
  if not exists(
    select 1 from public.operacion_participantes op
    where op.operacion_id=d.operacion_id and op.empresa_id=d.empresa_dadora_id
  ) then raise exception 'DADOR_NO_PARTICIPA_EN_OPERACION'; end if;
  if not exists(
    select 1 from public.transportistas t
    where t.id=o.transportista_id and t.empresa_id=o.empresa_transportista_id
      and t.verificacion_estado='VERIFICADO' and t.activo=true
  ) then raise exception 'TRANSPORTISTA_VERIFICADO_REQUERIDO'; end if;

  qty:=least(o.cantidad_camiones,d.cantidad_camiones_necesitados);
  if qty<=0 then raise exception 'CANTIDAD_CAMIONES_INVALIDA'; end if;

  flete_unitario:=round(p_total_flete_ars/qty,2);
  comision_unitaria:=round(flete_unitario*pct/100,2);
  comision_total:=comision_unitaria*qty;
  code:='OP-LOG-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  insert into public.cierres_logistica(
    codigo_operacion,operacion_id,id_oferta_flete,id_demanda_flete,
    empresa_transportista_id,empresa_dadora_id,cantidad_camiones,
    total_flete_pactado_ars,valor_flete_por_camion_ars,
    comision_logistica_pct,comision_logistica_por_camion_ars,
    comision_logistica_ars,estado_cierre,creado_por
  )
  values(
    code,d.operacion_id,o.id,d.id,o.empresa_transportista_id,d.empresa_dadora_id,qty,
    p_total_flete_ars,flete_unitario,pct,comision_unitaria,
    comision_total,'cerrado_formal',uid
  )
  returning id into cid;

  insert into public.conversaciones_fletes(cierre_logistica_id,empresa_transportista_id,empresa_dadora_id)
  values(cid,o.empresa_transportista_id,d.empresa_dadora_id)
  returning id into conv;

  insert into public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje)
  values(
    conv,null,true,
    '¡Operación de flete cerrada con éxito! Se reservaron '||qty||' camión(es) para la operación '||d.operacion_id||
    ', desde '||d.origen_carga||' hacia '||d.destino_carga||
    '. Flete total: $'||to_char(p_total_flete_ars,'FM999G999G990D00')||
    ' ARS. Valor por camión: $'||to_char(flete_unitario,'FM999G999G990D00')||
    ' ARS. Comisión AgroBrokerIA: 1% por camión ($'||to_char(comision_unitaria,'FM999G999G990D00')||
    ' ARS por unidad), total $'||to_char(comision_total,'FM999G999G990D00')||
    ' ARS. El transportista debe transferir la comisión y cargar el comprobante. La asignación de vehículos/choferes y la CPE quedan bloqueadas hasta la aprobación manual del pago por Administración.'
  );

  if o.cantidad_camiones>qty then
    update public.ofertas_logistica set cantidad_camiones=cantidad_camiones-qty,actualizado_at=now() where id=o.id;
  else
    update public.ofertas_logistica set estado='ASIGNADA',actualizado_at=now() where id=o.id;
  end if;

  if d.cantidad_camiones_necesitados>qty then
    update public.demandas_logistica set cantidad_camiones_necesitados=cantidad_camiones_necesitados-qty,estado='PARCIAL',actualizado_at=now() where id=d.id;
  else
    update public.demandas_logistica set estado='CUBIERTA',actualizado_at=now() where id=d.id;
  end if;
  return cid;
end;
$$;

create or replace function public.crear_viaje_operacion_con_vehiculos(
  p_operacion_id uuid,
  p_transportista_profile_id uuid,
  p_vehiculo_id uuid,
  p_acoplado_vehiculo_id uuid,
  p_origen text,
  p_destino text,
  p_origen_nombre text,
  p_destino_nombre text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_id uuid;
  v_transportista_id uuid;
  v_empresa_transportista_id uuid;
  v_verified text;
  v_patente text;
  v_acoplado text;
  v_cierre_id uuid;
begin
  if auth.uid() is null or not public.usuario_puede_gestionar_logistica_operacion(p_operacion_id) then raise exception 'FORBIDDEN'; end if;

  select id,empresa_id,verificacion_estado into v_transportista_id,v_empresa_transportista_id,v_verified
  from public.transportistas where profile_id=p_transportista_profile_id and activo=true;
  if v_transportista_id is null or v_verified is distinct from 'VERIFICADO' then raise exception 'TRANSPORTISTA_NOT_VERIFIED'; end if;

  select patente::text into v_patente from public.vehiculos
  where id=p_vehiculo_id and transportista_id=v_transportista_id and habilitado=true and upper(tipo)='CAMION';
  if v_patente is null then raise exception 'CAMION_NO_REGISTRADO_PARA_TRANSPORTISTA'; end if;
  if p_acoplado_vehiculo_id is not null then
    select patente::text into v_acoplado from public.vehiculos
    where id=p_acoplado_vehiculo_id and transportista_id=v_transportista_id and habilitado=true and upper(tipo)='ACOPLADO';
    if v_acoplado is null then raise exception 'ACOPLADO_NO_REGISTRADO_PARA_TRANSPORTISTA'; end if;
  end if;

  select c.id into v_cierre_id
  from public.cierres_logistica c
  where c.operacion_id=p_operacion_id
    and c.empresa_transportista_id=v_empresa_transportista_id
    and c.estado_cierre='cerrado_formal'
    and c.estado_pago_comision_logistica='aprobado'
    and (select count(*) from public.viajes v where v.cierre_logistica_id=c.id)<c.cantidad_camiones
  order by c.fecha_cierre asc
  limit 1 for update skip locked;
  if v_cierre_id is null then raise exception 'COMISION_LOGISTICA_NO_APROBADA_O_SIN_CAMIONES_DISPONIBLES'; end if;

  insert into public.viajes(
    operacion_id,cierre_logistica_id,vehiculo_id,acoplado_vehiculo_id,
    origen,destino,estado,transportista_profile_id,asignado_por,
    origen_nombre,destino_nombre,patente_camion,patente_acoplado,creado_en,actualizado_at
  )
  values(
    p_operacion_id,v_cierre_id,p_vehiculo_id,p_acoplado_vehiculo_id,
    p_origen,p_destino,'ASIGNADO',p_transportista_profile_id,auth.uid(),
    p_origen_nombre,p_destino_nombre,v_patente,v_acoplado,now(),now()
  )
  returning id into v_id;

  insert into public.viaje_eventos(viaje_id,operacion_id,estado,lugar,empresa_nombre,observaciones,registrado_por)
  values(v_id,p_operacion_id,'CAMION_ASIGNADO',p_origen,p_origen_nombre,
    'Comisión logística del 1% en ARS aprobada manualmente. Transportista, camión y acoplado asignados.',auth.uid());
  return v_id;
end;
$$;

create or replace function public.crear_viaje_operacion(
  p_operacion_id uuid,
  p_transportista_profile_id uuid,
  p_origen text,
  p_destino text,
  p_origen_nombre text,
  p_destino_nombre text,
  p_patente_camion text,
  p_patente_acoplado text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_id uuid;
  v_transportista_id uuid;
  v_empresa_transportista_id uuid;
  v_verified text;
  v_vehiculo_id uuid;
  v_acoplado_id uuid;
  v_patente text;
  v_acoplado text;
  v_cierre_id uuid;
  v_patente_normalizada text:=upper(regexp_replace(coalesce(p_patente_camion,''),'[^A-Z0-9]','','g'));
  v_acoplado_normalizada text:=upper(regexp_replace(coalesce(p_patente_acoplado,''),'[^A-Z0-9]','','g'));
begin
  if auth.uid() is null or not public.usuario_puede_gestionar_logistica_operacion(p_operacion_id) then raise exception 'FORBIDDEN'; end if;
  select id,empresa_id,verificacion_estado into v_transportista_id,v_empresa_transportista_id,v_verified
  from public.transportistas where profile_id=p_transportista_profile_id and activo=true;
  if v_transportista_id is null or v_verified is distinct from 'VERIFICADO' then raise exception 'TRANSPORTISTA_NOT_VERIFIED'; end if;

  select id,patente::text into v_vehiculo_id,v_patente from public.vehiculos
  where transportista_id=v_transportista_id and habilitado=true and upper(tipo)='CAMION'
    and upper(regexp_replace(patente,'[^A-Z0-9]','','g'))=v_patente_normalizada limit 1;
  if v_vehiculo_id is null then raise exception 'CAMION_NO_REGISTRADO_PARA_TRANSPORTISTA'; end if;

  if v_acoplado_normalizada<>'' then
    select id,patente::text into v_acoplado_id,v_acoplado from public.vehiculos
    where transportista_id=v_transportista_id and habilitado=true and upper(tipo)='ACOPLADO'
      and upper(regexp_replace(patente,'[^A-Z0-9]','','g'))=v_acoplado_normalizada limit 1;
    if v_acoplado_id is null then raise exception 'ACOPLADO_NO_REGISTRADO_PARA_TRANSPORTISTA'; end if;
  end if;

  select c.id into v_cierre_id
  from public.cierres_logistica c
  where c.operacion_id=p_operacion_id
    and c.empresa_transportista_id=v_empresa_transportista_id
    and c.estado_cierre='cerrado_formal'
    and c.estado_pago_comision_logistica='aprobado'
    and (select count(*) from public.viajes v where v.cierre_logistica_id=c.id)<c.cantidad_camiones
  order by c.fecha_cierre asc
  limit 1 for update skip locked;
  if v_cierre_id is null then raise exception 'COMISION_LOGISTICA_NO_APROBADA_O_SIN_CAMIONES_DISPONIBLES'; end if;

  insert into public.viajes(
    operacion_id,cierre_logistica_id,vehiculo_id,acoplado_vehiculo_id,
    origen,destino,estado,transportista_profile_id,asignado_por,
    origen_nombre,destino_nombre,patente_camion,patente_acoplado,creado_en,actualizado_at
  )
  values(
    p_operacion_id,v_cierre_id,v_vehiculo_id,v_acoplado_id,
    p_origen,p_destino,'ASIGNADO',p_transportista_profile_id,auth.uid(),
    p_origen_nombre,p_destino_nombre,v_patente,v_acoplado,now(),now()
  )
  returning id into v_id;

  insert into public.viaje_eventos(viaje_id,operacion_id,estado,lugar,empresa_nombre,observaciones,registrado_por)
  values(v_id,p_operacion_id,'CAMION_ASIGNADO',p_origen,p_origen_nombre,
    'Comisión logística del 1% en ARS aprobada manualmente. Camión asignado.',auth.uid());
  return v_id;
end;
$$;

create or replace function public.asignar_transportista_a_viaje(
  p_viaje_id uuid,
  p_transportista_profile_id uuid,
  p_patente_camion text,
  p_patente_acoplado text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_op uuid;
  v_cierre_id uuid;
  c public.cierres_logistica%rowtype;
  v_transportista_id uuid;
  v_empresa_transportista_id uuid;
  v_estado text;
  v_vehiculo_id uuid;
  v_acoplado_id uuid;
  v_patente text:=upper(regexp_replace(coalesce(p_patente_camion,''),'[^A-Z0-9]','','g'));
  v_acoplado text:=upper(regexp_replace(coalesce(p_patente_acoplado,''),'[^A-Z0-9]','','g'));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select operacion_id,cierre_logistica_id into v_op,v_cierre_id from public.viajes where id=p_viaje_id for update;
  if v_op is null then raise exception 'TRIP_NOT_FOUND'; end if;
  if not public.usuario_puede_gestionar_logistica_operacion(v_op) then raise exception 'FORBIDDEN'; end if;
  if v_cierre_id is null then raise exception 'LOGISTICS_CLOSURE_REQUIRED'; end if;
  select * into c from public.cierres_logistica where id=v_cierre_id for update;
  if not found or c.operacion_id<>v_op or c.estado_pago_comision_logistica<>'aprobado' then
    raise exception 'LOGISTICS_COMMISSION_NOT_APPROVED';
  end if;
  select id,empresa_id,verificacion_estado into v_transportista_id,v_empresa_transportista_id,v_estado
  from public.transportistas where profile_id=p_transportista_profile_id and activo=true;
  if v_transportista_id is null or v_estado is distinct from 'VERIFICADO' then raise exception 'TRANSPORTISTA_NOT_VERIFIED'; end if;
  if v_empresa_transportista_id is distinct from c.empresa_transportista_id then raise exception 'TRANSPORTISTA_COMPANY_MISMATCH'; end if;

  select id,patente::text into v_vehiculo_id,v_patente from public.vehiculos
  where transportista_id=v_transportista_id and habilitado=true and upper(tipo)='CAMION'
    and upper(regexp_replace(patente,'[^A-Z0-9]','','g'))=v_patente limit 1;
  if v_vehiculo_id is null then raise exception 'CAMION_NO_REGISTRADO_PARA_TRANSPORTISTA'; end if;
  if v_acoplado<>'' then
    select id,patente::text into v_acoplado_id,v_acoplado from public.vehiculos
    where transportista_id=v_transportista_id and habilitado=true and upper(tipo)='ACOPLADO'
      and upper(regexp_replace(patente,'[^A-Z0-9]','','g'))=v_acoplado limit 1;
    if v_acoplado_id is null then raise exception 'ACOPLADO_NO_REGISTRADO_PARA_TRANSPORTISTA'; end if;
  end if;

  update public.viajes set transportista_profile_id=p_transportista_profile_id,vehiculo_id=v_vehiculo_id,
    acoplado_vehiculo_id=v_acoplado_id,asignado_por=auth.uid(),patente_camion=v_patente,
    patente_acoplado=nullif(v_acoplado,''),estado='ASIGNADO',actualizado_at=now()
  where id=p_viaje_id;
  insert into public.viaje_eventos(viaje_id,operacion_id,estado,observaciones,registrado_por)
  values(p_viaje_id,v_op,'CAMION_ASIGNADO','Transportista y vehículos asignados luego de validar el 1% logístico en ARS.',auth.uid());
end;
$$;

create or replace function public.registrar_comprobante_comision_logistica(
  p_cierre_id uuid,p_storage_path text,p_referencia text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare c public.cierres_logistica%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into c from public.cierres_logistica where id=p_cierre_id for update;
  if not found or not public.usuario_es_miembro_empresa(c.empresa_transportista_id) then raise exception 'NO_AUTORIZADO'; end if;
  if c.estado_cierre<>'cerrado_formal' then raise exception 'CIERRE_NO_ACTIVO'; end if;
  if c.estado_pago_comision_logistica not in ('esperando_comprobante','rechazado') then raise exception 'COMPROBANTE_NO_PERMITIDO_EN_ESTADO_ACTUAL'; end if;
  if p_storage_path is null or length(p_storage_path)>500 or p_storage_path not like p_cierre_id::text||'/%' then raise exception 'COMPROBANTE_INVALIDO'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='logistica-comprobantes' and o.name=p_storage_path and o.owner_id::text=auth.uid()::text) then raise exception 'COMPROBANTE_NO_ENCONTRADO'; end if;
  update public.cierres_logistica set url_comprobante_logistica=p_storage_path,referencia_pago=nullif(trim(p_referencia),''),estado_pago_comision_logistica='comprobante_enviado' where id=p_cierre_id;
  insert into public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje,adjunto_path)
  select cf.id,null,true,'El transportista cargó el comprobante de la comisión logística del 1% en ARS. Monto por camión: $'||
    to_char(c.comision_logistica_por_camion_ars,'FM999G999G990D00')||' ARS. Total: $'||
    to_char(c.comision_logistica_ars,'FM999G999G990D00')||
    ' ARS. El pago queda pendiente de conciliación manual por Administración.',p_storage_path
  from public.conversaciones_fletes cf where cf.cierre_logistica_id=c.id;
end;
$$;

create or replace function public.revisar_comision_logistica(
  p_cierre_id uuid,p_aprobar boolean,p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  c public.cierres_logistica%rowtype;
  conv uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.platform_admins a where a.user_id=auth.uid()) then raise exception 'ADMIN_REQUIRED'; end if;
  select * into c from public.cierres_logistica where id=p_cierre_id for update;
  if not found or c.estado_pago_comision_logistica<>'comprobante_enviado' then raise exception 'COMPROBANTE_NO_PENDIENTE'; end if;
  update public.cierres_logistica
  set estado_pago_comision_logistica=case when p_aprobar then 'aprobado' else 'rechazado' end,
      revisado_por=auth.uid(),revisado_at=now(),motivo_revision=nullif(trim(p_motivo),'')
  where id=p_cierre_id;
  select id into conv from public.conversaciones_fletes where cierre_logistica_id=p_cierre_id limit 1;
  if conv is not null then
    insert into public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje)
    values(
      conv,null,true,
      case when p_aprobar then
        'Administración verificó el ingreso bancario y aprobó la comisión logística del 1% en ARS. Se habilita la asignación de camiones, patentes y choferes para esta operación y la prevalidación documental de la CPE ante ARCA.'
      else
        'Administración rechazó el comprobante de comisión logística. Motivo: '||coalesce(nullif(trim(p_motivo),''),'No se pudo conciliar el ingreso bancario')||'. Cargá un nuevo comprobante para solicitar otra revisión.'
      end
    );
  end if;
end;
$$;

create or replace function public.revisar_adelanto_combustible_logistica(
  p_adelanto_id uuid,p_aprobar boolean,p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  a public.logistica_adelantos_combustible%rowtype;
  conv uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.platform_admins a where a.user_id=auth.uid()) then raise exception 'ADMIN_REQUIRED'; end if;
  select * into a from public.logistica_adelantos_combustible where id=p_adelanto_id for update;
  if not found or a.estado<>'COMPROBANTE_CARGADO' then raise exception 'COMPROBANTE_ADELANTO_NO_PENDIENTE'; end if;
  update public.logistica_adelantos_combustible
  set estado=case when p_aprobar then 'APROBADO' else 'RECHAZADO' end,
      revisado_por=auth.uid(),revisado_at=now(),
      motivo_rechazo=case when p_aprobar then null else nullif(trim(p_motivo),'') end
  where id=p_adelanto_id;
  select cf.id into conv from public.conversaciones_fletes cf
  where cf.cierre_logistica_id=a.cierre_logistica_id limit 1;
  if conv is not null then
    insert into public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje,adjunto_path)
    values(
      conv,null,true,
      case when p_aprobar then
        'Administración verificó el comprobante del adelanto de combustible y viáticos. El adelanto quedó aprobado; el viaje puede continuar con la CPE una vez cumplidos los demás controles.'
      else
        'Administración rechazó el comprobante del adelanto. Motivo: '||coalesce(nullif(trim(p_motivo),''),'No se pudo verificar la transferencia')||'. El viaje permanece bloqueado hasta resolver el adelanto o cancelar la solicitud.'
      end,
      a.comprobante_path
    );
  end if;
end;
$$;

revoke all on function public.cerrar_operacion_logistica_market(uuid,uuid,numeric) from public,anon;
grant execute on function public.cerrar_operacion_logistica_market(uuid,uuid,numeric) to authenticated;
revoke all on function public.crear_viaje_operacion_con_vehiculos(uuid,uuid,uuid,uuid,text,text,text,text) from public,anon;
grant execute on function public.crear_viaje_operacion_con_vehiculos(uuid,uuid,uuid,uuid,text,text,text,text) to authenticated;
revoke all on function public.crear_viaje_operacion(uuid,uuid,text,text,text,text,text,text) from public,anon;
grant execute on function public.crear_viaje_operacion(uuid,uuid,text,text,text,text,text,text) to authenticated;
revoke all on function public.asignar_transportista_a_viaje(uuid,uuid,text,text) from public,anon;
grant execute on function public.asignar_transportista_a_viaje(uuid,uuid,text,text) to authenticated;
revoke all on function public.registrar_comprobante_comision_logistica(uuid,text,text) from public,anon;
grant execute on function public.registrar_comprobante_comision_logistica(uuid,text,text) to authenticated;
revoke all on function public.revisar_comision_logistica(uuid,boolean,text) from public,anon;
grant execute on function public.revisar_comision_logistica(uuid,boolean,text) to authenticated;
revoke all on function public.revisar_adelanto_combustible_logistica(uuid,boolean,text) from public,anon;
grant execute on function public.revisar_adelanto_combustible_logistica(uuid,boolean,text) to authenticated;
