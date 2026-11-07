-- F1 contract party snapshots and operation-scoped company lookup.
-- The caller must participate in the operation; only its participant companies are returned.

create or replace function public.datos_partes_contrato_operacion(p_operacion_id uuid)
returns table (
  rol text,
  empresa_id uuid,
  razon_social text,
  cuit text,
  sisa_categoria text,
  sisa_status text,
  verificada boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not coalesce(public.usuario_participa_operacion(p_operacion_id), false) then
    raise exception 'No autorizado para consultar las partes de esta operación.';
  end if;

  return query
  select
    upper(op.rol::text),
    e.id,
    coalesce(nullif(e.razon_social, ''), nullif(e.nombre_comercial, ''), 'Empresa sin razón social')::text,
    coalesce(e.cuit, '')::text,
    coalesce(ao.sisa_categoria, ''),
    coalesce(ao.sisa_status, ''),
    coalesce(e.verificada, false)
  from public.operacion_participantes op
  join public.empresas e on e.id = op.empresa_id
  left join public.account_onboarding ao on ao.user_id = e.cuenta_id
  where op.operacion_id = p_operacion_id
  order by op.creada_en, op.rol;
end;
$$;

revoke all on function public.datos_partes_contrato_operacion(uuid) from public;
grant execute on function public.datos_partes_contrato_operacion(uuid) to authenticated;

create or replace function public.guardar_contrato_comercial(p_operacion_id uuid, p_datos jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
  v_workflow public.operacion_workflow%rowtype;
  v_orden integer;
  v_estado text;
  v_qty numeric;
  v_price numeric;
  v_total numeric;
  v_agreement_id uuid;
  v_abierto_at timestamptz;
  v_vencimiento_at timestamptz;
begin
  if v_uid is null or not public.usuario_participa_operacion(p_operacion_id) then
    raise exception 'No autorizado para esta operación.';
  end if;

  select * into v_workflow from public.operacion_workflow
  where operacion_id = p_operacion_id for update;
  if not found then raise exception 'La operación no tiene workflow.'; end if;

  select orden into v_orden from public.workflow_etapas
  where id = v_workflow.etapa_actual_id and workflow_id = v_workflow.workflow_id;
  if v_orden <> 5 then raise exception 'El contrato definitivo solo puede gestionarse en la etapa 5.'; end if;

  v_estado := coalesce(nullif(p_datos->>'estado', ''), 'BORRADOR');
  if v_estado not in ('BORRADOR', 'CONFIRMADO') then
    raise exception 'Estado de contrato inválido.';
  end if;

  select cantidad_tn, precio_tn, importe_total into v_qty, v_price, v_total
  from public.operaciones where id = p_operacion_id for update;
  if not found then raise exception 'Operación inexistente.'; end if;

  if (p_datos->>'numero_contrato') is null or p_datos->>'numero_contrato' = '' then
    raise exception 'El número de contrato es obligatorio.';
  end if;
  if (p_datos->>'cantidad_tn')::numeric is distinct from v_qty then
    raise exception 'La cantidad contractual no coincide con la operación.';
  end if;
  if (p_datos->>'precio_tn')::numeric is distinct from v_price then
    raise exception 'El precio contractual no coincide con la operación.';
  end if;
  if (p_datos->>'importe_total')::numeric is distinct from v_total then
    raise exception 'El importe contractual no coincide con la operación.';
  end if;

  select abierto_at, vencimiento_at into v_abierto_at, v_vencimiento_at
  from public.contratos where operacion_id = p_operacion_id for update;
  v_abierto_at := coalesce(v_abierto_at, now());
  v_vencimiento_at := coalesce(v_vencimiento_at, v_abierto_at + interval '7 days');

  if now() >= v_vencimiento_at and v_estado <> 'CONFIRMADO' then
    update public.contratos
    set estado = 'CANCELADO', cancelado_por_vencimiento_at = now(), updated_at = now()
    where operacion_id = p_operacion_id;
    update public.operacion_control_comercial
    set cancelacion_estado = 'CANCELADA_POR_VENCIMIENTO',
        cancelacion_motivo = 'Contrato no cerrado dentro del plazo máximo de 7 días.',
        cancelacion_fecha = now(), updated_at = now()
    where operacion_id = p_operacion_id;
    raise exception 'El contrato venció: el plazo máximo de 7 días fue superado.';
  end if;

  if v_estado = 'CONFIRMADO' then
    v_agreement_id := nullif(p_datos->>'acuerdo_id', '')::uuid;
    if v_agreement_id is null then
      raise exception 'El contrato confirmado requiere Acuerdo Comercial.';
    end if;
    if not exists (
      select 1 from public.acuerdos_comerciales
      where id = v_agreement_id and operacion_id = p_operacion_id and estado = 'CONFIRMADO'
    ) then
      raise exception 'El Acuerdo Comercial debe estar confirmado antes del contrato.';
    end if;
    if nullif(p_datos->>'contenido', '') is null then
      raise exception 'El contrato confirmado requiere contenido.';
    end if;
  end if;

  insert into public.contratos(
    operacion_id, acuerdo_id, numero_contrato, estado, cantidad_tn, precio_tn, importe_total,
    lugar_carga, destino, condicion_entrega, forma_pago, plazo_pago, flete, calidad, observaciones,
    contenido, confirmado_at, updated_at, abierto_at, vencimiento_at, cancelado_por_vencimiento_at,
    intermediario_externo_empresa_id, intermediario_externo_nombre_snapshot,
    intermediario_externo_cuit_snapshot, pacto_comision_externa_declarada
  ) values (
    p_operacion_id, nullif(p_datos->>'acuerdo_id', '')::uuid, nullif(p_datos->>'numero_contrato', ''),
    v_estado, (p_datos->>'cantidad_tn')::numeric, (p_datos->>'precio_tn')::numeric,
    (p_datos->>'importe_total')::numeric, nullif(p_datos->>'lugar_carga', ''),
    nullif(p_datos->>'destino', ''), nullif(p_datos->>'condicion_entrega', ''),
    nullif(p_datos->>'forma_pago', ''), nullif(p_datos->>'plazo_pago', ''),
    nullif(p_datos->>'flete', ''), nullif(p_datos->>'calidad', ''), nullif(p_datos->>'observaciones', ''),
    p_datos->>'contenido', case when v_estado = 'CONFIRMADO' then now() end, now(),
    v_abierto_at, v_vencimiento_at, null,
    nullif(p_datos->>'intermediario_externo_empresa_id', '')::uuid,
    nullif(p_datos->>'intermediario_externo_nombre_snapshot', ''),
    nullif(p_datos->>'intermediario_externo_cuit_snapshot', ''),
    coalesce((p_datos->>'pacto_comision_externa_declarada')::boolean, false)
  )
  on conflict (operacion_id) do update set
    acuerdo_id = excluded.acuerdo_id,
    numero_contrato = excluded.numero_contrato,
    estado = excluded.estado,
    cantidad_tn = excluded.cantidad_tn,
    precio_tn = excluded.precio_tn,
    importe_total = excluded.importe_total,
    lugar_carga = excluded.lugar_carga,
    destino = excluded.destino,
    condicion_entrega = excluded.condicion_entrega,
    forma_pago = excluded.forma_pago,
    plazo_pago = excluded.plazo_pago,
    flete = excluded.flete,
    calidad = excluded.calidad,
    observaciones = excluded.observaciones,
    contenido = excluded.contenido,
    confirmado_at = excluded.confirmado_at,
    updated_at = excluded.updated_at,
    abierto_at = public.contratos.abierto_at,
    vencimiento_at = public.contratos.vencimiento_at,
    cancelado_por_vencimiento_at = null,
    intermediario_externo_empresa_id = excluded.intermediario_externo_empresa_id,
    intermediario_externo_nombre_snapshot = excluded.intermediario_externo_nombre_snapshot,
    intermediario_externo_cuit_snapshot = excluded.intermediario_externo_cuit_snapshot,
    pacto_comision_externa_declarada = excluded.pacto_comision_externa_declarada
  returning id into v_id;

  return (select to_jsonb(c) from public.contratos c where c.id = v_id);
end;
$function$;

notify pgrst, 'reload schema';
