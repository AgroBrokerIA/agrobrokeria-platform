-- Vincula una demanda de flete con una operación donde participa la empresa dadora.
-- La empresa se obtiene de la demanda y la identidad se valida en el servidor.
create or replace function public.vincular_demanda_logistica_operacion(
  p_demanda_id uuid,
  p_operacion_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa_id uuid;
  v_estado text;
  v_operacion_actual uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTENTICACION_REQUERIDA';
  end if;

  select d.empresa_dadora_id, d.estado, d.operacion_id
    into v_empresa_id, v_estado, v_operacion_actual
  from public.demandas_logistica d
  where d.id = p_demanda_id
  for update;

  if not found then
    raise exception 'DEMANDA_NO_ENCONTRADA';
  end if;

  if not public.usuario_es_miembro_empresa(v_empresa_id) then
    raise exception 'SIN_PERMISO_SOBRE_DEMANDA';
  end if;

  if v_estado not in ('PUBLICADA', 'PARCIAL') then
    raise exception 'DEMANDA_NO_DISPONIBLE';
  end if;

  if v_operacion_actual is not null and v_operacion_actual <> p_operacion_id then
    raise exception 'DEMANDA_YA_VINCULADA';
  end if;

  if not exists (
    select 1
    from public.operacion_participantes op
    where op.operacion_id = p_operacion_id
      and op.empresa_id = v_empresa_id
  ) then
    raise exception 'EMPRESA_NO_PARTICIPA_EN_OPERACION';
  end if;

  update public.demandas_logistica
  set operacion_id = p_operacion_id,
      actualizado_at = now()
  where id = p_demanda_id
    and (operacion_id is null or operacion_id = p_operacion_id);

  if not found then
    raise exception 'NO_SE_PUDO_VINCULAR_DEMANDA';
  end if;
end;
$$;

revoke all on function public.vincular_demanda_logistica_operacion(uuid, uuid) from public;
revoke all on function public.vincular_demanda_logistica_operacion(uuid, uuid) from anon;
grant execute on function public.vincular_demanda_logistica_operacion(uuid, uuid) to authenticated;
