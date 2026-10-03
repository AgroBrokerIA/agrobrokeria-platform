alter table public.documentos_operacion
  add column if not exists sha256 text,
  add column if not exists firmado_externamente boolean not null default false,
  add column if not exists firmado_externamente_at timestamptz,
  add column if not exists cargado_por uuid,
  add column if not exists evidencia_firma jsonb;

alter table public.contratos
  add column if not exists firma_externa_estado text not null default 'NO_APLICA',
  add column if not exists firma_externa_documento_id uuid,
  add column if not exists firma_externa_confirmada_at timestamptz,
  add column if not exists firma_externa_confirmada_por uuid;

alter table public.contratos
  drop constraint if exists contratos_firma_externa_estado_chk;

alter table public.contratos
  add constraint contratos_firma_externa_estado_chk
  check (firma_externa_estado in ('NO_APLICA','PENDIENTE','FIRMADO_EXTERNAMENTE','CONFIRMADO'));

create index if not exists idx_documentos_operacion_sha256
  on public.documentos_operacion(sha256)
  where sha256 is not null;

create or replace function public.confirmar_firma_externa(
  p_contrato_id uuid,
  p_documento_id uuid,
  p_sha256 text,
  p_nombre_archivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
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
  if not public.usuario_participa_operacion(v_contrato.operacion_id) then
    raise exception 'No autorizado para esta operación.';
  end if;

  if coalesce(length(trim(p_sha256)),0) <> 64 or p_sha256 !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'SHA-256 inválido.';
  end if;

  select * into v_doc
  from public.documentos_operacion
  where id=p_documento_id and operacion_id=v_contrato.operacion_id
  for update;

  if not found then raise exception 'El documento firmado no pertenece a la operación.'; end if;
  if coalesce(v_doc.aprobado,false) is not true then
    raise exception 'El documento firmado debe estar aprobado/cargado antes de confirmarlo.';
  end if;
  if coalesce(v_doc.url_archivo,'') = '' then
    raise exception 'El documento firmado debe tener un archivo cargado.';
  end if;

  update public.documentos_operacion
  set sha256=lower(trim(p_sha256)),
      nombre_archivo=coalesce(nullif(trim(p_nombre_archivo),''),nombre_archivo),
      firmado_externamente=true,
      firmado_externamente_at=coalesce(firmado_externamente_at,now()),
      cargado_por=coalesce(cargado_por,v_uid),
      evidencia_firma=jsonb_build_object(
        'metodo','EXTERNA_MANUAL',
        'confirmado_por',v_uid,
        'confirmado_at',now(),
        'documento_id',id,
        'contrato_id',p_contrato_id
      )
  where id=p_documento_id;

  select count(*) into v_required
  from public.operacion_participantes
  where operacion_id=v_contrato.operacion_id
    and rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO');

  if v_required < 2 then raise exception 'La operación debe tener al menos vendedor y comprador.'; end if;

  update public.contrato_firmantes
  set firmado=true, fecha_firma=coalesce(fecha_firma,current_date), metodo_firma='EXTERNA_MANUAL'
  where contrato_id=p_contrato_id and rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO');

  get diagnostics v_updated = row_count;
  if v_updated < v_required then
    raise exception 'Faltan firmantes reales registrados para la operación.';
  end if;

  update public.contratos
  set estado='CONFIRMADO',
      fecha_firma=coalesce(fecha_firma,current_date),
      confirmado_at=coalesce(confirmado_at,now()),
      firma_externa_estado='CONFIRMADO',
      firma_externa_documento_id=p_documento_id,
      firma_externa_confirmada_at=now(),
      firma_externa_confirmada_por=v_uid,
      actualizado_en=now(),
      updated_at=now()
  where id=p_contrato_id;

  return jsonb_build_object(
    'ok',true,'contrato_id',p_contrato_id,'documento_id',p_documento_id,
    'metodo','EXTERNA_MANUAL','firmantes_confirmados',v_updated,'confirmado_at',now()
  );
end;
$$;

revoke all on function public.confirmar_firma_externa(uuid,uuid,text,text) from public,anon;
grant execute on function public.confirmar_firma_externa(uuid,uuid,text,text) to authenticated;
