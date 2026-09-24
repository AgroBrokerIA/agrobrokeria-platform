-- Keep commission amount unset at offer acceptance.
-- The actual commission is configured explicitly through the commission workflow.
create or replace function public.procesar_aceptacion_oferta(p_oferta_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_of record;
  v_workflow record;
  v_stage record;
  v_ow uuid;
  v_control uuid;
  v_qty numeric;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select o.*, p.empresa_id as vendedor_empresa, p.id as pub_id
    into v_of
  from ofertas_negociacion o
  join publicaciones p on p.id = o.publicacion_id
  where o.id = p_oferta_id
  for update;

  if not found then raise exception 'Oferta inexistente'; end if;

  if not exists (
    select 1 from company_users
    where company_id = v_of.vendedor_empresa
      and profile_id = v_uid
      and activo = true
  ) then
    raise exception 'No autorizado para aceptar esta oferta';
  end if;

  if v_of.vendedor_empresa = v_of.empresa_id then
    raise exception 'Comprador y vendedor no pueden ser la misma empresa';
  end if;

  select cantidad_tn into v_qty
  from operaciones where id = v_of.operacion_id for update;

  if v_qty is null or v_qty <= 0 then
    raise exception 'Operación sin cantidad válida';
  end if;

  update ofertas_negociacion set estado = 'ACEPTADA' where id = p_oferta_id;
  update operaciones set estado = 'ACEPTADA' where id = v_of.operacion_id;

  insert into operacion_participantes(
    operacion_id, empresa_id, rol, porcentaje_comision, monto_comision,
    factura_presentada, factura_aprobada
  )
  values (v_of.operacion_id, v_of.vendedor_empresa, 'VENDEDOR', null, null, false, false)
  on conflict (operacion_id, empresa_id, rol) do nothing;

  insert into operacion_participantes(
    operacion_id, empresa_id, rol, porcentaje_comision, monto_comision,
    factura_presentada, factura_aprobada
  )
  values (v_of.operacion_id, v_of.empresa_id, 'COMPRADOR', null, null, false, false)
  on conflict (operacion_id, empresa_id, rol) do nothing;

  insert into operacion_control_comercial(
    operacion_id, comision_monto, comision_moneda, updated_at
  )
  values (v_of.operacion_id, null, 'USD', now())
  on conflict (operacion_id) do update
    set updated_at = now()
  returning id into v_control;

  select id into v_workflow
  from workflows
  where nombre = 'Operación de granos' and activo = true
  limit 1;

  if v_workflow.id is null then
    raise exception 'No existe workflow activo de Operación de granos';
  end if;

  select id into v_stage
  from workflow_etapas
  where workflow_id = v_workflow.id and orden = 1
  limit 1;

  if v_stage.id is null then
    raise exception 'El workflow no tiene etapa inicial';
  end if;

  select id into v_ow
  from operacion_workflow
  where operacion_id = v_of.operacion_id
  limit 1
  for update;

  if v_ow is null then
    insert into operacion_workflow(
      operacion_id, workflow_id, etapa_actual_id, estado
    )
    values (v_of.operacion_id, v_workflow.id, v_stage.id, 'EN_CURSO')
    returning id into v_ow;

    insert into workflow_historial(
      operacion_workflow_id, etapa_id, fecha_inicio, usuario_id, observaciones
    )
    values (
      v_ow, v_stage.id, now(), v_uid,
      'La oferta fue aceptada y se inició el workflow de la operación.'
    );
  end if;

  return jsonb_build_object(
    'oferta_id', p_oferta_id,
    'operacion_id', v_of.operacion_id,
    'estado', 'ACEPTADA',
    'control_id', v_control,
    'workflow_id', v_ow
  );
end;
$function$;
