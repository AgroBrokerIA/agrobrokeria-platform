-- Keep operations.estado consistent with workflow stage 10.
create or replace function public.sincronizar_estado_operacion_desde_workflow()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_orden integer;
begin
 select orden into v_orden from public.workflow_etapas where id=new.etapa_actual_id and workflow_id=new.workflow_id;
 if v_orden=10 then update public.operaciones set estado='CERRADA',actualizada_en=now() where id=new.operacion_id and estado<>'CERRADA'; end if;
 return new;
end;$function$;
drop trigger if exists trg_sync_operacion_estado_workflow on public.operacion_workflow;
create trigger trg_sync_operacion_estado_workflow after insert or update of etapa_actual_id,estado on public.operacion_workflow for each row execute function public.sincronizar_estado_operacion_desde_workflow();
update public.operaciones o set estado='CERRADA',actualizada_en=now() where o.estado='ACEPTADA' and exists(select 1 from public.operacion_workflow ow join public.workflow_etapas we on we.id=ow.etapa_actual_id and we.workflow_id=ow.workflow_id where ow.operacion_id=o.id and we.orden=10);