create or replace function public.proteger_contrato_confirmado() returns trigger language plpgsql set search_path=public as $$
begin
 if old.estado='CONFIRMADO' then
  if new.operacion_id is distinct from old.operacion_id or new.acuerdo_id is distinct from old.acuerdo_id or new.numero_contrato is distinct from old.numero_contrato or new.tipo_contrato is distinct from old.tipo_contrato or new.cantidad_tn is distinct from old.cantidad_tn or new.precio_tn is distinct from old.precio_tn or new.importe_total is distinct from old.importe_total or new.lugar_carga is distinct from old.lugar_carga or new.destino is distinct from old.destino or new.condicion_entrega is distinct from old.condicion_entrega or new.forma_pago is distinct from old.forma_pago or new.plazo_pago is distinct from old.plazo_pago or new.flete is distinct from old.flete or new.calidad is distinct from old.calidad or new.observaciones is distinct from old.observaciones or new.contenido is distinct from old.contenido then raise exception 'El contrato confirmado es inmutable.'; end if;
  if new.estado is distinct from old.estado and (new.estado<>'CANCELADO' or current_setting('agrobrokeria.allow_contract_cancellation',true)<>'on') then raise exception 'El contrato confirmado es inmutable salvo cancelación aprobada.'; end if;
 end if; return new;
end $$;

create or replace function public.solicitar_cancelacion_contrato(p_operacion_id uuid,p_motivo text,p_justificativo text,p_evidencia_url text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_cid uuid;v_id uuid;
begin
 if v_uid is null or not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para esta operación'; end if;
 if nullif(trim(p_motivo),'') is null then raise exception 'El motivo de cancelación es obligatorio'; end if;
 if nullif(trim(p_justificativo),'') is null or length(trim(p_justificativo))<10 then raise exception 'El justificativo debe explicar el motivo con suficiente detalle'; end if;
 select id into v_cid from contratos where operacion_id=p_operacion_id for update;
 if v_cid is null then raise exception 'La operación no tiene contrato'; end if;
 if (select estado from contratos where id=v_cid)='CANCELADO' then raise exception 'El contrato ya está cancelado'; end if;
 if exists(select 1 from cancelaciones_contrato where operacion_id=p_operacion_id and estado_revision='PENDIENTE') then raise exception 'Ya existe una solicitud de cancelación pendiente'; end if;
 insert into cancelaciones_contrato(operacion_id,contrato_id,solicitada_por,motivo,justificativo,evidencia_url) values(p_operacion_id,v_cid,v_uid,trim(p_motivo),trim(p_justificativo),nullif(trim(p_evidencia_url),'')) returning id into v_id;
 update operacion_control_comercial set cancelacion_estado='SOLICITADA',cancelacion_motivo=trim(p_motivo),cancelacion_justificativo=trim(p_justificativo),cancelacion_evidencia_url=nullif(trim(p_evidencia_url),''),cancelacion_solicitada_por=v_uid,cancelacion_fecha=now(),cancelacion_revision_estado='PENDIENTE',updated_at=now() where operacion_id=p_operacion_id;
 return v_id;
end $$;

create or replace function public.revisar_cancelacion_contrato(p_cancelacion_id uuid,p_resultado text,p_observaciones text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_c public.cancelaciones_contrato%rowtype;v_admin boolean;v_comm public.operacion_comisiones%rowtype;v_refund numeric;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_c from cancelaciones_contrato where id=p_cancelacion_id for update;
 if not found then raise exception 'Solicitud de cancelación inexistente'; end if;
 select exists(select 1 from company_users where company_id=(select empresa_id from operaciones where id=v_c.operacion_id) and profile_id=v_uid and activo=true and lower(rol::text) in ('administrador','admin')) into v_admin;
 if not v_admin then raise exception 'ADMIN_REQUIRED'; end if;
 if p_resultado not in ('APROBADA','RECHAZADA') or v_c.estado_revision<>'PENDIENTE' then raise exception 'Revisión inválida'; end if;
 select * into v_comm from operacion_comisiones where operacion_id=v_c.operacion_id and tipo_comision='PLATAFORMA' order by creado_at desc limit 1 for update;
 v_refund:=coalesce(v_comm.saldo_reservado,0);
 if p_resultado='APROBADA' then perform set_config('agrobrokeria.allow_contract_cancellation','on',true); update contratos set estado='CANCELADO',observaciones=concat_ws(E'\n',observaciones,'Cancelación aprobada: '||v_c.motivo),updated_at=now() where id=v_c.contrato_id; end if;
 update cancelaciones_contrato set estado_revision=p_resultado,revisada_por=v_uid,revisada_at=now(),observaciones_revision=p_observaciones,importe_comision_considerado=coalesce(v_comm.saldo_reservado,0),importe_comision_devuelto=case when p_resultado='APROBADA' then v_refund else 0 end,moneda_id=v_comm.moneda_id,devolucion_estado=case when p_resultado='APROBADA' and v_refund>0 then 'REGISTRADA' else 'NO_PROCEDE' end,updated_at=now() where id=p_cancelacion_id;
 update operacion_control_comercial set cancelacion_estado=case when p_resultado='APROBADA' then 'CANCELADA' else 'CANCELACION_RECHAZADA' end,cancelacion_revision_estado=p_resultado,cancelacion_revision_por=v_uid,cancelacion_revision_fecha=now(),cancelacion_revision_observaciones=p_observaciones,comision_fecha_devolucion=case when p_resultado='APROBADA' and v_refund>0 then now() else comision_fecha_devolucion end,comision_estado=case when p_resultado='APROBADA' and v_refund>0 then 'DEVUELTA' else comision_estado end,updated_at=now() where operacion_id=v_c.operacion_id;
 if p_resultado='APROBADA' and v_refund>0 then update operacion_comisiones set saldo_reservado=greatest(coalesce(saldo_reservado,0)-v_refund,0),observaciones=concat_ws(E'\n',observaciones,'Devolución registrada por cancelación justificada'),actualizado_at=now() where id=v_comm.id; end if;
 return jsonb_build_object('cancelacion_id',p_cancelacion_id,'resultado',p_resultado,'importe_devuelto',case when p_resultado='APROBADA' then v_refund else 0 end,'devolucion_estado',case when p_resultado='APROBADA' and v_refund>0 then 'REGISTRADA' else 'NO_PROCEDE' end);
end $$;

revoke all on function public.solicitar_cancelacion_contrato(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.solicitar_cancelacion_contrato(uuid,text,text,text) to authenticated;
revoke all on function public.revisar_cancelacion_contrato(uuid,text,text) from public,anon,authenticated;
grant execute on function public.revisar_cancelacion_contrato(uuid,text,text) to authenticated;