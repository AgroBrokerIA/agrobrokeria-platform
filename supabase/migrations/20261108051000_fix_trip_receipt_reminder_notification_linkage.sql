create or replace function public.procesar_recordatorios_recepcion_viajes()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_count integer:=0;
begin
 with pendientes as (
  select v.id viaje_id,v.operacion_id,v.transportista_entrega_confirmada_at,r.hito_horas,op.empresa_id
  from public.viajes v
  join public.operacion_participantes op on op.operacion_id=v.operacion_id
  cross join lateral (values (2),(12),(24),(48)) r(hito_horas)
  where v.transportista_entrega_confirmada_at is not null
    and v.productor_recepcion_confirmada_at is null
    and v.productor_recepcion_observada_at is null
    and v.estado='ESPERANDO_RECEPCION_PRODUCTOR'
    and now()>=v.transportista_entrega_confirmada_at+make_interval(hours=>r.hito_horas)
    and lower(trim(op.rol)) in ('vendedor','productor','seller')
 ), destinatarios as (
  select distinct p.viaje_id,p.operacion_id,p.hito_horas,cu.profile_id
  from pendientes p join public.company_empresa_map cem on cem.empresa_id=p.empresa_id
  join public.company_users cu on cu.company_id=cem.company_id and cu.activo=true
  union
  select distinct p.viaje_id,p.operacion_id,p.hito_horas,cu.profile_id
  from pendientes p join public.company_users cu on cu.company_id=p.empresa_id and cu.activo=true
 ), nuevos as (
  insert into public.viaje_recepcion_recordatorios(viaje_id,profile_id,hito_horas)
  select d.viaje_id,d.profile_id,d.hito_horas from destinatarios d
  on conflict(viaje_id,profile_id,hito_horas) do nothing
  returning id,viaje_id,profile_id,hito_horas
 ), enviados as (
  insert into public.notificaciones(profile_id,titulo,mensaje,tipo,operacion_id,leida,creada_en,actualizado_at)
  select n.profile_id,
   case n.hito_horas when 2 then 'Recepción pendiente: confirmar camión' when 12 then 'Recordatorio: confirmar recepción' when 24 then 'Atención: recepción sin confirmar' else 'Escalamiento: recepción pendiente hace 48 horas' end,
   case n.hito_horas
    when 2 then 'El transportista informó la entrega de un camión. Ingresá a la operación, verificá los kilos y seleccioná Confirmar recepción o Reportar diferencia.'
    when 12 then 'La recepción del camión continúa pendiente. Revisá la evidencia y confirmá los kilos recibidos o registrá una incidencia.'
    when 24 then 'Hace 24 horas que la recepción no fue confirmada. La comisión permanece retenida hasta resolver la entrega.'
    else 'La recepción sigue pendiente después de 48 horas. Se notificó también a Administración para seguimiento. No se liberará la comisión mientras exista una incidencia o falte evidencia.'
   end,
   'RECEPCION_CAMION_PENDIENTE_'||n.hito_horas||'H',n.operacion_id,false,now(),now()
  from nuevos n
  returning id,profile_id,operacion_id,tipo
 )
 update public.viaje_recepcion_recordatorios rr set notificacion_id=e.id
 from enviados e join public.viajes v on v.operacion_id=e.operacion_id
 where rr.viaje_id=v.id and rr.profile_id=e.profile_id
 and rr.hito_horas=case e.tipo when 'RECEPCION_CAMION_PENDIENTE_2H' then 2 when 'RECEPCION_CAMION_PENDIENTE_12H' then 12 when 'RECEPCION_CAMION_PENDIENTE_24H' then 24 when 'RECEPCION_CAMION_PENDIENTE_48H' then 48 end;
 get diagnostics v_count=row_count;
 with nuevos as (
  insert into public.viaje_recepcion_recordatorios(viaje_id,profile_id,hito_horas)
  select distinct v.id,a.user_id,48
  from public.viajes v join public.operacion_participantes op on op.operacion_id=v.operacion_id
  cross join public.platform_admins a
  where v.transportista_entrega_confirmada_at is not null
    and v.productor_recepcion_confirmada_at is null
    and v.productor_recepcion_observada_at is null
    and v.estado='ESPERANDO_RECEPCION_PRODUCTOR'
    and now()>=v.transportista_entrega_confirmada_at+interval '48 hours'
    and lower(trim(op.rol)) in ('vendedor','productor','seller')
  on conflict(viaje_id,profile_id,hito_horas) do nothing
  returning id,viaje_id,profile_id
 ), enviados as (
  insert into public.notificaciones(profile_id,titulo,mensaje,tipo,operacion_id,leida,creada_en,actualizado_at)
  select n.profile_id,'Revisión administrativa: recepción sin confirmar',
   'Un camión lleva 48 horas esperando la confirmación de recepción. Revisá evidencia, cantidades y contactá a las partes. La comisión sigue retenida.',
   'RECEPCION_CAMION_ESCALADA',v.operacion_id,false,now(),now()
  from nuevos n join public.viajes v on v.id=n.viaje_id
  returning id,profile_id
 )
 update public.viaje_recepcion_recordatorios rr set notificacion_id=e.id
 from enviados e where rr.profile_id=e.profile_id and rr.hito_horas=48 and rr.notificacion_id is null;
 return v_count;
end $$;
revoke all on function public.procesar_recordatorios_recepcion_viajes() from public,anon,authenticated;
