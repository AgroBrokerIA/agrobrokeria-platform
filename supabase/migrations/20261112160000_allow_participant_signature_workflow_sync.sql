-- Allow authenticated operation participants to trigger the guarded
-- signature-to-logistics reconciliation; keep platform-admin override.
CREATE OR REPLACE FUNCTION public.sincronizar_workflow_firmas_contrato(p_contrato_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_contrato public.contratos%rowtype;
  v_workflow public.operacion_workflow%rowtype;
  v_actual integer;
  v_stage_id uuid;
  v_version integer;
  v_aprobadas integer;
  v_requeridas integer;
  v_firmadas integer;
  v_result jsonb;
begin
  if v_uid is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

  select * into v_contrato from public.contratos where id=p_contrato_id;
  if not found or v_contrato.estado<>'CONFIRMADO' then
    raise exception 'CONTRATO_NO_CONFIRMADO';
  end if;

  if not exists(select 1 from public.platform_admins where user_id=v_uid)
     and not public.usuario_participa_operacion(v_contrato.operacion_id) then
    raise exception 'NOT_AUTHORIZED_FOR_OPERATION';
  end if;

  select * into v_workflow
  from public.operacion_workflow
  where operacion_id=v_contrato.operacion_id
  for update;
  if not found then raise exception 'WORKFLOW_NO_ENCONTRADO'; end if;

  select orden into v_actual
  from public.workflow_etapas
  where id=v_workflow.etapa_actual_id and workflow_id=v_workflow.workflow_id;

  if v_actual>=7 then
    return jsonb_build_object('ok',true,'avanzada',false,'ya_avanzada',true,'orden',v_actual);
  end if;
  if v_actual<>6 then
    return jsonb_build_object('ok',true,'avanzada',false,'pendiente',true,'orden',v_actual);
  end if;

  select max(version_contrato) into v_version
  from public.contrato_copias_firmadas
  where contrato_id=p_contrato_id;

  select count(distinct rol) into v_aprobadas
  from public.contrato_copias_firmadas
  where contrato_id=p_contrato_id
    and version_contrato=v_version
    and rol in ('VENDEDOR','COMPRADOR')
    and estado='APROBADA';

  select count(distinct case
    when upper(rol) in ('VENDEDOR','PRODUCTOR','SELLER') then 'VENDEDOR'
    when upper(rol) in ('COMPRADOR','BUYER') then 'COMPRADOR'
    else null end) into v_requeridas
  from public.operacion_participantes
  where operacion_id=v_contrato.operacion_id;

  select count(distinct rol) into v_firmadas
  from public.contrato_firmantes
  where contrato_id=p_contrato_id
    and rol in ('VENDEDOR','COMPRADOR')
    and firmado=true;

  if v_aprobadas<2 or v_requeridas<2 or v_firmadas<2 then
    return jsonb_build_object('ok',true,'avanzada',false,'pendiente',true,
      'copias_aprobadas',v_aprobadas,'roles_requeridos',v_requeridas,'firmas_registradas',v_firmadas);
  end if;

  select id into v_stage_id
  from public.workflow_etapas
  where workflow_id=v_workflow.workflow_id and orden=7;

  if v_stage_id is null then raise exception 'ETAPA_LOGISTICA_NO_ENCONTRADA'; end if;

  v_result:=public.avanzar_operacion_workflow(v_workflow.id,v_stage_id,null);
  return jsonb_build_object('ok',true,'avanzada',true,'orden',7,'resultado',v_result);
end;
$function$;
