create or replace function public.confirmar_entrega_transportista(
 p_viaje_id uuid,p_kilos_entregados numeric,p_observaciones text default null,p_evidencia_path text default null
) returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_v public.viajes%rowtype; v_cpe_kilos numeric; v_total_previo numeric; v_operacion_kilos numeric;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_v from public.viajes where id=p_viaje_id for update;
 if not found then raise exception 'TRIP_NOT_FOUND'; end if;
 if v_v.transportista_profile_id is distinct from v_uid then raise exception 'ASSIGNED_CARRIER_REQUIRED'; end if;
 if nullif(trim(coalesce(p_evidencia_path,'')),'') is null then raise exception 'DELIVERY_EVIDENCE_REQUIRED'; end if;
 if p_evidencia_path not like v_v.operacion_id::text||'/logistica/'||p_viaje_id::text||'/entrega/'||v_uid::text||'-%'
 or not exists(select 1 from storage.objects so where so.bucket_id='documentos-operacion' and so.name=p_evidencia_path and so.owner_id::text=v_uid::text) then raise exception 'INVALID_DELIVERY_EVIDENCE'; end if;
 if v_v.transportista_entrega_confirmada_at is not null then raise exception 'CARRIER_DELIVERY_ALREADY_CONFIRMED'; end if;
 if not exists(select 1 from public.viaje_eventos where viaje_id=p_viaje_id and estado='DESCARGA_FINALIZADA') then raise exception 'UNLOADING_COMPLETION_REQUIRED'; end if;
 if p_kilos_entregados is null or p_kilos_entregados<=0 then raise exception 'INVALID_DELIVERED_WEIGHT'; end if;
 select coalesce(sum(kilos_declarados),0) into v_cpe_kilos from public.viaje_cartas_porte where viaje_id=p_viaje_id and estado_verificacion='VALIDADA';
 if v_cpe_kilos<=0 then raise exception 'VALIDATED_CPE_WITH_WEIGHT_REQUIRED'; end if;
 if p_kilos_entregados>v_cpe_kilos then raise exception 'DELIVERED_WEIGHT_EXCEEDS_CPE_WEIGHT'; end if;
 select coalesce(sum(transportista_kilos_entregados),0) into v_total_previo from public.viajes where operacion_id=v_v.operacion_id and id<>p_viaje_id and transportista_entrega_confirmada_at is not null;
 select coalesce(cantidad_tn,0)*1000 into v_operacion_kilos from public.operaciones where id=v_v.operacion_id for update;
 if v_total_previo+p_kilos_entregados>v_operacion_kilos then raise exception 'DELIVERED_QUANTITY_EXCEEDS_OPERATION'; end if;
 update public.viajes set transportista_entrega_confirmada_por=v_uid,transportista_entrega_confirmada_at=now(),
  transportista_kilos_entregados=p_kilos_entregados,transportista_entrega_evidencia_path=p_evidencia_path,
  estado='ESPERANDO_RECEPCION_PRODUCTOR',actualizado_at=now() where id=p_viaje_id;
 insert into public.viaje_eventos(viaje_id,operacion_id,estado,toneladas,observaciones,registrado_por)
 values(p_viaje_id,v_v.operacion_id,'ENTREGA_TRANSPORTISTA_CONFIRMADA',p_kilos_entregados/1000,
  coalesce(nullif(trim(p_observaciones),''),'Entrega informada por el transportista; pendiente de recepción del productor.'),v_uid);
 insert into public.notificaciones(profile_id,titulo,mensaje,tipo,operacion_id,leida,creada_en,actualizado_at)
 select distinct cu.profile_id,'Acción requerida: confirmar recepción del camión',
  'El transportista confirmó la descarga de un camión ('||round(p_kilos_entregados/1000,3)::text||' tn) y adjuntó evidencia. Ingresá a Logística, verificá los kilos y seleccioná Confirmar recepción o Reportar diferencia. La comisión permanece retenida.',
  'RECEPCION_CAMION_PENDIENTE',v_v.operacion_id,false,now(),now()
 from public.operacion_participantes op
 join public.company_empresa_map cem on cem.empresa_id=op.empresa_id
 join public.company_users cu on cu.company_id=cem.company_id and cu.activo=true
 where op.operacion_id=v_v.operacion_id and lower(trim(op.rol)) in ('vendedor','productor','seller')
 union
 select distinct cu.profile_id,'Acción requerida: confirmar recepción del camión',
  'El transportista confirmó la descarga de un camión ('||round(p_kilos_entregados/1000,3)::text||' tn) y adjuntó evidencia. Ingresá a Logística, verificá los kilos y seleccioná Confirmar recepción o Reportar diferencia. La comisión permanece retenida.',
  'RECEPCION_CAMION_PENDIENTE',v_v.operacion_id,false,now(),now()
 from public.operacion_participantes op
 join public.company_users cu on cu.company_id=op.empresa_id and cu.activo=true
 where op.operacion_id=v_v.operacion_id and lower(trim(op.rol)) in ('vendedor','productor','seller');
 return jsonb_build_object('viaje_id',p_viaje_id,'estado','ESPERANDO_RECEPCION_PRODUCTOR',
  'transportista_confirmado',true,'productor_confirmado',false,'kilos_entregados',p_kilos_entregados,
  'notificacion_receptor_enviada',true,'comision_liberada',false);
end $$;
