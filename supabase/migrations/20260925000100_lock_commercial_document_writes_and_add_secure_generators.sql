create or replace function public.crear_loi_comercial(
  p_operacion_id uuid,
  p_archivo_pdf text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_receptora uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'No autorizado';
  end if;

  select p.active_company_id into v_empresa
  from public.profiles p
  where p.id = v_uid;

  if v_empresa is null or not public.usuario_es_miembro_empresa(v_empresa) then
    raise exception 'No hay una empresa activa válida';
  end if;

  if not public.usuario_participa_operacion(p_operacion_id) then
    raise exception 'No autorizado para la operación';
  end if;

  if p_archivo_pdf is not null then
    if length(p_archivo_pdf) > 1000000
       or p_archivo_pdf !~ '^data:application/pdf;base64,'
    then
      raise exception 'Archivo PDF inválido o demasiado grande';
    end if;
  end if;

  select op.empresa_id
    into v_receptora
  from public.operacion_participantes op
  where op.operacion_id = p_operacion_id
    and op.empresa_id <> v_empresa
    and upper(op.rol) in ('COMPRADOR','VENDEDOR')
  order by case when upper(op.rol) = 'COMPRADOR' then 0 else 1 end, op.creada_en
  limit 1;

  insert into public.loi(
    operacion_id,empresa_emisora,empresa_receptora,fecha_emision,estado,archivo_pdf
  )
  values(
    p_operacion_id,v_empresa,v_receptora,current_date,'EMITIDO',p_archivo_pdf
  )
  returning id into v_id;

  return v_id;
end;
$function$;

create or replace function public.crear_sco_comercial(
  p_operacion_id uuid,
  p_archivo_pdf text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'No autorizado';
  end if;

  select p.active_company_id into v_empresa
  from public.profiles p
  where p.id = v_uid;

  if v_empresa is null or not public.usuario_es_miembro_empresa(v_empresa) then
    raise exception 'No hay una empresa activa válida';
  end if;

  if not public.usuario_participa_operacion(p_operacion_id) then
    raise exception 'No autorizado para la operación';
  end if;

  if p_archivo_pdf is not null then
    if length(p_archivo_pdf) > 1000000
       or p_archivo_pdf !~ '^data:application/pdf;base64,'
    then
      raise exception 'Archivo PDF inválido o demasiado grande';
    end if;
  end if;

  insert into public.sco(
    operacion_id,empresa_emisora,fecha_emision,estado,archivo_pdf
  )
  values(
    p_operacion_id,v_empresa,current_date,'EMITIDO',p_archivo_pdf
  )
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.crear_loi_comercial(uuid,text) from public;
revoke all on function public.crear_loi_comercial(uuid,text) from anon;
grant execute on function public.crear_loi_comercial(uuid,text) to authenticated;

revoke all on function public.crear_sco_comercial(uuid,text) from public;
revoke all on function public.crear_sco_comercial(uuid,text) from anon;
grant execute on function public.crear_sco_comercial(uuid,text) to authenticated;

revoke insert, update, delete on public.loi from authenticated;
revoke insert, update, delete on public.loi from anon;
drop policy if exists "loi_insert_participante" on public.loi;
drop policy if exists "loi_update_participante" on public.loi;

revoke insert, update, delete on public.sco from authenticated;
revoke insert, update, delete on public.sco from anon;
drop policy if exists "sco_insert_participante" on public.sco;
drop policy if exists "sco_update_participante" on public.sco;
