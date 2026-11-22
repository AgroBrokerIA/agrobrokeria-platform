-- Restrict contract version creation to draft versions and serialize version numbering.
-- Existing production contract_versions table is empty; no historical rows are rewritten.
create or replace function public.crear_version_contrato(
  p_contrato_id uuid,
  p_motivo text,
  p_contenido text,
  p_estado text default 'BORRADOR'
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_op uuid;
  v_next integer;
  v_id uuid;
  v_hash text;
  v_estado text := coalesce(nullif(upper(trim(p_estado)), ''), 'BORRADOR');
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_estado <> 'BORRADOR' then
    raise exception 'CONTRACT_VERSION_STATE_NOT_ALLOWED: only BORRADOR versions can be created';
  end if;

  -- Lock the parent contract so concurrent requests cannot calculate the same version number.
  select operacion_id
    into v_op
  from public.contratos
  where id = p_contrato_id
  for update;

  if v_op is null or not public.usuario_participa_operacion(v_op) then
    raise exception 'FORBIDDEN';
  end if;

  if exists (
    select 1
    from public.contratos
    where id = p_contrato_id
      and estado = 'CONFIRMADO'
  ) then
    raise exception 'CONFIRMED_CONTRACT_IMMUTABLE';
  end if;

  if nullif(trim(p_contenido), '') is null then
    raise exception 'CONTENT_REQUIRED';
  end if;

  select coalesce(max(version), 0) + 1
    into v_next
  from public.contrato_versiones
  where contrato_id = p_contrato_id;

  v_hash := encode(digest(convert_to(p_contenido, 'utf8'), 'sha256'), 'hex');

  insert into public.contrato_versiones(
    contrato_id, version, estado, motivo, contenido, documento_hash, creado_por
  )
  values (
    p_contrato_id, v_next, v_estado, nullif(trim(p_motivo), ''),
    p_contenido, v_hash, v_uid
  )
  returning id into v_id;

  insert into public.auditoria(
    cuenta_id, accion, entidad, entidad_id, datos_nuevos
  )
  values (
    v_uid, 'CONTRATO_VERSION_CREADA', 'contrato_versiones', v_id,
    jsonb_build_object(
      'contrato_id', p_contrato_id,
      'version', v_next,
      'estado', v_estado,
      'documento_hash', v_hash
    )
  );

  return v_id;
end;
$function$;

revoke all on function public.crear_version_contrato(uuid, text, text, text) from public;
grant execute on function public.crear_version_contrato(uuid, text, text, text) to authenticated, service_role;
