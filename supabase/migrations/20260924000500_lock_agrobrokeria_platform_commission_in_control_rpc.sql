-- Keep AgroBrokerIA platform commission immutable at USD 1/TN inside the control RPC.
-- p_cambios may change operational control fields, but never the platform fee.

create or replace function public.guardar_control_comercial(p_operacion_id uuid,p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_id uuid; x jsonb; outrow jsonb; v_qty numeric;
begin
 if auth.uid() is null or not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para esta operación.'; end if;
 select cantidad_tn into v_qty from public.operaciones where id=p_operacion_id for update;
 if v_qty is null or v_qty<0 then raise exception 'Operación sin cantidad válida.'; end if;
 select id into v_id from public.operacion_control_comercial where operacion_id=p_operacion_id for update;
 if v_id is null then
   insert into public.operacion_control_comercial(operacion_id,comision_monto,comision_moneda,comision_estado,fondos_estado,visado_estado,vendedor_firma_estado,comprador_firma_estado,intermediario_firma_estado,datos_operativos_estado,no_elusion_aceptada,cancelacion_estado)
   values(p_operacion_id,v_qty,'USD','PENDIENTE','PENDIENTES','PENDIENTE','PENDIENTE','PENDIENTE','NO_CORRESPONDE','PROTEGIDOS',false,'NO_CANCELADA') returning id into v_id;
 end if;
 x:=coalesce(p_cambios,'{}'::jsonb);
 update public.operacion_control_comercial set comision_monto=v_qty,comision_moneda='USD',comision_estado=case when x ? 'comision_estado' then x->>'comision_estado' else comision_estado end,fondos_estado=case when x ? 'fondos_estado' then x->>'fondos_estado' else fondos_estado end,visado_estado=case when x ? 'visado_estado' then x->>'visado_estado' else visado_estado end,visado_resultado=case when x ? 'visado_resultado' then x->>'visado_resultado' else visado_resultado end,visado_motivo_rechazo=case when x ? 'visado_motivo_rechazo' then x->>'visado_motivo_rechazo' else visado_motivo_rechazo end,visado_observaciones=case when x ? 'visado_observaciones' then x->>'visado_observaciones' else visado_observaciones end,visado_responsable=case when x ? 'visado_responsable' then x->>'visado_responsable' else visado_responsable end,visado_calidad=case when x ? 'visado_calidad' then x->>'visado_calidad' else visado_calidad end,visado_humedad=case when x ? 'visado_humedad' then (x->>'visado_humedad')::numeric else visado_humedad end,visado_proteina=case when x ? 'visado_proteina' then (x->>'visado_proteina')::numeric else visado_proteina end,no_elusion_aceptada=case when x ? 'no_elusion_aceptada' then (x->>'no_elusion_aceptada')::boolean else no_elusion_aceptada end,datos_operativos_estado=case when x ? 'datos_operativos_estado' then x->>'datos_operativos_estado' else datos_operativos_estado end,datos_operativos_liberados_at=case when x ? 'datos_operativos_liberados_at' then (x->>'datos_operativos_liberados_at')::timestamptz else datos_operativos_liberados_at end,cancelacion_estado=case when x ? 'cancelacion_estado' then x->>'cancelacion_estado' else cancelacion_estado end,updated_at=now() where id=v_id returning to_jsonb(operacion_control_comercial.*) into outrow;
 return outrow;
end;$function$;