-- Enforce the critical operation workflow gates server-side.
-- The UI remains helpful, but stage transitions cannot bypass signatures, funds,
-- confidentiality/no-elusion prerequisites, operational-data release, or delivery.

create or replace function public.avanzar_operacion_workflow(p_workflow_id uuid,p_etapa_destino_id uuid,p_estado text default null)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
 v_workflow public.operacion_workflow%rowtype;
 v_actual_orden integer;
 v_destino_orden integer;
 v_max_orden integer;
 v_uid uuid:=auth.uid();
 v_gate jsonb;
 v_control public.operacion_control_comercial%rowtype;
 v_firmantes_requeridos integer;
 v_firmantes_firmados integer;
begin
 if v_uid is null then raise exception 'Autenticación requerida.'; end if;
 select * into v_workflow from public.operacion_workflow where id=p_workflow_id for update;
 if not found then raise exception 'Workflow de operación inexistente.'; end if;
 if not public.usuario_participa_operacion(v_workflow.operacion_id) then raise exception 'No autorizado para esta operación.'; end if;

 select orden into v_actual_orden from public.workflow_etapas where id=v_workflow.etapa_actual_id and workflow_id=v_workflow.workflow_id;
 select orden into v_destino_orden from public.workflow_etapas where id=p_etapa_destino_id and workflow_id=v_workflow.workflow_id;
 if v_actual_orden is null or v_destino_orden is null then raise exception 'Las etapas no pertenecen al workflow de la operación.'; end if;
 if v_destino_orden<>v_actual_orden+1 then raise exception 'La operación solo puede avanzar a la siguiente etapa.'; end if;

 if v_destino_orden=5 then
   if not exists(select 1 from public.contratos where operacion_id=v_workflow.operacion_id and estado='CONFIRMADO') then
     raise exception 'El contrato debe estar confirmado antes de pasar a Firmas.';
   end if;
 end if;

 if v_destino_orden=6 then
   select count(*) into v_firmantes_requeridos
   from public.operacion_participantes
   where operacion_id=v_workflow.operacion_id and rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO');
   select count(*) into v_firmantes_firmados
   from public.contrato_firmantes cf
   join public.contratos c on c.id=cf.contrato_id
   where c.operacion_id=v_workflow.operacion_id
     and cf.rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO')
     and cf.firmado=true;
   if v_firmantes_requeridos<2 or v_firmantes_firmados<v_firmantes_requeridos then
     raise exception 'No se puede pasar a Fondos: faltan firmas requeridas.';
   end if;
 end if;

 if v_destino_orden=7 then
   select * into v_control from public.operacion_control_comercial where operacion_id=v_workflow.operacion_id for update;
   if not found then raise exception 'No existe el control comercial de la operación.'; end if;
   if v_control.fondos_estado<>'LIBERADOS' then raise exception 'No se puede liberar operativamente: los fondos no están LIBERADOS.'; end if;
   if v_control.comision_estado<>'ABONADA' then raise exception 'No se puede liberar operativamente: la comisión AgroBroker IA no está ABONADA.'; end if;
   if v_control.no_elusion_aceptada is not true then raise exception 'No se puede liberar operativamente: falta aceptar la no elusión.'; end if;
 end if;

 if v_destino_orden=8 then
   select * into v_control from public.operacion_control_comercial where operacion_id=v_workflow.operacion_id for update;
   if not found or v_control.datos_operativos_estado<>'HABILITADOS' then
     raise exception 'No se puede iniciar Logística / Entrega: los datos operativos no están HABILITADOS.';
   end if;
 end if;

 if v_destino_orden=9 then
   if not exists(select 1 from public.operacion_logistica where operacion_id=v_workflow.operacion_id and estado='ENTREGADA') then
     raise exception 'No se puede pasar a Liquidación: la entrega no está confirmada como ENTREGADA.';
   end if;
 end if;

 if p_estado is not null then
   select max(orden) into v_max_orden from public.workflow_etapas where workflow_id=v_workflow.workflow_id;
   if v_destino_orden<>v_max_orden then raise exception 'El estado de cierre solo puede establecerse en la última etapa.'; end if;
 end if;

 if v_destino_orden=(select max(orden) from public.workflow_etapas where workflow_id=v_workflow.workflow_id) then
   v_gate:=public.validar_cierre_documental_operacion(v_workflow.operacion_id);
   if coalesce((v_gate->>'ok')::boolean,false)=false then raise exception 'CIERRE_DOCUMENTAL_INCOMPLETO:%',v_gate->'faltantes'; end if;
 end if;

 update public.workflow_historial set fecha_fin=now()
 where operacion_workflow_id=p_workflow_id and etapa_id=v_workflow.etapa_actual_id and fecha_fin is null;
 update public.operacion_workflow set etapa_actual_id=p_etapa_destino_id,estado=coalesce(p_estado,estado) where id=p_workflow_id;
 insert into public.workflow_historial(operacion_workflow_id,etapa_id,fecha_inicio,usuario_id,observaciones)
 values(p_workflow_id,p_etapa_destino_id,now(),v_uid,'Avance del workflow validado por reglas de etapa.');
 if v_destino_orden=(select max(orden) from public.workflow_etapas where workflow_id=v_workflow.workflow_id)
 then update public.operaciones set estado=coalesce(p_estado,'CERRADA'),actualizada_en=now() where id=v_workflow.operacion_id; end if;
 return jsonb_build_object('workflow_id',p_workflow_id,'etapa_destino_id',p_etapa_destino_id,'orden',v_destino_orden,'estado',coalesce(p_estado,v_workflow.estado));
end;
$$;

revoke all on function public.avanzar_operacion_workflow(uuid,uuid,text) from public,anon;
grant execute on function public.avanzar_operacion_workflow(uuid,uuid,text) to authenticated;
