create or replace function public.confirmar_firma_externa(p_contrato_id uuid,p_documento_id uuid,p_sha256 text,p_nombre_archivo text default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_uid uuid := auth.uid();
  v_contrato public.contratos%rowtype;
  v_doc public.documentos_operacion%rowtype;
  v_required integer;
  v_updated integer;
begin
  if v_uid is null then raise exception 'Autenticación requerida.'; end if;

  select * into v_contrato from public.contratos where id=p_contrato_id for update;
  if not found then raise exception 'Contrato inexistente.'; end if;
  if not public.usuario_participa_operacion(v_contrato.operacion_id) then raise exception 'No autorizado para esta operación.'; end if;

  if coalesce(length(trim(p_sha256)),0) <> 64 or p_sha256 !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'SHA-256 inválido.';
  end if;

  select * into v_doc from public.documentos_operacion
  where id=p_documento_id and operacion_id=v_contrato.operacion_id for update;
  if not found then raise exception 'El documento firmado no pertenece a la operación.'; end if;
  if coalesce(v_doc.aprobado,false) is not true then raise exception 'El documento firmado debe estar aprobado/cargado antes de confirmarlo.'; end if;
  if coalesce(v_doc.url_archivo,'')='' then raise exception 'El documento firmado debe tener un archivo cargado.'; end if;

  select count(*) into v_required
  from public.operacion_participantes
  where operacion_id=v_contrato.operacion_id
    and rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO');
  if v_required < 2 then raise exception 'La operación debe tener al menos vendedor y comprador.'; end if;

  if exists (
    select 1 from public.operacion_participantes op
    where op.operacion_id=v_contrato.operacion_id
      and op.rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO')
      and not exists (
        select 1 from public.contrato_firmantes cf
        where cf.contrato_id=p_contrato_id
          and cf.rol=op.rol
          and cf.empresa_id=op.empresa_id
      )
  ) then
    raise exception 'Faltan firmantes registrados para uno o más participantes reales de la operación.';
  end if;

  update public.documentos_operacion
  set sha256=lower(trim(p_sha256)),
      nombre_archivo=coalesce(nullif(trim(p_nombre_archivo),''),nombre_archivo),
      firmado_externamente=true,
      firmado_externamente_at=coalesce(firmado_externamente_at,now()),
      cargado_por=coalesce(cargado_por,v_uid),
      evidencia_firma=jsonb_build_object('metodo','EXTERNA_MANUAL','confirmado_por',v_uid,'confirmado_at',now(),'documento_id',id,'contrato_id',p_contrato_id)
  where id=p_documento_id;

  update public.contrato_firmantes cf
  set firmado=true, fecha_firma=coalesce(fecha_firma,current_date), metodo_firma='EXTERNA_MANUAL'
  where cf.contrato_id=p_contrato_id
    and exists (
      select 1 from public.operacion_participantes op
      where op.operacion_id=v_contrato.operacion_id
        and op.rol=cf.rol
        and op.empresa_id=cf.empresa_id
        and op.rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO')
    );

  select count(*) into v_updated
  from (
    select distinct op.empresa_id,op.rol
    from public.operacion_participantes op
    where op.operacion_id=v_contrato.operacion_id
      and op.rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO')
      and exists (
        select 1 from public.contrato_firmantes cf
        where cf.contrato_id=p_contrato_id
          and cf.empresa_id=op.empresa_id
          and cf.rol=op.rol
          and cf.firmado=true
      )
  ) s;

  if v_updated < v_required then raise exception 'No todos los participantes reales están firmados externamente.'; end if;

  update public.contratos
  set estado='CONFIRMADO',fecha_firma=coalesce(fecha_firma,current_date),confirmado_at=coalesce(confirmado_at,now()),
      firma_externa_estado='CONFIRMADO',firma_externa_documento_id=p_documento_id,
      firma_externa_confirmada_at=now(),firma_externa_confirmada_por=v_uid,actualizado_en=now(),updated_at=now()
  where id=p_contrato_id;

  return jsonb_build_object('ok',true,'contrato_id',p_contrato_id,'documento_id',p_documento_id,'metodo','EXTERNA_MANUAL','firmantes_confirmados',v_updated,'firmantes_requeridos',v_required,'confirmado_at',now());
end;
$function$;